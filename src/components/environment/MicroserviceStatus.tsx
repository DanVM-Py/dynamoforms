
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { environment } from "@/config/environment";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ServiceMetric {
  service_id: string;
  status: "healthy" | "degraded" | "down";
  response_time: number;
  checked_at: string;
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "planned" | "upcoming" | "in_progress" | "completed";
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

// Function to fetch service metrics from our Edge Function
const fetchServiceMetrics = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'GET',
    });
    
    if (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
    
    if (!data || !data.metrics || !Array.isArray(data.metrics)) {
      return { metrics: [] };
    }
    
    return data;
  } catch (error) {
    console.error('Error in fetchServiceMetrics:', error);
    throw error;
  }
};

// This component shows the current microservice architecture status
export const MicroserviceStatus = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Use React Query to fetch and cache service metrics
  const { data, status, refetch } = useQuery({
    queryKey: ['serviceMetrics'],
    queryFn: fetchServiceMetrics,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 60 * 1000, // Consider data stale after 1 minute
  });
  
  // Prepare services with status information
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "completed", lastUpdated: new Date() },
    { name: "Auth Service", status: "completed", lastUpdated: new Date() },
    { name: "Projects Service", status: "completed", lastUpdated: new Date() },
    { name: "Forms Service", status: "completed", lastUpdated: new Date() },
    { name: "Tasks Service", status: "completed", lastUpdated: new Date() },
    { name: "Notifications Service", status: "completed", lastUpdated: new Date() }
  ]);
  
  // Update services when data is fetched
  useEffect(() => {
    if (data?.metrics && Array.isArray(data.metrics)) {
      // Group metrics by service_id to get the latest for each service
      const latestMetricsByService = data.metrics.reduce((acc, metric) => {
        if (!acc[metric.service_id] || 
            new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
          acc[metric.service_id] = metric;
        }
        return acc;
      }, {} as Record<string, ServiceMetric>);
      
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
    }
  }, [data?.metrics]);

  // Check actual service status
  const fetchServiceStatus = async () => {
    setIsLoading(true);
    
    try {
      // Use the same function as the query
      await refetch();
      
      toast({
        title: "Estado actualizado",
        description: "Información de microservicios actualizada correctamente."
      });
    } catch (error) {
      console.error("Error fetching service status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de los microservicios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manually trigger a full refresh (with clearing old data)
  const refreshServiceStatus = async () => {
    setIsLoading(true);
    
    try {
      toast({
        title: "Actualizando estado",
        description: "Recolectando nuevas métricas de servicios..."
      });
      
      // Use our edge function to refresh metrics with clearing
      const { data, error } = await supabase.functions.invoke('collect-metrics', {
        method: 'POST',
        body: { 
          clearBeforeInsert: true,
          forceFetch: true
        }
      });
      
      if (error) {
        console.error('Error al actualizar métricas:', error);
        throw error;
      }
      
      console.log("Refreshed metrics data:", data);
      
      // After refreshing, update the UI with the new data
      await refetch();
      
      toast({
        title: "Estado actualizado",
        description: "Información de microservicios actualizada correctamente."
      });
    } catch (error) {
      console.error("Error refreshing service status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de los microservicios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "completed":
      case "operational":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "outage":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "planned":
      case "upcoming":
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
      case "in_progress":
        return "Migrando";
      case "planned":
        return "Planificado";
      case "upcoming":
      default:
        return "Próximamente";
    }
  };

  return (
    <div className="bg-background border rounded-md p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Estado de Microservicios</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={refreshServiceStatus}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="sr-only">Actualizar estado</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar estado de microservicios</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        <p>Los estados se actualizan automáticamente cada 5 minutos.</p>
      </div>
    </div>
  );
};
