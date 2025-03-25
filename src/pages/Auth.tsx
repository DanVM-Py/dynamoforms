
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
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check auth state in a way that prevents loops
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication state on Auth page");
        setAuthStage("getting_session");
        
        // Check for session - but don't redirect if coming from no-project-access
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking auth state:", error);
          setAuthStage("session_check_error");
          setAuthInit(false);
          return;
        }
        
        // If user is authenticated and not coming from no-project-access page
        if (data?.session && redirect !== '/no-project-access') {
          console.log("User is authenticated, redirecting to:", redirect);
          setAuthStage("authenticated_redirecting");
          navigate(redirect, { replace: true });
        } else {
          console.log("No active session or coming from no-project-access");
          setAuthStage("ready_for_auth");
          setAuthInit(false);
        }
      } catch (error) {
        console.error("Unexpected error in auth check:", error);
        setAuthStage("unexpected_error");
        setAuthInit(false);
      }
    };

    checkAuth();
  }, [redirect, navigate]);

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
