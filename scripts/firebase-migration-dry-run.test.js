'use strict';

const assert = require('assert');
const { analyze } = require('./firebase-migration-dry-run');

const base = {
  users: { u1: { email: 'redacted@example.test' } },
  proveedores: { s1: { nombre: 'Supplier' } },
  productos: { p1: { nombre: 'Product', precio: 10 } },
  ordenes: {
    o1: {
      proveedorId: 's1', status: 'pending', total: 20, createdAt: '2026-09-15T10:00:00-03:00',
      items: [{ productoId: 'p1', quantity: 2, price: 10 }],
    },
  },
  recetasCosto: { p1: { costo: 5 } },
};

const valid = analyze(base);
assert.equal(valid.mode, 'DRY_RUN');
assert.equal(valid.writeCapability, 'DISABLED');
assert.equal(valid.roots.recetasCosto.disposition, 'HOLD');
assert.equal(valid.orderSimulation[0].keyStrategy, 'PRESERVE_SOURCE_KEY');
assert.deepEqual(valid.blockers, []);
assert.equal(analyze(base).reportChecksum, valid.reportChecksum, 'repeated dry-run must be deterministic');

const missingRef = JSON.parse(JSON.stringify(base));
missingRef.ordenes.o1.proveedorId = 'missing';
missingRef.ordenes.o1.items[0].productoId = 'missing';
const refReport = analyze(missingRef);
assert(refReport.blockers.some((b) => b.code === 'MISSING_SUPPLIER_REFERENCE'));
assert(refReport.blockers.some((b) => b.code.includes('MISSING_PRODUCT_REFERENCE')));

const missingFields = JSON.parse(JSON.stringify(base));
delete missingFields.ordenes.o1.status;
delete missingFields.ordenes.o1.total;
delete missingFields.ordenes.o1.items[0].price;
const fieldsReport = analyze(missingFields);
assert(fieldsReport.blockers.some((b) => b.code === 'MISSING_STATUS'));
assert(fieldsReport.blockers.some((b) => b.code === 'MISSING_OR_INVALID_TOTAL'));
assert(fieldsReport.blockers.some((b) => b.code.includes('MISSING_OR_INVALID_PRICE')));

const collision = analyze(base, { purchaseOrders: { o1: {} } });
assert.equal(collision.orderSimulation[0].keyStrategy, 'REKEY_WITH_MAPPING_TABLE_REQUIRED');
assert(collision.blockers.some((b) => b.code === 'REKEY_WITH_MAPPING_TABLE_REQUIRED'));

const unexpected = analyze({ ...base, mystery: { x: 1 } });
assert.deepEqual(unexpected.unexpectedRoots, ['mystery']);
assert(unexpected.blockers.some((b) => b.code === 'UNEXPECTED_ROOT'));

// Static safety assertion: analyzer API exposes analysis only, no write/import function.
const analyzer = require('./firebase-migration-dry-run');
assert.deepEqual(Object.keys(analyzer).sort(), ['analyze', 'checksum', 'summary']);

console.log('firebase-migration-dry-run tests: PASS');
