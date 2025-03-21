
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

  // Check authentication status - with timeout to prevent hanging
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Set a timeout to avoid infinite loading
        const timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.log("Auth check timeout reached");
            setLoading(false);
          }
        }, 5000);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
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
        
        // User is already logged in, redirect to the target page
        console.log("Authentication valid, redirecting to:", redirectTo);
        navigate(redirectTo, { replace: true });
      } catch (error) {
        if (isMounted) {
          console.error("Auth check error:", error);
          setLoading(false);
        }
      }
    };
    
    checkAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate, redirectTo]);

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
