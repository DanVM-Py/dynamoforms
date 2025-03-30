
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Actual service endpoints configuration - PRODUCTION ENDPOINTS
interface ServiceConfig {
  id: string;
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  timeout: number; // milliseconds
}

// Real production service endpoints
const serviceConfigs: ServiceConfig[] = [
  {
    id: 'auth',
    name: 'Auth Service',
    baseUrl: 'https://api.dynamoforms.app/auth',
    healthEndpoint: '/health',
    timeout: 5000
  },
  {
    id: 'projects',
    name: 'Projects Service',
    baseUrl: 'https://api.dynamoforms.app/projects',
    healthEndpoint: '/health',
    timeout: 5000
  },
  {
    id: 'forms',
    name: 'Forms Service',
    baseUrl: 'https://api.dynamoforms.app/forms',
    healthEndpoint: '/health',
    timeout: 5000
  },
  {
    id: 'tasks',
    name: 'Tasks Service',
    baseUrl: 'https://api.dynamoforms.app/tasks',
    healthEndpoint: '/health',
    timeout: 5000
  },
  {
    id: 'notifications',
    name: 'Notifications Service',
    baseUrl: 'https://api.dynamoforms.app/notifications',
    healthEndpoint: '/health',
    timeout: 5000
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    baseUrl: 'https://api.dynamoforms.app',
    healthEndpoint: '/health',
    timeout: 5000
  }
];

// Define a standard health response structure
interface ServiceHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
  uptime?: number;
  responseTime?: number;
  metrics?: {
    cpu?: number;
    memory?: number;
    requestCount?: number;
    errorRate?: number;
    [key: string]: any;
  };
  lastChecked?: string;
  message?: string;
}

// Function to check health of a microservice with real HTTP request
async function checkServiceHealth(serviceConfig: ServiceConfig): Promise<any> {
  const { id, baseUrl, healthEndpoint, timeout } = serviceConfig;
  const healthUrl = `${baseUrl}${healthEndpoint}`;
  const startTime = Date.now();
  
  try {
    console.log(`Checking health of ${id} at ${healthUrl}`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Make the actual HTTP request to the service's health endpoint
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Monitor-Source': 'dynamo-monitoring-system'
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.warn(`Service ${id} returned non-200 status: ${response.status}`);
      return {
        service_id: id,
        status: 'degraded',
        response_time: responseTime,
        error_rate: 100,
        cpu_usage: 0,
        memory_usage: 0,
        request_count: 0,
        checked_at: new Date().toISOString(),
        message: `HTTP status: ${response.status}`,
        metrics_data: {
          responseTime: [{ timestamp: Date.now(), value: responseTime }],
          errorRate: [{ timestamp: Date.now(), value: 100 }],
          requestCount: [{ timestamp: Date.now(), value: 0 }]
        }
      };
    }
    
    // Parse health data from response
    let healthData: ServiceHealthResponse;
    try {
      healthData = await response.json();
    } catch (error) {
      console.error(`Failed to parse JSON from ${id} health check:`, error);
      return {
        service_id: id,
        status: 'degraded',
        response_time: responseTime,
        error_rate: 100,
        cpu_usage: 0,
        memory_usage: 0,
        request_count: 0,
        checked_at: new Date().toISOString(),
        message: 'Invalid health check response format',
        metrics_data: {
          responseTime: [{ timestamp: Date.now(), value: responseTime }],
          errorRate: [{ timestamp: Date.now(), value: 100 }],
          requestCount: [{ timestamp: Date.now(), value: 0 }]
        }
      };
    }
    
    // Validate and normalize health data
    const normalizedStatus = 
      ['healthy', 'degraded', 'down'].includes(healthData.status) 
        ? healthData.status 
        : 'degraded';
    
    // Extract metrics or use sensible defaults
    const cpuUsage = healthData.metrics?.cpu || 0;
    const memoryUsage = healthData.metrics?.memory || 0;
    const reportedErrorRate = healthData.metrics?.errorRate !== undefined 
      ? healthData.metrics.errorRate 
      : 0;
    const requestCount = healthData.metrics?.requestCount || 0;
    
    return {
      service_id: id,
      status: normalizedStatus,
      response_time: responseTime,
      error_rate: reportedErrorRate,
      cpu_usage: cpuUsage,
      memory_usage: memoryUsage,
      request_count: requestCount,
      checked_at: new Date().toISOString(),
      message: healthData.message || `Service is ${normalizedStatus}`,
      metrics_data: {
        responseTime: [{ timestamp: Date.now(), value: responseTime }],
        errorRate: [{ timestamp: Date.now(), value: reportedErrorRate }],
        requestCount: [{ timestamp: Date.now(), value: requestCount }]
      }
    };
  } catch (error) {
    console.error(`Failed to check health of ${id}:`, error);
    
    // Handle timeout or other network errors
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    
    return {
      service_id: id,
      status: 'down',
      response_time: timeout,
      error_rate: 100,
      cpu_usage: 0,
      memory_usage: 0,
      request_count: 0,
      checked_at: new Date().toISOString(),
      message: isTimeout ? 'Connection timeout' : `Connection error: ${error.message}`,
      metrics_data: {
        responseTime: [{ timestamp: Date.now(), value: timeout }],
        errorRate: [{ timestamp: Date.now(), value: 100 }],
        requestCount: [{ timestamp: Date.now(), value: 0 }]
      }
    };
  }
}

// Function to clear existing metrics data when requested
async function clearMetricsData() {
  try {
    console.log('Clearing existing metrics data');
    const { error } = await supabase
      .from('service_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') 

    if (error) {
      console.error('Error clearing metrics data:', error);
      throw error;
    }
    
    console.log('Successfully cleared metrics data');
    return true;
  } catch (error) {
    console.error('Failed to clear metrics data:', error);
    throw error;
  }
}

// Fetch historical metrics for a service to calculate trends
async function fetchHistoricalMetrics(serviceId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('service_metrics')
      .select('*')
      .eq('service_id', serviceId)
      .order('checked_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error(`Error fetching historical metrics for ${serviceId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Failed to fetch historical metrics for ${serviceId}:`, error);
    return [];
  }
}

// Calculate metrics trends based on historical data
function calculateTrends(currentMetric: any, historicalMetrics: any[]) {
  if (!historicalMetrics || historicalMetrics.length === 0) {
    return {
      responseTimeTrend: 0,
      errorRateTrend: 0,
      cpuUsageTrend: 0,
      memoryUsageTrend: 0,
      requestCountTrend: 0
    };
  }
  
  // Calculate average of historical metrics
  const avgResponseTime = historicalMetrics.reduce((sum, metric) => sum + metric.response_time, 0) / historicalMetrics.length;
  const avgErrorRate = historicalMetrics.reduce((sum, metric) => sum + metric.error_rate, 0) / historicalMetrics.length;
  const avgCpuUsage = historicalMetrics.reduce((sum, metric) => sum + metric.cpu_usage, 0) / historicalMetrics.length;
  const avgMemoryUsage = historicalMetrics.reduce((sum, metric) => sum + metric.memory_usage, 0) / historicalMetrics.length;
  const avgRequestCount = historicalMetrics.reduce((sum, metric) => sum + metric.request_count, 0) / historicalMetrics.length;
  
  // Calculate trends (percentage change)
  return {
    responseTimeTrend: avgResponseTime !== 0 ? ((currentMetric.response_time - avgResponseTime) / avgResponseTime) * 100 : 0,
    errorRateTrend: avgErrorRate !== 0 ? ((currentMetric.error_rate - avgErrorRate) / avgErrorRate) * 100 : 0,
    cpuUsageTrend: avgCpuUsage !== 0 ? ((currentMetric.cpu_usage - avgCpuUsage) / avgCpuUsage) * 100 : 0,
    memoryUsageTrend: avgMemoryUsage !== 0 ? ((currentMetric.memory_usage - avgMemoryUsage) / avgMemoryUsage) * 100 : 0,
    requestCountTrend: avgRequestCount !== 0 ? ((currentMetric.request_count - avgRequestCount) / avgRequestCount) * 100 : 0
  };
}

// Store metrics in the database
async function storeMetrics(metricsArray: any[]) {
  try {
    console.log(`Storing ${metricsArray.length} metrics in database`);
    
    const { data, error } = await supabase
      .from('service_metrics')
      .insert(metricsArray)
      .select();
    
    if (error) {
      console.error('Error storing metrics:', error);
      throw error;
    }
    
    console.log(`Successfully stored ${data?.length || 0} metrics records`);
    return data || metricsArray;
  } catch (error) {
    console.error('Failed to store metrics:', error);
    throw error;
  }
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the real production configuration
    console.log(`Using production microservice configuration with ${serviceConfigs.length} services`);

    if (req.method === 'GET') {
      // Fetch the latest metrics for all services
      const { data: latestMetrics, error } = await supabase
        .from('service_metrics')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(serviceConfigs.length * 3); // Get more for historical context

      if (error) {
        console.error('Error fetching metrics from database:', error);
        throw error;
      }

      // If no metrics found, inform the user but don't generate fake data
      if (!latestMetrics || latestMetrics.length === 0) {
        console.log("No metrics found in database. User should trigger a metrics collection.");
        
        return new Response(JSON.stringify({ 
          metrics: [],
          success: false,
          error: "No metrics data available. Please click 'Refresh' to collect current metrics.",
          endpoints: serviceConfigs.map(config => ({
            id: config.id,
            url: `${config.baseUrl}${config.healthEndpoint}`
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      console.log(`Returning ${latestMetrics?.length || 0} metrics records`);
      
      return new Response(JSON.stringify({ 
        metrics: latestMetrics || [],
        success: true,
        endpoints: serviceConfigs.map(config => ({
          id: config.id,
          url: `${config.baseUrl}${config.healthEndpoint}`
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (req.method === 'POST') {
      // Parse the request body
      let clearBeforeInsert = false;
      let forceFetch = true; // Always force fetch when POST is called
      
      try {
        const body = await req.json();
        clearBeforeInsert = body?.clearBeforeInsert === true;
        forceFetch = body?.forceFetch !== false; // Default to true
        console.log('Request body:', body);
        console.log('Clear before insert:', clearBeforeInsert);
        console.log('Force fetch:', forceFetch);
      } catch (e) {
        console.log('No request body or invalid JSON', e);
      }
      
      // Clear existing data if requested
      if (clearBeforeInsert) {
        await clearMetricsData();
      }
      
      // Always collect fresh metrics for POST request - no fallback to fake data
      let metricsArray;
      try {
        // Collect fresh metrics from all services in parallel
        console.log(`Collecting fresh metrics for ${serviceConfigs.length} services`);
        const metricsPromises = serviceConfigs.map(serviceConfig => 
          checkServiceHealth(serviceConfig)
            .then(async (currentMetric) => {
              // Fetch historical metrics for this service
              const historicalMetrics = await fetchHistoricalMetrics(serviceConfig.id);
              
              // Calculate trends based on historical data
              const trends = calculateTrends(currentMetric, historicalMetrics);
              
              // Add trends to the metric data
              return {
                ...currentMetric,
                trends
              };
            })
        );
        
        metricsArray = await Promise.all(metricsPromises);
      } catch (error) {
        console.error('Critical error collecting metrics:', error);
        return new Response(JSON.stringify({ 
          metrics: [],
          success: false,
          error: `Failed to collect metrics: ${error.message}`,
          endpoints: serviceConfigs.map(config => ({
            id: config.id,
            url: `${config.baseUrl}${config.healthEndpoint}`
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      
      console.log(`Generated ${metricsArray.length} metrics records from real services`);
      
      // Store metrics
      try {
        const storedData = await storeMetrics(metricsArray);
        
        return new Response(JSON.stringify({ 
          metrics: storedData,
          success: true,
          message: "Successfully collected real-time metrics from all microservices",
          endpoints: serviceConfigs.map(config => ({
            id: config.id,
            url: `${config.baseUrl}${config.healthEndpoint}`
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (storeError) {
        console.error('Failed to store metrics in database:', storeError);
        
        return new Response(JSON.stringify({ 
          metrics: metricsArray,
          success: false,
          error: `Generated metrics could not be stored in database: ${storeError.message}`,
          message: "Retrieved metrics but failed to store them in the database"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }
  } catch (error) {
    console.error('Error in collect-metrics function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
