
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { environment } from "@/config/environment";
import { supabase } from "@/integrations/supabase/client";

interface ServiceMetric {
  service_id: string;
  status: "healthy" | "degraded" | "down";
  response_time: number;
  checked_at: string;
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
  // Prepare services with status information
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "completed" },
    { name: "Auth Service", status: "completed" },
    { name: "Projects Service", status: "completed" },
    { name: "Forms Service", status: "completed" },
    { name: "Tasks Service", status: "completed" },
    { name: "Notifications Service", status: "completed" }
  ]);
  
  // Function to fetch current metrics
  const fetchCurrentMetrics = async () => {
    try {
      const { data, error } = await supabase.from('service_metrics')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(30);
      
      if (error) {
        console.error("Error fetching metrics:", error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("No metrics data available");
        return;
      }
      
      // Group metrics by service_id to get the latest for each service
      const latestMetricsByService = data.reduce((acc, metric) => {
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
    } catch (error) {
      console.error("Error in fetchCurrentMetrics:", error);
    }
  };
  
  // Fetch metrics on initial load
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
        <h3 className="text-sm font-medium">Estado de Microservicios</h3>
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
