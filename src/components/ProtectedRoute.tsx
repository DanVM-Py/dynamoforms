
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
  
  // Agregar un tiempo límite para forzar la continuación después de 3 segundos para evitar carga infinita
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || checkingProjectAccess) {
        console.log("Tiempo de espera para carga alcanzado, continuando con estado actual");
        setShowLoading(false);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [loading, checkingProjectAccess]);
  
  // Registro de depuración para seguir cambios de estado
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
  
  // Verificar si el usuario tiene acceso a algún proyecto
  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!user || !requireProjectAccess) {
        setHasProjectAccess(true);
        return;
      }
      
      try {
        setCheckingProjectAccess(true);
        
        // Los administradores globales automáticamente tienen acceso a todos los proyectos
        if (isGlobalAdmin) {
          setHasProjectAccess(true);
          return;
        }
        
        // Verificar si el usuario tiene membresía activa en algún proyecto
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

  // Siempre permitir acceso a página de autenticación y rutas públicas
  if (location.pathname === "/auth" || location.pathname.startsWith("/public")) {
    return <>{children}</>;
  }

  // Paso 1: Verificar si el usuario está autenticado (excepto para la página de autenticación y rutas públicas)
  const isPublicRoute = location.pathname.startsWith("/public") || location.pathname === "/auth";
  if (!user && !isPublicRoute) {
    console.log("ProtectedRoute: Usuario no autenticado, redirigiendo a página de autenticación");
    // Guardar la ruta actual para redirigir después del inicio de sesión
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Manejo especial para la página confirm-email - queremos que sea accesible si el usuario está autenticado
  // independientemente del estado de confirmación del correo electrónico
  if (location.pathname === "/confirm-email") {
    // Para la página confirm-email, solo necesitamos que el usuario esté autenticado
    return <>{children}</>;
  }

  // Paso 2: Verificar si el correo electrónico está confirmado para todas las rutas excepto confirm-email
  if (user && userProfile && userProfile.email_confirmed === false && location.pathname !== "/confirm-email") {
    console.log("ProtectedRoute: Correo no confirmado, redirigiendo a página de confirmación de correo");
    return <Navigate to="/confirm-email" replace />;
  }

  // Paso 3: Verificar si el usuario tiene acceso a algún proyecto
  if (requireProjectAccess && hasProjectAccess === false && location.pathname !== "/no-project-access") {
    console.log("ProtectedRoute: Sin acceso a proyecto, redirigiendo a página de sin acceso a proyecto");
    return <Navigate to="/no-project-access" replace />;
  }

  // Paso 4: Verificar acceso de administrador global
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador global");
    return <Navigate to="/" replace />;
  }

  // Paso 5: Verificar acceso de administrador de proyecto
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Acceso denegado: Se requiere administrador de proyecto");
    return <Navigate to="/" replace />;
  }

  // Si llegamos aquí, renderizar los children
  return <>{children}</>;
};

export default ProtectedRoute;
