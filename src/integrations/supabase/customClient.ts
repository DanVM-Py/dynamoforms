
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = "https://dgnjoqgfccxdlteiptfv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpvcWdmY2N4ZGx0ZWlwdGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5OTQxNDMsImV4cCI6MjA1NzU3MDE0M30.WaKEJL_VuJL9osWDEIc5NUUWekD-90Hbavya5S_5uIg";

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
      'apikey': SUPABASE_PUBLISHABLE_KEY
    },
    fetch: (url, options = {}) => {
      // Create a new options object with headers
      const newOptions = {
        ...options,
        headers: {
          ...(options.headers as Record<string, string> || {}),
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0'
        },
        cache: 'no-store'
      };
      
      return fetch(url, newOptions);
    }
  }
});
