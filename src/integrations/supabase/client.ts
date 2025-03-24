
// This file connects to the appropriate Supabase service based on the current context
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config } from '@/config/environment';

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
      persistSession: true // Changed to true to maintain sessions
    }
  });
  
  supabaseInstance = createClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      auth: {
        storageKey: config.storage.authTokenKey,
        autoRefreshToken: true,
        persistSession: true, // Changed to true to maintain sessions
        detectSessionInUrl: true,
      },
      global: {
        headers: {},
        // Increase timeout to prevent quick timeouts
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // Increase to 60 seconds for more margin
            signal: options?.signal || AbortSignal.timeout(60000)
          });
        }
      }
    }
  );

  return supabaseInstance;
};

// Create a single instance and export it
export const supabase = createSupabaseClient();

// Since other parts of the code expect an adminClient, we'll provide it
// but make it use the same instance to avoid multiple GoTrueClient instances
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

// Export the service clients using the same instance
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;
