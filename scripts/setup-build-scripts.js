/**
 * This script adds build scripts to package.json for different environments
 */
const fs = require('fs');
const path = require('path');
const { logger } = require('../src/lib/logger');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add build scripts if they don't exist
if (!packageJson.scripts['build:dev']) {
  packageJson.scripts['build:dev'] = 'vite build --mode development';
  logger.debug('Added build:dev script to package.json');
}

if (!packageJson.scripts['build:prod']) {
  packageJson.scripts['build:prod'] = 'vite build --mode production';
  logger.debug('Added build:prod script to package.json');
}

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

logger.info('Build scripts added to package.json');
logger.info('You can now run:');
logger.info('  npm run build:dev   - Build for development');
logger.info('  npm run build:prod  - Build for production');
