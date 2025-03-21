
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { Loader2, MailCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ConfirmEmail = () => {
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const [user, setUser] = useState<any>(null);
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
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error al verificar sesión:", error);
          toast({
            title: "Error de sesión",
            description: "No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.",
            variant: "destructive",
          });
          navigate("/auth", { replace: true });
          return;
        }
        
        // No session found
        if (!data.session) {
          console.log("No se encontró sesión activa, redirigiendo a login");
          
          // Only show toast if no email from state (direct access)
          if (!emailFromState) {
            toast({
              title: "Sesión no encontrada",
              description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
              variant: "destructive",
            });
            navigate("/auth", { replace: true });
          }
          return;
        }
        
        // Set user data
        setUser(data.session.user);
        
        // Check if user profile exists and email is confirmed
        if (data.session.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.session.user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error("Error al obtener perfil:", profileError);
          } else if (profileData) {
            // Check if email is confirmed
            const isConfirmed = 'email_confirmed' in profileData ? 
              profileData.email_confirmed === true : true;
            
            if (isConfirmed) {
              console.log("Correo ya confirmado, redirigiendo al inicio");
              toast({
                title: "Correo ya confirmado",
                description: "Tu correo ya ha sido confirmado. Redirigiendo al inicio.",
              });
              navigate("/", { replace: true });
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error en verificación de sesión:", error);
      } finally {
        setSessionChecking(false);
      }
    };
    
    checkSession();
    
    // Set a timeout to avoid infinite loading
    const timeoutId = setTimeout(() => {
      if (sessionChecking) {
        console.log("Session check timeout reached");
        setSessionChecking(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [navigate, toast, emailFromState]);

  const resendConfirmationEmail = async () => {
    const userEmail = user?.email || emailFromState;
    
    if (!userEmail) {
      toast({
        title: "Error",
        description: "No se pudo determinar tu dirección de email.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
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
      toast({
        title: "Error al enviar correo",
        description: error.message || "No se pudo enviar el correo de confirmación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      setLoading(true);
      
      console.log("Verificando estado de confirmación de correo...");
      
      if (!user && !emailFromState) {
        toast({
          title: "Error",
          description: "No se pudo determinar tu sesión. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      
      if (user) {
        // Refresh the user profile
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
          // Check if email is confirmed
          const isConfirmed = 'email_confirmed' in profileData ? 
            profileData.email_confirmed === true : false;
          
          if (isConfirmed) {
            toast({
              title: "Correo confirmado",
              description: "Tu correo ha sido confirmado correctamente. Ahora puedes acceder al sistema.",
            });
            navigate("/");
            return;
          }
        }
      }
      
      // If we get here, the email is not confirmed
      toast({
        title: "Correo no confirmado",
        description: "Tu correo aún no ha sido confirmado. Por favor, revisa tu bandeja de entrada y carpeta de spam.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Error al verificar estado del correo:", error);
      toast({
        title: "Error al verificar correo",
        description: error.message || "No se pudo verificar el estado de confirmación de tu correo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
              ) : (
                'Ya confirmé mi correo'
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={resendConfirmationEmail}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                'Reenviar correo de confirmación'
              )}
            </Button>
            
            <Button 
              variant="ghost"
              onClick={goToLogin}
              className="w-full text-gray-600"
              disabled={loading}
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
