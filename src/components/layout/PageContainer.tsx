
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
  
  // List of paths that should always show sidebar
  const alwaysShowSidebarPaths = ['/task-templates'];
  
  // Check if current path is in the list of paths that should always show sidebar
  const shouldForceSidebar = alwaysShowSidebarPaths.some(path => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  
  // Determine if sidebar should be shown
  const shouldShowSidebar = isAuthenticated && (!hideSidebar || shouldForceSidebar);
  
  // Log container rendering for debugging
  useEffect(() => {
    console.log("PageContainer rendered. User:", !!user, "Loading:", loading, 
      "Authenticated:", isAuthenticated, "Path:", location.pathname, 
      "Force sidebar:", shouldForceSidebar, "Show sidebar:", shouldShowSidebar);
  }, [user, loading, isAuthenticated, location.pathname, shouldForceSidebar, shouldShowSidebar]);
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {shouldShowSidebar && <Sidebar forceVisible={shouldForceSidebar} />}
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
