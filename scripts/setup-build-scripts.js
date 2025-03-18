
/**
 * This script adds build scripts to package.json for different environments
 */
const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add build scripts if they don't exist
if (!packageJson.scripts['build:dev']) {
  packageJson.scripts['build:dev'] = 'vite build --mode development';
}

if (!packageJson.scripts['build:prod']) {
  packageJson.scripts['build:prod'] = 'vite build --mode production';
}

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Build scripts added to package.json');
console.log('You can now run:');
console.log('  npm run build:dev   - Build for development');
console.log('  npm run build:prod  - Build for production');
