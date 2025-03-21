
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ConfirmEmail = () => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const [user, setUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get email from location state if available
  const emailFromState = location.state?.email;
  
  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setSessionChecking(true);
        setErrorMessage(null);
        
        // Set a timeout to avoid infinite loading
        const timeoutId = setTimeout(() => {
          if (sessionChecking) {
            console.log("Session check timeout reached");
            setSessionChecking(false);
          }
        }, 5000);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        // Clear timeout as we got a response
        clearTimeout(timeoutId);
        
        if (error) {
          console.error("Error al verificar sesión:", error);
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
          setUser(data.session.user);
          
          // Check if user profile exists and email is confirmed
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error("Error al obtener perfil:", profileError);
          } else if (profileData) {
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
          }
        }
      } catch (error) {
        console.error("Error en verificación de sesión:", error);
        setErrorMessage("Ocurrió un error al verificar tu sesión.");
      } finally {
        setSessionChecking(false);
      }
    };
    
    checkSession();
  }, [navigate, toast, emailFromState, sessionChecking]);

  const resendConfirmationEmail = async () => {
    const userEmail = user?.email || emailFromState;
    setErrorMessage(null);
    
    if (!userEmail) {
      setErrorMessage("No se pudo determinar tu dirección de email.");
      return;
    }
    
    try {
      setResending(true);
      setResendCount(prev => prev + 1);
      setLastResendTime(new Date());
      
      // Get current origin with protocol
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth?confirmation=success`;
      
      console.log(`Intentando reenviar correo de confirmación a ${userEmail} (intento #${resendCount + 1})`);
      console.log(`Usando URL de redirección: ${redirectUrl}`);
      
      // Call Supabase to resend confirmation email with explicit redirect URL
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Correo enviado",
        description: "Se ha enviado un nuevo correo de confirmación a tu dirección de email. Revisa también tu carpeta de spam.",
      });
    } catch (error: any) {
      console.error("Error al reenviar correo:", error);
      setErrorMessage(error.message || "No se pudo enviar el correo de confirmación");
    } finally {
      setResending(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      setChecking(true);
      setErrorMessage(null);
      
      console.log("Verificando estado de confirmación de correo...");
      
      if (!user && !emailFromState) {
        setErrorMessage("No se pudo determinar tu sesión. Por favor, inicia sesión nuevamente.");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }
      
      if (user) {
        // Refresh the user profile to get the latest status
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error al obtener perfil:", profileError);
          throw new Error("No se pudo verificar el estado de tu correo");
        }
        
        if (profileData) {
          // Default to confirmed if property doesn't exist
          const isConfirmed = !('email_confirmed' in profileData) || 
            profileData.email_confirmed === true;
          
          if (isConfirmed) {
            toast({
              title: "Correo confirmado",
              description: "Tu correo ha sido confirmado correctamente. Ahora puedes acceder al sistema.",
            });
            navigate("/");
            return;
          }
        }
      } else if (emailFromState) {
        // If we only have email from state, we can try to sign in to check status
        try {
          const { data } = await supabase.auth.signInWithOtp({
            email: emailFromState,
            options: {
              shouldCreateUser: false
            }
          });
          
          if (data) {
            toast({
              title: "Verificación enviada",
              description: "Se ha enviado un enlace de verificación a tu correo. Por favor, revisa tu bandeja de entrada.",
            });
            return;
          }
        } catch (e) {
          console.error("Error checking auth status:", e);
        }
      }
      
      // If we get here, the email is not confirmed
      setErrorMessage("Tu correo aún no ha sido confirmado. Por favor, revisa tu bandeja de entrada y carpeta de spam.");
    } catch (error: any) {
      console.error("Error al verificar estado del correo:", error);
      setErrorMessage(error.message || "No se pudo verificar el estado de confirmación de tu correo");
    } finally {
      setChecking(false);
    }
  };

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
            <CardContent className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-dynamo-600" />
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
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <MailCheck className="h-12 w-12 text-dynamo-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-dynamo-700">Confirma tu email</CardTitle>
            <CardDescription>
              Por favor confirma tu correo electrónico para acceder al sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
              <p className="text-sm">
                Te hemos enviado un correo de confirmación a{" "}
                <span className="font-medium">{displayEmail}</span>. Por favor, revisa tu bandeja de entrada y haz clic en el enlace de confirmación.
              </p>
              {resendCount > 0 && (
                <p className="text-xs mt-2">
                  Se ha intentado reenviar el correo {resendCount} {resendCount === 1 ? 'vez' : 'veces'}. 
                  Si no lo encuentras, revisa también tu carpeta de spam o correo no deseado.
                </p>
              )}
              {lastResendTime && (
                <p className="text-xs mt-1">
                  Último reenvío: {lastResendTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
              <p className="text-sm">
                <strong>Importante:</strong> Si después de varios intentos no recibes el correo:
              </p>
              <ul className="list-disc ml-5 text-xs mt-1">
                <li>Revisa tu carpeta de spam o correo no deseado</li>
                <li>Verifica que la dirección de correo sea correcta</li>
                <li>Contacta al administrador del sistema para verificar la configuración del servicio de correo</li>
              </ul>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              onClick={checkEmailStatus}
              className="w-full bg-dynamo-600 hover:bg-dynamo-700"
              disabled={checking}
            >
              {checking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                'Ya confirmé mi correo'
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={resendConfirmationEmail}
              className="w-full"
              disabled={resending}
            >
              {resending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                'Reenviar correo de confirmación'
              )}
            </Button>
            
            <Button 
              variant="ghost"
              onClick={goToLogin}
              className="w-full text-gray-600"
            >
              Volver a inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ConfirmEmail;
