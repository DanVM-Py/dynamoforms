
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthInit({
  setSession,
  setUser,
  setLoading,
  fetchUserProfile,
  setFetchComplete
}: {
  setSession: (session: any) => void;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  fetchUserProfile: (userId: string, skipLoading?: boolean) => Promise<void>;
  setFetchComplete: (complete: boolean) => void;
}) {
  useEffect(() => {
    // Obtener sesión inicial y configurar escucha de cambios de estado de autenticación
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setFetchComplete(false);
        
        // Configurar escucha de cambios de estado de autenticación PRIMERO
        authListener = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Estado de autenticación cambiado:", event, !!newSession);
            
            // Actualizar estado según evento de autenticación
            if (event === 'SIGNED_OUT') {
              // Limpiar todo el estado relacionado con la autenticación
              setSession(null);
              setUser(null);
              setFetchComplete(true);
              setLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              // Para otros eventos, actualizar sesión y usuario
              setSession(newSession);
              setUser(newSession?.user ?? null);
              
              if (newSession?.user) {
                try {
                  await fetchUserProfile(newSession.user.id, true);
                } catch (error) {
                  console.error("Error al obtener perfil de usuario después de cambio de estado de autenticación:", error);
                } finally {
                  setFetchComplete(true);
                  setLoading(false);
                }
              } else {
                setFetchComplete(true);
                setLoading(false);
              }
            } else {
              // Para otros eventos, solo actualizar sesión y usuario
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setFetchComplete(true);
              setLoading(false);
            }
          }
        );
        
        // LUEGO verificar sesión existente
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error al obtener sesión:", sessionError);
          setFetchComplete(true);
          setLoading(false);
          return;
        }
        
        console.log("Estado de autenticación inicializado:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await fetchUserProfile(session.user.id, true);
          } catch (error) {
            console.error("Error al obtener perfil de usuario inicial:", error);
          } finally {
            setFetchComplete(true);
            setLoading(false);
          }
        } else {
          setFetchComplete(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error al inicializar autenticación:", error);
        setFetchComplete(true);
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      // Limpiar escucha de autenticación al desmontar
      if (authListener) {
        try {
          authListener.data.subscription.unsubscribe();
        } catch (error) {
          console.error("Error al cancelar suscripción de escucha de autenticación:", error);
        }
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
