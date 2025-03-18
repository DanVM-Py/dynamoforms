
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
// Set reasonable timeouts to prevent hanging requests
const supabaseClient = createClient<Database>(
  config.supabaseUrl, 
  config.supabaseAnonKey,
  {
    auth: {
      storageKey: config.storage.authTokenKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // Disable to prevent navigation issues
    },
    db: {
      schema: 'public'
    },
    global: {
      fetch: (url, options) => {
        // Create a controller with timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, { 
          ...options, 
          cache: 'no-store',
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      }
    }
  }
);

// Set headers to avoid CORS issues
if (typeof window !== 'undefined') {
  supabaseClient.realtime.setAuth(localStorage.getItem(config.storage.authTokenKey) || '');
}

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
