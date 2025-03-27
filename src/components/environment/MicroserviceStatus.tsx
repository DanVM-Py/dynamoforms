
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { environment } from "@/config/environment";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "planned" | "upcoming" | "in_progress" | "completed";
  latency?: number;
  lastUpdated?: Date;
}

// This component shows the current microservice architecture status
export const MicroserviceStatus = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceStatus[]>([
    { 
      name: "API Gateway", 
      status: "completed", 
      lastUpdated: new Date() 
    },
    { 
      name: "Auth Service", 
      status: "completed", 
      lastUpdated: new Date() 
    },
    { 
      name: "Projects Service", 
      status: "completed", 
      lastUpdated: new Date() 
    },
    { 
      name: "Forms Service", 
      status: "completed", 
      lastUpdated: new Date() 
    },
    { 
      name: "Tasks Service", 
      status: "completed", 
      lastUpdated: new Date() 
    },
    { 
      name: "Notifications Service", 
      status: "completed", 
      lastUpdated: new Date() 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Check actual service status
  const fetchServiceStatus = async () => {
    setIsLoading(true);
    
    try {
      // Use our edge function to get actual metrics
      const { data, error } = await supabase.functions.invoke('collect-metrics', {
        method: 'GET',
      });
      
      if (error) throw error;
      
      if (data && data.metrics && data.metrics.length > 0) {
        // Map the metrics data to our service status format
        const updatedServices = services.map(service => {
          const serviceName = service.name.split(' ')[0].toLowerCase();
          const metric = data.metrics.find(m => m.service_id === serviceName);
          
          if (!metric) return service;
          
          // Map the status from metrics
          let status: ServiceStatus['status'] = 'completed';
          if (metric.status === 'degraded') status = 'degraded';
          if (metric.status === 'down') status = 'outage';
          
          return {
            ...service,
            status,
            latency: metric.response_time,
            lastUpdated: new Date()
          };
        });
        
        setServices(updatedServices);
      }
      
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

  // Check status on mount
  useEffect(() => {
    fetchServiceStatus();
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
                onClick={fetchServiceStatus}
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
        <p>La migración a microservicios ha sido completada.</p>
        <p>Todos los servicios están operativos y funcionando como instancias independientes.</p>
      </div>
    </div>
  );
};
