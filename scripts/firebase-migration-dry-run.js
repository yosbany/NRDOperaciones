#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const EXPECTED_ROOTS = ['users', 'proveedores', 'productos', 'ordenes', 'recetasCosto'];
const DISPOSITIONS = {
  users: 'TRANSFORM',
  proveedores: 'TRANSFORM',
  productos: 'TRANSFORM',
  ordenes: 'TRANSFORM',
  recetasCosto: 'HOLD',
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

function checksum(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function entries(root) {
  return root && typeof root === 'object' && !Array.isArray(root) ? Object.entries(root) : [];
}

function productRef(item) {
  return item && (item.productoId || item.productId || item.id);
}

function analyze(source, target = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('SOURCE_SNAPSHOT_INVALID');
  if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error('TARGET_SNAPSHOT_INVALID');

  const unexpectedRoots = Object.keys(source).filter((key) => !EXPECTED_ROOTS.includes(key)).sort();
  const roots = {};
  const blockers = [];
  const collisions = [];

  for (const root of EXPECTED_ROOTS) {
    const value = source[root] || {};
    roots[root] = {
      count: entries(value).length,
      checksum: checksum(value),
      disposition: DISPOSITIONS[root],
    };
  }

  const suppliers = source.proveedores || {};
  const products = source.productos || {};
  const targetSuppliers = target.suppliers || {};
  const targetProducts = target.products || {};
  const targetOrders = target.purchaseOrders || {};

  for (const [id] of entries(suppliers)) {
    if (Object.prototype.hasOwnProperty.call(targetSuppliers, id)) collisions.push({ root: 'proveedores', sourceKey: id, code: 'SOURCE_KEY_COLLISION' });
  }
  for (const [id] of entries(products)) {
    if (Object.prototype.hasOwnProperty.call(targetProducts, id)) collisions.push({ root: 'productos', sourceKey: id, code: 'SOURCE_KEY_COLLISION' });
  }

  const orderSimulation = entries(source.ordenes || {}).map(([id, order]) => {
    const recordBlockers = [];
    const supplierId = order && (order.proveedorId || order.supplierId);
    if (!supplierId || !Object.prototype.hasOwnProperty.call(suppliers, supplierId)) recordBlockers.push('MISSING_SUPPLIER_REFERENCE');
    if (!order || order.status == null) recordBlockers.push('MISSING_STATUS');
    if (!order || typeof order.total !== 'number' || !Number.isFinite(order.total)) recordBlockers.push('MISSING_OR_INVALID_TOTAL');
    const timestamp = order && (order.createdAt ?? order.fecha);
    if (timestamp == null || Number.isNaN(new Date(timestamp).getTime())) recordBlockers.push('MISSING_OR_INVALID_TIMESTAMP');

    const items = Array.isArray(order && order.items) ? order.items : Array.isArray(order && order.productos) ? order.productos : [];
    items.forEach((item, index) => {
      const ref = productRef(item);
      if (!ref || !Object.prototype.hasOwnProperty.call(products, ref)) recordBlockers.push(`ITEM_${index}_MISSING_PRODUCT_REFERENCE`);
      if (typeof item.quantity !== 'number' && typeof item.cantidad !== 'number') recordBlockers.push(`ITEM_${index}_MISSING_OR_INVALID_QUANTITY`);
      if (typeof item.price !== 'number' && typeof item.precio !== 'number') recordBlockers.push(`ITEM_${index}_MISSING_OR_INVALID_PRICE`);
    });

    const keyCollision = Object.prototype.hasOwnProperty.call(targetOrders, id);
    if (keyCollision) {
      collisions.push({ root: 'ordenes', sourceKey: id, code: 'SOURCE_KEY_COLLISION' });
      recordBlockers.push('REKEY_WITH_MAPPING_TABLE_REQUIRED');
    }
    recordBlockers.forEach((code) => blockers.push({ root: 'ordenes', sourceKey: id, code }));
    return { sourceKey: id, targetRoot: 'purchaseOrders', disposition: 'TRANSFORM', keyStrategy: keyCollision ? 'REKEY_WITH_MAPPING_TABLE_REQUIRED' : 'PRESERVE_SOURCE_KEY', blockers: [...new Set(recordBlockers)].sort() };
  });

  unexpectedRoots.forEach((root) => blockers.push({ root, code: 'UNEXPECTED_ROOT' }));

  const report = {
    schemaVersion: 1,
    mode: 'DRY_RUN',
    writeCapability: 'DISABLED',
    roots,
    unexpectedRoots,
    collisions: collisions.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    blockers: blockers.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    orderSimulation: orderSimulation.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)),
  };
  report.reportChecksum = checksum(report);
  return report;
}

function summary(report) {
  const counts = EXPECTED_ROOTS.map((root) => `${root}=${report.roots[root].count}`).join(', ');
  return [
    'NRD Firebase migration analyzer — DRY RUN ONLY',
    `Roots: ${counts}`,
    `Unexpected roots: ${report.unexpectedRoots.length}`,
    `Collisions: ${report.collisions.length}`,
    `Blockers: ${report.blockers.length}`,
    `Checksum: ${report.reportChecksum}`,
    'No Firebase/Auth/rules/deploy write path exists in this tool.',
  ].join('\n');
}

if (require.main === module) {
  const sourcePath = process.argv[2];
  const targetPath = process.argv[3];
  if (!sourcePath) {
    console.error('Usage: node scripts/firebase-migration-dry-run.js <source-snapshot.json> [target-snapshot.json]');
    process.exit(2);
  }
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const target = targetPath ? JSON.parse(fs.readFileSync(targetPath, 'utf8')) : {};
  const report = analyze(source, target);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(summary(report) + '\n');
  if (report.blockers.length) process.exitCode = 3;
}

module.exports = { analyze, checksum, summary };
