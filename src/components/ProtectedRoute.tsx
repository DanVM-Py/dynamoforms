
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
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

  // First loading state - waiting for authentication
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    console.log("User not authenticated, redirecting to auth page");
    return <Navigate to="/auth" replace />;
  }

  // Second loading state - waiting for profile data
  if ((requireGlobalAdmin || requireProjectAdmin || requireRegularUser || requireApprover || requireFormAccess || requiredRole) && loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

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

  // If project admin is required, allow both project admins and global admins (since global admins have higher privileges)
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

  // All checks passed, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
