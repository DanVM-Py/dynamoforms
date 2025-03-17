
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { environment } from "@/config/environment";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "planned" | "upcoming";
  latency?: number;
}

// This component would be expanded during the actual migration to show real-time service status
export const MicroserviceStatus = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "API Gateway", status: "upcoming" },
    { name: "Auth Service", status: "upcoming" },
    { name: "Projects Service", status: "upcoming" },
    { name: "Forms Service", status: "upcoming" },
    { name: "Tasks Service", status: "upcoming" },
    { name: "Notifications Service", status: "upcoming" }
  ]);

  // In a real implementation, this would fetch actual service status
  useEffect(() => {
    // This is just a placeholder for demonstration
    // During actual migration, this would connect to a service health endpoint
    const intervalId = setInterval(() => {
      // Simulated status updates - would be replaced with actual API calls
      if (environment !== 'production') {
        console.log("Fetching service status would happen here in a real implementation");
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "outage":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "planned":
      case "upcoming":
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusText = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded";
      case "outage":
        return "Outage";
      case "planned":
        return "Planned";
      case "upcoming":
      default:
        return "Coming Soon";
    }
  };

  if (environment === 'production') {
    return null; // Don't show in production yet
  }

  return (
    <div className="bg-background border rounded-md p-4 mt-4">
      <h3 className="text-sm font-medium mb-2">Microservice Migration Status</h3>
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
    </div>
  );
};
