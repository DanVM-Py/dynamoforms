
/**
 * Check Deployed Version
 * 
 * This script checks the currently deployed version on different environments
 * by fetching their build-info.json files.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const deployConfig = require('../deployment.config');

const environments = ['development', 'qa', 'production'];

const fetchBuildInfo = (url) => {
  return new Promise((resolve, reject) => {
    const requester = url.startsWith('https') ? https : http;
    
    console.log(`Fetching from ${url}...`);
    
    const req = requester.get(url, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirects
        console.log(`Redirected to ${res.headers.location}`);
        fetchBuildInfo(res.headers.location)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`HTTP Error: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
};

const checkDeployedVersions = async () => {
  console.log('\n📋 Checking deployed versions in all environments...\n');
  
  for (const env of environments) {
    const config = deployConfig.environments[env];
    if (!config || !config.url) {
      console.log(`⚠️ Environment ${env} has no URL configured in deployment.config.js`);
      continue;
    }
    
    const buildInfoUrl = `${config.url}/build-info.json`;
    
    try {
      console.log(`\n🔍 Checking ${env.toUpperCase()} environment:`);
      console.log(`URL: ${config.url}`);
      
      const buildInfo = await fetchBuildInfo(buildInfoUrl);
      
      console.log(`\n✅ ${env.toUpperCase()} build information:`);
      console.log(`• Environment: ${buildInfo.environment}`);
      console.log(`• Build Date: ${new Date(buildInfo.timestamp).toLocaleString()}`);
      console.log(`• Git Commit: ${buildInfo.gitCommit}`);
      
      if (buildInfo.gitBranch) {
        console.log(`• Git Branch: ${buildInfo.gitBranch}`);
      }
      
      if (buildInfo.environment !== env) {
        console.log(`\n⚠️ WARNING: Deployed build is for ${buildInfo.environment} environment, but URL is for ${env} environment!`);
      }
      
    } catch (error) {
      console.error(`\n❌ Error checking ${env} environment:`, error.message);
    }
  }
  
  console.log('\n✨ Check complete. Use this information to verify your deployments are correct.');
};

// Get local build info for comparison
const getLocalBuildInfo = () => {
  try {
    const localBuildInfoPath = path.join(__dirname, '..', 'build-info.json');
    if (fs.existsSync(localBuildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(localBuildInfoPath, 'utf8'));
      console.log('\n📄 Local build information:');
      console.log(`• Environment: ${buildInfo.environment}`);
      console.log(`• Build Date: ${new Date(buildInfo.timestamp).toLocaleString()}`);
      console.log(`• Git Commit: ${buildInfo.gitCommit}`);
      if (buildInfo.gitBranch) {
        console.log(`• Git Branch: ${buildInfo.gitBranch}`);
      }
    } else {
      console.log('\n⚠️ No local build-info.json found. Run a build first.');
    }
  } catch (error) {
    console.error('\n❌ Error reading local build info:', error.message);
  }
};

// Execute the check
getLocalBuildInfo();
checkDeployedVersions();
