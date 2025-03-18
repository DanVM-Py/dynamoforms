
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
  
  // Set a maximum loading time to prevent infinite loading states
  useEffect(() => {
    // Only show the loading indicator for 5 seconds maximum
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading state while checking authentication, but only for a limited time
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

  // Immediate check for non-authenticated user to prevent unnecessary rendering
  if (!user && location.pathname !== "/auth") {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth page");
    return <Navigate to="/auth" replace />;
  }

  // Permission checks (only run these when not loading)
  // Check specific role requirement
  if (requiredRole === "global_admin" && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  // Check role restrictions
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  // If project admin is required, allow both project admins and global admins
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Access denied: Project admin required");
    return <Navigate to="/" replace />;
  }

  // If regular user is required, check that the user is NOT a global or project admin
  if (requireRegularUser && (isGlobalAdmin || isProjectAdmin)) {
    console.log("Access denied: Regular user required");
    return <Navigate to="/" replace />;
  }

  // If approver is required, allow both approvers and global admins
  if (requireApprover && !isApprover && !isGlobalAdmin) {
    console.log("Access denied: Approver required");
    return <Navigate to="/" replace />;
  }

  // All checks passed or not required, render children
  return <>{children}</>;
};

export default ProtectedRoute;
