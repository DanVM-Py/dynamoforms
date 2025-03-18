
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { environment, isDevelopment } from '@/config/environment';

export const EnvironmentBadge = () => {
  // No mostrar en producción
  if (!isDevelopment) {
    return null;
  }

  return (
    <Badge className="bg-blue-500 hover:bg-blue-600 gap-1 cursor-pointer" title="Ambiente de desarrollo">
      <Info className="h-3 w-3" />
      Desarrollo
    </Badge>
  );
};
