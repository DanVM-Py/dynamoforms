
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
}

const ProtectedRoute = ({ 
  children, 
  requireGlobalAdmin = false,
  requireProjectAdmin = false,
  requireRegularUser = false,
  requireApprover = false
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
    return <Navigate to="/auth" replace />;
  }

  // Second loading state - waiting for profile data
  if ((requireGlobalAdmin || requireProjectAdmin || requireRegularUser || requireApprover) && loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600 font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Debug the roles
  console.log("Role check for protected route:", {
    isGlobalAdmin,
    isProjectAdmin,
    isApprover,
    requireGlobalAdmin,
    requireProjectAdmin,
    requireRegularUser,
    requireApprover
  });

  // If global admin is required and user is not a global admin, redirect
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  // If project admin is required and user is neither project admin nor global admin, redirect
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Access denied: Project admin required");
    return <Navigate to="/" replace />;
  }

  // If regular user is required and user is either global or project admin, redirect
  if (requireRegularUser && (isGlobalAdmin || isProjectAdmin)) {
    console.log("Access denied: Regular user required");
    return <Navigate to="/" replace />;
  }

  // If approver is required and user is neither approver nor global admin, redirect
  if (requireApprover && !isApprover && !isGlobalAdmin) {
    console.log("Access denied: Approver required");
    return <Navigate to="/" replace />;
  }

  // If all checks pass, render the children
  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;
