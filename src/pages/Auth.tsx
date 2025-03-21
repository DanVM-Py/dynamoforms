import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";

const Auth = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();

  // Check for confirmation success query parameter
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/';

  // Handle confirmation success notification
  useConfirmationEffect(confirmationSuccess);

  // Debug logging for auth flow
  useEffect(() => {
    console.log("Auth component state:", {
      userExists: !!user,
      userProfile: userProfile ? {
        id: userProfile.id,
        emailConfirmed: userProfile.email_confirmed
      } : null,
      redirectTo,
      confirmationSuccess,
      currentPath: location.pathname,
      checkingSession
    });
  }, [user, userProfile, redirectTo, confirmationSuccess, location.pathname, checkingSession]);

  // Handle authentication and redirections
  useEffect(() => {
    const handleAuthSession = async () => {
      try {
        setCheckingSession(true);
        
        // Check if user is trying to access auth page directly when already logged in
        const directAccess = !location.search.includes('redirect');
        
        if (directAccess && user) {
          console.log("Direct access to auth page with active session");
          
          // If user's email is not confirmed, redirect to confirm-email page
          if (userProfile && !userProfile.email_confirmed) {
            console.log("User authenticated but email not confirmed, redirecting to confirm-email");
            navigate("/confirm-email", { replace: true });
            return;
          }
          
          // If direct access and email is confirmed, we can either sign out or redirect
          if (userProfile?.email_confirmed) {
            // User is fully authenticated, redirect to home or requested page
            console.log("User already authenticated with confirmed email, redirecting to:", redirectTo);
            navigate(redirectTo, { replace: true });
            return;
          }
          
          // Otherwise clear session for new login
          await signOut();
        } else if (user) {
          // User is already logged in, check email confirmation
          if (!userProfile?.email_confirmed) {
            console.log("User authenticated but email not confirmed, redirecting to confirm-email");
            navigate("/confirm-email", { replace: true });
          } else {
            // User is fully authenticated, redirect to home or requested page
            console.log("User already authenticated with confirmed email, redirecting to:", redirectTo);
            navigate(redirectTo, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setCheckingSession(false);
      }
    };
    
    handleAuthSession();
  }, [navigate, redirectTo, signOut, location.search, user, userProfile]);

  if (checkingSession) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <LoadingAuthState />
      </PageContainer>
    );
  }

  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <AuthCard 
        redirectTo={redirectTo} 
        confirmationSuccess={confirmationSuccess} 
      />
    </PageContainer>
  );
};

export default Auth;
