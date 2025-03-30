
// This file provides a single source of truth for Supabase clients
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config } from '@/config/environment';

// Define service constants for microservice identification
export enum SERVICES {
  AUTH = 'auth_service',
  PROJECTS = 'projects_service',
  FORMS = 'forms_service',
  TASKS = 'tasks_service',
  NOTIFICATIONS = 'notifications_service'
}

// Define standard client options
const getClientOptions = (customHeaders = {}): SupabaseClientOptions<"public"> => ({
  auth: {
    storageKey: config.storage.authTokenKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: customHeaders,
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: options?.signal || AbortSignal.timeout(60000)
      });
    }
  },
  db: {
    schema: "public"
  }
});

// Primary Supabase client for authenticated operations
const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  getClientOptions()
);

// Admin client for operations requiring admin privileges
export const supabaseAdmin = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  getClientOptions({
    'X-Client-Info': 'admin-client',
    'X-Admin-Access': 'true'
  })
);

// Custom client for anonymous operations (used for public forms, metrics, etc.)
const customSupabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  getClientOptions({
    'X-Client-Info': 'dynamo-system'
  })
);

// Export the Supabase URL for reference in other modules
export const supabaseApiUrl = config.supabaseUrl;

// Centralized function to get current session
export const getCurrentSession = async () => {
  try {
    console.log("Requesting current session...");
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting current session:", error);
      return null;
    }
    
    return data.session;
  } catch (e) {
    console.error("Error getting current session:", e);
    return null;
  }
};

// Centralized function to check authentication status
export const isAuthenticated = async () => {
  const session = await getCurrentSession();
  return !!session;
};

// Centralized function to clean up auth state
export const cleanupAuthState = () => {
  console.log("Cleaning up auth state across the application");
  
  // Clear local/session storage items
  localStorage.removeItem('currentProjectId');
  sessionStorage.removeItem('currentProjectId');
  localStorage.removeItem('isGlobalAdmin');
  
  // Clear Supabase-specific tokens
  const supabaseKey = 'sb-' + new URL(supabaseApiUrl).hostname.split('.')[0] + '-auth-token';
  localStorage.removeItem(supabaseKey);
  sessionStorage.removeItem(supabaseKey);
  
  // Check for other Supabase keys and clear them too
  const storageKeys = Object.keys(localStorage);
  const supabaseKeys = storageKeys.filter(key => key.startsWith('sb-'));
  supabaseKeys.forEach(key => {
    console.log("Clearing supabase storage key:", key);
    localStorage.removeItem(key);
  });
};

// Export main clients
export { supabase, customSupabase };
