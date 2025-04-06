import React, { useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarProjects } from '@/hooks/use-sidebar-projects';
import { Loader2 } from 'lucide-react';
import { cleanupAuthState } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireGlobalAdmin?: boolean;
  requireProjectAdmin?: boolean;
  requireProjectAccess?: boolean;
  showLoading?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireGlobalAdmin = false, 
  requireProjectAdmin = false, 
  requireProjectAccess = true,
  showLoading = true 
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, session, loading: authContextLoading, isGlobalAdmin, isProjectAdmin, isInitialized } = useAuth();
  const { currentProjectId, loading: projectsLoading } = useSidebarProjects();

  const combinedComponentLoading = authContextLoading || projectsLoading;

  const shouldShowLoader = showLoading && (!isInitialized || combinedComponentLoading);

  console.log(
    `[ProtectedRoute DEBUG] Render Check. isInitialized: ${isInitialized}, authLoading: ${authContextLoading}, projectsLoading: ${projectsLoading}, CombinedComponentLoading: ${combinedComponentLoading}, ShouldShowLoader: ${shouldShowLoader}`
  );

  if (shouldShowLoader) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">
            {isInitialized ? 'Cargando datos...' : 'Inicializando sesión...'}
          </p>
        </div>
      </div>
    );
  }

  if (location.pathname === "/no-project-access" || location.pathname === "/auth" || location.pathname.startsWith("/public")) {
    return <>{children}</>;
  }
  
  const isEffectivelyAuthenticated = !!user;

  console.log(`[ProtectedRoute DEBUG] Authentication Check. isEffectivelyAuthenticated: ${isEffectivelyAuthenticated} (User: ${!!user})`);

  if (requireAuth && !isEffectivelyAuthenticated) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to auth page");
    cleanupAuthState();
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${encodeURIComponent(currentPath)}` : ""}`} replace />;
  }
  
  const isEffectivelyGlobalAdmin = isGlobalAdmin;

  if (requireGlobalAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Global admin access required but user is not a global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador Global.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  if (requireProjectAdmin && !isProjectAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Project admin access required but user is not a project admin or global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador de Proyecto.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  if (requireProjectAccess && !currentProjectId && !isEffectivelyGlobalAdmin && location.pathname !== '/projects') {
    console.log("[ProtectedRoute] Project access required but no project ID is set, redirecting to no-project-access");
    return <Navigate to="/no-project-access" replace />;
  }

  console.log("[ProtectedRoute] Access granted for path:", location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
