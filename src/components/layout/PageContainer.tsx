
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useLocation } from "react-router-dom";
import { HIDE_SIDEBAR_PATHS } from '@/hooks/use-sidebar-state';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  hideSidebar?: boolean;
  className?: string;
}

export const PageContainer = ({
  children,
  title,
  hideSidebar = false,
  className = "p-6",
}: PageContainerProps) => {
  const location = useLocation();
  
  // Check if current path is in the paths that should hide sidebar
  const isHiddenSidebarPath = HIDE_SIDEBAR_PATHS.some(path => 
    location.pathname === path || 
    location.pathname.startsWith(`${path}/`)
  );
  
  // Respect the explicit hideSidebar prop if provided, otherwise use path-based logic
  const shouldHideSidebar = hideSidebar || isHiddenSidebarPath;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {!shouldHideSidebar && <Sidebar />}
      <main className={`flex-1 ${className}`}>
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};
