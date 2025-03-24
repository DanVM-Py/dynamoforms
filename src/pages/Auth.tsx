
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
  const forceSignOut = searchParams.get('forceSignOut') === 'true';
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const [signOutCompleted, setSignOutCompleted] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Handle force sign out if explicitly requested via URL parameter
  useEffect(() => {
    if (forceSignOut && user && !signOutCompleted) {
      console.log("Force sign out requested via URL parameter, signing out user");
      
      const performSignOut = async () => {
        await signOut();
        setSignOutCompleted(true);
      };
      
      performSignOut();
    }
  }, [forceSignOut, user, signOut, signOutCompleted]);
  
  // If user is already authenticated and not being signed out, redirect them
  useEffect(() => {
    if (user && !forceSignOut) {
      console.log("User already authenticated, redirecting to:", redirect);
      navigate(redirect, { replace: true });
    }
  }, [user, redirect, navigate, forceSignOut]);
  
  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log("Checking authentication status...");
        setAuthStage("getting_session");
        
        // If we're forcing sign out, skip the session check
        if (forceSignOut) {
          setAuthInit(false);
          setAuthStage("force_signout_requested");
          return;
        }
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking authentication:", error);
          setAuthStage("session_check_error");
          setAuthInit(false);
        } else {
          const hasSession = !!data.session;
          console.log("Auth session check result:", {
            hasSession,
            hasError: !!error
          });

          if (hasSession && !forceSignOut) {
            console.log("Active session found, redirecting to:", redirect);
            setAuthStage("authenticated_redirecting");
            navigate(redirect, { replace: true });
          } else {
            console.log("No active session found, which is expected");
            setAuthInit(false);
            setAuthStage("no_session");
          }
        }
      } catch (error) {
        console.error("Unexpected error in auth check:", error);
        setAuthStage("unexpected_error");
        setAuthInit(false);
      }
    };

    checkAuthStatus();
  }, [redirect, navigate, forceSignOut]);

  // If still checking auth, show loading state
  if (authInit) {
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
            <LoginForm redirectTo={redirect} />
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
