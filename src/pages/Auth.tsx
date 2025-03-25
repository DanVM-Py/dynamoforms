
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
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  
  // Siempre ejecutar signOut cuando se carga la página Auth
  useEffect(() => {
    const performSignOut = async () => {
      try {
        setAuthStage("signing_out");
        console.log("Auth page: Executing signOut to clear session");
        
        // Si venimos de no-project-access, necesitamos cerrar sesión
        if (user) {
          await signOut();
          console.log("Auth page: Session cleared successfully");
        }
        
        setAuthStage("ready_for_auth");
        setAuthInit(false);
      } catch (error) {
        console.error("Auth page: Error during sign out:", error);
        setAuthStage("sign_out_error");
        setAuthInit(false);
      }
    };

    performSignOut();
  }, [signOut, user]);

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

  // Si todavía estamos verificando el estado de autenticación, mostrar el estado de carga
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
