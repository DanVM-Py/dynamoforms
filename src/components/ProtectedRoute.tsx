import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireGlobalAdmin?: boolean;
  requireProjectAdmin?: boolean;
  requireRegularUser?: boolean;
  requireApprover?: boolean;
  requireFormAccess?: boolean;
  requiredRole?: string;
}

const ProtectedRoute = ({ 
  children, 
  requireGlobalAdmin = false,
  requireProjectAdmin = false,
  requireRegularUser = false,
  requireApprover = false,
  requireFormAccess = false,
  requiredRole
}: ProtectedRouteProps) => {
  const { user, userProfile, loading, isGlobalAdmin, isProjectAdmin, isApprover } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const isTaskTemplatesPath = 
    location.pathname === '/task-templates' ||
    location.pathname.startsWith('/task-templates/') ||
    location.pathname.includes('task-templates');
    
  useEffect(() => {
    if (isTaskTemplatesPath) {
      console.log("ProtectedRoute: task-templates path detected", {
        path: location.pathname,
        user: !!user,
        loading
      });
    }
  }, [isTaskTemplatesPath, location.pathname, user, loading]);
  
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user && location.pathname !== "/auth") {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth page");
    return <Navigate to="/auth" replace />;
  }

  if (location.pathname === "/admin" && !isGlobalAdmin) {
    console.log("Access denied: Global admin required for admin page");
    return <Navigate to="/" replace />;
  }

  if (requiredRole === "global_admin" && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Access denied: Project admin required");
    return <Navigate to="/" replace />;
  }

  if (requireRegularUser && (isGlobalAdmin || isProjectAdmin)) {
    console.log("Access denied: Regular user required");
    return <Navigate to="/" replace />;
  }

  if (requireApprover && !isApprover && !isGlobalAdmin) {
    console.log("Access denied: Approver required");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
