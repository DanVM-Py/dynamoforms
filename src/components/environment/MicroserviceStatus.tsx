
import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { customSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ServiceMetric {
  service_id: string;
  status: "healthy" | "degraded" | "down";
  response_time: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
  request_count: number;
  checked_at: string;
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
  message?: string;
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
  'gateway': 'https://api.dynamoforms.app/health',
  'auth': 'https://api.dynamoforms.app/auth/health',
  'projects': 'https://api.dynamoforms.app/projects/health',
  'forms': 'https://api.dynamoforms.app/forms/health',
  'tasks': 'https://api.dynamoforms.app/tasks/health',
  'notifications': 'https://api.dynamoforms.app/notifications/health'
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
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "unknown" },
    { name: "Auth Service", status: "unknown" },
    { name: "Projects Service", status: "unknown" },
    { name: "Forms Service", status: "unknown" },
    { name: "Tasks Service", status: "unknown" },
    { name: "Notifications Service", status: "unknown" }
  ]);
  const [error, setError] = useState<string | null>(null);
  
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
      console.log("Triggering metrics collection...");
      
      toast({
        title: "Refreshing metrics",
        description: "Collecting real-time data from microservices...",
      });
      
      const { data, error } = await customSupabase.functions.invoke('collect-metrics', {
        method: 'POST',
        body: { 
          forceFetch: true,
          clearBeforeInsert: false
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
        toast({
          title: "Metrics updated",
          description: `Successfully collected metrics from ${metricsArray.length} services.`,
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

  return (
    <div className="bg-background border rounded-md p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Estado de Microservicios</h3>
          <p className="text-xs text-muted-foreground">
            Última actualización: {lastUpdated ? lastUpdated.toLocaleString() : 'Nunca'}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={triggerMetricsCollection}
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Actualizar Datos
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-3 text-xs">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between text-xs">
            <div>
              <span className="font-medium">{service.name}</span>
              {service.message && (
                <p className="text-xs text-muted-foreground">{service.message}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(service.status)}
              <span title={getStatusDescription(service.status)}>{getStatusText(service.status)}</span>
              {service.latency !== undefined && <span className="text-muted-foreground ml-1">({service.latency}ms)</span>}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-muted-foreground">
        <p>Monitoreo conectado a servicios en producción.</p>
        <p className="font-medium">URLs de monitoreo:</p>
        <ul className="mt-1 space-y-1">
          {Object.entries(SERVICE_URLS).map(([serviceId, url]) => (
            <li key={serviceId}>
              <span className="font-medium">{SERVICE_NAMES[serviceId as keyof typeof SERVICE_NAMES]}:</span> {url}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
