
import React from 'react';
import { isDevelopment } from '@/config/environment';
import { AlertTriangle } from 'lucide-react';

export const EnvironmentIndicator = () => {
  // Only show in development environment
  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="bg-blue-500 text-white text-xs font-medium px-2 py-1 fixed bottom-0 right-0 z-50 flex items-center gap-1 rounded-tl-md">
      <AlertTriangle className="h-3 w-3" />
      <span>Ambiente de Desarrollo</span>
    </div>
  );
};
