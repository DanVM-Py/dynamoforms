
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const [authSession, setAuthSession] = useState<any>(null);
  
  // Use custom hook for confirmation effect
  useConfirmationEffect();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log("Checking authentication status...");
        console.log("Auth check started at:", Date.now());
        setAuthStage("getting_session");

        // First, sign out to clear any previous session
        await supabase.auth.signOut();
        
        const { data, error } = await supabase.auth.getSession();

        console.log("Auth check completed at:", Date.now());
        
        if (error) {
          console.error("Error checking authentication:", error);
          setAuthStage("session_check_error");
        } else {
          const hasSession = !!data.session;
          console.log("Auth session check result:", {
            hasSession,
            hasError: !!error
          });

          if (hasSession) {
            console.log("Active session found, redirecting to:", redirect);
            setAuthSession(data.session);
            setAuthStage("authenticated_redirecting");
            window.location.href = redirect;
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
  }, [redirect]);

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
          <CardHeader className="flex flex-col items-center space-y-1 p-6 pt-4 pb-0">
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
            <CardDescription>
              Accede al sistema o crea una cuenta nueva
            </CardDescription>
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
