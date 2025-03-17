
/**
 * Build Info Generator
 * 
 * This script creates a build-info.json file in the build output directory
 * to track which environment was used for the build and when it was created.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get target environment from command line argument or environment variable
const getTargetEnv = () => {
  // Check command line arguments
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='));
  if (envArg) {
    return envArg.split('=')[1];
  }
  
  // Check environment variable
  if (process.env.MODE) {
    return process.env.MODE;
  }
  
  // Fallback to default
  return 'development';
};

// Generate a unique build ID
const generateBuildId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Try to get git information
const getGitInfo = () => {
  try {
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return { gitCommit, gitBranch };
  } catch (error) {
    console.warn('Warning: Unable to get git information', error.message);
    return { gitCommit: 'unknown', gitBranch: 'unknown' };
  }
};

// Main function to generate build info
const generateBuildInfo = () => {
  const environment = getTargetEnv();
  const buildId = generateBuildId();
  const timestamp = new Date().toISOString();
  const { gitCommit, gitBranch } = getGitInfo();
  
  console.log(`Generating build info for ${environment} environment`);
  
  const buildInfo = {
    environment,
    buildId,
    timestamp,
    nodeName: process.env.NODE_NAME || 'local',
    buildNumber: process.env.BUILD_NUMBER || '0',
    gitCommit,
    gitBranch
  };
  
  // Determine the output directory
  const outputDir = path.resolve(__dirname, '..', 'dist', environment);
  
  // Ensure the directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the build info file
  const buildInfoPath = path.join(outputDir, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  
  console.log(`Build info written to ${buildInfoPath}`);
  
  // Also copy to the public directory for development
  if (environment === 'development') {
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicBuildInfoPath = path.join(publicDir, 'build-info.json');
    fs.writeFileSync(publicBuildInfoPath, JSON.stringify(buildInfo, null, 2));
    console.log(`Development build info copy written to ${publicBuildInfoPath}`);
  }
  
  // Also write a copy to the root of the dist directory for easier access
  const rootDistDir = path.join(outputDir, '..');
  if (!fs.existsSync(rootDistDir)) {
    fs.mkdirSync(rootDistDir, { recursive: true });
  }
  
  const rootBuildInfoPath = path.join(rootDistDir, 'build-info.json');
  fs.writeFileSync(rootBuildInfoPath, JSON.stringify(buildInfo, null, 2));
  
  console.log(`Additional build info copy written to ${rootBuildInfoPath}`);
};

// Run the generator
generateBuildInfo();
