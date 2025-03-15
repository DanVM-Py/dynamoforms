
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
