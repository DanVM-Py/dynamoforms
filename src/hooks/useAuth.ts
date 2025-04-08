import { useState, useEffect, useCallback, useRef, createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Tables } from '@/config/environment'; // Asumiendo existencia
import { supabase } from '@/integrations/supabase/client'; // Para el listener
import { authService as supabaseAuthService, UserProfile } from '@/services/authService';
import { logger } from "@/lib/logger";

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
    logger.debug(`[useAuth DEBUG] refreshAuthState called with fetchInitialProject=${fetchInitialProject}.`);
    // isLoading cubre TODO el proceso de refresh, especialmente los iniciales
    setIsLoading(true);
    // isCheckingInitialProject es específico para la sub-tarea de fetch
    setIsCheckingInitialProject(fetchInitialProject);

    try {
      logger.info(`[useAuth] Refreshing auth state (fetch project: ${fetchInitialProject})...`);
      const authStatus = await authService.getAuthStatus();
      logger.debug("[useAuth DEBUG] authService.getAuthStatus result:", authStatus);

      // --- Establecer estado ---
      setSession(authStatus.session);
      setUser(authStatus.user);
      setUserProfile(authStatus.profile);
      setIsGlobalAdmin(authStatus.isGlobalAdmin);
      logger.debug("[useAuth DEBUG] Core auth states SET. User:", authStatus.user ? authStatus.user.id : 'null');

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
        
        logger.info("[useAuth] Set global admin flag to true in storage");

      } else {
        // Only clear if we're sure user is not admin
        if (authStatus.session) {
          localStorage.removeItem('isGlobalAdmin');
          sessionStorage.removeItem('isGlobalAdmin');
        }
      }
      
      const currentUser = authStatus.user;

      // --- Obtener projectId inicial ---
      if (fetchInitialProject && currentUser) {
        // isCheckingInitialProject ya está en true
        try {
          logger.debug(`[useAuth DEBUG] Project Fetch TRY block STARTING. User: ${currentUser.id}`);
          // Intentar asegurar que el cliente Supabase tenga la sesión más reciente
          logger.debug("[useAuth DEBUG] Explicitly calling getSession before project query...");
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
              logger.error("[useAuth DEBUG] Error during explicit getSession before project query:", sessionError);
              // Considerar si lanzar un error aquí o continuar igualmente
          } else {
              logger.debug("[useAuth DEBUG] Supabase getSession completed before project query.");
          }

          logger.debug(`[useAuth] Fetching initial project from table: ${Tables.project_users} for user: ${currentUser.id}`);

          const { data: projectUserData, error: projectUserError } = await supabase
            .from(Tables.project_users)
            .select('project_id')
            .eq('user_id', currentUser.id)
            .limit(1)
            .single();
          logger.debug('[useAuth DEBUG] Project fetch RESULT:', { projectUserData, projectUserError });

          if (projectUserError && projectUserError.code !== 'PGRST116') {
             logger.error('[useAuth] Error fetching initial project user data:', projectUserError);
           }

          const initialProjectId = projectUserData?.project_id || null;
          logger.debug(`[useAuth DEBUG] Determined initialProjectId: ${initialProjectId}`);
          setCurrentProjectId(initialProjectId);
          if (initialProjectId) {
             sessionStorage.setItem('currentProjectId', initialProjectId);
           } else {
             sessionStorage.removeItem('currentProjectId');
           }
           logger.debug(`[useAuth DEBUG] Project Fetch state updated.`);
          } catch (error) {
          logger.error('[useAuth DEBUG] Project Fetch CATCH block:', error);
           setCurrentProjectId(null);
           sessionStorage.removeItem('currentProjectId');
        } finally {
          // SOLO marcamos que la revisión del proyecto terminó aquí
          logger.debug('[useAuth DEBUG] Project Fetch FINALLY block. Setting isCheckingInitialProject=false.');
          setIsCheckingInitialProject(false);
        }
      } else if (fetchInitialProject) {
         // Asegurar que checking termine si se pidió fetch pero no había user
         logger.debug('[useAuth DEBUG] Skipping project fetch (no user), setting isCheckingInitialProject=false.');
         setIsCheckingInitialProject(false);
      }
      // Si fetchInitialProject era false, isCheckingInitialProject nunca se puso true

    } catch (error) {
      logger.error('[useAuth] Error during refreshAuthState:', error);
      // Limpiar todo en error
      setSession(null); setUser(null); setUserProfile(null);
      setIsGlobalAdmin(false); setIsProjectAdmin(false); setCurrentProjectId(null);
      // Asegurar limpieza de flags de carga en error
      setIsCheckingInitialProject(false);
      setIsLoading(false);
    } finally {
      // isLoading GENERAL solo se pone false al final de TODO el proceso.
      // isCheckingInitialProject ya debería ser false si se ejecutó esa parte.
      logger.debug('[useAuth DEBUG] refreshAuthState FINAL finally block. Setting isLoading=false.');
      setIsLoading(false);
    }
  // Dependencia simplificada a authService (estable)
  }, [authService]);

  // Efecto para listener y carga inicial
  useEffect(() => {
    if (authListenerRef.current) {
       logger.debug("[useAuth Initial Effect] Listener already exists, skipping setup.");
       return;
    }
    logger.info("[useAuth Initial Effect] Setting up auth listener.");

    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Log inicial SIN el estado 'user' para evitar confusión sobre cuándo se lee
      logger.debug(`[useAuth] Auth state changed. Event: ${event}, Session exists: ${!!newSession}, isInitialized: ${isInitialized}`);

      switch (event) {
        case 'INITIAL_SESSION':
          // Lógica robusta para la carga inicial
          if (newSession) {
            logger.debug("[useAuth DEBUG] Event: INITIAL_SESSION (user exists) -> Calling refreshAuthState(true) for full load.");
            try { await refreshAuthState(true); } catch (e) { logger.error("Error during initial session refresh:", e); }
            finally { setIsInitialized(true); } // Marcar inicializado DESPUÉS
          } else {
            logger.debug("[useAuth DEBUG] Event: INITIAL_SESSION (no user) -> Setting final state.");
            setIsLoading(false); setIsCheckingInitialProject(false);
            setIsInitialized(true); // Estado conocido
          }
          break;

        case 'SIGNED_IN':
          // Simplificado: NO llamar a refreshAuthState aquí. LoginForm se encarga.
          logger.debug(`[useAuth DEBUG] Event: SIGNED_IN received. Taking no explicit action based on this event.`);
          // Asegurar que esté inicializado
          if (!isInitialized) {
              logger.warn("[useAuth DEBUG] SIGNED_IN event occurred but isInitialized was false. Setting true now.");
              setIsInitialized(true);
          }
          break;

        case 'SIGNED_OUT':
             logger.debug("[useAuth DEBUG] Event: SIGNED_OUT -> Cleaning up state.");
             setSession(null); setUser(null); setUserProfile(null);
             setIsGlobalAdmin(false); setIsProjectAdmin(false); setCurrentProjectId(null);
             sessionStorage.removeItem('currentProjectId');
             localStorage.removeItem('isGlobalAdmin'); localStorage.removeItem('authState');
             sessionStorage.removeItem('isGlobalAdmin');
             setIsLoading(false); setIsCheckingInitialProject(false);
             break;

        case 'TOKEN_REFRESHED':
           logger.debug("[useAuth DEBUG] Event: TOKEN_REFRESHED. Taking no explicit action.");
           // OPCIONAL: refreshAuthState(false);
           break;

        case 'USER_UPDATED':
           logger.debug("[useAuth DEBUG] Event: USER_UPDATED received. Taking no explicit action for now to prevent loops.");
           // ANTERIOR: Llamaba a refreshAuthState(false). Comentado temporalmente.
           // if (isInitialized && user) { await refreshAuthState(false); }
           break;

        case 'PASSWORD_RECOVERY':
          logger.debug("[useAuth DEBUG] Event: PASSWORD_RECOVERY -> No default action needed.");
          break;

        default:
          logger.debug(`[useAuth DEBUG] Unhandled auth event: ${event}`);
      }
    });

    authListenerRef.current = { data };

    return () => {
      logger.debug("[useAuth Initial Effect] Cleaning up auth listener.");
      authListenerRef.current?.data.subscription.unsubscribe();
      authListenerRef.current = null;
    };
  // QUITAR 'user' de las dependencias para romper el ciclo.
  }, [refreshAuthState, isInitialized]);

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
        logger.error("Sign out error:", error);
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
      logger.debug(`[useAuth] Checking project admin status for user ${user.id} and project ${currentProjectId}`);
      let isMounted = true; // Flag para evitar actualizaciones en componente desmontado
      authService.isProjectAdmin(user.id, currentProjectId)
        .then(isAdmin => {
          if (isMounted) {
            logger.debug(`[useAuth] Project admin status: ${isAdmin}`);
            setIsProjectAdmin(isAdmin);
          }
        })
        .catch(error => {
           logger.error("[useAuth] Error checking project admin status:", error);
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

  // Estado de carga combinado para exportar
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
