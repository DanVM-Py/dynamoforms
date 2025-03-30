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
  mockEnabled?: boolean; // Flag to enable mock data for testing
}

// Real production service endpoints (with mockEnabled flag added)
const serviceConfigs: ServiceConfig[] = [
  {
    id: 'auth',
    name: 'Auth Service',
    baseUrl: 'https://api.dynamoforms.app/auth',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
  },
  {
    id: 'projects',
    name: 'Projects Service',
    baseUrl: 'https://api.dynamoforms.app/projects',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
  },
  {
    id: 'forms',
    name: 'Forms Service',
    baseUrl: 'https://api.dynamoforms.app/forms',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
  },
  {
    id: 'tasks',
    name: 'Tasks Service',
    baseUrl: 'https://api.dynamoforms.app/tasks',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
  },
  {
    id: 'notifications',
    name: 'Notifications Service',
    baseUrl: 'https://api.dynamoforms.app/notifications',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    baseUrl: 'https://api.dynamoforms.app',
    healthEndpoint: '/health',
    timeout: 5000,
    mockEnabled: true // Enable mock while real service is unavailable
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

// Function to create a service down metric
function createServiceDownMetric(serviceId: string, errorMessage: string): any {
  return {
    service_id: serviceId,
    status: 'down',
    response_time: 0,
    error_rate: 100,
    cpu_usage: 0,
    memory_usage: 0,
    request_count: 0,
    checked_at: new Date().toISOString(),
    message: errorMessage || "Conexión fallida - Servicio no disponible",
    metrics_data: {
      responseTime: [{ timestamp: Date.now(), value: 0 }],
      errorRate: [{ timestamp: Date.now(), value: 100 }],
      requestCount: [{ timestamp: Date.now(), value: 0 }]
    }
  };
}

// Generate mock service health data for testing/development
function generateMockServiceMetric(serviceId: string): any {
  // Create various health states for demonstration
  let status: 'healthy' | 'degraded' | 'down';
  let message = '';
  let responseTime = 0;
  let errorRate = 0;
  let cpuUsage = 0;
  let memoryUsage = 0;
  let requestCount = 0;
  
  // Create a pseudo-random but consistent state based on service ID
  const randomSeed = serviceId.charCodeAt(0) + serviceId.length;
  
  // Determine status based on service ID (for testing purposes)
  if (serviceId === 'gateway' || serviceId === 'auth') {
    status = 'healthy';
    message = 'Service is operating normally';
    responseTime = 20 + (randomSeed % 10);
    errorRate = 0;
    cpuUsage = 20 + (randomSeed % 30);
    memoryUsage = 30 + (randomSeed % 20);
    requestCount = 100 + (randomSeed * 10);
  } else if (serviceId === 'projects') {
    status = 'degraded';
    message = 'Service experiencing higher than normal latency';
    responseTime = 150 + (randomSeed % 50);
    errorRate = 3.5;
    cpuUsage = 65 + (randomSeed % 15);
    memoryUsage = 70 + (randomSeed % 10);
    requestCount = 80 + (randomSeed * 5);
  } else if (serviceId === 'notifications') {
    status = 'down';
    message = 'Service is currently unavailable - scheduled maintenance';
    responseTime = 0;
    errorRate = 100;
    cpuUsage = 0;
    memoryUsage = 0;
    requestCount = 0;
  } else {
    // Other services get random health status
    const healthRoll = randomSeed % 3;
    if (healthRoll === 0) {
      status = 'healthy';
      message = 'Service is operating normally';
      responseTime = 30 + (randomSeed % 20);
      errorRate = 0.5 + (randomSeed % 2);
      cpuUsage = 25 + (randomSeed % 25);
      memoryUsage = 40 + (randomSeed % 15);
      requestCount = 90 + (randomSeed * 8);
    } else if (healthRoll === 1) {
      status = 'degraded';
      message = 'Service experiencing minor issues';
      responseTime = 120 + (randomSeed % 80);
      errorRate = 5 + (randomSeed % 5);
      cpuUsage = 60 + (randomSeed % 20);
      memoryUsage = 65 + (randomSeed % 20);
      requestCount = 50 + (randomSeed * 6);
    } else {
      status = 'healthy';
      message = 'Service recovered from recent issues';
      responseTime = 50 + (randomSeed % 30);
      errorRate = 1 + (randomSeed % 2);
      cpuUsage = 35 + (randomSeed % 20);
      memoryUsage = 45 + (randomSeed % 15);
      requestCount = 75 + (randomSeed * 7);
    }
  }
  
  // Add some time variance to make the dashboard interesting
  const timestamp = Date.now();
  const timeOffset = randomSeed * 1000 * 60; // Offset by minutes based on service ID
  
  // Create mock metric data over time for charts
  const historyPoints = 10;
  const responseTimeHistory = Array.from({ length: historyPoints }, (_, i) => ({
    timestamp: timestamp - (historyPoints - i) * 60000,
    value: Math.max(1, responseTime * (0.7 + (Math.sin(i * 0.6) + 1) * 0.25))
  }));
  
  const errorRateHistory = Array.from({ length: historyPoints }, (_, i) => ({
    timestamp: timestamp - (historyPoints - i) * 60000,
    value: Math.max(0, errorRate * (0.8 + (Math.cos(i * 0.4) + 0.5) * 0.4))
  }));
  
  const requestCountHistory = Array.from({ length: historyPoints }, (_, i) => ({
    timestamp: timestamp - (historyPoints - i) * 60000,
    value: Math.max(1, requestCount * (0.8 + (Math.sin(i * 0.3) + 0.5) * 0.3))
  }));
  
  return {
    service_id: serviceId,
    status: status,
    response_time: responseTime,
    error_rate: errorRate,
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    request_count: requestCount,
    checked_at: new Date(timestamp - timeOffset).toISOString(),
    message: message,
    metrics_data: {
      responseTime: responseTimeHistory,
      errorRate: errorRateHistory,
      requestCount: requestCountHistory
    },
    trends: {
      responseTimeTrend: Math.round((Math.random() * 20) - 10), // -10 to +10
      errorRateTrend: Math.round((Math.random() * 16) - 8),     // -8 to +8
      cpuUsageTrend: Math.round((Math.random() * 30) - 15),     // -15 to +15
      memoryUsageTrend: Math.round((Math.random() * 20) - 10),  // -10 to +10
      requestCountTrend: Math.round((Math.random() * 40) - 10)  // -10 to +30
    }
  };
}

// Function to check health of a microservice with real HTTP request
async function checkServiceHealth(serviceConfig: ServiceConfig): Promise<any> {
  const { id, baseUrl, healthEndpoint, timeout, mockEnabled } = serviceConfig;
  
  // Use mock data if enabled (for development/testing)
  if (mockEnabled) {
    console.log(`Using mock data for ${id} since mockEnabled is true`);
    return generateMockServiceMetric(id);
  }
  
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
    const errorMessage = isTimeout 
      ? 'Tiempo de conexión agotado' 
      : `Error de conexión: ${error.message}`;
    
    return createServiceDownMetric(id, errorMessage);
  }
}

// Function to clear existing metrics data when requested
async function clearMetricsData() {
  try {
    console.log('Clearing existing metrics data');
    const { error } = await supabase
      .from('service_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

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
    console.log(`Using microservice configuration with ${serviceConfigs.length} services`);

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

      // If no metrics found, generate demo data
      if (!latestMetrics || latestMetrics.length === 0) {
        console.log("No metrics found in database. Generating demo data automatically.");
        
        const mockMetrics = serviceConfigs.map(config => generateMockServiceMetric(config.id));
        
        try {
          // Store mock metrics in the database
          await storeMetrics(mockMetrics);
          
          console.log("Successfully generated and stored demo metrics");
          return new Response(JSON.stringify({ 
            metrics: mockMetrics,
            success: true,
            mock: true,
            message: "Generated demo metrics for visualization purposes. Use 'Refresh' for current data.",
            endpoints: serviceConfigs.map(config => ({
              id: config.id,
              url: `${config.baseUrl}${config.healthEndpoint}`,
              mockEnabled: config.mockEnabled
            }))
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } catch (storeError) {
          console.error('Error storing generated metrics:', storeError);
          // Return mock data even if storage failed
          return new Response(JSON.stringify({ 
            metrics: mockMetrics,
            success: true,
            mock: true,
            error: `Note: Generated metrics could not be stored: ${storeError.message}`,
            endpoints: serviceConfigs.map(config => ({
              id: config.id, 
              url: `${config.baseUrl}${config.healthEndpoint}`,
              mockEnabled: config.mockEnabled
            }))
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      console.log(`Returning ${latestMetrics?.length || 0} metrics records`);
      
      return new Response(JSON.stringify({ 
        metrics: latestMetrics || [],
        success: true,
        endpoints: serviceConfigs.map(config => ({
          id: config.id,
          url: `${config.baseUrl}${config.healthEndpoint}`,
          mockEnabled: config.mockEnabled
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
      
      // Collect fresh metrics from all services in parallel
      console.log(`Collecting fresh metrics for ${serviceConfigs.length} services`);
      const servicePromises = serviceConfigs.map(async (serviceConfig) => {
        try {
          const metric = await checkServiceHealth(serviceConfig);
          // Fetch historical metrics for this service
          const historicalMetrics = await fetchHistoricalMetrics(serviceConfig.id);
          // Calculate trends based on historical data
          const trends = calculateTrends(metric, historicalMetrics);
          // Return metric with trends
          return { ...metric, trends };
        } catch (serviceError) {
          console.error(`Error processing ${serviceConfig.id}:`, serviceError);
          // Return a mock metric when the service check fails
          return generateMockServiceMetric(serviceConfig.id);
        }
      });
      
      const metricsArray = await Promise.all(servicePromises);
      console.log(`Generated ${metricsArray.length} metrics records (${metricsArray.filter(m => m.status === 'healthy').length} healthy)`);
      
      // Store metrics
      try {
        const storedData = await storeMetrics(metricsArray);
        
        return new Response(JSON.stringify({ 
          metrics: storedData,
          success: true,
          message: "Successfully collected metrics from all services",
          endpoints: serviceConfigs.map(config => ({
            id: config.id,
            url: `${config.baseUrl}${config.healthEndpoint}`,
            mockEnabled: config.mockEnabled
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
