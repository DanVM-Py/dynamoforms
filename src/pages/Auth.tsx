import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useAuth } from "@/contexts/AuthContext";
// cleanupAuthState might not be needed here if signOut handles it
// import { supabase, cleanupAuthState } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get("redirect") || "/";
  const forceSignOut = searchParams.get('signout') === 'forced';

  // Get only loading and user state. SignOut might be needed if we re-introduce forced signout handling.
  const { user, loading: authContextLoading, signOut } = useAuth();

  // State for initial forced sign out process
  const [isHandlingForcedSignOut, setIsHandlingForcedSignOut] = useState(forceSignOut);

  // Effect solely to handle initial forced sign out
  useEffect(() => {
    if (forceSignOut && isHandlingForcedSignOut) {
      console.log("Auth page: Handling forced sign out on mount.");
      // Attempt sign out only if needed
      if (user || sessionStorage.getItem('supabase.auth.token') || localStorage.getItem('supabase.auth.token')) {
         signOut().finally(() => {
            setIsHandlingForcedSignOut(false);
            // Clear the param from URL after sign out attempt
            navigate('/auth', { replace: true });
         });
      } else {
         // Already signed out
         setIsHandlingForcedSignOut(false);
         navigate('/auth', { replace: true });
      }
    } else {
       // If not forcing signout, mark as not handling it
       setIsHandlingForcedSignOut(false);
    }
    // This effect runs once on mount or if forceSignOut param changes
  }, [forceSignOut, signOut, navigate, user, isHandlingForcedSignOut]);


  // --- Conditional Rendering ---

  // 1. Show Loader during initial forced sign out or while context is loading
  if (isHandlingForcedSignOut || authContextLoading) {
    const stage = isHandlingForcedSignOut ? "signing_out" : "verifying";
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <LoadingAuthState stage={stage} />
      </PageContainer>
    );
  }

  // 2. If **NOT** loading and user **IS** authenticated, redirect away
  //    (This check prevents showing the login form briefly after load if already logged in)
  //    ProtectedRoute wrapping the layout handles preventing access to AUTHENTICATED routes,
  //    this handles redirecting AWAY from AUTH page itself.
  if (!authContextLoading && user) {
     console.log("Auth page: User is authenticated AFTER loading, redirecting to:", redirect);
     return <Navigate to={redirect} replace />;
   }

  // 3. If **NOT** loading and **NO** user, render the Login/Signup form
  //    (This is the default state after loading finishes and user is confirmed null)
  console.log("Auth page: No user authenticated after loading, rendering Auth forms.");
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
