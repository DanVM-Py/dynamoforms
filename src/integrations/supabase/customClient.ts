
import { createSupabaseClient } from './client';
import { config, environment } from '@/config/environment';

// Create a custom Supabase client with specific configuration for public usage
// We create a separate instance with a unique key to avoid authentication conflicts
export const customSupabase = createSupabaseClient('public-client', {
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
      const newOptions = {
        ...options,
        headers: {
          ...((options as any).headers || {}),
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0',
          'Content-Type': 'application/json'
        },
        cache: 'no-store' as RequestCache // Explicitly type this as RequestCache
      };
      
      return fetch(url, newOptions);
    }
  }
});

// Log connection information in non-production environments
if (environment !== 'production') {
  console.log(`Custom Supabase client initialized for ${environment} environment`);
}
