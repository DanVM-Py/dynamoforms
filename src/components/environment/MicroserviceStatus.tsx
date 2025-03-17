
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { environment } from "@/config/environment";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "planned" | "upcoming" | "in_progress";
  latency?: number;
  lastUpdated?: Date;
}

// This component shows the current microservice migration status
export const MicroserviceStatus = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceStatus[]>([
    { 
      name: "API Gateway", 
      status: "in_progress", 
      lastUpdated: new Date() 
    },
    { 
      name: "Auth Service", 
      status: "planned", 
      lastUpdated: new Date() 
    },
    { 
      name: "Projects Service", 
      status: "planned", 
      lastUpdated: new Date() 
    },
    { 
      name: "Forms Service", 
      status: "planned", 
      lastUpdated: new Date() 
    },
    { 
      name: "Tasks Service", 
      status: "planned", 
      lastUpdated: new Date() 
    },
    { 
      name: "Notifications Service", 
      status: "planned", 
      lastUpdated: new Date() 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulated function to fetch service status
  // In a real implementation, this would connect to a service health endpoint
  const fetchServiceStatus = async () => {
    if (environment === 'production') return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would be replaced with actual API calls in a real implementation
      // For now, we'll just simulate updating one service to show progress
      setServices(prev => prev.map(service => {
        // Simulate the API Gateway being under active migration
        if (service.name === "API Gateway") {
          return {
            ...service,
            status: "in_progress",
            lastUpdated: new Date()
          };
        }
        return service;
      }));
      
      toast({
        title: "Status actualizado",
        description: "Estado de la migración a microservicios actualizado correctamente."
      });
    } catch (error) {
      console.error("Error fetching service status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la migración",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial status check
  useEffect(() => {
    // In development/QA, check status on mount
    if (environment !== 'production') {
      fetchServiceStatus();
      
      // Set up interval for status updates
      const intervalId = setInterval(() => {
        fetchServiceStatus();
      }, 60000); // Check every minute
      
      return () => clearInterval(intervalId);
    }
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
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

  if (environment === 'production') {
    return null; // Don't show in production yet
  }

  return (
    <div className="bg-background border rounded-md p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Estado de Migración a Microservicios</h3>
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
              <p>Actualizar estado de migración</p>
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
        <p>La migración está en curso y seguirá el patrón de estrangulamiento (Strangler Pattern).</p>
        <p>Primero se migrarán los servicios menos acoplados, manteniendo la funcionalidad existente.</p>
      </div>
    </div>
  );
};
