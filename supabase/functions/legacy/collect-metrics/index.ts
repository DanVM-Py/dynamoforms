
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Environment modes
const ENV_MODE = Deno.env.get('MONITORING_ENV') || 'development';
const USE_MOCK_DATA = (ENV_MODE === 'development');

// Actual service endpoints configuration
interface ServiceConfig {
  id: string;
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  timeout: number; // milliseconds
  testEndpoint?: string; // Optional endpoint for testing connectivity
}

// Production service endpoints with improved configuration
const serviceConfigs: ServiceConfig[] = [
  {
    id: 'auth',
    name: 'Auth Service',
    baseUrl: 'https://api.dynamoforms.lovable.app/auth',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  },
  {
    id: 'projects',
    name: 'Projects Service',
    baseUrl: 'https://api.dynamoforms.lovable.app/projects',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  },
  {
    id: 'forms',
    name: 'Forms Service',
    baseUrl: 'https://api.dynamoforms.lovable.app/forms',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  },
  {
    id: 'tasks',
    name: 'Tasks Service',
    baseUrl: 'https://api.dynamoforms.lovable.app/tasks',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  },
  {
    id: 'notifications',
    name: 'Notifications Service',
    baseUrl: 'https://api.dynamoforms.lovable.app/notifications',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    baseUrl: 'https://api.dynamoforms.lovable.app',
    healthEndpoint: '/health',
    timeout: 5000,
    testEndpoint: '/ping'
  }
];

// Local development service endpoints (optional fallback for testing)
const localServiceConfigs: ServiceConfig[] = [
  {
    id: 'auth',
    name: 'Auth Service (Local)',
    baseUrl: 'http://localhost:3001/auth',
    healthEndpoint: '/health',
    timeout: 2000
  },
  {
    id: 'projects',
    name: 'Projects Service (Local)',
    baseUrl: 'http://localhost:3002/projects',
    healthEndpoint: '/health',
    timeout: 2000
  },
  {
    id: 'forms',
    name: 'Forms Service (Local)',
    baseUrl: 'http://localhost:3003/forms',
    healthEndpoint: '/health',
    timeout: 2000
  },
  {
    id: 'tasks',
    name: 'Tasks Service (Local)',
    baseUrl: 'http://localhost:3004/tasks',
    healthEndpoint: '/health',
    timeout: 2000
  },
  {
    id: 'notifications',
    name: 'Notifications Service (Local)',
    baseUrl: 'http://localhost:3005/notifications',
    healthEndpoint: '/health',
    timeout: 2000
  },
  {
    id: 'gateway',
    name: 'API Gateway (Local)',
    baseUrl: 'http://localhost:3000',
    healthEndpoint: '/health',
    timeout: 2000
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

// Function to check network connectivity to a service without validating health data
async function checkServiceConnectivity(serviceConfig: ServiceConfig): Promise<boolean> {
  try {
    // Use either the test endpoint or the health endpoint
    const endpoint = serviceConfig.testEndpoint || serviceConfig.healthEndpoint;
    const testUrl = `${serviceConfig.baseUrl}${endpoint}`;
    
    console.log(`Checking basic connectivity to ${serviceConfig.id} at ${testUrl}`);
    
    // Create a controller with a short timeout just to check connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Short timeout for basic connectivity check
    
    // Simple HEAD request to check if endpoint is reachable
    const response = await fetch(testUrl, {
      method: 'HEAD',
      headers: {
        'Accept': 'application/json',
        'X-Monitor-Source': 'dynamo-monitoring-system'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true; // If we get here, there's basic connectivity
  } catch (error) {
    console.warn(`Basic connectivity check failed for ${serviceConfig.id}:`, error.message);
    return false;
  }
}

// Function to generate realistic mock data for a service
function generateMockHealthData(serviceId: string): any {
  const now = Date.now();
  const isHealthy = Math.random() > 0.2; // 80% chance of being healthy
  const isDegraded = !isHealthy && Math.random() > 0.5; // If not healthy, 50% chance of being degraded vs down
  
  const status = isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'down');
  
  // Generate realistic looking metrics
  const responseTime = isHealthy ? 
    Math.floor(Math.random() * 200) + 50 : // 50-250ms when healthy
    Math.floor(Math.random() * 500) + 250; // 250-750ms when degraded
  
  const errorRate = isHealthy ? 
    Math.random() * 2 : // 0-2% when healthy
    (isDegraded ? Math.random() * 15 + 5 : 100); // 5-20% when degraded, 100% when down
  
  const cpuUsage = isHealthy ? 
    Math.random() * 30 + 10 : // 10-40% when healthy
    Math.random() * 40 + 40; // 40-80% when degraded/down
  
  const memoryUsage = isHealthy ? 
    Math.random() * 40 + 20 : // 20-60% when healthy
    Math.random() * 30 + 60; // 60-90% when degraded/down
  
  const requestCount = isHealthy ? 
    Math.floor(Math.random() * 100) + 50 : // 50-150 when healthy
    Math.floor(Math.random() * 50) + 10; // 10-60 when degraded/down
  
  let message = "";
  if (status === 'healthy') {
    message = "Servicio operando correctamente";
  } else if (status === 'degraded') {
    const reasons = [
      "Alta latencia detectada",
      "Tasa de errores elevada",
      "Uso de CPU por encima del umbral",
      "Memoria en niveles críticos",
      "Problemas de conectividad intermitentes"
    ];
    message = reasons[Math.floor(Math.random() * reasons.length)];
  } else {
    const reasons = [
      "Servicio no responde",
      "Error de conexión a base de datos",
      "Error de autenticación",
      "Timeout excedido",
      "Error interno del servidor"
    ];
    message = reasons[Math.floor(Math.random() * reasons.length)];
  }
  
  return {
    service_id: serviceId,
    status: status,
    response_time: status === 'down' ? 0 : responseTime,
    error_rate: errorRate,
    cpu_usage: cpuUsage,
    memory_usage: memoryUsage,
    request_count: requestCount,
    checked_at: new Date().toISOString(),
    message: message,
    metrics_data: {
      responseTime: [{ timestamp: now, value: responseTime }],
      errorRate: [{ timestamp: now, value: errorRate }],
      requestCount: [{ timestamp: now, value: requestCount }]
    }
  };
}

// Enhanced function to check health of a microservice with better error handling
async function checkServiceHealth(serviceConfig: ServiceConfig, useMockData: boolean = false): Promise<any> {
  const { id, baseUrl, healthEndpoint, timeout } = serviceConfig;
  
  // If in development mode and mock data is enabled, generate mock health data
  if (useMockData) {
    console.log(`Generating mock health data for ${id} in development mode`);
    return generateMockHealthData(id);
  }
  
  const healthUrl = `${baseUrl}${healthEndpoint}`;
  const startTime = Date.now();
  
  try {
    console.log(`Checking health of ${id} at ${healthUrl}`);
    
    // Check basic connectivity first
    const hasConnectivity = await checkServiceConnectivity(serviceConfig);
    if (!hasConnectivity) {
      console.warn(`No connectivity to ${id}. The service might be unreachable.`);
      return createServiceDownMetric(id, `No se pudo establecer conexión con ${id}. El servicio podría no estar desplegado o no ser accesible desde este entorno.`);
    }
    
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
        message: `HTTP status: ${response.status} - El servicio respondió con un código de error`,
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
        message: 'Formato de respuesta inválido, el punto de salud no devolvió JSON válido',
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
      message: healthData.message || `Servicio está ${normalizedStatus === 'healthy' ? 'operativo' : normalizedStatus === 'degraded' ? 'degradado' : 'caído'}`,
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
    let errorMessage = isTimeout 
      ? `Tiempo de conexión agotado (${timeout}ms)` 
      : `Error de conexión: ${error.message}`;
      
    // Enhanced error messages for common issues
    if (error.message?.includes('ssl')) {
      errorMessage += ' - Posible problema con certificados SSL/TLS';
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('DNS')) {
      errorMessage += ' - No se pudo resolver el nombre de dominio, verifique DNS';
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage += ' - Conexión rechazada, el servicio podría no estar en ejecución';
    }
    
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
    console.log(`Using microservice configuration with ${serviceConfigs.length} services (Mode: ${ENV_MODE})`);

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

      // Return the metrics from database
      console.log(`Returning ${latestMetrics?.length || 0} metrics records`);
      
      // Check if we have any metrics or if they're too old
      const needsFreshData = !latestMetrics || latestMetrics.length === 0 || 
                            (latestMetrics.length > 0 && 
                            Date.now() - new Date(latestMetrics[0].checked_at).getTime() > 15 * 60 * 1000); // older than 15 minutes
      
      if (needsFreshData) {
        console.log('Metrics are missing or too old, collecting fresh data automatically');
        // No metrics found or they're too old, collect fresh ones
        const freshMetrics = await collectFreshMetrics(USE_MOCK_DATA);
        
        return new Response(JSON.stringify({ 
          metrics: freshMetrics,
          success: true,
          message: "Se generaron métricas frescas automáticamente - servicios podrían no estar disponibles aún",
          developmentMode: USE_MOCK_DATA,
          endpoints: serviceConfigs.map(config => ({
            id: config.id,
            url: `${config.baseUrl}${config.healthEndpoint}`
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({ 
        metrics: latestMetrics || [],
        success: true,
        developmentMode: USE_MOCK_DATA,
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
      let useMockData = USE_MOCK_DATA;
      
      try {
        const body = await req.json();
        clearBeforeInsert = body?.clearBeforeInsert === true;
        forceFetch = body?.forceFetch !== false; // Default to true
        // Allow overriding the mock setting from request
        if (body?.useMockData !== undefined) {
          useMockData = !!body.useMockData;
        }
        console.log('Request body:', body);
        console.log('Clear before insert:', clearBeforeInsert);
        console.log('Force fetch:', forceFetch);
        console.log('Use mock data:', useMockData);
      } catch (e) {
        console.log('No request body or invalid JSON', e);
      }
      
      // Clear existing data if requested
      if (clearBeforeInsert) {
        await clearMetricsData();
      }
      
      // Collect fresh metrics
      const metricsArray = await collectFreshMetrics(useMockData);
      
      // Store metrics
      try {
        const storedData = await storeMetrics(metricsArray);
        
        return new Response(JSON.stringify({ 
          metrics: storedData,
          success: true,
          message: useMockData 
            ? "Se generaron métricas simuladas para desarrollo/pruebas" 
            : "Se recolectaron métricas de todos los servicios",
          developmentMode: useMockData,
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
          message: "Se recuperaron métricas pero no se pudieron almacenar en la base de datos",
          developmentMode: useMockData
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

// Helper function to collect fresh metrics
async function collectFreshMetrics(useMockData: boolean = false) {
  console.log(`Collecting fresh metrics for ${serviceConfigs.length} services (Mock: ${useMockData})`);
  
  // Collect fresh metrics from all services in parallel
  const servicePromises = serviceConfigs.map(async (serviceConfig) => {
    try {
      const metric = await checkServiceHealth(serviceConfig, useMockData);
      // Fetch historical metrics for this service
      const historicalMetrics = await fetchHistoricalMetrics(serviceConfig.id);
      // Calculate trends based on historical data
      const trends = calculateTrends(metric, historicalMetrics);
      // Return metric with trends
      return { ...metric, trends };
    } catch (serviceError) {
      console.error(`Error processing ${serviceConfig.id}:`, serviceError);
      // Return a down service metric when the service check fails
      return createServiceDownMetric(
        serviceConfig.id, 
        useMockData ? "Error simulado para desarrollo" : `Error: ${serviceError.message}`
      );
    }
  });
  
  const metricsArray = await Promise.all(servicePromises);
  console.log(`Generated ${metricsArray.length} metrics records from ${useMockData ? 'mock' : 'real'} services`);
  
  return metricsArray;
}
