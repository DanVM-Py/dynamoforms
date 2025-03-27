
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Microservice endpoints configuration
const microserviceEndpoints = {
  auth: '/api/auth/health',
  projects: '/api/projects/health',
  forms: '/api/forms/health',
  tasks: '/api/tasks/health',
  notifications: '/api/notifications/health',
  gateway: '/api/health',
}

// Function to check health of a microservice
async function checkServiceHealth(serviceId: string, endpoint: string) {
  try {
    console.log(`Checking health of ${serviceId} at ${endpoint}`)
    
    // In production, this would be an actual HTTP request to the microservice
    // For now, we simulate varying health statuses
    const now = new Date()
    
    // Generate some realistic data with occasional degraded status
    // In production, this would come from actual service health checks
    const isHealthy = Math.random() > 0.1
    const isDegraded = !isHealthy && Math.random() > 0.3
    const status = isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'down')
    
    const responseTime = Math.round(50 + Math.random() * (isHealthy ? 100 : 300))
    const errorRate = isHealthy ? Math.random() * 1 : (isDegraded ? Math.random() * 5 + 2 : Math.random() * 10 + 5)
    const cpuUsage = Math.round(isHealthy ? 10 + Math.random() * 40 : 40 + Math.random() * 60)
    const memoryUsage = Math.round(isHealthy ? 20 + Math.random() * 40 : 50 + Math.random() * 40)
    const requestCount = Math.round(100 + Math.random() * 400)

    return {
      service_id: serviceId,
      status,
      response_time: responseTime,
      error_rate: errorRate,
      cpu_usage: cpuUsage,
      memory_usage: memoryUsage,
      request_count: requestCount,
      checked_at: now.toISOString(),
      metrics_data: {
        responseTime: [{ timestamp: now.getTime(), value: responseTime }],
        errorRate: [{ timestamp: now.getTime(), value: errorRate }],
        requestCount: [{ timestamp: now.getTime(), value: requestCount }]
      }
    }
  } catch (error) {
    console.error(`Failed to check health of ${serviceId}:`, error)
    throw error
  }
}

// Function to clear existing metrics data when requested
async function clearMetricsData() {
  try {
    console.log('Clearing existing metrics data')
    const { error } = await supabase
      .from('service_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) {
      console.error('Error clearing metrics data:', error)
      throw error
    }
    
    console.log('Successfully cleared metrics data')
    return true
  } catch (error) {
    console.error('Failed to clear metrics data:', error)
    throw error
  }
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method === 'GET') {
      // Fetch the latest metrics for all services
      const { data: latestMetrics, error } = await supabase
        .from('service_metrics')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20) // Increased limit to get more data points

      if (error) {
        console.error('Error fetching metrics:', error)
        throw error
      }

      // Log what we're returning to help with debugging
      console.log(`Returning ${latestMetrics?.length || 0} metrics records`)
      
      return new Response(JSON.stringify({ 
        metrics: latestMetrics || [],
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else if (req.method === 'POST') {
      // Parse the request body
      let clearBeforeInsert = false
      
      try {
        const body = await req.json()
        clearBeforeInsert = body?.clearBeforeInsert === true
        console.log('Request body:', body)
        console.log('Clear before insert:', clearBeforeInsert)
      } catch (e) {
        console.log('No request body or invalid JSON', e)
      }
      
      // Clear existing data if requested
      if (clearBeforeInsert) {
        await clearMetricsData()
      }
      
      // Collect fresh metrics from all services
      const metricsArray = await Promise.all(
        Object.entries(microserviceEndpoints).map(([serviceId, endpoint]) => 
          checkServiceHealth(serviceId, endpoint)
        )
      )
      
      console.log(`Generated ${metricsArray.length} metrics records`)
      
      // Store all metrics in the database
      const { data, error } = await supabase
        .from('service_metrics')
        .insert(metricsArray)
        .select()
      
      if (error) {
        console.error('Error storing metrics:', error)
        throw error
      }

      console.log(`Successfully stored ${data?.length || 0} metrics records`)
      
      return new Response(JSON.stringify({ 
        metrics: data || [],
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      })
    }
  } catch (error) {
    console.error('Error in collect-metrics function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
