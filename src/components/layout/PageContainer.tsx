
import React from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  hideSidebar?: boolean;
  title?: string;
}

export const PageContainer = ({ children, className, hideSidebar, title }: PageContainerProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {isAuthenticated && !hideSidebar && <Sidebar />}
      <main className={cn(`flex-1 p-6 ${!isAuthenticated ? 'w-full' : ''}`, className)}>
        {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
};
