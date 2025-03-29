
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
 * This function is designed to be called by a cron job to collect metrics regularly.
 * It can also be triggered manually for testing.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Schedule-metrics-collection function triggered')

    // Call the collect-metrics function to fetch and store metrics
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'POST',
      body: { 
        forceFetch: true,
        clearBeforeInsert: false // Don't clear data, just add new metrics
      }
    })

    if (error) {
      console.error('Error invoking collect-metrics function:', error)
      throw error
    }

    console.log('Metrics collection completed successfully')
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Metrics collection triggered successfully',
      timestamp: new Date().toISOString(),
      metrics: data?.metrics?.length || 0
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
