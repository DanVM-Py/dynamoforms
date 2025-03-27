
// This file connects to the appropriate Supabase service based on the current context
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config } from '@/config/environment';

// Define service identifiers
export const SERVICES = {
  AUTH: 'auth',
  PROJECTS: 'projects',
  FORMS: 'forms',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications'
};

// Create a single Supabase client instance - SINGLETON PATTERN
let supabaseInstance = null;

// Create a single instance of the Supabase client
export const createSupabaseClient = (options = {}) => {
  // Common config applied to all instances
  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;
  
  // Default options that apply to the main instance
  const defaultOptions = {
    auth: {
      storageKey: config.storage.authTokenKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {},
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          signal: options?.signal || AbortSignal.timeout(60000)
        });
      }
    }
  };
  
  // Merge the default options with any provided options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    auth: {
      ...defaultOptions.auth,
      ...(options.auth || {}),
    },
    global: {
      ...defaultOptions.global,
      ...(options.global || {}),
      headers: {
        ...defaultOptions.global.headers,
        ...(options.global?.headers || {}),
      },
    },
  };
  
  // For the main instance with no custom options, return the singleton
  if (Object.keys(options).length === 0 && supabaseInstance) {
    return supabaseInstance;
  }
  
  // For custom options, create a new instance but don't store it as the singleton
  if (Object.keys(options).length > 0) {
    console.log("Creating custom Supabase instance with options:", options);
    return createClient<Database>(supabaseUrl, supabaseAnonKey, mergedOptions);
  }
  
  // Create and store the main singleton instance
  console.log("Initializing main Supabase singleton instance with:", {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    options: mergedOptions
  });
  
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, mergedOptions);
  return supabaseInstance;
};

// Create a single instance and export it as the default client
export const supabase = createSupabaseClient();

// Export the same instance for admin functions
export const supabaseAdmin = supabase;

// Function to get the current session - useful for components that need quick access
export const getCurrentSession = async () => {
  try {
    console.log("Requesting current session...");
    const startTime = Date.now();
    
    const { data, error } = await supabase.auth.getSession();
    
    const endTime = Date.now();
    console.log(`Session request completed in ${endTime - startTime}ms`);
    
    if (error) {
      console.error("Error getting current session:", error);
      throw error;
    }
    
    if (data.session) {
      console.log("Session found, user:", data.session.user.email);
    } else {
      console.log("No active session found");
    }
    
    return data.session;
  } catch (e) {
    console.error("Error getting current session:", e);
    return null;
  }
};

// Function to check if user is authenticated - useful for quick checks
export const isAuthenticated = async () => {
  const session = await getCurrentSession();
  return !!session;
};

// Function to clean up auth state across the application
export const cleanupAuthState = () => {
  console.log("Cleaning up auth state across the application");
  
  // Clear local/session storage items
  localStorage.removeItem('currentProjectId');
  sessionStorage.removeItem('currentProjectId');
  localStorage.removeItem('isGlobalAdmin');
  
  // Clear Supabase-specific tokens
  const supabaseKey = 'sb-' + new URL(supabase.supabaseUrl).hostname.split('.')[0] + '-auth-token';
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

// Export the service clients using the same instance
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;
