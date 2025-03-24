
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
  const [actionStatus, setActionStatus] = useState<string>("idle");
  
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
      setActionStatus("sending");
      
      // Get current origin with protocol
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth?confirmation=success`;
      
      console.log(`Intentando reenviar correo de confirmación a ${email} (intento #${resendCount + 1})`);
      console.log(`Usando URL de redirección: ${redirectUrl}`);
      console.log(`Estado antes de enviar: ${actionStatus}`);
      
      // Call Supabase to resend confirmation email with explicit redirect URL
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      console.log("Respuesta de Supabase (resend):", data, error);
      
      if (error) {
        console.error("Error de Supabase al reenviar:", error);
        setActionStatus("error");
        throw error;
      }
      
      setActionStatus("sent");
      
      // Check if we got a response that indicates success
      if (data) {
        console.log("Datos de respuesta al reenviar email:", data);
      }
      
      // Verify with Supabase auth status
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData.user) {
          console.log("Usuario verificado en Supabase:", authData.user);
        } else if (authError) {
          console.log("Error al verificar usuario:", authError);
        } else {
          console.log("No se encontró usuario en la sesión actual");
        }
      } catch (e) {
        console.log("Excepción al verificar usuario:", e);
      }
      
      toast({
        title: "Correo enviado",
        description: "Se ha enviado un nuevo correo de confirmación a tu dirección de email. Revisa también tu carpeta de spam.",
      });
    } catch (error: any) {
      console.error("Error al reenviar correo:", error);
      setErrorMessage(error.message || "No se pudo enviar el correo de confirmación");
      setActionStatus("error");
    } finally {
      setResending(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      setChecking(true);
      setErrorMessage(null);
      setActionStatus("checking");
      
      console.log("Verificando estado de confirmación de correo...");
      console.log("Email:", email, "UserId:", userId);
      
      if (!email && !userId) {
        setErrorMessage("No se pudo determinar tu sesión. Por favor, inicia sesión nuevamente.");
        setActionStatus("no_session");
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
          setActionStatus("profile_error");
          throw new Error("No se pudo verificar el estado de tu correo");
        }
        
        if (profileData) {
          console.log("Datos del perfil:", profileData);
          // Default to confirmed if property doesn't exist
          const isConfirmed = !('email_confirmed' in profileData) || 
            profileData.email_confirmed === true;
          
          if (isConfirmed) {
            setActionStatus("confirmed");
            toast({
              title: "Correo confirmado",
              description: "Tu correo ha sido confirmado correctamente. Ahora puedes acceder al sistema.",
            });
            navigate("/");
            return;
          }
          
          setActionStatus("not_confirmed");
        }
      } else if (email) {
        // If we only have email, try using Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData && sessionData.session) {
          console.log("Sesión activa encontrada:", sessionData.session);
          setActionStatus("session_found");
          
          // If we have a session, check the profile
          const userId = sessionData.session.user.id;
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
            
          if (profileError) {
            console.error("Error al obtener perfil desde sesión:", profileError);
            setActionStatus("profile_error_session");
          } else if (profileData) {
            console.log("Perfil desde sesión:", profileData);
            const isConfirmed = !('email_confirmed' in profileData) || 
              profileData.email_confirmed === true;
              
            if (isConfirmed) {
              setActionStatus("confirmed_session");
              toast({
                title: "Correo confirmado",
                description: "Tu correo ha sido confirmado correctamente. Ahora puedes acceder al sistema.",
              });
              navigate("/");
              return;
            }
            
            setActionStatus("not_confirmed_session");
          }
        } else {
          console.log("No se encontró sesión activa");
          setActionStatus("no_active_session");
          
          // Try sending a magic link (this will fail if the user doesn't exist)
          try {
            console.log("Intentando enviar magic link para verificar estado");
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email: email,
              options: {
                shouldCreateUser: false
              }
            });
            
            if (otpError) {
              console.log("Error al enviar magic link:", otpError);
              setActionStatus("otp_error");
            } else {
              console.log("Magic link enviado correctamente");
              setActionStatus("magic_link_sent");
              toast({
                title: "Verificación enviada",
                description: "Se ha enviado un enlace de verificación a tu correo. Por favor, revisa tu bandeja de entrada.",
              });
              return;
            }
          } catch (e) {
            console.error("Excepción al enviar magic link:", e);
            setActionStatus("otp_exception");
          }
        }
      }
      
      // If we get here, the email is not confirmed
      setErrorMessage("Tu correo aún no ha sido confirmado. Por favor, revisa tu bandeja de entrada y carpeta de spam.");
    } catch (error: any) {
      console.error("Error al verificar estado del correo:", error);
      setErrorMessage(error.message || "No se pudo verificar el estado de confirmación de tu correo");
      setActionStatus("check_exception");
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
    actionStatus,
    setErrorMessage,
    resendConfirmationEmail,
    checkEmailStatus
  };
};
