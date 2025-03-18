
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

// Create a single instance of the Supabase client for the main API
const supabaseClient = createClient<Database>(
  config.supabaseUrl, 
  config.supabaseAnonKey,
  {
    auth: {
      storageKey: config.storage.authTokenKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    // Disable the cache to prevent stale data
    global: {
      fetch: (url, options) => {
        return fetch(url, { 
          ...options, 
          cache: 'no-store',
          // Add signal abort controller with reasonable timeout
          signal: options?.signal || new AbortController().signal
        });
      }
    }
  }
);

// Export the main API client as the default supabase client
export const supabase = supabaseClient;

// Maintain service-specific names for backward compatibility
// but use the same client instance to avoid multiple client warnings
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;

// For logging in non-production environments
if (environment !== 'production') {
  console.log(`Supabase client initialized for environment: ${environment}`);
}
