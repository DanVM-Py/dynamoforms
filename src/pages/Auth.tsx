
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingAuthState } from "@/components/auth/LoadingAuthState";
import { useConfirmationEffect } from "@/hooks/useConfirmationEffect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { toast } = useToast();

  // Verificar el parámetro de confirmación en la URL
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  
  // Obtener URL de redirección de los parámetros de consulta
  const redirectTo = searchParams.get('redirect') || '/';

  // Manejar notificación de confirmación exitosa
  useConfirmationEffect(confirmationSuccess);

  // Registros de depuración para el flujo de autenticación
  useEffect(() => {
    console.log("Estado del componente Auth:", {
      usuarioExiste: !!user,
      emailUsuario: user?.email,
      perfilUsuario: userProfile ? {
        id: userProfile.id,
        emailConfirmado: userProfile.email_confirmed
      } : null,
      redirectTo,
      confirmationSuccess,
      rutaActual: location.pathname,
      checkingSession,
      sessionCheckTimeout
    });
  }, [user, userProfile, redirectTo, confirmationSuccess, location.pathname, checkingSession, sessionCheckTimeout]);

  // Establecer un tiempo límite para evitar carga infinita si la verificación de sesión tarda demasiado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (checkingSession) {
        console.log("Tiempo de espera excedido para verificación de sesión, forzando actualización de estado");
        setSessionCheckTimeout(true);
        setCheckingSession(false);
        
        toast({
          title: "Tiempo de espera excedido",
          description: "No se pudo verificar la sesión en un tiempo razonable. Por favor, inténtelo de nuevo.",
          variant: "destructive",
        });
      }
    }, 3000); // Reducido a 3 segundos para mejor experiencia de usuario

    return () => clearTimeout(timeoutId);
  }, [checkingSession, toast]);

  // Manejar autenticación y redirecciones
  useEffect(() => {
    const handleAuthSession = async () => {
      try {
        setCheckingSession(true);
        
        // Verificar explícitamente la sesión actual para abordar posibles problemas de estado de autenticación
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error al verificar sesión:", error);
          setCheckingSession(false);
          return;
        }
        
        const currentSession = sessionData?.session;
        
        // Verificar si el usuario está intentando acceder a la página de autenticación directamente cuando ya ha iniciado sesión
        const directAccess = !location.search.includes('redirect');
        
        if (directAccess && currentSession?.user) {
          console.log("Acceso directo a página de autenticación con sesión activa, usuario:", currentSession.user.email);
          
          // Si el correo electrónico del usuario no está confirmado, redirigir a la página confirm-email
          if (userProfile && userProfile.email_confirmed === false) {
            console.log("Usuario autenticado pero correo no confirmado, redirigiendo a confirm-email");
            navigate("/confirm-email", { replace: true });
            return;
          }
          
          // Si acceso directo y el correo está confirmado, redirigir al inicio
          if (userProfile && userProfile.email_confirmed === true) {
            console.log("Usuario ya autenticado con correo confirmado, redirigiendo a:", redirectTo);
            navigate(redirectTo, { replace: true });
            return;
          }
        } else if (user) {
          // El usuario ya ha iniciado sesión, verificar confirmación de correo
          if (userProfile === null) {
            console.log("Usuario autenticado pero perfil no cargado aún, esperando...");
            // Mantener en la página de autenticación hasta que se cargue el perfil
          } else if (userProfile.email_confirmed === false) {
            console.log("Usuario autenticado pero correo no confirmado, redirigiendo a confirm-email");
            navigate("/confirm-email", { replace: true });
          } else {
            // El usuario está completamente autenticado, redirigir al inicio o a la página solicitada
            console.log("Usuario ya autenticado con correo confirmado, redirigiendo a:", redirectTo);
            navigate(redirectTo, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error al verificar sesión:", error);
      } finally {
        setCheckingSession(false);
      }
    };
    
    handleAuthSession();
  }, [navigate, redirectTo, signOut, location.search, user, userProfile]);

  // Si se ha agotado el tiempo de espera o se ha completado la verificación, mostrar la tarjeta de autenticación
  if (!checkingSession || sessionCheckTimeout) {
    return (
      <PageContainer hideSidebar className="flex items-center justify-center p-0">
        <AuthCard 
          redirectTo={redirectTo} 
          confirmationSuccess={confirmationSuccess} 
        />
      </PageContainer>
    );
  }

  // De lo contrario, mostrar el estado de carga
  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <LoadingAuthState />
    </PageContainer>
  );
};

export default Auth;
