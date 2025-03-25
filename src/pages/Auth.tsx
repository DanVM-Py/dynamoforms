
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  const forceSignOut = searchParams.get('signout') === 'true';
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const { user, signOut, loading: authContextLoading } = useAuth();
  const navigate = useNavigate();
  
  // Handle initial authentication state and redirect logic
  useEffect(() => {
    const performInitialCheck = async () => {
      try {
        console.log("Auth page initial check starting - User exists:", !!user);
        console.log("Auth page params - forceSignOut:", forceSignOut, "redirect:", redirect);
        
        // If explicitly asked to sign out
        if (forceSignOut) {
          setAuthStage("explicit_signout_requested");
          console.log("Auth page: Explicit signout requested via URL parameter");
          
          await signOut();
          console.log("Auth page: Session cleared successfully after explicit request");
          setAuthStage("ready_for_auth");
          setAuthInit(false);
          return;
        }
        
        // If user exists and we have a redirect target
        if (user && searchParams.get("redirect")) {
          console.log("Auth page: User is already authenticated with redirect target, redirecting to:", redirect);
          navigate(redirect, { replace: true });
          return;
        }
        
        // If user exists but accessing auth page directly (no redirect parameter)
        if (user && !searchParams.get("redirect")) {
          setAuthStage("signing_out_direct_access");
          console.log("Auth page: User directly accessing auth page while logged in, signing out");
          
          await signOut();
          console.log("Auth page: Session cleared after direct auth page access");
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
  }, [signOut, user, navigate, searchParams, forceSignOut, redirect, authContextLoading]);

  // Function to handle successful login with project access check
  const handleSuccessfulLogin = (hasNoProjectAccess: boolean) => {
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
