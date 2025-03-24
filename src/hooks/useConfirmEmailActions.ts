
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useConfirmEmailActions = (email: string | undefined, userId?: string) => {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const resendConfirmationEmail = async () => {
    if (!email) {
      setErrorMessage("No se pudo determinar tu dirección de email.");
      return;
    }
    
    try {
      setResending(true);
      setErrorMessage(null);
      setResendCount(prev => prev + 1);
      setLastResendTime(new Date());
      
      // Get current origin with protocol
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth?confirmation=success`;
      
      console.log(`Intentando reenviar correo de confirmación a ${email} (intento #${resendCount + 1})`);
      console.log(`Usando URL de redirección: ${redirectUrl}`);
      
      // Call Supabase to resend confirmation email with explicit redirect URL
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
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
      
      if (!email && !userId) {
        setErrorMessage("No se pudo determinar tu sesión. Por favor, inicia sesión nuevamente.");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }
      
      if (userId) {
        // Refresh the user profile to get the latest status
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
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
      } else if (email) {
        // If we only have email, we can try to sign in to check status
        try {
          const { data } = await supabase.auth.signInWithOtp({
            email: email,
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

  return {
    resending,
    checking,
    resendCount,
    lastResendTime,
    errorMessage,
    setErrorMessage,
    resendConfirmationEmail,
    checkEmailStatus
  };
};
