
/**
 * Deployment Configuration
 * 
 * This file contains configuration for deploying to different environments.
 * It's used by the CI/CD pipeline to determine which environment to deploy to.
 */

module.exports = {
  environments: {
    development: {
      supabaseProjectId: 'dgnjoqgfccxdlteiptfv', // Development Supabase project
      url: 'https://dev.yourapp.com', // Development URL
      buildCommand: 'npm run build:dev',
      description: 'Development environment for testing new features',
      services: {
        apiGateway: 'https://dev-api-gateway.yourapp.com',
        auth: 'https://dev-auth-service.yourapp.com',
        projects: 'https://dev-projects-service.yourapp.com',
        forms: 'https://dev-forms-service.yourapp.com',
        tasks: 'https://dev-tasks-service.yourapp.com',
        notifications: 'https://dev-notifications-service.yourapp.com'
      }
    },
    qa: {
      supabaseProjectId: '', // To be filled with QA Supabase project ID
      url: 'https://qa.yourapp.com', // QA URL
      buildCommand: 'npm run build:qa',
      description: 'Quality Assurance environment for testing before production',
      services: {
        apiGateway: 'https://qa-api-gateway.yourapp.com',
        auth: 'https://qa-auth-service.yourapp.com',
        projects: 'https://qa-projects-service.yourapp.com',
        forms: 'https://qa-forms-service.yourapp.com',
        tasks: 'https://qa-tasks-service.yourapp.com',
        notifications: 'https://qa-notifications-service.yourapp.com'
      }
    },
    production: {
      supabaseProjectId: 'dgnjoqgfccxdlteiptfv', // Production Supabase project
      url: 'https://app.yourapp.com', // Production URL
      buildCommand: 'npm run build:prod',
      description: 'Production environment for end users',
      services: {
        apiGateway: 'https://api-gateway.yourapp.com',
        auth: 'https://auth-service.yourapp.com',
        projects: 'https://projects-service.yourapp.com',
        forms: 'https://forms-service.yourapp.com',
        tasks: 'https://tasks-service.yourapp.com',
        notifications: 'https://notifications-service.yourapp.com'
      }
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
    },
    microservices: {
      apiGateway: {
        repository: 'api-gateway',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3000
      },
      auth: {
        repository: 'auth-service',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3001
      },
      projects: {
        repository: 'projects-service',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3002
      },
      forms: {
        repository: 'forms-service',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3003
      },
      tasks: {
        repository: 'tasks-service',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3004
      },
      notifications: {
        repository: 'notifications-service',
        buildCommand: 'npm run build',
        testCommand: 'npm run test',
        containerPort: 3005
      }
    }
  }
};
