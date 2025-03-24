
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [loading, setLoading] = useState(true);
  const [authCheckStarted, setAuthCheckStarted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
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
    if (authCheckStarted) return; // Prevent multiple auth checks
    
    const checkAuth = async () => {
      try {
        setAuthCheckStarted(true);
        console.log("Checking authentication status...");
        console.log("Auth check started at:", Date.now());
        
        // Get current session with a simpler approach
        const { data, error } = await supabase.auth.getSession();
        
        console.log("Auth check completed at:", Date.now());
        
        if (error) {
          console.error("Session check error:", error);
          setLoading(false);
          return;
        }
        
        if (!data.session) {
          console.log("No active session found");
          setLoading(false);
          return;
        }
        
        // User is already logged in, redirect to the target page
        console.log("User is already authenticated, redirecting to:", redirectTo);
        navigate(redirectTo, { replace: true });
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };
    
    // Check auth with a failsafe timeout
    checkAuth();
    
    // Set a backup timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      console.log("Auth check timeout reached");
      console.log("Current state:", { loading, authCheckStarted });
      setLoading(false);
    }, 8000); // Reduced timeout to 8 seconds
    
    return () => clearTimeout(timeoutId);
  }, [navigate, redirectTo, loading, authCheckStarted]);

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
