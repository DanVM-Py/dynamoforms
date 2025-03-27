
// This file connects to the appropriate Supabase service based on the current context
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
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

// Create a single global Supabase client instance with default options
const supabaseClientOptions: SupabaseClientOptions<"public"> = {
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
  },
  db: {
    schema: "public"
  }
};

// Create one client for the entire application
const supabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  supabaseClientOptions
);

// Export the same instance for all standard operations
export { supabase };

// Export the same instance for admin functions
export const supabaseAdmin = supabase;

// Explicitly export service-specific clients using the same instance
export const authClient = supabase;
export const projectsClient = supabase;
export const formsClient = supabase;
export const tasksClient = supabase;
export const notificationsClient = supabase;

// The Supabase URL is needed in a few places, expose it in a safe way
export const supabaseApiUrl = config.supabaseUrl;

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
