import { useState, useEffect, useCallback, useRef, createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Tables } from '@/config/environment'; // Asumiendo existencia
import { supabase } from '@/integrations/supabase/client'; // Para el listener
import { authService as supabaseAuthService, UserProfile } from '@/services/authService';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingInitialProject, setIsCheckingInitialProject] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const authListenerRef = useRef<{ data: { subscription: any; } } | null>(null);
  const authService = supabaseAuthService;

  // useCallback para refreshAuthState
  const refreshAuthState = useCallback(async (fetchInitialProject = false) => {
    console.log(`[useAuth DEBUG] refreshAuthState(${fetchInitialProject}) STARTING.`);
    setIsLoading(true);
    setIsCheckingInitialProject(fetchInitialProject);

    try {
      console.log("[useAuth] Refreshing auth state...");
      const authStatus = await authService.getAuthStatus();
      console.log("[useAuth DEBUG] authService.getAuthStatus result:", authStatus);

      // --- Establecer estado de autenticación central ---
      setSession(authStatus.session);
      setUser(authStatus.user); // <- Actualización de User
      setUserProfile(authStatus.profile);
      setIsGlobalAdmin(authStatus.isGlobalAdmin);
      console.log("[useAuth DEBUG] Core auth states SET. User:", authStatus.user ? authStatus.user.id : 'null');

      // Store global admin status
      if (authStatus.isGlobalAdmin) {
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
      
      const currentUser = authStatus.user; // Usar el usuario recién obtenido

      // --- Obtener projectId inicial (si se solicita y hay usuario) ---
      if (fetchInitialProject && currentUser) {
        // NOTA: isCheckingInitialProject ya está en true si llegamos aquí
        try {
          console.log(`[useAuth DEBUG] Project Fetch TRY block STARTING. User: ${currentUser.id}`);
          // Intentar asegurar que el cliente Supabase tenga la sesión más reciente
          console.log("[useAuth DEBUG] Explicitly calling getSession before project query...");
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
              console.error("[useAuth DEBUG] Error during explicit getSession before project query:", sessionError);
              // Considerar si lanzar un error aquí o continuar igualmente
          } else {
              console.log("[useAuth DEBUG] Supabase getSession completed before project query.");
          }

          console.log(`[useAuth] Fetching initial project from table: ${Tables.project_users} for user: ${currentUser.id}`);

          const { data: projectUserData, error: projectUserError } = await supabase
            .from(Tables.project_users)
            .select('project_id')
            .eq('user_id', currentUser.id)
            .eq('status', 'active')
            .limit(1)
            .single();
          console.log('[useAuth DEBUG] Project fetch RESULT:', { projectUserData, projectUserError });

          if (projectUserError && projectUserError.code !== 'PGRST116') {
             console.error('[useAuth] Error fetching initial project user data:', projectUserError);
           }

          const initialProjectId = projectUserData?.project_id || null;
          console.log(`[useAuth DEBUG] Determined initialProjectId: ${initialProjectId}`);
          setCurrentProjectId(initialProjectId); // <- Actualización de ProjectId
          if (initialProjectId) {
             sessionStorage.setItem('currentProjectId', initialProjectId);
           } else {
             sessionStorage.removeItem('currentProjectId');
           }
           console.log(`[useAuth DEBUG] Project Fetch state updated.`);
          } catch (error) {
          console.error('[useAuth DEBUG] Project Fetch CATCH block:', error);
           setCurrentProjectId(null); // Limpiar en error
           sessionStorage.removeItem('currentProjectId');
        } finally {
          // SOLO marcamos que la revisión del proyecto terminó aquí
          console.log('[useAuth DEBUG] Project Fetch FINALLY block. Setting isCheckingInitialProject=false.');
          setIsCheckingInitialProject(false);
        }
      } else if (fetchInitialProject) {
        // Si se solicitó fetchInitialProject pero no había usuario,
        // también terminamos la 'revisión' del proyecto (que no ocurrió).
         console.log('[useAuth DEBUG] Skipping project fetch (no user), setting isCheckingInitialProject=false.');
         setIsCheckingInitialProject(false);
      }
      // Si fetchInitialProject era false, isCheckingInitialProject ya estaba en false.

      // En este punto, todas las operaciones async y setState DENTRO del try han sido iniciadas.

    } catch (error) {
      console.error('[useAuth] Error during refreshAuthState:', error);
      // Limpiar todo el estado en caso de error
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setCurrentProjectId(null);
      setIsCheckingInitialProject(false); // Asegurar que esté en false
      setIsLoading(false); // Detener carga en error también
      // Podrías considerar cleanupAuthState() aquí si es apropiado
    } finally {
      // Este finally se ejecuta DESPUÉS del try completo o del catch.
      // Solo ponemos isLoading principal en false AQUI, una vez todo lo demás (incluido el finally del proyecto) ha terminado.
      console.log('[useAuth DEBUG] refreshAuthState FINAL finally block. Setting isLoading=false.');
      setIsLoading(false);
      if (!isInitialized) setIsInitialized(true); // Marcar como inicializado después del primer refresh
    }
  }, [authService]);

  // Efecto para listener y carga inicial
  useEffect(() => {
    // Solo configurar una vez
    if (authListenerRef.current) {
       console.log("[useAuth Initial Effect] Listener already exists, skipping setup.");
       return;
    }
    console.log("[useAuth Initial Effect] Setting up auth listener.");

    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => { // Hacer async para await refreshAuthState
      console.log("[useAuth] Auth state changed, event:", event, "session:", !!newSession);

      if (event === 'INITIAL_SESSION') {
        if (newSession) {
          console.log("[useAuth DEBUG] INITIAL_SESSION (user exists) -> Calling refreshAuthState(true)");
          try {
            await refreshAuthState(true);
            console.log("[useAuth DEBUG] INITIAL_SESSION refresh complete, setting isInitialized=true");
          } catch (e) { console.error("Error during initial session refresh:", e); }
          finally { setIsInitialized(true); } // Marcar inicializado incluso si hubo error en refresh? O solo en éxito? Decidimos marcar siempre.
        } else {
          console.log("[useAuth DEBUG] INITIAL_SESSION (no user) -> Setting isLoading=false, isInitialized=true");
          setIsLoading(false); // No hay nada que cargar
          setIsInitialized(true); // Pero el estado inicial está determinado
        }
      } else if (event === 'SIGNED_IN') {
        console.log("[useAuth DEBUG] SIGNED_IN event -> Calling refreshAuthState(true)");
        try {
           await refreshAuthState(true);
           console.log("[useAuth DEBUG] SIGNED_IN refresh complete, setting isInitialized=true");
        } catch (e) { console.error("Error during signed in refresh:", e); }
        finally { setIsInitialized(true); } // Marcar inicializado después del login
      } else if (event === 'SIGNED_OUT') {
        console.log("[useAuth DEBUG] SIGNED_OUT event -> Cleaning up state.");
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setIsGlobalAdmin(false);
        setIsProjectAdmin(false);
        setCurrentProjectId(null);
        sessionStorage.removeItem('currentProjectId');
        localStorage.removeItem('isGlobalAdmin');
        localStorage.removeItem('authState');
        setIsLoading(false);
        setIsCheckingInitialProject(false);
        // ¿Deberíamos poner isInitialized = false aquí? Depende.
        // Si queremos que al volver a loguear se muestre "Inicializando...", sí.
        // Por ahora, dejémoslo en true.
      } else if (event !== 'USER_UPDATED' && event !== 'PASSWORD_RECOVERY' && event !== 'TOKEN_REFRESHED') {
        // Otros eventos que podrían requerir un refresh simple (sin buscar proyecto)
        console.log(`[useAuth DEBUG] Auth event ${event} -> Calling refreshAuthState(false)`);
        await refreshAuthState(false);
      } else {
        console.log(`[useAuth DEBUG] Auth event ${event} -> No action needed.`);
      }
    });

    authListenerRef.current = { data };

    return () => {
      console.log("[useAuth Initial Effect] Cleaning up auth listener.");
      authListenerRef.current?.data.subscription.unsubscribe();
      authListenerRef.current = null;
    };
    // Ejecutar solo una vez para configurar el listener
  }, [refreshAuthState]); // Depender de refreshAuthState

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
  }, [authService]);

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
  }, [user, currentProjectId, authService]); // Dependencias correctas

  // Estado de carga combinado
  const combinedLoading = isLoading || isCheckingInitialProject;

  return {
    session,
    user,
    userProfile,
    isGlobalAdmin,
    isProjectAdmin,
    isLoading: combinedLoading, // Estado de carga para consumidores
    isInitialized, // Estado de inicialización
    currentProjectId,
    signOut, // Export the locally defined signOut function
    refreshAuthState,
  };
}

// Nota: El hook `useAuthActions` y el contexto `AuthContext` / `AuthProvider` no se muestran aquí
// pero se asume que usan los valores devueltos por `useAuth`.
