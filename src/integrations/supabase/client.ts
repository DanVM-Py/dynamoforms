
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

// Get the current project ID from session storage
const getCurrentProjectId = () => {
  return sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
};

// Create default headers with project ID if available
const getDefaultHeaders = (): Record<string, string> => {
  const projectId = getCurrentProjectId();
  const headers: Record<string, string> = {};
  
  if (projectId) {
    headers['X-Current-Project'] = projectId;
  }
  
  return headers;
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
      detectSessionInUrl: false, // Disable to prevent navigation issues
      storage: localStorage, // Explicitly define storage mechanism
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: getDefaultHeaders(),
      fetch: (url, options = {}) => {
        // Add a request timeout
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          ),
        ]) as Promise<Response>;
      }
    }
  }
);

// Export the main API client as the default supabase client
export const supabase = supabaseClient;

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
