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

const useLocalAuthCheck = () => {
  const [authState, setAuthState] = useState({ isChecked: false, isAuthenticated: false, isGlobalAdmin: false });

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('supabase.auth.token');
    const sessionAdmin = sessionStorage.getItem('isGlobalAdmin') === 'true';
    const localAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
    
    setAuthState({
      isChecked: true,
      isAuthenticated: !!sessionAuth,
      isGlobalAdmin: sessionAdmin || localAdmin
    });
  }, []);

  return authState;
};

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireGlobalAdmin = false, 
  requireProjectAdmin = false, 
  requireProjectAccess = true,
  showLoading = true 
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, session, loading: authContextLoading, isGlobalAdmin, isProjectAdmin } = useAuth();
  const { currentProjectId, loading: projectsLoading } = useSidebarProjects();
  const localAuthState = useLocalAuthCheck();

  const loading = authContextLoading || projectsLoading;

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando sesión y proyecto...</p>
        </div>
      </div>
    );
  }

  if (location.pathname === "/no-project-access" || location.pathname === "/auth" || location.pathname.startsWith("/public")) {
    return <>{children}</>;
  }
  
  const isEffectivelyAuthenticated = !!user || (localAuthState.isChecked && localAuthState.isAuthenticated);

  if (requireAuth && !isEffectivelyAuthenticated) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to auth page");
    cleanupAuthState();
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${encodeURIComponent(currentPath)}` : ""}`} replace />;
  }
  
  const isEffectivelyGlobalAdmin = isGlobalAdmin || (localAuthState.isChecked && localAuthState.isGlobalAdmin);

  if (requireGlobalAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Global admin access required but user is not effectively a global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador Global.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  if (requireProjectAdmin && !isProjectAdmin && !isEffectivelyGlobalAdmin) {
    console.log("[ProtectedRoute] Project admin access required but user is not a project admin or global admin");
    toast({ title: "Acceso Denegado", description: "Necesitas permisos de Administrador de Proyecto.", variant: "destructive" });
    return <Navigate to="/" replace />;
  }

  if (requireProjectAccess && !currentProjectId) {
    console.log("[ProtectedRoute] Redirecting to /no-project-access because project required and no effective project ID found (after initial load). Applies to all users including global admins.");
    return <Navigate to="/no-project-access" replace />;
  }

  console.log("[ProtectedRoute] Access granted for path:", location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
