
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";

const Auth = () => {
  const [loading, setLoading] = useState(true);
  const [authCheckStarted, setAuthCheckStarted] = useState(false);
  const [authStage, setAuthStage] = useState<string>("initializing");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  const redirectTo = searchParams.get('redirect') || '/';

  // Use the extracted confirmation effect hook
  useConfirmationEffect(confirmationSuccess);

  // Check authentication status
  useEffect(() => {
    if (authCheckStarted) return; // Prevent multiple auth checks
    
    const checkAuth = async () => {
      try {
        setAuthCheckStarted(true);
        setAuthStage("starting_auth_check");
        console.log("Checking authentication status...");
        console.log("Auth check started at:", Date.now());
        
        // Get current session with a simpler approach
        setAuthStage("getting_session");
        const { data, error } = await supabase.auth.getSession();
        
        console.log("Auth check completed at:", Date.now());
        console.log("Auth session check result:", { hasSession: !!data.session, hasError: !!error });
        
        if (error) {
          console.error("Session check error:", error);
          setErrorDetails(`Error al verificar sesión: ${error.message}`);
          setAuthStage("session_check_error");
          setLoading(false);
          return;
        }
        
        if (!data.session) {
          console.log("No active session found");
          setAuthStage("no_session");
          setLoading(false);
          return;
        }
        
        // User is already logged in, redirect to the target page
        console.log("User is already authenticated, redirecting to:", redirectTo);
        setAuthStage("authenticated_redirecting");
        
        // Add a small delay before redirecting to ensure state has updated
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 100);
      } catch (error: any) {
        console.error("Auth check error:", error);
        setErrorDetails(`Error inesperado: ${error.message || 'Error desconocido'}`);
        setAuthStage("unexpected_error");
        setLoading(false);
      }
    };
    
    // Check auth with a failsafe timeout
    checkAuth();
    
    // Set a backup timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      console.log("Auth check timeout reached");
      console.log("Current state:", { loading, authCheckStarted, authStage });
      setErrorDetails("La verificación de sesión ha tomado demasiado tiempo. Puede ser un problema de conexión o un error interno.");
      setAuthStage("timeout");
      setLoading(false);
    }, 15000); // Set timeout to 15 seconds
    
    return () => clearTimeout(timeoutId);
  }, [navigate, redirectTo, loading, authCheckStarted]);

  // Show auth card if not loading
  if (!loading) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        {errorDetails && (
          <div className="absolute top-4 right-4 left-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded shadow-sm">
            <p className="font-medium">Error de autenticación</p>
            <p className="text-sm">{errorDetails}</p>
            <p className="text-sm mt-2">Último estado: {authStage}</p>
          </div>
        )}
        <AuthCard redirectTo={redirectTo} confirmationSuccess={confirmationSuccess} />
      </PageContainer>
    );
  }

  // Show loading state
  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <LoadingAuthState stage={authStage} />
    </PageContainer>
  );
};

export default Auth;
