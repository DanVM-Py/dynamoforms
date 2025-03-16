
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = "https://dgnjoqgfccxdlteiptfv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpvcWdmY2N4ZGx0ZWlwdGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5OTQxNDMsImV4cCI6MjA1NzU3MDE0M30.WaKEJL_VuJL9osWDEIc5NUUWekD-90Hbavya5S_5uIg";

export const customSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: {
    schema: 'public'
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, { 
        ...options, 
        cache: 'no-store',
        headers: {
          ...options?.headers,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
    }
  }
});
