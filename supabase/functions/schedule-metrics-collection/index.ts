
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * This function is now only used for manual triggering of metrics collection.
 * It has been simplified to work reliably.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Schedule-metrics-collection function triggered')

    // Call the collect-metrics function directly using fetch with auth
    // This is more reliable than using supabase.functions.invoke
    const url = `${supabaseUrl}/functions/v1/collect-metrics`;
    console.log(`Calling collect-metrics at: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        ...corsHeaders
      },
      body: JSON.stringify({ 
        forceFetch: true,
        clearBeforeInsert: false // Don't clear data, just add new metrics
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to invoke collect-metrics: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    console.log('Metrics collection completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Metrics collection triggered successfully',
      timestamp: new Date().toISOString(),
      metrics: data?.metrics?.length || 0,
      endpoints: data?.endpoints || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in schedule-metrics-collection function:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
