
// This file connects to the appropriate Supabase service based on the current context
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config, environment } from '@/config/environment';

// Service identification constants
export const SERVICES = {
  AUTH: 'auth',
  PROJECTS: 'projects',
  FORMS: 'forms',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications'
};

// Create a single Supabase client instance - SINGLETON PATTERN
// This prevents multiple instances of GoTrueClient
let supabaseInstance = null;
let supabaseAdminInstance = null;

// Create a single instance of the Supabase client
const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;
  
  console.log("Initializing Supabase client with:", {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    authSettings: {
      storageKey: config.storage.authTokenKey,
      autoRefreshToken: true,
      persistSession: true
    }
  });
  
  supabaseInstance = createClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      auth: {
        storageKey: config.storage.authTokenKey,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {},
        // Increase timeout to prevent quick timeouts
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // Increase to 45 seconds for more margin
            signal: options?.signal || AbortSignal.timeout(45000)
          });
        }
      }
    }
  );

  return supabaseInstance;
};

// Create an admin client with the same config but no project headers
// This is used for operations that need to work across projects
const createAdminClient = () => {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = config.supabaseUrl;
  const supabaseAnonKey = config.supabaseAnonKey;
  
  console.log("Initializing Supabase admin client");
  
  supabaseAdminInstance = createClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      auth: {
        storageKey: `${config.storage.authTokenKey}-admin`, // Use a different storage key for admin client
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {},
        // Increase timeout to prevent quick timeouts
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // Increase to 45 seconds
            signal: options?.signal || AbortSignal.timeout(45000)
          });
        }
      }
    }
  );

  return supabaseAdminInstance;
};

// Create only one instance and export it
export const supabase = createSupabaseClient();

// Create and export the admin client
export const supabaseAdmin = createAdminClient();

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

// Export the service clients using the same instance
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;
