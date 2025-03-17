
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
    
    // Ensure the dist directory exists
    const distDir = path.resolve(__dirname, '..', 'dist');
    const envDistDir = path.resolve(distDir, targetEnv);
    
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    if (!fs.existsSync(envDistDir)) {
      fs.mkdirSync(envDistDir, { recursive: true });
    }
    
    // Generate build info
    console.log('📝 Generating build info...');
    const generateBuildInfoScript = path.resolve(__dirname, 'generate-build-info.js');
    
    execSync(`node ${generateBuildInfoScript} --env=${targetEnv}`, {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Copy build-info.json to the root directory for easier access
    const buildInfoSource = path.join(envDistDir, 'build-info.json');
    const buildInfoDest = path.join(distDir, `build-info-${targetEnv}.json`);
    const buildInfoRoot = path.join(distDir, 'build-info.json');
    
    if (fs.existsSync(buildInfoSource)) {
      fs.copyFileSync(buildInfoSource, buildInfoDest);
      fs.copyFileSync(buildInfoSource, buildInfoRoot);
      console.log(`✅ Build info generated at: ${buildInfoSource}`);
      console.log(`✅ Build info copied to: ${buildInfoDest}`);
      console.log(`✅ Build info copied to: ${buildInfoRoot}`);
    } else {
      console.error(`❌ Build info not generated at: ${buildInfoSource}`);
    }
    
    console.log(`✅ Build completed for ${targetEnv} environment`);
    console.log(`📁 Output directory: dist/${targetEnv}`);
    
    if (targetEnv === 'production') {
      console.log('\n🚀 DEPLOYMENT INSTRUCTIONS:');
      console.log('1. Use the files in dist/production for production deployment');
      console.log('2. Ensure build-info.json is included in the deployment');
      console.log('3. Update your deployment platform to use this specific build folder\n');
    }
    
  } catch (error) {
    console.error(`❌ Build failed for ${targetEnv} environment:`, error.message);
    process.exit(1);
  }
};

// Execute the build
buildForEnvironment();
