import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, UserProfile } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [authVerifications, setAuthVerifications] = useState(0);
  const [isCheckingInitialProject, setIsCheckingInitialProject] = useState(true);
  
  // Use a ref to track the subscription to avoid multiple listeners
  const authListenerRef = useRef<{ data?: { subscription?: { unsubscribe?: () => void } } }>(null);

  // Function to refresh auth state from the service
  const refreshAuthState = useCallback(async (fetchInitialProject = false) => {
    setIsLoading(true);
    try {
      console.log("[useAuth] Refreshing auth state...");
      const authStatus = await authService.getAuthStatus();
      
      setSession(authStatus.session);
      setUser(authStatus.user);
      setUserProfile(authStatus.profile);
      
      const isAdmin = authStatus.isGlobalAdmin;
      setIsGlobalAdmin(isAdmin);
      
      // Store global admin status
      if (isAdmin) {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
        
        // Also store enhanced auth state
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: authStatus.user?.id,
          isGlobalAdmin: true,
          timestamp: Date.now()
        }));
        
        console.log("[useAuth] Set global admin flag to true in storage");
      } else {
        // Only clear if we're sure user is not admin
        if (authStatus.session) {
          localStorage.removeItem('isGlobalAdmin');
          sessionStorage.removeItem('isGlobalAdmin');
        }
      }
      
      const currentUser = authStatus.user;

      // --- Obtener projectId inicial (solo si se solicita explícitamente) ---
      if (fetchInitialProject && currentUser) {
        setIsCheckingInitialProject(true); // Marcar inicio de carga de proyecto
        try {
          const projectUsersTable = Tables.project_users;
          console.log(`[useAuth] Fetching initial project from table: ${projectUsersTable} for user: ${currentUser.id}`);

          const { data: projectUserData, error: projectUserError } = await supabase
            .from(projectUsersTable)
            .select('project_id')
            .eq('user_id', currentUser.id)
            .eq('status', 'active')
            .limit(1)
            .single();

          if (projectUserError && projectUserError.code !== 'PGRST116') {
             console.error('[useAuth] Error fetching initial project user data:', projectUserError);
           }

          const initialProjectId = projectUserData?.project_id || null;
          console.log(`[useAuth] Initial project ID found: ${initialProjectId}`);

          setCurrentProjectId(initialProjectId);
          if (initialProjectId) {
             sessionStorage.setItem('currentProjectId', initialProjectId);
           } else {
             sessionStorage.removeItem('currentProjectId');
           }
        } catch (error) {
          console.error('[useAuth] Failed to fetch initial project ID:', error);
           setCurrentProjectId(null);
           sessionStorage.removeItem('currentProjectId');
        } finally {
           setIsCheckingInitialProject(false); // Marcar fin de carga de proyecto
         }
      } else if (!currentUser) {
         // Limpiar si no hay usuario
         setCurrentProjectId(null);
         sessionStorage.removeItem('currentProjectId');
         setIsCheckingInitialProject(false); // No hay proyecto que buscar
       }
      // --- Fin obtención projectId inicial ---

    } catch (error) {
      console.error("[useAuth] Error refreshing auth state:", error);
       // Limpiar en caso de error
       setCurrentProjectId(null);
       sessionStorage.removeItem('currentProjectId');
       setIsGlobalAdmin(false);
       // ... (limpiar storage) ...
    } finally {
      setIsLoading(false); // Marcar fin carga general
      // isCheckingInitialProject se maneja dentro del bloque try/catch/finally
      setIsInitialized(true);
    }
  }, []);

  // NUEVO: useEffect simplificado que depende solo de authVerifications
  useEffect(() => {
    if (authVerifications > 0) {
      console.log(`[useAuth] Running auth verification #${authVerifications} (triggered by counter)`);

      // VERIFICACIÓN MÁS SIMPLE: Solo detectar si la sesión se perdió en Supabase
      // mientras aún tenemos un usuario en el contexto.
      const checkSessionInconsistency = async () => {
        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            // Si hay error al obtener la sesión, loguear pero no hacer nada drástico aquí.
            // Podría ser un problema temporal de red.
            console.error("[useAuth] Error checking session during verification:", error);
            return;
          }

          // La única inconsistencia crítica que manejamos aquí:
          // Supabase dice NO hay sesión, PERO el contexto todavía tiene un usuario.
          if (!data.session && user) {
            console.warn("[useAuth] Supabase session missing during verification, but user exists in context. Forcing sign out to resync.");
            // Forzar sign out para limpiar el estado local inconsistente.
            await signOut();
          } else {
            // En todos los demás casos (sesión y usuario coinciden, o ambos son null,
            // o hay sesión en Supabase pero no usuario local aún), no hacemos nada aquí.
            // Confiamos en onAuthStateChange y refreshAuthState(true) inicial.
            console.log("[useAuth] Session check during verification completed (no critical inconsistency detected).");
          }
        } catch (error) {
          // Capturar errores de la lógica interna de checkSessionInconsistency
          console.error("[useAuth] Auth verification checkSessionInconsistency error:", error);
        }
      };

      checkSessionInconsistency();
    }
  }, [authVerifications]); // Solo depende de authVerifications

  // Set up auth listener and get initial state
  useEffect(() => {
    if (isInitialized) return;
    
    setIsLoading(true); // Asegurar estado de carga
    setIsCheckingInitialProject(true); // Asegurar estado de carga del proyecto

    // Clean up any existing listeners before setting a new one
    if (authListenerRef.current?.data?.subscription?.unsubscribe) {
      console.log("Cleaning up existing auth listener before setting up a new one");
      authListenerRef.current.data.subscription.unsubscribe();
    }
    
    console.log("[useAuth] Setting up auth listener and performing initial load.");

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[useAuth] Auth state changed, event:", event, "session:", !!newSession);
      
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // Si el usuario cierra sesión, limpiar todo
      if (event === 'SIGNED_OUT') {
        setIsGlobalAdmin(false);
        setIsProjectAdmin(false);
        setUserProfile(null);
        setCurrentProjectId(null); // Limpiar projectId
        localStorage.removeItem('isGlobalAdmin');
        sessionStorage.removeItem('isGlobalAdmin');
        localStorage.removeItem('authState');
        sessionStorage.removeItem('currentProjectId'); // Limpiar storage projectId
        setIsCheckingInitialProject(false); // No hay proyecto que buscar
      }
      
      // For sign-in events, store basic auth state immediately
      if (event === 'SIGNED_IN' && newSession?.user) {
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: newSession.user.id,
          timestamp: Date.now()
        }));
        
        // If the user already has global admin flag in storage, preserve it
        if (localStorage.getItem('isGlobalAdmin') === 'true') {
          localStorage.setItem('authState', JSON.stringify({
            isAuthenticated: true,
            userId: newSession.user.id,
            isGlobalAdmin: true,
            timestamp: Date.now()
          }));
        }
      }
      
      // Refrescar estado completo, PERO indicar que NO busque el proyecto inicial aquí,
      // ya que el listener puede dispararse por cambios menores. La búsqueda inicial
      // se hace una vez abajo.
      if (event === 'SIGNED_IN') {
        console.log("[useAuth] SIGNED_IN detected, calling refreshAuthState(true) to fetch project.");
        refreshAuthState(true);
      } else if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT') {
        console.log(`[useAuth] Auth event ${event} detected, calling refreshAuthState(false).`);
        refreshAuthState(false);
      }
    });
    
    authListenerRef.current = { data };
    
    // Carga inicial completa: refrescar estado Y buscar proyecto inicial
    refreshAuthState(true);
    
    // Clean up the listener on unmount
    return () => {
      console.log("[useAuth] Cleaning up auth listener");
      if (authListenerRef.current?.data?.subscription?.unsubscribe) {
        authListenerRef.current.data.subscription.unsubscribe();
      }
    };
  }, [isInitialized, refreshAuthState]);

  // Sign out function
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Limpiar estado local primero
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setUserProfile(null);
      setCurrentProjectId(null);
      localStorage.removeItem('isGlobalAdmin');
      sessionStorage.removeItem('isGlobalAdmin');
      localStorage.removeItem('authState');
      sessionStorage.removeItem('currentProjectId');

      const { success, error } = await authService.signOut();
      if (!success && error) {
        console.error("Sign out error:", error);
      }
      // El listener onAuthStateChange se encargará de actualizar session y user a null
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efecto para verificar si es Project Admin cuando cambia el usuario o el projectId
  useEffect(() => {
    // Solo ejecutar si tenemos usuario y projectId
    if (user && currentProjectId) {
      console.log(`[useAuth] Checking project admin status for user ${user.id} and project ${currentProjectId}`);
      let isMounted = true; // Flag para evitar actualizaciones en componente desmontado
      authService.isProjectAdmin(user.id, currentProjectId)
        .then(isAdmin => {
          if (isMounted) {
            console.log(`[useAuth] Project admin status: ${isAdmin}`);
            setIsProjectAdmin(isAdmin);
          }
        })
        .catch(error => {
           console.error("[useAuth] Error checking project admin status:", error);
           if (isMounted) {
             setIsProjectAdmin(false); // Asumir no admin en caso de error
           }
         });
      return () => { isMounted = false; }; // Cleanup
    } else {
      // Si no hay usuario o proyecto, no puede ser project admin
      setIsProjectAdmin(false);
    }
  }, [user, currentProjectId]); // Dependencias correctas

  // Function to trigger a manual auth verification
  const verifyAuthentication = useCallback(() => {
    setAuthVerifications(prev => prev + 1);
  }, []);

  // Estado de carga combinado
  const combinedLoading = isLoading || isCheckingInitialProject;

  return {
    session,
    user,
    userProfile,
    isGlobalAdmin,
    isProjectAdmin,
    isLoading: combinedLoading, // Asegurar que se exporta con este nombre
    isInitialized,
    currentProjectId, // El ID obtenido inicialmente o null
    signOut,
    refreshAuthState, // Puede ser útil para refrescos manuales
    verifyAuthentication
  };
}
