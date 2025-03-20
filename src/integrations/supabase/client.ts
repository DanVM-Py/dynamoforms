
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
      headers: getDefaultHeaders()
    }
  }
);

// Create an admin client that doesn't include project headers
// This is useful for global admin operations that aren't scoped to a project
const supabaseAdminClient = createClient<Database>(
  config.supabaseUrl, 
  config.supabaseAnonKey,
  {
    auth: {
      storageKey: config.storage.authTokenKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: localStorage,
    },
    db: {
      schema: 'public'
    }
  }
);

// Update headers based on current project ID
supabaseClient.realtime.setAuth(config.supabaseAnonKey);

// Log initialization in development
if (environment !== 'production') {
  console.log(`Supabase clients initialized for ${environment} environment`);
}

// Export the main API client as the default supabase client
export const supabase = supabaseClient;

// Export the admin client for global admin operations
export const supabaseAdmin = supabaseAdminClient;

// Maintain service-specific names for backward compatibility
// but use the same client instance to avoid multiple client warnings
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;

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
