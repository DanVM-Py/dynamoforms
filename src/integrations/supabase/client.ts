
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

// Storage keys for consistent auth state - use unique keys to avoid conflicts
export const AUTH_STORAGE_KEY = 'dynamo-auth-token';
export const PUBLIC_STORAGE_KEY = 'dynamo-public-token';

// Create a singleton instance of the Supabase client
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;
let customSupabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

// Define standard client options
const getClientOptions = (customHeaders = {}, storageKey = AUTH_STORAGE_KEY): SupabaseClientOptions<"public"> => ({
  auth: {
    storageKey: storageKey,
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

// Singleton getter for primary Supabase client
export const getSupabase = () => {
  if (!supabaseInstance) {
    console.log("Creating new primary Supabase client");
    supabaseInstance = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      getClientOptions()
    );
  }
  return supabaseInstance;
};

// Singleton getter for admin client
export const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    console.log("Creating new admin Supabase client");
    supabaseAdminInstance = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      getClientOptions({
        'X-Client-Info': 'admin-client',
        'X-Admin-Access': 'true'
      })
    );
  }
  return supabaseAdminInstance;
};

// Singleton getter for public/anonymous client
export const getCustomSupabase = () => {
  if (!customSupabaseInstance) {
    console.log("Creating new custom Supabase client");
    customSupabaseInstance = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      getClientOptions({
        'X-Client-Info': 'dynamo-system'
      }, PUBLIC_STORAGE_KEY)
    );
  }
  return customSupabaseInstance;
};

// Create primary client instance
const supabase = getSupabase();
const supabaseAdmin = getSupabaseAdmin();
const customSupabase = getCustomSupabase();

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
  
  // Clear main Supabase auth token
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  
  // Clear public Supabase auth token if exists
  localStorage.removeItem(PUBLIC_STORAGE_KEY);
  sessionStorage.removeItem(PUBLIC_STORAGE_KEY);
  
  // Legacy cleanup for Supabase-specific tokens
  const supabaseKey = 'sb-' + new URL(supabaseApiUrl).hostname.split('.')[0] + '-auth-token';
  localStorage.removeItem(supabaseKey);
  sessionStorage.removeItem(supabaseKey);
  
  // Check for other Supabase keys and clear them too
  const storageKeys = Object.keys(localStorage);
  const supabaseKeys = storageKeys.filter(key => key.startsWith('sb-'));
  supabaseKeys.forEach(key => {
    console.log("Clearing supabase storage key:", key);
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

// Export instances
export { supabase, supabaseAdmin, customSupabase };
