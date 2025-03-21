
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
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
  const { user, userProfile, loading, isGlobalAdmin, isProjectAdmin } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [hasProjectAccess, setHasProjectAccess] = useState<boolean | null>(null);
  const [checkingProjectAccess, setCheckingProjectAccess] = useState(false);
  
  // Add a time limit to force continuation after 15 seconds (increased from 3) to avoid infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || checkingProjectAccess) {
        console.log("Tiempo de espera para carga alcanzado, continuando con estado actual");
        setShowLoading(false);
      }
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [loading, checkingProjectAccess]);
  
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
      userProfile
    });
  }, [user, userProfile, loading, isGlobalAdmin, isProjectAdmin, hasProjectAccess, location.pathname]);
  
  // Check if the user has access to any project
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!user || !requireProjectAccess) {
        setHasProjectAccess(true);
        return;
      }
      
      try {
        setCheckingProjectAccess(true);
        
        // Global admins automatically have access to all projects
        if (isGlobalAdmin) {
          setHasProjectAccess(true);
          return;
        }
        
        // Check if user has active membership in any project
        const { data, error } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);
          
        if (error) {
          console.error("Error al verificar acceso a proyecto:", error);
          setHasProjectAccess(false);
          return;
        }
        
        setHasProjectAccess(data && data.length > 0);
      } catch (error) {
        console.error("Error en checkProjectAccess:", error);
        setHasProjectAccess(false);
      } finally {
        setCheckingProjectAccess(false);
      }
    };
    
    if (user) {
      checkProjectAccess();
    }
  }, [user, isGlobalAdmin, requireProjectAccess]);
  
  if ((loading || checkingProjectAccess) && showLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
          <p className="text-gray-400 text-xs mt-2">Si esto tarda demasiado, intenta recargar la página</p>
        </div>
      </div>
    );
  }

  // Always allow access to authentication page and public routes
  if (location.pathname === "/auth" || location.pathname.startsWith("/public")) {
    return <>{children}</>;
  }

  // Step 1: Check if user is authenticated (except for auth page and public routes)
  const isPublicRoute = location.pathname.startsWith("/public") || location.pathname === "/auth";
  if (!user && !isPublicRoute) {
    console.log("ProtectedRoute: Usuario no autenticado, redirigiendo a página de autenticación");
    // Save current path for redirect after login
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Special handling for confirm-email page - accessible if user is authenticated
  // regardless of email confirmation status
  if (location.pathname === "/confirm-email") {
    // For confirm-email page, only need user to be authenticated
    return <>{children}</>;
  }

  // Step 2: Check if email is confirmed for all routes except confirm-email
  if (user && userProfile && userProfile.email_confirmed === false && location.pathname !== "/confirm-email") {
    console.log("ProtectedRoute: Correo no confirmado, redirigiendo a página de confirmación de correo");
    return <Navigate to="/confirm-email" replace />;
  }

  // Step 3: Check if user has access to any project
  if (requireProjectAccess && hasProjectAccess === false && location.pathname !== "/no-project-access") {
    console.log("ProtectedRoute: Sin acceso a proyecto, redirigiendo a página de sin acceso a proyecto");
    return <Navigate to="/no-project-access" replace />;
  }

  // Step 4: Check global admin access
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador global");
    return <Navigate to="/" replace />;
  }

  // Step 5: Check project admin access
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador de proyecto");
    return <Navigate to="/" replace />;
  }

  // If we reach here, render children
  return <>{children}</>;
};

export default ProtectedRoute;
