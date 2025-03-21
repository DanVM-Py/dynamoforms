
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check for confirmation success parameter
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/';

  // Show confirmation toast if needed
  useEffect(() => {
    if (confirmationSuccess) {
      toast({
        title: "Email confirmado",
        description: "Tu correo ha sido confirmado correctamente. Ahora puedes iniciar sesión.",
      });
      
      // Remove the query parameter to avoid showing the toast again on refresh
      navigate('/auth', { replace: true });
    }
  }, [confirmationSuccess, toast, navigate]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Set a timeout to avoid infinite loading
        const timeoutId = setTimeout(() => {
          if (loading) {
            console.log("Auth check timeout reached");
            setLoading(false);
          }
        }, 5000);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        // Clear timeout as we got a response
        clearTimeout(timeoutId);
        
        if (error) {
          console.error("Session check error:", error);
          setLoading(false);
          return;
        }
        
        // No active session, just show login form
        if (!data.session) {
          console.log("No active session found");
          setLoading(false);
          return;
        }
        
        // If user is already logged in, check if email is confirmed
        const userId = data.session.user.id;
        
        // Check if user profile exists and email is confirmed
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
          
        if (profileError) {
          console.error("Profile fetch error:", profileError);
          setLoading(false);
          return;
        }
        
        if (profileData) {
          // Safely check email confirmation status 
          const needsEmailConfirmation = 'email_confirmed' in profileData && 
                profileData.email_confirmed === false;
          
          if (needsEmailConfirmation) {
            console.log("Email not confirmed, redirecting to confirm page");
            navigate("/confirm-email", { replace: true });
            return;
          }
          
          // Email is confirmed or not tracked, redirect to the target page
          console.log("Authentication valid, redirecting to:", redirectTo);
          navigate(redirectTo, { replace: true });
          return;
        } else {
          // No profile found but user is authenticated, let them proceed
          navigate(redirectTo, { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, redirectTo, loading]);

  // Show auth card if not loading
  if (!loading) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <AuthCard 
          redirectTo={redirectTo} 
          confirmationSuccess={confirmationSuccess} 
        />
      </PageContainer>
    );
  }

  // Show loading state
  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <LoadingAuthState />
    </PageContainer>
  );
};

export default Auth;
