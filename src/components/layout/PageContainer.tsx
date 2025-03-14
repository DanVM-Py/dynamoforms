
import React from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={cn("flex-1 p-6", className)}>
        {children}
      </main>
    </div>
  );
};
