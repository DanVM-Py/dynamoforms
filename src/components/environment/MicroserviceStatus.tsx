import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { config } from "@/config/environment";
import { customSupabase } from "@/integrations/supabase/customClient";
import { Button } from "@/components/ui/button";

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
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "completed";
  latency?: number;
  lastUpdated?: Date;
}

// Service name mapping
const SERVICE_NAMES = {
  'gateway': 'API Gateway',
  'auth': 'Auth Service',
  'projects': 'Projects Service',
  'forms': 'Forms Service',
  'tasks': 'Tasks Service',
  'notifications': 'Notifications Service'
};

// Map metrics status to service status
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
      return "completed";
  }
};

// This component shows the current microservice architecture status
export const MicroserviceStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "completed" },
    { name: "Auth Service", status: "completed" },
    { name: "Projects Service", status: "completed" },
    { name: "Forms Service", status: "completed" },
    { name: "Tasks Service", status: "completed" },
    { name: "Notifications Service", status: "completed" }
  ]);
  
  // Function to fetch current metrics - using customSupabase instance for edge function invocation
  const fetchCurrentMetrics = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching metrics data...");
      
      // Using the edge function to retrieve metrics instead of querying the table directly
      const { data, error } = await customSupabase.functions.invoke('collect-metrics', {
        method: 'GET'
      });
      
      if (error) {
        console.error("Error fetching metrics:", error);
        setIsLoading(false);
        return;
      }
      
      console.log("Metrics data received:", data);
      
      if (!data || !data.metrics || data.metrics.length === 0) {
        console.log("No metrics data available");
        setIsLoading(false);
        return;
      }
      
      // Group metrics by service_id to get the latest for each service
      const metricsArray = data.metrics;
      const latestMetricsByService = metricsArray.reduce((acc: Record<string, any>, metric: any) => {
        if (!acc[metric.service_id] || 
            new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
          acc[metric.service_id] = metric;
        }
        return acc;
      }, {});
      
      console.log("Latest metrics by service:", latestMetricsByService);
      
      // Update services with metric data
      const updatedServices = services.map(service => {
        // Get the service ID from service name
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
          lastUpdated: new Date(metric.checked_at)
        };
      });
      
      setServices(updatedServices);
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchCurrentMetrics:", error);
      setIsLoading(false);
    }
  };
  
  // Function to trigger metrics collection via edge function - using customSupabase to avoid auth issues
  const triggerMetricsCollection = async () => {
    try {
      setIsLoading(true);
      console.log("Triggering metrics collection...");
      
      // Direct invocation of the collect-metrics function with POST method
      const { data, error } = await customSupabase.functions.invoke('collect-metrics', {
        method: 'POST',
        body: { 
          forceFetch: true,
          clearBeforeInsert: false
        }
      });
      
      if (error) {
        console.error("Error triggering metrics collection:", error);
        setIsLoading(false);
        throw error;
      }
      
      console.log("Metrics collection triggered successfully:", data);
      
      // Update the UI with the collected metrics
      if (data && data.metrics && data.metrics.length > 0) {
        // Group metrics by service_id to get the latest for each service
        const metricsArray = data.metrics;
        const latestMetricsByService = metricsArray.reduce((acc: Record<string, any>, metric: any) => {
          if (!acc[metric.service_id] || 
              new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
            acc[metric.service_id] = metric;
          }
          return acc;
        }, {});
        
        // Update services with metric data
        const updatedServices = services.map(service => {
          // Get the service ID from service name
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
            lastUpdated: new Date(metric.checked_at)
          };
        });
        
        setServices(updatedServices);
        setLastUpdated(new Date());
      } else {
        // If no metrics are returned, fetch them
        await fetchCurrentMetrics();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error triggering metrics collection:", error);
      setIsLoading(false);
    }
  };
  
  // Load initial data when component mounts
  useEffect(() => {
    fetchCurrentMetrics();
  }, []);
  
  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "completed":
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
      case "completed":
        return "Completado";
      case "operational":
        return "Operativo";
      case "degraded":
        return "Degradado";
      case "outage":
        return "Inactivo";
      default:
        return "Desconocido";
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
      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between text-xs">
            <span className="font-medium">{service.name}</span>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(service.status)}
              <span>{getStatusText(service.status)}</span>
              {service.latency && <span className="text-muted-foreground ml-1">({service.latency}ms)</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        <p>Monitoreo conectado a servicios en producción.</p>
        <p>Utilice el botón "Actualizar Datos" para obtener la información más reciente.</p>
      </div>
    </div>
  );
};
