
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
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
      sessionCheckTimeout
    });
  }, [
    user, userProfile, redirectTo, confirmationSuccess, 
    location.pathname, checkingSession, sessionCheckTimeout
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
    }, 15000); // 15 seconds

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
        const currentUser = currentSession?.user;
        const hasActiveSession = !!currentUser;
        
        setUser(currentUser || null);
        
        // Check if direct access to auth page when already signed in
        const isDirectAccess = !location.search.includes('redirect');
        
        if (hasActiveSession) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
            
          if (profileError) {
            console.error("Profile fetch error:", profileError);
          } else {
            setUserProfile(profileData);
            
            // If email not confirmed, redirect to confirm page
            // Check for email_confirmed property safely
            const emailConfirmed = 'email_confirmed' in profileData ? 
              Boolean(profileData.email_confirmed) : 
              true; // Default to true if property doesn't exist
            
            if (profileData && emailConfirmed === false) {
              console.log("Email not confirmed, redirecting to confirm page");
              navigate("/confirm-email", { replace: true });
              return;
            }
            
            // If direct access to auth with confirmed email, redirect to home
            // Safely check the email_confirmed property
            if (isDirectAccess && profileData) {
              const isEmailConfirmed = 'email_confirmed' in profileData ? 
                Boolean(profileData.email_confirmed) !== false :
                true; // Default to true if property doesn't exist
                
              if (isEmailConfirmed) {
                console.log("Authenticated with confirmed email, redirecting");
                navigate(redirectTo, { replace: true });
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error("Authentication state handling error:", error);
      } finally {
        setCheckingSession(false);
      }
    };
    
    handleAuthState();
  }, [navigate, redirectTo, location.search]);

  // Show auth card if session check complete or timed out
  if (!checkingSession || sessionCheckTimeout) {
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
