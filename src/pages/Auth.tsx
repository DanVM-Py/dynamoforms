
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  const forceSignOut = searchParams.get('signout') === 'true' || searchParams.get('signout') === 'forced';
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const { user, isGlobalAdmin, signOut, loading: authContextLoading } = useAuth();
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    console.log("Auth page mount status:", {
      user: !!user,
      isGlobalAdmin,
      loading: authContextLoading,
      redirect,
      forceSignOut,
      authInit,
      authStage
    });
  }, [user, isGlobalAdmin, authContextLoading, redirect, forceSignOut, authInit, authStage]);
  
  // Handle initial authentication state and redirect logic
  useEffect(() => {
    const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
    
    console.log("Auth page checking user status:", { 
      user: !!user, 
      isGlobalAdmin, 
      storedIsGlobalAdmin, 
      authContextLoading, 
      forceSignOut 
    });
    
    // First check if we're dealing with a global admin who's already authenticated
    // We want to skip all storage clearing for them unless explicitly forced to sign out
    if (user && (isGlobalAdmin || storedIsGlobalAdmin) && !forceSignOut) {
      console.log("Auth page: Detected authenticated global admin, redirecting to home");
      navigate("/", { replace: true });
      return;
    }
    
    // Only clear storage if we're not a global admin and not performing a specific auth action
    if (!user || !isGlobalAdmin || forceSignOut) {
      console.log("Auth page: Clearing storage as first step");
      cleanupAuthState();
    }
    
    // If we have a forced sign-out parameter, ensure we're truly signed out
    if (forceSignOut || searchParams.has('signout')) {
      // Execute an explicit sign-out to ensure we're fully logged out
      const forceExplicitSignOut = async () => {
        try {
          console.log("Auth page: Forced signout triggered from URL parameter");
          await supabase.auth.signOut();
          localStorage.removeItem('isGlobalAdmin');
          console.log("Auth page: Explicit Supabase signOut completed");
        } catch (e) {
          console.error("Auth page: Error during explicit signout:", e);
        }
      };
      
      forceExplicitSignOut();
    }
    
    const performInitialCheck = async () => {
      try {
        console.log("Auth page initial check starting - User exists:", !!user);
        console.log("Auth page params - forceSignOut:", forceSignOut, "redirect:", redirect);
        console.log("Auth page - isGlobalAdmin:", isGlobalAdmin);
        console.log("Auth page - localStorage isGlobalAdmin:", localStorage.getItem('isGlobalAdmin'));
        
        // If explicitly asked to sign out or coming from no-project-access
        if (forceSignOut || searchParams.has('signout')) {
          setAuthStage("explicit_signout_requested");
          console.log("Auth page: Explicit signout requested via URL parameter");
          
          if (user) {
            try {
              await signOut();
              localStorage.removeItem('isGlobalAdmin');
              console.log("Auth page: Session cleared successfully after explicit request");
            } catch (e) {
              console.error("Auth page: Error during explicit signout:", e);
            }
          }
          
          setAuthStage("ready_for_auth");
          setAuthInit(false);
          return;
        }
        
        // Check for global admin status from both context and localStorage
        const isUserGlobalAdmin = isGlobalAdmin || localStorage.getItem('isGlobalAdmin') === 'true';
        
        // If user exists and is a global admin, always navigate directly to home without checks
        if (user && isUserGlobalAdmin) {
          console.log("Auth page: User is already authenticated as global admin, redirecting to home");
          navigate("/", { replace: true });
          return;
        }
        
        // If user exists and we have a redirect target
        if (user && redirect !== "/") {
          console.log("Auth page: User is already authenticated with redirect target, redirecting to:", redirect);
          navigate(redirect, { replace: true });
          return;
        }
        
        // If user exists but accessing auth page directly (no specific redirect parameter)
        if (user && redirect === "/") {
          console.log("Auth page: User is already authenticated, redirecting to home");
          navigate("/", { replace: true });
          return;
        }
        
        setAuthStage("ready_for_auth");
        setAuthInit(false);
      } catch (error) {
        console.error("Auth page: Error during initial check:", error);
        setAuthStage("initial_check_error");
        setAuthInit(false);
      }
    };

    // Only run the check if we're sure about the auth state
    if (!authContextLoading) {
      performInitialCheck();
    }
  }, [signOut, user, navigate, searchParams, forceSignOut, redirect, authContextLoading, isGlobalAdmin]);

  // Function to handle successful login with project access check
  const handleSuccessfulLogin = (hasNoProjectAccess: boolean) => {
    console.log("Login callback executed. No project access:", hasNoProjectAccess);
    
    // Check if the user is a global admin from localStorage
    const isUserGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
    
    if (isUserGlobalAdmin) {
      console.log("Login successful and user is global admin, redirecting to home");
      navigate('/', { replace: true });
      return;
    }
    
    if (hasNoProjectAccess) {
      console.log("Login successful but user has no project access, redirecting to no-project-access");
      navigate('/no-project-access', { replace: true });
    } else {
      console.log("Login successful and user has project access, redirecting to:", redirect);
      navigate(redirect, { replace: true });
    }
  };

  // If still checking auth state, show loading
  if (authInit || authContextLoading) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <LoadingAuthState stage={authStage} />
      </PageContainer>
    );
  }

  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <Tabs defaultValue="login" className="w-full max-w-md px-4">
        <Card>
          <CardHeader className="flex flex-col items-center space-y-4 p-6 pt-4 pb-0">
            <div className="text-center mb-2">
              <CardTitle className="text-2xl font-bold text-dynamo-700">Dynamo</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Plataforma de gestión de formularios
              </CardDescription>
            </div>
            
            <div className="w-full pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Crear Cuenta
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <TabsContent value="login" className="pt-0 pb-0">
            <LoginForm 
              redirectTo={redirect} 
              onSuccessfulLogin={handleSuccessfulLogin} 
            />
          </TabsContent>
          
          <TabsContent value="signup" className="pt-0 pb-0">
            <SignUpForm redirectTo={redirect} />
          </TabsContent>
          
          <CardFooter className="px-6 py-2 border-t">
            <div className="text-xs text-gray-500 w-full text-center">
              Al continuar, estás aceptando nuestros términos y condiciones
            </div>
          </CardFooter>
        </Card>
      </Tabs>
    </PageContainer>
  );
};

export default Auth;
