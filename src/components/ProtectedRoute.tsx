
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
  
  // Debug logging to track state changes
  useEffect(() => {
    console.log("ProtectedRoute state:", { 
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
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Check if user has access to any project
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
          console.error("Error checking project access:", error);
          setHasProjectAccess(false);
          return;
        }
        
        setHasProjectAccess(data && data.length > 0);
      } catch (error) {
        console.error("Error in checkProjectAccess:", error);
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
        </div>
      </div>
    );
  }

  // Always allow access to auth page
  if (location.pathname === "/auth") {
    return <>{children}</>;
  }

  // Step 1: Check if user is authenticated (except for auth page and public routes)
  const isPublicRoute = location.pathname.startsWith("/public") || location.pathname === "/auth";
  if (!user && !isPublicRoute) {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth page");
    // Save the current path to redirect back after login
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Special handling for confirm-email page - we want this to be accessible if the user is authenticated
  // regardless of email confirmation status
  if (location.pathname === "/confirm-email") {
    // For confirm-email page, we just need user to be authenticated
    return <>{children}</>;
  }

  // Step 2: Check if email is confirmed for all routes except confirm-email
  if (user && userProfile && !userProfile.email_confirmed && location.pathname !== "/confirm-email") {
    console.log("ProtectedRoute: Email not confirmed, redirecting to confirm email page");
    return <Navigate to="/confirm-email" replace />;
  }

  // Step 3: Check if user has access to any project
  if (requireProjectAccess && hasProjectAccess === false && location.pathname !== "/no-project-access") {
    console.log("ProtectedRoute: No project access, redirecting to no project access page");
    return <Navigate to="/no-project-access" replace />;
  }

  // Step 4: Check for global admin access
  if (requireGlobalAdmin && !isGlobalAdmin) {
    console.log("Access denied: Global admin required");
    return <Navigate to="/" replace />;
  }

  // Step 5: Check for project admin access
  if (requireProjectAdmin && !isProjectAdmin && !isGlobalAdmin) {
    console.log("Access denied: Project admin required");
    return <Navigate to="/" replace />;
  }

  // If we got here, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
