
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config, environment } from '@/config/environment';

const SUPABASE_URL = config.supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY = config.supabaseAnonKey;

export const customSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json'
    },
    fetch: (url, options = {}) => {
      // Create a new options object with headers
      const newOptions: RequestInit = {
        ...options,
        headers: {
          ...((options as RequestInit).headers || {}),
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
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
