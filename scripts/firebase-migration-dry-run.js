#!/usr/bin/env node
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const EXPECTED_ROOTS = ['users','proveedores','productos','ordenes','recetasCosto'];
const DISPOSITIONS = { users:'TRANSFORM', proveedores:'TRANSFORM', productos:'TRANSFORM', ordenes:'TRANSFORM', recetasCosto:'HOLD' };
const EXECUTION_GATES = ['TARGET_RULES_INDEX_EVIDENCE','ACTUAL_PRODUCTION_COLLISION_COUNTS','PRIVILEGED_AUTH_INVENTORY','AUTH_HASH_AVAILABILITY'];
function stable(v){ if(Array.isArray(v)) return v.map(stable); if(v&&typeof v==='object') return Object.keys(v).sort().reduce((o,k)=>(o[k]=stable(v[k]),o),{}); return v; }
function checksum(v){ return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'); }
function entries(v){ return v&&typeof v==='object'&&!Array.isArray(v)?Object.entries(v):[]; }
function productRef(i){ return i&&(i.productoId||i.productId||i.id); }
function collisionClass(sourceRecord,targetRecord,evidence){
  if(!targetRecord) return 'NONE';
  if(evidence==='SAME_ENTITY') return 'SAME_ENTITY';
  if(evidence==='DIFFERENT_ENTITY') return 'DIFFERENT_ENTITY';
  return 'UNKNOWN';
}
function keyStrategy(c){ if(c==='NONE'||c==='SAME_ENTITY') return 'PRESERVE_SOURCE_KEY'; if(c==='DIFFERENT_ENTITY') return 'REKEY_WITH_MAPPING_TABLE_REQUIRED'; return 'BLOCKED'; }
function identityPreflight(sourceUsers,targetIdentities,proofs,inventoriesProvided){
  if(!inventoriesProvided) return [{ classification:'BLOCKED/UNKNOWN', reason:'AUTH_INVENTORIES_NOT_PROVIDED' }];
  return entries(sourceUsers).map(([uid,u])=>{
    const sameUid=targetIdentities[uid];
    if(!sameUid) {
      const normalized=String(u.email||'').trim().toLowerCase();
      const match=entries(targetIdentities).find(([,t])=>String(t.email||'').trim().toLowerCase()===normalized);
      if(!match) return { uid, classification:'PRESERVE_UID' };
      const [targetUid]=match;
      return proofs[uid]===targetUid?{uid,targetUid,classification:'MATCH_EXISTING'}:{uid,targetUid,classification:'REQUIRES_RECONCILIATION'};
    }
    return proofs[uid]===uid?{uid,targetUid:uid,classification:'MATCH_EXISTING'}:{uid,targetUid:uid,classification:'REQUIRES_RECONCILIATION'};
  }).sort((a,b)=>String(a.uid||'').localeCompare(String(b.uid||'')));
}
function analyze(source,target={},rehearsal={}){
  if(!source||typeof source!=='object'||Array.isArray(source)) throw new Error('SOURCE_SNAPSHOT_INVALID');
  if(!target||typeof target!=='object'||Array.isArray(target)) throw new Error('TARGET_SNAPSHOT_INVALID');
  const unexpectedRoots=Object.keys(source).filter(k=>!EXPECTED_ROOTS.includes(k)).sort(), roots={}, blockers=[], collisions=[];
  for(const root of EXPECTED_ROOTS){ const v=source[root]||{}; roots[root]={count:entries(v).length,checksum:checksum(v),disposition:DISPOSITIONS[root]}; }
  const suppliers=source.proveedores||{}, products=source.productos||{}, targetRoots={proveedores:target.suppliers||{},productos:target.products||{},ordenes:target.purchaseOrders||{}};
  const collisionEvidence=rehearsal.collisionEvidence||{};
  const keyStrategies=[];
  for(const root of ['proveedores','productos']) for(const [id,record] of entries(source[root]||{})){
    const targetRecord=targetRoots[root][id]; const cls=collisionClass(record,targetRecord,collisionEvidence[`${root}/${id}`]); const strategy=keyStrategy(cls);
    keyStrategies.push({root,sourceKey:id,collisionClass:cls,keyStrategy:strategy});
    if(cls!=='NONE') collisions.push({root,sourceKey:id,classification:cls,keyStrategy:strategy});
    if(strategy==='BLOCKED'||strategy==='REKEY_WITH_MAPPING_TABLE_REQUIRED') blockers.push({root,sourceKey:id,code:strategy});
  }
  const orderSimulation=entries(source.ordenes||{}).map(([id,order])=>{
    const rb=[]; const supplierId=order&&(order.proveedorId||order.supplierId);
    if(!supplierId||!Object.prototype.hasOwnProperty.call(suppliers,supplierId)) rb.push('MISSING_SUPPLIER_REFERENCE');
    if(!order||order.status==null) rb.push('MISSING_STATUS');
    if(!order||typeof order.total!=='number'||!Number.isFinite(order.total)) rb.push('MISSING_OR_INVALID_TOTAL');
    const ts=order&&(order.createdAt??order.fecha); if(ts==null||Number.isNaN(new Date(ts).getTime())) rb.push('MISSING_OR_INVALID_TIMESTAMP');
    const items=Array.isArray(order&&order.items)?order.items:Array.isArray(order&&order.productos)?order.productos:[];
    items.forEach((item,i)=>{const ref=productRef(item); if(!ref||!Object.prototype.hasOwnProperty.call(products,ref)) rb.push(`ITEM_${i}_MISSING_PRODUCT_REFERENCE`); if(typeof item.quantity!=='number'&&typeof item.cantidad!=='number') rb.push(`ITEM_${i}_MISSING_OR_INVALID_QUANTITY`); if(typeof item.price!=='number'&&typeof item.precio!=='number') rb.push(`ITEM_${i}_MISSING_OR_INVALID_PRICE`);});
    const cls=collisionClass(order,targetRoots.ordenes[id],collisionEvidence[`ordenes/${id}`]); const strategy=keyStrategy(cls); if(cls!=='NONE') collisions.push({root:'ordenes',sourceKey:id,classification:cls,keyStrategy:strategy}); if(strategy==='BLOCKED'||strategy==='REKEY_WITH_MAPPING_TABLE_REQUIRED') rb.push(strategy);
    [...new Set(rb)].forEach(code=>blockers.push({root:'ordenes',sourceKey:id,code}));
    return {sourceKey:id,targetRoot:'purchaseOrders',disposition:'TRANSFORM',collisionClass:cls,keyStrategy:strategy,blockers:[...new Set(rb)].sort()};
  }).sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey));
  unexpectedRoots.forEach(root=>blockers.push({root,code:'UNEXPECTED_ROOT'}));
  const identities=identityPreflight(source.users||{},rehearsal.targetIdentities||{},rehearsal.identityProofs||{},rehearsal.authInventoriesProvided===true);
  const report={schemaVersion:2,mode:'DRY_RUN',writeCapability:'DISABLED',roots,unexpectedRoots,collisions:collisions.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),keyStrategies:keyStrategies.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),identityPreflight:identities,executionGates:EXECUTION_GATES.map(g=>({gate:g,status:'UNRESOLVED'})),blockers:blockers.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),orderSimulation};
  report.reportChecksum=checksum(report); return report;
}
function summary(r){ return ['NRD Firebase migration analyzer — DRY RUN ONLY',`Roots: ${EXPECTED_ROOTS.map(x=>`${x}=${r.roots[x].count}`).join(', ')}`,`Unexpected roots: ${r.unexpectedRoots.length}`,`Collisions: ${r.collisions.length}`,`Blockers: ${r.blockers.length}`,`Identity preflight: ${r.identityPreflight.map(x=>x.classification).join(', ')}`,`Unresolved execution gates: ${r.executionGates.length}`,`Checksum: ${r.reportChecksum}`,'No Firebase/Auth/rules/deploy write path exists in this tool.'].join('\n'); }
if(require.main===module){ const s=process.argv[2],t=process.argv[3],r=process.argv[4]; if(!s){console.error('Usage: node scripts/firebase-migration-dry-run.js <source.json> [target.json] [rehearsal.json]');process.exit(2);} const report=analyze(JSON.parse(fs.readFileSync(s,'utf8')),t?JSON.parse(fs.readFileSync(t,'utf8')):{},r?JSON.parse(fs.readFileSync(r,'utf8')):{}); process.stdout.write(JSON.stringify(report,null,2)+'\n'); process.stderr.write(summary(report)+'\n'); if(report.blockers.length) process.exitCode=3; }
module.exports={analyze,checksum,summary};
