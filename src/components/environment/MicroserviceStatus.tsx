
import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Loader2, Server } from "lucide-react";
import { customSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceMetric {
  service_id: string;
  status: "healthy" | "degraded" | "down";
  response_time: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
  request_count: number;
  checked_at: string;
  message?: string;
  metrics_data?: {
    responseTime: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
    requestCount: Array<{ timestamp: number; value: number }>;
  };
  trends?: {
    responseTimeTrend: number;
    errorRateTrend: number;
    cpuUsageTrend: number;
    memoryUsageTrend: number;
    requestCountTrend: number;
  };
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  latency?: number;
  lastUpdated?: Date;
  message?: string;
}

const SERVICE_NAMES = {
  'gateway': 'API Gateway',
  'auth': 'Auth Service',
  'projects': 'Projects Service',
  'forms': 'Forms Service',
  'tasks': 'Tasks Service',
  'notifications': 'Notifications Service'
};

const SERVICE_URLS = {
  'gateway': 'https://api.dynamoforms.lovable.app/health',
  'auth': 'https://api.dynamoforms.lovable.app/auth/health',
  'projects': 'https://api.dynamoforms.lovable.app/projects/health',
  'forms': 'https://api.dynamoforms.lovable.app/forms/health',
  'tasks': 'https://api.dynamoforms.lovable.app/tasks/health',
  'notifications': 'https://api.dynamoforms.lovable.app/notifications/health'
};

const mapStatusToServiceStatus = (
  status: "healthy" | "degraded" | "down"
): ServiceStatus["status"] => {
  switch (status) {
    case "healthy":
      return "operational";
    case "degraded":
      return "degraded";
    case "down":
      return "outage";
    default:
      return "unknown";
  }
};

export const MicroserviceStatus = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "unknown" },
    { name: "Auth Service", status: "unknown" },
    { name: "Projects Service", status: "unknown" },
    { name: "Forms Service", status: "unknown" },
    { name: "Tasks Service", status: "unknown" },
    { name: "Notifications Service", status: "unknown" }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [developmentMode, setDevelopmentMode] = useState(false);
  
  const fetchCurrentMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching metrics data...");
      
      const { data, error } = await customSupabase.functions.invoke('collect-metrics', {
        method: 'GET'
      });
      
      if (error) {
        console.error("Error fetching metrics:", error);
        setError(`Error fetching metrics: ${error.message}`);
        toast({
          title: "Error fetching metrics",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Metrics data received:", data);
      
      if (data?.error) {
        console.error("Error in metrics data:", data.error);
        setError(data.error);
        toast({
          title: "No metrics available",
          description: data.error || "Please refresh to collect current metrics.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      if (!data || !data.metrics || data.metrics.length === 0) {
        console.log("No metrics data available");
        setError("No metrics data available. Please click 'Refresh' to collect current metrics.");
        toast({
          title: "No metrics available",
          description: "Please refresh to collect current metrics.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Check if in development mode
      if (data.developmentMode !== undefined) {
        setDevelopmentMode(data.developmentMode);
      }
      
      const metricsArray = data.metrics;
      const latestMetricsByService = metricsArray.reduce((acc: Record<string, any>, metric: any) => {
        if (!acc[metric.service_id] || 
            new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
          acc[metric.service_id] = metric;
        }
        return acc;
      }, {});
      
      console.log("Latest metrics by service:", latestMetricsByService);
      
      const updatedServices = services.map(service => {
        const serviceId = Object.entries(SERVICE_NAMES).find(
          ([_, name]) => name === service.name
        )?.[0];
        
        if (!serviceId || !latestMetricsByService[serviceId]) {
          return service;
        }
        
        const metric = latestMetricsByService[serviceId];
        
        return {
          ...service,
          status: mapStatusToServiceStatus(metric.status),
          latency: metric.response_time,
          lastUpdated: new Date(metric.checked_at),
          message: metric.message
        };
      });
      
      setServices(updatedServices);
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchCurrentMetrics:", error);
      setError(`Failed to fetch metrics: ${error.message || "Unknown error"}`);
      toast({
        title: "Error",
        description: `Failed to fetch metrics: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  const triggerMetricsCollection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Triggering metrics collection with mock data:", useMockData);
      
      toast({
        title: useMockData ? "Generating mock metrics" : "Refreshing metrics",
        description: useMockData 
          ? "Generating simulated data for development..." 
          : "Collecting real-time data from microservices...",
      });
      
      const { data, error } = await customSupabase.functions.invoke('collect-metrics', {
        method: 'POST',
        body: { 
          forceFetch: true,
          clearBeforeInsert: false,
          useMockData: useMockData
        }
      });
      
      if (error) {
        console.error("Error triggering metrics collection:", error);
        setError(`Error refreshing metrics: ${error.message}`);
        toast({
          title: "Error refreshing metrics",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        throw error;
      }
      
      if (data?.error) {
        console.error("Error in metrics collection:", data.error);
        setError(data.error);
        toast({
          title: "Error collecting metrics",
          description: data.error,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Metrics collection triggered successfully:", data);
      
      if (data?.developmentMode !== undefined) {
        setDevelopmentMode(data.developmentMode);
      }
      
      if (data && data.metrics && data.metrics.length > 0) {
        const metricsArray = data.metrics;
        const latestMetricsByService = metricsArray.reduce((acc: Record<string, any>, metric: any) => {
          if (!acc[metric.service_id] || 
              new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
            acc[metric.service_id] = metric;
          }
          return acc;
        }, {});
        
        const updatedServices = services.map(service => {
          const serviceId = Object.entries(SERVICE_NAMES).find(
            ([_, name]) => name === service.name
          )?.[0];
          
          if (!serviceId || !latestMetricsByService[serviceId]) {
            return {
              ...service,
              lastUpdated: new Date()
            };
          }
          
          const metric = latestMetricsByService[serviceId];
          
          return {
            ...service,
            status: mapStatusToServiceStatus(metric.status),
            latency: metric.response_time,
            lastUpdated: new Date(metric.checked_at),
            message: metric.message
          };
        });
        
        setServices(updatedServices);
        setLastUpdated(new Date());
        
        const healthyCount = metricsArray.filter((m: any) => m.status === 'healthy').length;
        toast({
          title: useMockData ? "Mock metrics generated" : "Metrics updated",
          description: useMockData 
            ? `Successfully generated mock data for ${metricsArray.length} services.`
            : `Successfully collected metrics from ${healthyCount} healthy services.`,
        });
      } else {
        // Fall back to fetching stored metrics if collection doesn't return data
        console.log("No data in collection response, fetching stored metrics...");
        await fetchCurrentMetrics();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error triggering metrics collection:", error);
      setError(`Failed to refresh metrics: ${error.message || "Unknown error"}`);
      toast({
        title: "Error",
        description: `Failed to refresh metrics: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCurrentMetrics();
  }, []);
  
  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "outage":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusText = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "Operativo";
      case "degraded":
        return "Degradado";
      case "outage":
        return "Inactivo";
      case "unknown":
        return "Desconocido";
      default:
        return "Desconocido";
    }
  };

  const getStatusDescription = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "El servicio está funcionando correctamente";
      case "degraded":
        return "El servicio está operativo pero con rendimiento reducido o errores ocasionales";
      case "outage":
        return "El servicio no está respondiendo o está completamente inoperativo";
      case "unknown":
        return "No hay datos disponibles sobre el estado del servicio";
      default:
        return "";
    }
  };

  // Calcular porcentajes para la barra de progreso
  const healthyCount = services.filter(s => s.status === "operational").length;
  const degradedCount = services.filter(s => s.status === "degraded").length;
  const outageCount = services.filter(s => s.status === "outage").length;
  const totalServices = services.length;
  
  // Calcular porcentajes para la visualización de la barra
  const healthyPercentage = (healthyCount / totalServices) * 100;
  const degradedPercentage = (degradedCount / totalServices) * 100;
  const outagePercentage = (outageCount / totalServices) * 100;
  
  // Porcentaje general de salud del sistema
  const overallHealthPercentage = Math.round((healthyCount / Math.max(1, totalServices)) * 100);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Estado de Microservicios</CardTitle>
            <p className="text-xs text-muted-foreground">
              Última actualización: {lastUpdated ? lastUpdated.toLocaleString() : 'Nunca'}
              {developmentMode && " (Modo Desarrollo)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="mock-mode" 
                checked={useMockData}
                onCheckedChange={setUseMockData}
              />
              <Label htmlFor="mock-mode" className="text-xs">Modo Simulación</Label>
            </div>
          
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerMetricsCollection}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-3 text-xs">
            {error}
          </div>
        )}
        
        {developmentMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 mb-3 text-xs">
            <p className="font-medium">Modo de Desarrollo Activo</p>
            <p>Los datos mostrados pueden ser simulados para propósitos de desarrollo. 
            Active "Modo Simulación" si los microservicios reales no están desplegados o accesibles.</p>
          </div>
        )}
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Saludables: {healthyCount}</span>
            <span>Degradados: {degradedCount}</span>
            <span>Caídos: {outageCount}</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-gray-200 flex">
            {healthyPercentage > 0 && (
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${healthyPercentage}%` }}
                title={`${healthyCount} servicios operativos`}
              />
            )}
            {degradedPercentage > 0 && (
              <div 
                className="bg-amber-500 h-full" 
                style={{ width: `${degradedPercentage}%` }}
                title={`${degradedCount} servicios degradados`}
              />
            )}
            {outagePercentage > 0 && (
              <div 
                className="bg-red-500 h-full" 
                style={{ width: `${outagePercentage}%` }}
                title={`${outageCount} servicios caídos`}
              />
            )}
          </div>
          <p className="text-xs mt-1 text-muted-foreground">{overallHealthPercentage}% del sistema operativo</p>
        </div>
        
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between text-xs p-2 bg-muted/10 rounded-md">
              <div>
                <div className="font-medium flex items-center">
                  <Server className="h-3 w-3 mr-1" />
                  {service.name}
                </div>
                {service.message && (
                  <p className="text-xs text-muted-foreground mt-0.5">{service.message}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {getStatusIcon(service.status)}
                <span title={getStatusDescription(service.status)}>{getStatusText(service.status)}</span>
                {service.latency !== undefined && (
                  <span className={`text-muted-foreground ml-1 ${
                    service.status === "operational" ? "text-green-600" : 
                    service.status === "degraded" ? "text-amber-600" : ""
                  }`}>
                    ({service.latency}ms)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">URLs de monitoreo:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(SERVICE_URLS).map(([serviceId, url]) => (
              <div key={serviceId} className="truncate">
                <span className="font-medium">{SERVICE_NAMES[serviceId as keyof typeof SERVICE_NAMES]}:</span>
                <span className="ml-1 text-xs">{url}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
