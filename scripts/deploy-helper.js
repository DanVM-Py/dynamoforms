
/**
 * Deployment Helper Script
 * 
 * This script helps verify and prepare the correct build artifacts for deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const deployConfig = require('../deployment.config');

// Get target environment from command line argument
const getTargetEnv = () => {
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='));
  if (envArg) {
    return envArg.split('=')[1];
  }
  return null; // No default, must be specified
};

// Check if build exists and is up to date
const verifyBuild = (environment) => {
  const buildDir = path.join(__dirname, '..', 'dist', environment);
  const buildInfoPath = path.join(buildDir, 'build-info.json');
  
  if (!fs.existsSync(buildDir)) {
    console.error(`❌ No build found for ${environment} environment`);
    console.error(`Run 'node scripts/build-environment.js --env=${environment}' to create it`);
    return false;
  }
  
  if (!fs.existsSync(buildInfoPath)) {
    console.warn(`⚠️ Build exists but no build-info.json found for ${environment} environment`);
    console.warn('This may be an old or invalid build');
    return false;
  }
  
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
  console.log(`📋 Build information for ${environment}:`);
  console.log(`   - Created: ${buildInfo.timestamp}`);
  console.log(`   - Environment: ${buildInfo.environment}`);
  console.log(`   - Supabase Project: ${buildInfo.config.supabaseProjectId}`);
  
  return true;
};

// Helper to prepare deployment
const prepareDeployment = () => {
  const targetEnv = getTargetEnv();
  
  if (!targetEnv) {
    console.error('❌ No environment specified');
    console.error('Usage: node scripts/deploy-helper.js --env=<environment>');
    console.error('Valid environments: development, qa, production');
    process.exit(1);
  }
  
  if (!['development', 'qa', 'production'].includes(targetEnv)) {
    console.error(`❌ Invalid environment: ${targetEnv}`);
    console.error('Valid environments are: development, qa, production');
    process.exit(1);
  }
  
  console.log(`🚀 Preparing deployment for ${targetEnv} environment...`);
  
  // Verify the build exists and is valid
  const isBuildValid = verifyBuild(targetEnv);
  
  if (!isBuildValid) {
    const createBuild = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    createBuild.question(`Would you like to create a new build for ${targetEnv}? (y/n) `, (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log(`Creating new build for ${targetEnv}...`);
        execSync(`node scripts/build-environment.js --env=${targetEnv}`, { stdio: 'inherit' });
        console.log('Build created successfully');
      } else {
        console.log('Deployment preparation canceled');
        process.exit(1);
      }
      createBuild.close();
    });
  } else {
    console.log(`✅ Valid build found for ${targetEnv} environment`);
    console.log('\n🚀 DEPLOYMENT STEPS:');
    console.log(`1. Deploy the contents of dist/${targetEnv} to your hosting service`);
    console.log(`2. Ensure environment variables are set correctly for ${targetEnv}`);
    console.log('3. Verify deployment by checking the environment indicator in the UI');
  }
};

// Run the script
prepareDeployment();
