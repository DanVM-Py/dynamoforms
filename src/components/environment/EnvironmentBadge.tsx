
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { environment, getEnvironmentName } from '@/config/environment';

export const EnvironmentBadge = () => {
  // Get environment color based on environment
  const getEnvColor = (): string => {
    switch (environment) {
      case 'development':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'qa':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'production':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Badge className={`${getEnvColor()} gap-1 cursor-pointer`} title={`Current environment: ${getEnvironmentName()}`}>
      <Info className="h-3 w-3" />
      {getEnvironmentName()}
    </Badge>
  );
};
