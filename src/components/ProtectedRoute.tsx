
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
  const [isValidatingAuth, setIsValidatingAuth] = useState(false);
  const [localAuthState, setLocalAuthState] = useState({
    isAuthenticated: false,
    isGlobalAdmin: false,
    isChecked: false
  });
  
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
  
  // Double-check authentication status using localStorage and direct Supabase check
  useEffect(() => {
    const checkLocalAuth = async () => {
      if (isValidatingAuth || localAuthState.isChecked) return;
      
      setIsValidatingAuth(true);
      
      try {
        // 1. Check localStorage/sessionStorage first (fastest check)
        const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true' || 
                                   sessionStorage.getItem('isGlobalAdmin') === 'true';
        
        const storedAuthState = localStorage.getItem('authState');
        let parsedAuthState = null;
        
        if (storedAuthState) {
          try {
            parsedAuthState = JSON.parse(storedAuthState);
          } catch (e) {
            console.error("Failed to parse stored auth state:", e);
          }
        }
        
        const isRecentAuth = parsedAuthState?.timestamp && 
                           (Date.now() - parsedAuthState.timestamp < 30 * 60 * 1000); // 30 minutes
        
        // 2. Get current session directly from Supabase (more reliable but slower)
        const { data } = await supabase.auth.getSession();
        const hasValidSession = !!data.session?.user;
        
        console.log("Local auth verification:", {
          storedIsGlobalAdmin,
          hasValidSession,
          parsedAuthState: !!parsedAuthState,
          isRecentAuth
        });
        
        // Set local auth state based on checks
        setLocalAuthState({
          isAuthenticated: hasValidSession || (parsedAuthState?.isAuthenticated && isRecentAuth),
          isGlobalAdmin: storedIsGlobalAdmin || (parsedAuthState?.isGlobalAdmin && isRecentAuth),
          isChecked: true
        });
        
      } catch (error) {
        console.error("Error during local auth verification:", error);
      } finally {
        setIsValidatingAuth(false);
      }
    };
    
    checkLocalAuth();
  }, [isValidatingAuth, localAuthState.isChecked, location.pathname]);
  
  // Enhanced debug logging with both context and local verification
  useEffect(() => {
    console.log("ProtectedRoute enhanced state:", { 
      path: location.pathname,
      contextAuth: {
        isAuthenticated: !!user,
        hasProfile: !!userProfile,
        isContextGlobalAdmin: isGlobalAdmin,
        isContextProjectAdmin: isProjectAdmin,
        contextLoading: loading
      },
      localAuth: {
        isLocallyAuthenticated: localAuthState.isAuthenticated,
        isLocalGlobalAdmin: localAuthState.isGlobalAdmin,
        isLocalChecked: localAuthState.isChecked
      },
      storageState: {
        storedIsGlobalAdmin: localStorage.getItem('isGlobalAdmin') === 'true',
        sessionStoredAdmin: sessionStorage.getItem('isGlobalAdmin') === 'true',
        hasAuthStateInStorage: !!localStorage.getItem('authState')
      },
      effectiveState: {
        isEffectivelyAuthenticated: !!user || localAuthState.isAuthenticated,
        isEffectivelyGlobalAdmin: isGlobalAdmin || localAuthState.isGlobalAdmin,
        currentProjectId
      },
      requireProjectAccess
    });
  }, [user, userProfile, loading, isGlobalAdmin, isProjectAdmin, currentProjectId, 
      location.pathname, requireProjectAccess, localAuthState]);
  
  // Derive effective authentication state from multiple sources
  const isEffectivelyAuthenticated = !!user || localAuthState.isAuthenticated;
  const isEffectivelyGlobalAdmin = isGlobalAdmin || localAuthState.isGlobalAdmin;
  
  // Show loading state
  if ((loading || !localAuthState.isChecked) && showLoading) {
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

  // Check if user is authenticated - using both context and direct checks
  if (!isEffectivelyAuthenticated) {
    console.log("User not authenticated, redirecting to auth page");
    const currentPath = location.pathname;
    return <Navigate to={`/auth${currentPath !== "/" ? `?redirect=${currentPath}` : ""}`} replace />;
  }

  // Check global admin access - use both context and localStorage/sessionStorage
  if (requireGlobalAdmin && !isEffectivelyGlobalAdmin) {
    console.log("Global admin access required but user is not a global admin");
    return <Navigate to="/" replace />;
  }

  // Check project admin access - global admins automatically have project admin privileges
  if (requireProjectAdmin && !isProjectAdmin && !isEffectivelyGlobalAdmin) {
    console.log("Project admin access required but user is not a project admin or global admin");
    return <Navigate to="/" replace />;
  }

  // Check project access - but don't redirect if global admin OR we're already on no-project-access
  if (requireProjectAccess && !currentProjectId && !isEffectivelyGlobalAdmin) {
    console.log("Project access required but user has no project access and is not global admin");
    return <Navigate to="/no-project-access" replace />;
  }

  // If we reach here, render children
  return <>{children}</>;
};

export default ProtectedRoute;
