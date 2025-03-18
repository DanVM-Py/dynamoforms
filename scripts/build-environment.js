
/**
 * Environment-specific build script
 * 
 * This script handles building the application for different environments
 * without needing to modify package.json directly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const deployConfig = require('../deployment.config');

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
  
  // Check if environment is configured
  const envConfig = deployConfig.environments[targetEnv];
  if (!envConfig) {
    console.error(`❌ Environment ${targetEnv} not properly configured in deployment.config.js`);
    process.exit(1);
  }
  
  console.log(`\n🔨 Building for ${targetEnv.toUpperCase()} environment...\n`);
  console.log(`🔍 Environment configuration:`);
  console.log(`   - Supabase Project: ${envConfig.supabaseProjectId || 'Not specified'}`);
  console.log(`   - URL: ${envConfig.url || 'Not specified'}`);
  console.log(`   - Build Command: ${envConfig.buildCommand || 'vite build'}`);
  console.log(`\n`);
  
  try {
    // Create .env.local with environment variables
    createEnvFile(targetEnv, envConfig);
    
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
    
    // Copy build artifacts to their respective folders
    if (targetEnv !== 'development') {
      // Copy all build artifacts to the environment-specific directory
      console.log(`📂 Copying build artifacts to dist/${targetEnv}...`);
      
      // For non-development builds, Vite creates the output in dist/
      // We need to copy these files to dist/{environment}/
      const distContentDir = path.resolve(distDir);
      const files = fs.readdirSync(distContentDir);
      
      files.forEach(file => {
        if (file !== targetEnv && !file.includes('build-info')) {
          const srcPath = path.join(distContentDir, file);
          const destPath = path.join(envDistDir, file);
          
          if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
          
          // Log only directories or important files
          if (fs.statSync(srcPath).isDirectory() || file.endsWith('.html') || file.endsWith('.js')) {
            console.log(`   - Copied: ${file}`);
          }
        }
      });
    }
    
    // Copy index.html with environment injection
    injectEnvironmentIntoHTML(targetEnv, envDistDir);
    
    console.log(`\n✅ Build completed for ${targetEnv.toUpperCase()} environment`);
    console.log(`📁 Output directory: dist/${targetEnv}`);
    
    if (targetEnv === 'production') {
      console.log(`\n🚀 DEPLOYMENT INSTRUCTIONS:`);
      console.log(`1. Upload ALL files from dist/production to your hosting service`);
      console.log(`2. Make sure to include build-info.json in the deployment`);
      console.log(`3. The application should now show the Production environment badge`);
    }
    
  } catch (error) {
    console.error(`\n❌ Build failed for ${targetEnv} environment:`, error.message);
    console.error(error);
    process.exit(1);
  }
};

// Helper function to create temporary .env.local file
const createEnvFile = (environment, config) => {
  const envContent = `
# Auto-generated environment file for ${environment}
VITE_ENVIRONMENT=${environment}
VITE_SUPABASE_URL=${config.supabaseProjectId ? `https://${config.supabaseProjectId}.supabase.co` : ''}
VITE_APP_URL=${config.url || ''}
`;

  const envFilePath = path.resolve(__dirname, '..', '.env.local');
  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ Created temporary .env.local for ${environment}`);
};

// Helper function to copy directory recursively
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Inject environment information into the HTML
const injectEnvironmentIntoHTML = (environment, destDir) => {
  const indexPath = path.join(destDir, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.warn(`Warning: index.html not found at ${indexPath}`);
    return;
  }
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Add environment information to the HTML
  html = html.replace('</head>', `
  <script>
    window.ENV = "${environment}";
    console.log("Application running in ${environment} environment");
  </script>
</head>`);
  
  fs.writeFileSync(indexPath, html);
  console.log(`✅ Injected environment information into index.html`);
};

// Execute the build
buildForEnvironment();
