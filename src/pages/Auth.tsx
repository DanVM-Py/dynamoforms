
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  const forceSignOut = searchParams.get('signout') === 'true' || searchParams.get('signout') === 'forced';
  const [authInit, setAuthInit] = useState(true);
  const [authStage, setAuthStage] = useState("starting_auth_check");
  const { user, signOut, loading: authContextLoading } = useAuth();
  const navigate = useNavigate();
  
  // Handle initial authentication state and redirect logic
  useEffect(() => {
    // Immediately clear storage when reaching auth page
    const clearStorage = () => {
      console.log("Auth page: Clearing storage as first step");
      localStorage.removeItem('currentProjectId');
      sessionStorage.removeItem('currentProjectId');
      
      // Also clear any Supabase storage keys
      try {
        const storageKeys = Object.keys(localStorage);
        const supabaseKeys = storageKeys.filter(key => key.startsWith('sb-'));
        supabaseKeys.forEach(key => {
          console.log("Clearing supabase storage key:", key);
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.error("Error clearing supabase storage keys:", e);
      }
    };
    
    // Call immediately
    clearStorage();
    
    const performInitialCheck = async () => {
      try {
        console.log("Auth page initial check starting - User exists:", !!user);
        console.log("Auth page params - forceSignOut:", forceSignOut, "redirect:", redirect);
        
        // If explicitly asked to sign out or coming from no-project-access
        if (forceSignOut || searchParams.has('signout')) {
          setAuthStage("explicit_signout_requested");
          console.log("Auth page: Explicit signout requested via URL parameter");
          
          if (user) {
            try {
              await signOut();
              console.log("Auth page: Session cleared successfully after explicit request");
            } catch (e) {
              console.error("Auth page: Error during explicit signout:", e);
            }
          }
          
          setAuthStage("ready_for_auth");
          setAuthInit(false);
          return;
        }
        
        // Ensure we're fully signed out when reaching this page from NoProjectAccess
        const comingFromNoProjectAccess = document.referrer.includes('no-project-access');
        if (comingFromNoProjectAccess || searchParams.has('error')) {
          console.log("Auth page: Coming from no-project-access or with error, ensuring clean session");
          if (user) {
            await signOut();
            console.log("Auth page: Session cleared for user coming from no-project-access");
          }
          setAuthStage("ready_for_auth");
          setAuthInit(false);
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
  }, [signOut, user, navigate, searchParams, forceSignOut, redirect, authContextLoading]);

  // Function to handle successful login with project access check
  const handleSuccessfulLogin = (hasNoProjectAccess: boolean) => {
    console.log("Login callback executed. No project access:", hasNoProjectAccess);
    
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
