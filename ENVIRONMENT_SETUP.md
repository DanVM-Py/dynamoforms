
# Dynamo System - Environment Setup

This document outlines how to set up and manage the different environments for the Dynamo System.

## Environments

The Dynamo System uses three separate environments:

1. **Development (DEV)**
   - Used for active development and initial testing
   - Database: Development Supabase Project
   - URL: https://dev.yourapp.com

2. **Quality Assurance (QA)**
   - Used for testing before production deployment
   - Database: QA Supabase Project
   - URL: https://qa.yourapp.com

3. **Production (PROD)**
   - Live environment used by end users
   - Database: Production Supabase Project
   - URL: https://app.yourapp.com

## Environment Setup Instructions

### Step 1: Create Supabase Projects

For each environment, you need a separate Supabase project:

1. Go to [Supabase Dashboard](https://app.supabase.io/)
2. Create a new project for each environment (DEV, QA, PROD)
3. Note down the project URLs and anon keys

### Step 2: Update Configuration

Update the environment configuration in `src/config/environment.ts` with the appropriate Supabase URLs and keys for each environment.

### Step 3: Database Migration

For each new Supabase project:

1. Export the schema from the existing project:
   ```
   supabase db dump -f schema.sql --db-url <EXISTING_DB_URL>
   ```

2. Import the schema to the new project:
   ```
   supabase db push --db-url <NEW_DB_URL> -f schema.sql
   ```

### Step 4: Configure Build Scripts

To build for different environments:

```bash
# Development build
npm run build:dev

# QA build
npm run build:qa

# Production build
npm run build:prod
```

## Deployment Workflow

The recommended deployment workflow is:

1. Develop locally
2. Deploy to DEV environment
3. Test thoroughly in DEV
4. Deploy to QA environment
5. Conduct QA testing and user acceptance testing
6. Deploy to PROD environment

## Environment Indicators

When working in non-production environments, a colored indicator will appear in the bottom-right corner of the application:

- Blue: Development Environment
- Yellow: QA Environment

This indicator is automatically hidden in production.

## Notes

- Each environment uses a separate storage key for authentication to avoid conflicts
- Feature flags can be configured per environment in the `src/config/environment.ts` file
- Debug tools are automatically disabled in production

