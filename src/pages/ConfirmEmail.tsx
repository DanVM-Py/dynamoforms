
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmEmailForm } from "@/components/auth/ConfirmEmailForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const ConfirmEmail = () => {
  const [sessionChecking, setSessionChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get email from location state if available
  const emailFromState = location.state?.email;
  
  useEffect(() => {
    console.log("ConfirmEmail loaded with email from state:", emailFromState);
    console.log("Location state:", location.state);
    
    // Add debug information
    setDebugInfo({
      emailFromState,
      locationState: location.state,
      timestamp: new Date().toISOString()
    });
  }, [emailFromState, location.state]);
  
  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Starting session check in ConfirmEmail");
        setSessionChecking(true);
        setErrorMessage(null);
        
        // Set a timeout to avoid infinite loading
        const timeoutId = setTimeout(() => {
          console.log("Session check timeout reached in ConfirmEmail");
          setSessionChecking(false);
          setDebugInfo(prev => ({ 
            ...prev, 
            timeoutReached: true,
            timeoutTime: new Date().toISOString()
          }));
        }, 5000);
        
        // If we have email in state, we can skip session check
        if (emailFromState) {
          console.log("Found email in state, skipping session check:", emailFromState);
          clearTimeout(timeoutId);
          setSessionChecking(false);
          setDebugInfo(prev => ({ 
            ...prev, 
            sessionCheckSkipped: true,
            emailUsed: emailFromState
          }));
          return;
        }
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        // Update debug info
        setDebugInfo(prev => ({ 
          ...prev, 
          sessionCheck: {
            hasData: !!data,
            hasSession: !!data?.session,
            hasError: !!error,
            errorMessage: error?.message,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Clear timeout as we got a response
        clearTimeout(timeoutId);
        
        if (error) {
          console.error("Error al verificar sesión en ConfirmEmail:", error);
          setErrorMessage("No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.");
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
          return;
        }
        
        // No session found but we have email from state
        if (!data.session && emailFromState) {
          console.log("No se encontró sesión activa, pero tenemos email de estado");
          setSessionChecking(false);
          return;
        }
        
        // No session found and no email from state
        if (!data.session && !emailFromState) {
          console.log("No se encontró sesión activa ni email de estado, redirigiendo a login");
          setErrorMessage("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
          return;
        }
        
        // Set user data if we have a session
        if (data.session?.user) {
          console.log("Session found with user:", data.session.user.email);
          setUser(data.session.user);
          
          // Check if user profile exists and email is confirmed
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle();
            
          setDebugInfo(prev => ({ 
            ...prev, 
            profileCheck: {
              hasData: !!profileData,
              hasError: !!profileError,
              profileData,
              errorMessage: profileError?.message,
              timestamp: new Date().toISOString()
            }
          }));
            
          if (profileError) {
            console.error("Error al obtener perfil en ConfirmEmail:", profileError);
          } else if (profileData) {
            console.log("Profile data:", profileData);
            // Check if email is confirmed
            const isConfirmed = !('email_confirmed' in profileData) || 
                              profileData.email_confirmed === true;
            
            if (isConfirmed) {
              console.log("Correo ya confirmado, redirigiendo al inicio");
              toast({
                title: "Correo ya confirmado",
                description: "Tu correo ya ha sido confirmado. Redirigiendo al inicio.",
              });
              setTimeout(() => navigate("/", { replace: true }), 1500);
              return;
            }
          } else {
            // If profile doesn't exist, create one
            console.log("No profile found, creating one");
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: data.session.user.id,
                email: data.session.user.email,
                name: data.session.user.email?.split('@')[0] || 'Usuario',
                role: 'user',
                email_confirmed: false
              })
              .select("*")
              .single();
              
            setDebugInfo(prev => ({ 
              ...prev, 
              profileCreation: {
                success: !!newProfile,
                hasError: !!insertError,
                newProfile,
                errorMessage: insertError?.message,
                timestamp: new Date().toISOString()
              }
            }));
              
            if (insertError) {
              console.error("Error creating profile:", insertError);
            } else {
              console.log("New profile created:", newProfile);
            }
          }
        }
        
        console.log("Session check complete in ConfirmEmail");
        setSessionChecking(false);
      } catch (error) {
        console.error("Error en verificación de sesión en ConfirmEmail:", error);
        setErrorMessage("Ocurrió un error al verificar tu sesión.");
        setSessionChecking(false);
        setDebugInfo(prev => ({ 
          ...prev, 
          sessionCheckError: {
            message: (error as Error).message,
            stack: (error as Error).stack,
            timestamp: new Date().toISOString()
          }
        }));
      }
    };
    
    checkSession();
  }, [navigate, toast, emailFromState, location.state]);

  // Go to login
  const goToLogin = () => {
    navigate("/auth");
  };

  // Loading state
  if (sessionChecking) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <div className="w-full max-w-md px-4">
          <Card className="border-gray-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-dynamo-700">Verificando sesión</CardTitle>
              <CardDescription>
                Por favor espera mientras verificamos tu sesión...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-6">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-dynamo-600" />
              </div>
              
              {/* Show debugging details in development environment */}
              {process.env.NODE_ENV === 'development' && (
                <Alert className="text-xs bg-gray-50 border-gray-200">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="font-mono overflow-auto max-h-32">
                    {JSON.stringify(debugInfo, null, 2)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // If no user but we have an email, show confirmation form
  const displayEmail = user?.email || emailFromState;

  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <div className="w-full max-w-md px-4">
        <ConfirmEmailForm 
          email={displayEmail} 
          userId={user?.id}
          onGoToLogin={goToLogin}
        />
        
        {/* Show debug information in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-4 border-gray-200 text-xs">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="font-mono overflow-auto max-h-40 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

export default ConfirmEmail;
