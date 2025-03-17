
/**
 * Deployment Configuration
 * 
 * This file contains configuration for deploying to different environments.
 * It's used by the CI/CD pipeline to determine which environment to deploy to.
 */

module.exports = {
  environments: {
    development: {
      supabaseProjectId: 'dgnjoqgfccxdlteiptfv', // Current project being used as development
      url: 'https://dev.yourapp.com', // Replace with your actual dev URL
      buildCommand: 'npm run build:dev',
      description: 'Development environment for testing new features',
    },
    qa: {
      supabaseProjectId: '', // To be filled with QA Supabase project ID
      url: 'https://qa.yourapp.com', // Replace with your actual QA URL
      buildCommand: 'npm run build:qa',
      description: 'Quality Assurance environment for testing before production',
    },
    production: {
      supabaseProjectId: 'dgnjoqgfccxdlteiptfv', // Current production project
      url: 'https://app.yourapp.com', // Replace with your actual production URL
      buildCommand: 'npm run build:prod',
      description: 'Production environment for end users',
    }
  },
  
  // Deployment pipeline configuration
  pipeline: {
    developmentFlow: 'Local → Dev → QA → Production',
    branchStrategy: {
      main: 'production',
      qa: 'qa',
      develop: 'development',
      feature: 'development'
    }
  }
};
