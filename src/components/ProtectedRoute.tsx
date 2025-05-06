import React, { useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarProjects } from '@/hooks/use-sidebar-projects';
import { Loader2 } from 'lucide-react';
import { cleanupAuthState } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

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

  logger.debug(
    `[ProtectedRoute DEBUG] Render Check. Path: ${location.pathname}, isInitialized: ${isInitialized}, authLoading: ${authContextLoading}, projectsLoading: ${projectsLoading}, ShouldShowLoader: ${shouldShowLoader}, User: ${!!user}, isGlobalAdmin: ${isGlobalAdmin}, isProjectAdmin: ${isProjectAdmin}, currentProjectId: ${currentProjectId}`
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
    logger.debug(`[ProtectedRoute DEBUG] Path (${location.pathname}) does not require auth/project checks. Rendering children.`);
    return <>{children}</>;
  }
  
  const isEffectivelyAuthenticated = !!user;

  logger.debug(`[ProtectedRoute DEBUG] Auth Check. requireAuth: ${requireAuth}, isEffectivelyAuthenticated: ${isEffectivelyAuthenticated}`);

  if (requireAuth && !isEffectivelyAuthenticated) {
    logger.info("User not authenticated, redirecting to auth page");
    cleanupAuthState();
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${encodeURIComponent(currentPath)}` : ""}`} replace />;
  }
  
  const isEffectivelyGlobalAdmin = isGlobalAdmin;

  logger.debug(`[ProtectedRoute DEBUG] Global Admin Check. requireGlobalAdmin: ${requireGlobalAdmin}, isEffectivelyGlobalAdmin: ${isEffectivelyGlobalAdmin}`);

  if (requireGlobalAdmin && !isEffectivelyGlobalAdmin) {
    logger.warn("Global admin access required but user is not a global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador Global.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  logger.debug(`[ProtectedRoute DEBUG] Project Admin Check. requireProjectAdmin: ${requireProjectAdmin}, isProjectAdmin: ${isProjectAdmin}, isGlobalAdmin: ${isEffectivelyGlobalAdmin}, currentProjectId: ${currentProjectId}`);

  if (requireProjectAdmin && !isEffectivelyGlobalAdmin && !(isProjectAdmin && currentProjectId)) {
    logger.warn(`Project admin access required. User isProjectAdmin=${isProjectAdmin}, currentProjectId=${currentProjectId}. Access denied.`);
    toast({ title: "Acceso Denegado", description: "Necesitas ser Administrador del proyecto seleccionado.", variant: "destructive" });
    return <Navigate to="/no-project-access" replace />;
  }

  // --- Chequeo general de acceso a proyecto (si no se requiere admin específico) ---
  // La declaración de needsProjectCheck se hace aquí una sola vez.
  const needsProjectCheck = requireProjectAccess && 
                            !requireGlobalAdmin && 
                            !requireProjectAdmin && 
                            location.pathname !== '/'; // Evitar chequeo en la ruta raíz si no se requiere admin
                            
  logger.debug(`[ProtectedRoute DEBUG] General Project Access Check Needed? ${needsProjectCheck} (requireProjectAccess: ${requireProjectAccess}, path: ${location.pathname})`);

  if (needsProjectCheck && !currentProjectId) {
    logger.info(`[ProtectedRoute] General project access required but no currentProjectId. Redirecting user to /no-project-access.`);
    return <Navigate to="/no-project-access" replace />; 
  }

  // Si pasó todas las verificaciones, renderiza el contenido protegido
  logger.debug(`[ProtectedRoute DEBUG] All checks passed for path: ${location.pathname}. Rendering children.`);
  return <>{children}</>;
};

export default ProtectedRoute;
