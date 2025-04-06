/**
 * Environment Configuration
 * 
 * This module manages environment-specific configuration settings and provides
 * a consistent way to access environment information throughout the application.
 */

// Define window.ENV para TypeScript
declare global {
  interface Window {
    ENV?: string;
  }
}

// Define all possible environment types
export type Environment = 'development' | 'production';

// Helper to determine the current environment
export const getCurrentEnvironment = (): Environment => {
  // Check for explicit environment configuration
  const explicitEnv = window.ENV as Environment | undefined;
  if (explicitEnv && ['development', 'production'].includes(explicitEnv)) {
    console.log(`Using explicit environment: ${explicitEnv}`);
    return explicitEnv as Environment;
  }
  
  // Check if we're in a production build
  const isProduction = 
    // Detect Lovable deployment
    window.location.hostname.includes('lovable.app') || 
    window.location.hostname.includes('app.') ||
    // Detect any non-localhost environment
    (!window.location.hostname.includes('localhost') && 
     !window.location.hostname.includes('127.0.0.1'));
  
  return isProduction ? 'production' : 'development';
};

// Define the structure for environment-specific settings
interface EnvironmentConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string; // Add the service role key property
  tablePrefix: string; // Prefijo para las tablas según el entorno
  featureFlags: {
    debuggingEnabled: boolean;
    notificationsEnabled: boolean;
    aiAutomationEnabled: boolean;
  };
  storage: {
    authTokenKey: string;
  };
}

// Environment-specific configurations
const configurations: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: "https://dgnjoqgfccxdlteiptfv.supabase.co",
    supabaseUrl: "https://dgnjoqgfccxdlteiptfv.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpvcWdmY2N4ZGx0ZWlwdGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5OTQxNDMsImV4cCI6MjA1NzU3MDE0M30.WaKEJL_VuJL9osWDEIc5NUUWekD-90Hbavya5S_5uIg",
    supabaseServiceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'fallback_prod_key_if_needed',
    tablePrefix: "dev_", // Prefijo para tablas de desarrollo
    featureFlags: {
      debuggingEnabled: true,
      notificationsEnabled: true,
      aiAutomationEnabled: true
    },
    storage: {
      authTokenKey: 'dynamo-app-auth-token-dev'
    }
  },
  production: {
    apiUrl: "https://dgnjoqgfccxdlteiptfv.supabase.co",
    supabaseUrl: "https://dgnjoqgfccxdlteiptfv.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpvcWdmY2N4ZGx0ZWlwdGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5OTQxNDMsImV4cCI6MjA1NzU3MDE0M30.WaKEJL_VuJL9osWDEIc5NUUWekD-90Hbavya5S_5uIg",
    supabaseServiceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'fallback_prod_key_if_needed',
    tablePrefix: "",
    featureFlags: {
      debuggingEnabled: false,
      notificationsEnabled: true,
      aiAutomationEnabled: true
    },
    storage: {
      authTokenKey: 'dynamo-app-auth-token-v3'
    }
  }
};

// Determine the current environment
export const environment = getCurrentEnvironment();

// Export the configuration object for the current environment (SINGLE DECLARATION)
export const config = configurations[environment];

// Check if we're in a production environment
export const isProduction = environment === 'production';

// Check if we're in a development environment
export const isDevelopment = environment === 'development';

// Helper to determine if debugging is enabled
export const isDebuggingEnabled = config.featureFlags.debuggingEnabled;

// Helper to get the environment name for display purposes
export const getEnvironmentName = (): string => {
  return environment === 'development' ? 'Desarrollo' : 'Producción';
};

// Tipo para las tablas permitidas en Supabase
export type TableName = 
  | 'form_responses'
  | 'forms'
  | 'profiles'
  | 'projects'
  | 'form_roles'
  | 'roles'
  | 'notifications'
  | 'project_users'
  | 'tasks'
  | 'task_templates'
  | 'user_roles';

// Define and export table names AFTER config is defined
export const Tables = {
  form_responses: `${config.tablePrefix}form_responses` as 'form_responses',
  forms: `${config.tablePrefix}forms` as 'forms',
  profiles: `${config.tablePrefix}profiles` as 'profiles',
  projects: `${config.tablePrefix}projects` as 'projects',
  form_roles: `${config.tablePrefix}form_roles` as 'form_roles',
  roles: `${config.tablePrefix}roles` as 'roles',
  notifications: `${config.tablePrefix}notifications` as 'notifications',
  project_users: `${config.tablePrefix}project_users` as 'project_users',
  tasks: `${config.tablePrefix}tasks` as 'tasks',
  task_templates: `${config.tablePrefix}task_templates` as 'task_templates',
  user_roles: `${config.tablePrefix}user_roles` as 'user_roles',
};
