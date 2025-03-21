
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, loading: authContextLoading } = useAuth();
  const { toast } = useToast();

  // Check for confirmation success parameter
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/';

  // Handle confirmation notification
  useConfirmationEffect(confirmationSuccess);

  // Debug logging
  useEffect(() => {
    console.log("Auth page state:", {
      userExists: !!user,
      userEmail: user?.email,
      userProfile: userProfile ? {
        id: userProfile.id,
        emailConfirmed: userProfile?.email_confirmed
      } : null,
      redirectTo,
      confirmationSuccess,
      currentPath: location.pathname,
      checkingSession,
      sessionCheckTimeout,
      authContextLoading
    });
  }, [
    user, userProfile, redirectTo, confirmationSuccess, 
    location.pathname, checkingSession, sessionCheckTimeout, authContextLoading
  ]);

  // Set timeout to avoid infinite loading - INCREASED TIMEOUT FROM 3s TO 15s
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (checkingSession) {
        console.log("Session check timeout reached, forcing state update");
        setSessionCheckTimeout(true);
        setCheckingSession(false);
        
        toast({
          title: "Tiempo de espera excedido",
          description: "La verificación de sesión está tomando más tiempo de lo esperado. Intenta iniciar sesión manualmente.",
          variant: "default",
        });
      }
    }, 15000); // Increased from 3000 to 15000 (15 seconds)

    return () => clearTimeout(timeoutId);
  }, [checkingSession, toast]);

  // Handle auth state and redirections
  useEffect(() => {
    const handleAuthState = async () => {
      try {
        setCheckingSession(true);
        
        // Explicitly check current session
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session check error:", error);
          setCheckingSession(false);
          return;
        }
        
        const currentSession = sessionData?.session;
        const hasActiveSession = !!currentSession?.user;
        
        // Check if direct access to auth page when already signed in
        const isDirectAccess = !location.search.includes('redirect');
        
        if (isDirectAccess && hasActiveSession) {
          console.log("Direct access to auth page with active session");
          
          // If user is authenticated but profile shows email not confirmed
          if (userProfile && userProfile.email_confirmed === false) {
            console.log("User authenticated but email not confirmed, redirecting");
            navigate("/confirm-email", { replace: true });
            return;
          }
          
          // If authenticated with confirmed email, redirect to home
          if (userProfile && userProfile.email_confirmed !== false) {
            console.log("User authenticated with confirmed email, redirecting");
            navigate(redirectTo, { replace: true });
            return;
          }
        } else if (user) {
          // User already logged in via context
          if (userProfile === null) {
            console.log("User authenticated but profile not loaded yet");
            // Wait for profile to load
          } else if (userProfile.email_confirmed === false) {
            console.log("User authenticated but email not confirmed");
            navigate("/confirm-email", { replace: true });
          } else {
            // User is fully authenticated, redirect
            console.log("User fully authenticated, redirecting");
            navigate(redirectTo, { replace: true });
          }
        }
      } catch (error) {
        console.error("Authentication state handling error:", error);
      } finally {
        setCheckingSession(false);
      }
    };
    
    // Only run the auth check if context is done loading
    if (!authContextLoading) {
      handleAuthState();
    }
  }, [navigate, redirectTo, location.search, user, userProfile, authContextLoading]);

  // Show auth card if session check complete or timed out
  if (!checkingSession || sessionCheckTimeout || !authContextLoading) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <AuthCard 
          redirectTo={redirectTo} 
          confirmationSuccess={confirmationSuccess} 
        />
      </PageContainer>
    );
  }

  // Otherwise show loading state
  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <LoadingAuthState />
    </PageContainer>
  );
};

export default Auth;
