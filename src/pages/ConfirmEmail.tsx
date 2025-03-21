
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ConfirmEmail = () => {
  const [loading, setLoading] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const { user, userProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Debug logs to help diagnose issues
  useEffect(() => {
    console.log("ConfirmEmail component state:", {
      userExists: !!user,
      userEmail: user?.email,
      userProfile: userProfile ? {
        id: userProfile.id,
        emailConfirmed: userProfile?.email_confirmed
      } : null,
      resendCount,
      lastResendTime
    });
    
    // If we don't have a user, re-authenticate silently to try to restore the session
    if (!user) {
      const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        console.log("Session check result:", !!data.session);
      };
      
      checkSession();
    }
  }, [user, userProfile, resendCount, lastResendTime]);

  // Check if we need to redirect (if email is already confirmed)
  useEffect(() => {
    if (userProfile?.email_confirmed) {
      console.log("Email already confirmed, redirecting to home");
      toast({
        title: "Correo ya confirmado",
        description: "Tu correo ya ha sido confirmado. Redirigiendo al inicio.",
      });
      navigate("/", { replace: true });
    }
  }, [userProfile, navigate, toast]);

  const resendConfirmationEmail = async () => {
    if (!user?.email) {
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
      
      console.log(`Attempting to resend confirmation email to ${user.email} (attempt #${resendCount + 1})`);
      
      // Call Supabase to resend confirmation email
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin + '/auth?confirmation=success'
        }
      });
      
      console.log("Resend response:", { data, error });
      
      if (error) throw error;
      
      toast({
        title: "Correo enviado",
        description: "Se ha enviado un nuevo correo de confirmación a tu dirección de email.",
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
      
      console.log("Checking email confirmation status...");
      
      // Force refresh user profile to check if email is confirmed
      await refreshUserProfile();
      
      // If email is confirmed after refresh, navigate to home
      if (userProfile?.email_confirmed) {
        toast({
          title: "Correo confirmado",
          description: "Tu correo ha sido confirmado correctamente. Ahora puedes acceder al sistema.",
        });
        navigate("/");
      } else {
        toast({
          title: "Correo no confirmado",
          description: "Tu correo aún no ha sido confirmado. Por favor, revisa tu bandeja de entrada.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error al verificar estado del correo:", error);
      toast({
        title: "Error al verificar correo",
        description: "No se pudo verificar el estado de confirmación de tu correo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a button to go back to login
  const goToLogin = () => {
    navigate("/auth");
  };

  // Handle case where we somehow got here without being logged in
  if (!user) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <div className="w-full max-w-md px-4">
          <Card className="border-gray-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-dynamo-700">Error de Sesión</CardTitle>
              <CardDescription>
                No se ha detectado una sesión activa. Debes iniciar sesión primero.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                onClick={goToLogin}
                className="w-full bg-dynamo-600 hover:bg-dynamo-700"
              >
                Ir a inicio de sesión
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageContainer>
    );
  }

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
                <span className="font-medium">{user?.email}</span>. Por favor, revisa tu bandeja de entrada y haz clic en el enlace de confirmación.
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
