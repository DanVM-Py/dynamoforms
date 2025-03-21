
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
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
        
        // Set user data
        setUser(data.session.user);
        
        // Check if user profile exists and email is confirmed
        if (data.session.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error("Profile fetch error:", profileError);
            setLoading(false);
            return;
          }
          
          if (profileData) {
            // Safely check email confirmation status
            const isConfirmed = !('email_confirmed' in profileData) || 
                                profileData.email_confirmed !== false;
            
            if (!isConfirmed) {
              console.log("Email not confirmed, redirecting to confirm page");
              navigate("/confirm-email", { replace: true });
              return;
            }
            
            // Email is confirmed, redirect to the target page
            console.log("Email confirmed, redirecting to:", redirectTo);
            navigate(redirectTo, { replace: true });
            return;
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };
    
    // Set a timeout to avoid infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("Auth check timeout reached");
        setLoading(false);
      }
    }, 5000);
    
    checkAuth();
    
    return () => clearTimeout(timeoutId);
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
