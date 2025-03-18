
import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

// Paths that should always show the sidebar regardless of hideSidebar prop
const ALWAYS_SHOW_SIDEBAR_PATHS = [
  '/task-templates',
  '/task-templates/',
  // Add any other paths that should always show sidebar here
];

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
  
  // Check if current path directly matches or is a sub-path of task-templates
  const isTaskTemplatesPath = 
    location.pathname === '/task-templates' ||
    location.pathname.startsWith('/task-templates/') ||
    location.pathname.includes('task-templates');
  
  // Force sidebar for task template paths regardless of the hideSidebar prop
  const shouldForceSidebar = isTaskTemplatesPath || 
    ALWAYS_SHOW_SIDEBAR_PATHS.some(path => 
      location.pathname === path || 
      location.pathname.startsWith(`${path}/`)
    );
  
  // Always store the current state in session storage for persistence
  useEffect(() => {
    if (shouldForceSidebar) {
      sessionStorage.setItem('forceSidebar', 'true');
      console.log('Force sidebar set to true for path:', location.pathname);
    } else if (!ALWAYS_SHOW_SIDEBAR_PATHS.some(path => location.pathname.includes(path))) {
      // Only remove if we're not on any path that should force the sidebar
      sessionStorage.removeItem('forceSidebar');
    }
  }, [shouldForceSidebar, location.pathname]);
  
  // This ensures the sidebar is shown when it should be forced
  const shouldShowSidebar = isAuthenticated && (!hideSidebar || shouldForceSidebar);
  
  // Log container rendering for debugging
  useEffect(() => {
    console.log("PageContainer rendered:", {
      user: !!user,
      loading,
      authenticated: isAuthenticated,
      path: location.pathname, 
      isTaskTemplatesPath,
      forceSidebar: shouldForceSidebar,
      showSidebar: shouldShowSidebar
    });
  }, [user, loading, isAuthenticated, location.pathname, isTaskTemplatesPath, shouldForceSidebar, shouldShowSidebar]);
  
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
