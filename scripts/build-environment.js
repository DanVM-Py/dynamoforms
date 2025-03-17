
/**
 * Environment-specific build script
 * 
 * This script handles building the application for different environments
 * without needing to modify package.json directly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get target environment from command line argument
const getTargetEnv = () => {
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='));
  if (envArg) {
    return envArg.split('=')[1];
  }
  return 'development'; // Default to development
};

// Main build function
const buildForEnvironment = () => {
  const targetEnv = getTargetEnv();
  
  if (!['development', 'qa', 'production'].includes(targetEnv)) {
    console.error(`❌ Invalid environment: ${targetEnv}`);
    console.error('Valid environments are: development, qa, production');
    process.exit(1);
  }
  
  console.log(`🔨 Building for ${targetEnv} environment...`);
  
  try {
    // Run environment-specific build command
    const buildCmd = `vite build --mode ${targetEnv}`;
    console.log(`📦 Running build command: ${buildCmd}`);
    
    // Set environment variable for the child process
    process.env.MODE = targetEnv;
    
    execSync(buildCmd, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Generate build info
    console.log('📝 Generating build info...');
    execSync(`node scripts/generate-build-info.js --env=${targetEnv}`, {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log(`✅ Build completed for ${targetEnv} environment`);
    console.log(`📁 Output directory: dist/${targetEnv}`);
    
    if (targetEnv === 'production') {
      console.log('\n🚀 DEPLOYMENT INSTRUCTIONS:');
      console.log('1. Use the files in dist/production for production deployment');
      console.log('2. Ensure the correct environment variables are set');
      console.log('3. Update your deployment platform to use this specific build folder\n');
    }
    
  } catch (error) {
    console.error(`❌ Build failed for ${targetEnv} environment:`, error.message);
    process.exit(1);
  }
};

// Execute the build
buildForEnvironment();
