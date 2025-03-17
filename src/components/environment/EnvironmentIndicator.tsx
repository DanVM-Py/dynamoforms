
import React from 'react';
import { environment, getEnvironmentName, isProduction } from '@/config/environment';
import { AlertTriangle } from 'lucide-react';

export const EnvironmentIndicator = () => {
  // Don't show anything in production
  if (isProduction) {
    return null;
  }

  // Style based on environment
  const getBgColor = () => {
    switch (environment) {
      case 'development':
        return 'bg-blue-500';
      case 'qa':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`${getBgColor()} text-white text-xs font-medium px-2 py-1 fixed bottom-0 right-0 z-50 flex items-center gap-1 rounded-tl-md`}>
      <AlertTriangle className="h-3 w-3" />
      <span>{getEnvironmentName()} Environment</span>
    </div>
  );
};
