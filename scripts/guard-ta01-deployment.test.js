#!/usr/bin/env node

const assert = require('assert');
const {
  INVARIANT,
  assertDeploymentAllowed,
} = require('./guard-ta01-deployment');

assert.throws(
  () => assertDeploymentAllowed(),
  (error) =>
    error.code === 'TA01_DEPLOYMENT_BLOCKED' &&
    error.message.includes(INVARIANT),
  'deployment guard must fail closed with the TA-01 invariant'
);

console.log('PASS: TA-01 deployment guard fails closed');
