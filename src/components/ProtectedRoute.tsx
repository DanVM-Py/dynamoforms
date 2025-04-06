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
  const { user, session, loading: authContextLoading, isGlobalAdmin, isProjectAdmin, isInitialized, currentProjectId } = useAuth();
  const { loading: projectsLoading } = useSidebarProjects();

  const combinedComponentLoading = authContextLoading || projectsLoading;

  const shouldShowLoader = showLoading && (!isInitialized || combinedComponentLoading);

  console.log(
    `[ProtectedRoute DEBUG] Render Check. Path: ${location.pathname}, isInitialized: ${isInitialized}, authLoading: ${authContextLoading}, projectsLoading: ${projectsLoading}, ShouldShowLoader: ${shouldShowLoader}, User: ${!!user}, isGlobalAdmin: ${isGlobalAdmin}, currentProjectId: ${currentProjectId}`
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
    console.log(`[ProtectedRoute DEBUG] Path (${location.pathname}) does not require auth/project checks. Rendering children.`);
    return <>{children}</>;
  }
  
  const isEffectivelyAuthenticated = !!user;

  console.log(`[ProtectedRoute DEBUG] Auth Check. requireAuth: ${requireAuth}, isEffectivelyAuthenticated: ${isEffectivelyAuthenticated}`);

  if (requireAuth && !isEffectivelyAuthenticated) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to auth page");
    cleanupAuthState();
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${encodeURIComponent(currentPath)}` : ""}`} replace />;
  }
  
  const isEffectivelyGlobalAdmin = isGlobalAdmin;

  console.log(`[ProtectedRoute DEBUG] Global Admin Check. requireGlobalAdmin: ${requireGlobalAdmin}, isEffectivelyGlobalAdmin: ${isEffectivelyGlobalAdmin}`);

  if (requireGlobalAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Global admin access required but user is not a global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador Global.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  console.log(`[ProtectedRoute DEBUG] Project Admin Check. requireProjectAdmin: ${requireProjectAdmin}, isProjectAdmin: ${isProjectAdmin}, isGlobalAdmin: ${isEffectivelyGlobalAdmin}`);

  if (requireProjectAdmin && !isProjectAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Project admin access required but user is not a project admin or global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador de Proyecto.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  const needsProjectCheck = requireProjectAccess && location.pathname !== '/projects';
  console.log(`[ProtectedRoute DEBUG] Project Access Check Needed? ${needsProjectCheck} (requireProjectAccess: ${requireProjectAccess}, path: ${location.pathname})`);

  if (needsProjectCheck && !currentProjectId) {
    console.log(`[ProtectedRoute] Project access required (requireProjectAccess=${requireProjectAccess}) but no currentProjectId (${currentProjectId}). Redirecting user (isGlobalAdmin: ${isEffectivelyGlobalAdmin}) to /no-project-access.`);
    return <Navigate to="/no-project-access" replace />;
  }

  console.log(`[ProtectedRoute] Access GRANTED for path: ${location.pathname}. User: ${user?.id}, isGlobalAdmin: ${isEffectivelyGlobalAdmin}, ProjectID: ${currentProjectId}`);
  return <>{children}</>;
};

export default ProtectedRoute;
