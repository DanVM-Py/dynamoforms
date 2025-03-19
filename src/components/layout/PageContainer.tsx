
import React from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { HIDE_SIDEBAR_PATHS } from '@/hooks/use-sidebar-state';
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
  
  // Check if current path is in hide sidebar paths
  const isHiddenSidebarPath = HIDE_SIDEBAR_PATHS.some(path => 
    location.pathname === path || 
    location.pathname.startsWith(`${path}/`)
  );
  
  // Only hide sidebar if explicitly requested OR if path is in hidden paths
  const shouldHideSidebar = hideSidebar || isHiddenSidebarPath;
  
  // Render sidebar if user is authenticated and sidebar should not be hidden
  const shouldShowSidebar = isAuthenticated && !shouldHideSidebar;
  
  // Debug log for diagnosis
  console.log('PageContainer sidebar check:', {
    path: location.pathname,
    hideSidebar,
    isHiddenSidebarPath,
    shouldHideSidebar,
    shouldShowSidebar,
    isAuthenticated
  });
  
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
