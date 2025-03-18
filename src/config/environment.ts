
/**
 * Environment Configuration
 * 
 * This module manages environment-specific configuration settings and provides
 * a consistent way to access environment information throughout the application.
 */

// Define all possible environment types
export type Environment = 'development' | 'production';

// Helper to determine the current environment
export const getCurrentEnvironment = (): Environment => {
  // In production deployment, Lovable sets the environment
  if (window.location.hostname.includes('lovable.app') || 
      window.location.hostname.includes('app.') ||
      !window.location.hostname.includes('localhost')) {
    return 'production';
  }
  
  // Development environment (localhost)
  return 'development';
};

// Configuration interface
interface EnvironmentConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
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

// Get current environment
export const environment = getCurrentEnvironment();

// Export the configuration for the current environment
export const config = configurations[environment];

// Check if we're in a production environment
export const isProduction = environment === 'production';

// Check if we're in a development environment
export const isDevelopment = environment === 'development';

// Helper to determine if debugging is enabled
export const isDebuggingEnabled = config.featureFlags.debuggingEnabled;

// Helper to get the environment name for display purposes
export const getEnvironmentName = (): string => {
  return environment === 'development' ? 'Development' : 'Production';
};
