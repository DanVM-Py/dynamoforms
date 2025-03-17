
/**
 * Pre-deployment Verification Script
 * 
 * This script verifies that the correct environment is being deployed
 * based on the branch and target environment.
 */

const { execSync } = require('child_process');
const deployConfig = require('../deployment.config');

// Get current branch
const getCurrentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.error('Failed to get current branch:', error);
    return 'unknown';
  }
};

// Get target environment from arguments
const getTargetEnv = () => {
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='));
  if (envArg) {
    return envArg.split('=')[1];
  }
  return null;
};

// Main verification logic
const verifyDeployment = () => {
  const branch = getCurrentBranch();
  const targetEnv = getTargetEnv();
  
  console.log(`Current branch: ${branch}`);
  console.log(`Target environment: ${targetEnv || 'not specified'}`);
  
  // Get expected environment for this branch
  const expectedEnv = deployConfig.pipeline.branchStrategy[branch] || 'development';
  
  // If target env is specified but doesn't match expected env
  if (targetEnv && targetEnv !== expectedEnv) {
    console.warn(`⚠️ WARNING: Deploying branch '${branch}' to '${targetEnv}' environment!`);
    console.warn(`The recommended environment for this branch is '${expectedEnv}'.`);
    
    // For production deployments, add extra warning
    if (targetEnv === 'production' && branch !== 'main') {
      console.error(`🚨 CRITICAL: Deploying a non-main branch to production!`);
      console.error(`This is not recommended. Please consider merging to main first.`);
      process.exit(1);
    }
  } else {
    console.log(`✅ Deployment verification passed. Deploying branch '${branch}' to '${targetEnv || expectedEnv}'.`);
  }
};

verifyDeployment();
