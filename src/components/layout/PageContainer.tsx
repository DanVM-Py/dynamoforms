
import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  hideSidebar?: boolean;
  title?: string;
}

export const PageContainer = ({ children, className, hideSidebar = false, title }: PageContainerProps) => {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user && !loading;
  const location = useLocation();
  
  // Check if current path is task-templates, which should always show sidebar
  const isTaskTemplatesPage = location.pathname === '/task-templates';
  const shouldShowSidebar = isAuthenticated && (!hideSidebar || isTaskTemplatesPage);
  
  // Log container rendering for debugging
  useEffect(() => {
    console.log("PageContainer rendered. User:", !!user, "Loading:", loading, "Authenticated:", isAuthenticated, "Path:", location.pathname);
  }, [user, loading, isAuthenticated, location.pathname]);
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {shouldShowSidebar && <Sidebar />}
      <main 
        className={cn(
          "flex-1 p-6", 
          (!shouldShowSidebar) ? 'w-full' : '',
          className
        )}
      >
        {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
};
