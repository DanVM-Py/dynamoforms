
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
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600">Verificando sesión...</p>
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
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Profile check - if a role is required but profile isn't loaded
  if ((requireGlobalAdmin || requireProjectAdmin || requireRegularUser || requireApprover) && !userProfile) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based access checks
  if (requireGlobalAdmin && !isGlobalAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireRegularUser && (isGlobalAdmin || isProjectAdmin)) {
    return <Navigate to="/" replace />;
  }

  if (requireApprover && !isApprover && !isGlobalAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
