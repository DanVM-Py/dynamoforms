
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useConfirmEmailActions(email: string | undefined, userId?: string) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const resendConfirmationEmail = async () => {
    if (!email) {
      setErrorMessage("No hay dirección de correo para enviar la confirmación");
      return;
    }

    try {
      setResending(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }

      setResendCount(prev => prev + 1);
      setLastResendTime(new Date());
      
      toast({
        title: "Correo enviado",
        description: "Se ha reenviado el correo de confirmación. Por favor revisa tu bandeja de entrada.",
      });
    } catch (error: any) {
      console.error("Error al reenviar correo:", error);
      setErrorMessage(error.message || "No se pudo reenviar el correo de confirmación");
      
      toast({
        title: "Error",
        description: "Hubo un problema al reenviar el correo de confirmación",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const checkEmailStatus = async () => {
    if (!email) {
      setErrorMessage("No hay dirección de correo para verificar");
      return;
    }

    try {
      setChecking(true);
      setErrorMessage(null);

      // Clear any active sessions first
      await supabase.auth.signOut();

      // Check if the user has confirmed their email
      const { data, error } = await supabase
        .from("profiles")
        .select("*")  // Select all columns to avoid missing columns
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // If confirmed, redirect to login - safely check for email_confirmed
      const emailConfirmed = data && 'email_confirmed' in data ? data.email_confirmed : false;
      
      if (emailConfirmed) {
        toast({
          title: "Email confirmado",
          description: "Tu correo ha sido confirmado. Ahora puedes iniciar sesión.",
        });
        window.location.href = '/auth';
      } else {
        setErrorMessage("Todavía no has confirmado tu correo. Por favor, revisa tu bandeja de entrada.");
        
        toast({
          title: "Correo no confirmado",
          description: "Todavía no has confirmado tu correo. Por favor, revisa tu bandeja de entrada.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error al verificar estado del correo:", error);
      setErrorMessage(error.message || "No se pudo verificar el estado de confirmación del correo");
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
    resendConfirmationEmail,
    checkEmailStatus
  };
}
