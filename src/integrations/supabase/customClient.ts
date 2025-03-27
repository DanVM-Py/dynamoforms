
import { createClient } from '@supabase/supabase-js';
import { config, environment } from '@/config/environment';
import type { Database } from '@/types/supabase';

// Create a completely separate Supabase client for public usage
// This is a separate instance with unique configuration to avoid authentication conflicts
export const customSupabase = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      // Explicitly use different storage to avoid auth conflicts
      storageKey: 'public-auth-token',
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
  }
);

// Export a safe URL for the custom client
export const customSupabaseApiUrl = config.supabaseUrl;

// Log connection information in non-production environments
if (environment !== 'production') {
  console.log(`Custom Supabase client initialized for ${environment} environment`);
}
