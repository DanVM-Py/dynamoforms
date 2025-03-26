
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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
  const { 
    user, 
    userProfile, 
    loading, 
    isGlobalAdmin, 
    isProjectAdmin, 
    currentProjectId 
  } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  
  // Set a time limit for loading states
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Loading timeout reached, proceeding with current state");
        setShowLoading(false);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Check the localStorage for global admin status as a fallback
  const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
  const isUserGlobalAdmin = isGlobalAdmin || storedIsGlobalAdmin;
  
  // Debug logging
  useEffect(() => {
    console.log("ProtectedRoute state:", { 
      path: location.pathname,
      isAuthenticated: !!user,
      userProfile,
      loading, 
      isGlobalAdmin, 
      storedIsGlobalAdmin,
      effectiveIsGlobalAdmin: isUserGlobalAdmin,
      isProjectAdmin,
      currentProjectId,
      requireProjectAccess
    });
  }, [user, userProfile, loading, isGlobalAdmin, storedIsGlobalAdmin, isUserGlobalAdmin, isProjectAdmin, currentProjectId, location.pathname, requireProjectAccess]);
  
  // Show loading state
  if (loading && showLoading) {
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

  // Allow access to no-project-access and auth routes regardless of auth state
  if (location.pathname === "/no-project-access" || location.pathname === "/auth" || location.pathname.startsWith("/public")) {
    return <>{children}</>;
  }

  // Check if user is authenticated
  if (!user) {
    console.log("User not authenticated, redirecting to auth page");
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Check global admin access - use both context and localStorage
  if (requireGlobalAdmin && !isUserGlobalAdmin) {
    console.log("Global admin access required but user is not a global admin");
    return <Navigate to="/" replace />;
  }

  // Check project admin access - global admins automatically have project admin privileges
  if (requireProjectAdmin && !isProjectAdmin && !isUserGlobalAdmin) {
    console.log("Project admin access required but user is not a project admin or global admin");
    return <Navigate to="/" replace />;
  }

  // Check project access - but don't redirect if global admin OR we're already on no-project-access
  if (requireProjectAccess && !currentProjectId && !isUserGlobalAdmin) {
    console.log("Project access required but user has no project access and is not global admin");
    return <Navigate to="/no-project-access" replace />;
  }

  // If we reach here, render children
  return <>{children}</>;
};

export default ProtectedRoute;
