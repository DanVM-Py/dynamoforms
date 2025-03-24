import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  requireGlobalAdmin?: boolean;
  requireProjectAdmin?: boolean;
  requireProjectAccess?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireGlobalAdmin = false,
  requireProjectAdmin = false,
  requireProjectAccess = true
}: ProtectedRouteProps) => {
  const { user, userProfile, loading, isGlobalAdmin, isProjectAdmin, profileFetchStage } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [hasProjectAccess, setHasProjectAccess] = useState<boolean | null>(null);
  const [checkingProjectAccess, setCheckingProjectAccess] = useState(false);
  const [loadingTimeExceeded, setLoadingTimeExceeded] = useState(false);
  const [projectAccessStage, setProjectAccessStage] = useState<string>("not_started");
  
  // Set a time limit for loading states to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || checkingProjectAccess) {
        console.log("Tiempo de espera para carga alcanzado, continuando con estado actual");
        console.log("Estados finales:", { 
          loading,
          checkingProjectAccess,
          profileFetchStage,
          projectAccessStage 
        });
        setLoadingTimeExceeded(true);
        setShowLoading(false);
      }
    }, 20000); // 20 seconds
    
    return () => clearTimeout(timer);
  }, [loading, checkingProjectAccess, profileFetchStage, projectAccessStage]);
  
  // Debug logging to track state changes
  useEffect(() => {
    console.log("Estado de ProtectedRoute:", { 
      path: location.pathname,
      isAuthenticated: !!user,
      emailConfirmed: userProfile?.email_confirmed,
      loading, 
      isGlobalAdmin, 
      isProjectAdmin,
      hasProjectAccess,
      profileFetchStage,
      projectAccessStage
    });
  }, [
    user, 
    userProfile, 
    loading, 
    isGlobalAdmin, 
    isProjectAdmin, 
    hasProjectAccess, 
    location.pathname, 
    profileFetchStage, 
    projectAccessStage
  ]);
  
  // Check if the user has access to any project
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!user || !requireProjectAccess) {
        setHasProjectAccess(true);
        setProjectAccessStage("not_required");
        return;
      }
      
      try {
        setCheckingProjectAccess(true);
        setProjectAccessStage("checking");
        console.log("Verificando acceso a proyecto para usuario:", user.id);
        
        // Global admins automatically have access to all projects
        if (isGlobalAdmin) {
          console.log("Usuario es administrador global, acceso otorgado automáticamente");
          setHasProjectAccess(true);
          setProjectAccessStage("global_admin_access");
          return;
        }
        
        // Check if user has active membership in any project
        setProjectAccessStage("querying_project_users");
        console.log("Consultando membresías de proyectos activas");
        
        const { data, error } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);
          
        if (error) {
          console.error("Error al verificar acceso a proyecto:", error);
          setHasProjectAccess(false);
          setProjectAccessStage("query_error");
          return;
        }
        
        const hasAccess = data && data.length > 0;
        console.log("Resultado de acceso a proyecto:", { hasAccess, projectCount: data?.length || 0 });
        setHasProjectAccess(hasAccess);
        setProjectAccessStage(hasAccess ? "access_granted" : "no_access");
      } catch (error) {
        console.error("Error en checkProjectAccess:", error);
        setHasProjectAccess(false);
        setProjectAccessStage("exception");
      } finally {
        setCheckingProjectAccess(false);
      }
    };
    
    if (user) {
      checkProjectAccess();
    }
  }, [user, isGlobalAdmin, requireProjectAccess]);
  
  // Show loading state
  if ((loading || checkingProjectAccess) && showLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
          {loadingTimeExceeded && (
            <div className="mt-4 text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 max-w-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-medium">El proceso está tomando más tiempo de lo esperado</p>
                  <p className="text-sm mt-1">Si persiste, intenta recargar la página</p>
                  <div className="mt-2 text-xs bg-amber-100 p-2 rounded-sm">
                    <p>Estado de autenticación: {profileFetchStage || "desconocido"}</p>
                    <p>Estado de acceso a proyecto: {projectAccessStage || "desconocido"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <p className="text-gray-400 text-xs mt-2">Si esto tarda demasiado, intenta recargar la página</p>
        </div>
      </div>
    );
  }

  // Always allow access to authentication page and public routes
  if (location.pathname === "/auth" || 
      location.pathname.startsWith("/public") || 
      location.pathname === "/confirm-email") {
    return <>{children}</>;
  }

  // Check if user is authenticated (except for auth page and public routes)
  if (!user) {
    console.log("ProtectedRoute: Usuario no autenticado, redirigiendo a página de autenticación");
    // Save current path for redirect after login
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Check if email is confirmed for all protected routes
  if (user && userProfile && userProfile.email_confirmed === false) {
    console.log("ProtectedRoute: Correo no confirmado, redirigiendo a página de confirmación de correo");
    return <Navigate to="/confirm-email" state={{ email: user.email }} replace />;
  }

  // Check if user has access to any project
  if (requireProjectAccess && hasProjectAccess === false && location.pathname !== "/no-project-access") {
    console.log("ProtectedRoute: Sin acceso a proyecto, redirigiendo a página de sin acceso a proyecto");
    return <Navigate to="/no-project-access" replace />;
  }

  // Check global admin access
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador global");
    return <Navigate to="/" replace />;
  }

  // Check project admin access
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador de proyecto");
    return <Navigate to="/" replace />;
  }

  // If we reach here, render children
  return <>{children}</>;
};

export default ProtectedRoute;
