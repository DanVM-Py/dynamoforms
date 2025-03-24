
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

// Create a single instance of the Supabase client
const createSupabaseClient = () => {
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
  
  return createClient<Database>(
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
            // Increase to 30 seconds
            signal: options?.signal || AbortSignal.timeout(30000)
          });
        }
      }
    }
  );
};

// Create only one instance and export it
export const supabase = createSupabaseClient();

// Function to get the current session - useful for components that need quick access
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
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
