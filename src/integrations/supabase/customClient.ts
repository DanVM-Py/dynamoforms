
import { createSupabaseClient } from './client';
import { config, environment } from '@/config/environment';

// Create a custom Supabase client with specific configuration for public usage
// The main difference is that we don't persist sessions to avoid auth conflicts
export const customSupabase = createSupabaseClient({
  db: {
    schema: 'public'
  },
  auth: {
    // Don't persist the session to avoid authentication issues with public forms
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'apikey': config.supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    fetch: (url, options = {}) => {
      // Create a new options object with headers
      const newOptions: RequestInit = {
        ...options,
        headers: {
          ...((options as RequestInit).headers || {}),
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0',
          'Content-Type': 'application/json'
        },
        cache: 'no-store' as RequestCache
      };
      
      return fetch(url, newOptions);
    }
  }
});

// Log connection information in non-production environments
if (environment !== 'production') {
  console.log(`Custom Supabase client initialized for ${environment} environment`);
}
