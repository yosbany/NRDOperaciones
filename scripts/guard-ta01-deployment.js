#!/usr/bin/env node

const INVARIANT = 'DO_NOT_DEPLOY_CURRENT_NRD_OPERACIONES_WORKSPACE_BEFORE_TA01_CUTOVER';

function assertDeploymentAllowed() {
  const error = new Error(
    `${INVARIANT}: deployment is intentionally blocked until TA-01 cutover is explicitly completed through the governed change process.`
  );
  error.code = 'TA01_DEPLOYMENT_BLOCKED';
  throw error;
}

if (require.main === module) {
  try {
    assertDeploymentAllowed();
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  INVARIANT,
  assertDeploymentAllowed,
};
