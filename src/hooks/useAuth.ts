
import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, UserProfile } from '@/services/authService';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);

  // Function to refresh auth state from the service
  const refreshAuthState = useCallback(async () => {
    setIsLoading(true);
    try {
      const authStatus = await authService.getAuthStatus();
      
      setSession(authStatus.session);
      setUser(authStatus.user);
      setUserProfile(authStatus.profile);
      setIsGlobalAdmin(authStatus.isGlobalAdmin);
      
      // Check project admin status if we have a current project
      if (authStatus.user && currentProjectId) {
        const projectAdmin = await authService.isProjectAdmin(
          authStatus.user.id,
          currentProjectId
        );
        setIsProjectAdmin(projectAdmin);
      } else {
        setIsProjectAdmin(false);
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [currentProjectId]);

  // Set up auth listener and get initial state
  useEffect(() => {
    if (isInitialized) return;
    
    // Set up the auth state change listener
    const { data: authListener } = authService.onAuthStateChange((session) => {
      console.log("Auth state changed, session:", !!session);
      refreshAuthState();
    });
    
    // Get initial auth state
    refreshAuthState();
    
    // Update project ID from storage if available
    const storedProjectId = localStorage.getItem('currentProjectId') || 
                           sessionStorage.getItem('currentProjectId');
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId);
    }
    
    // Clean up the listener on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isInitialized, refreshAuthState]);

  // Sign out function
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, error } = await authService.signOut();
      if (!success && error) {
        console.error("Sign out error:", error);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update project ID and check admin status when it changes
  useEffect(() => {
    if (user && currentProjectId) {
      authService.isProjectAdmin(user.id, currentProjectId)
        .then(isAdmin => {
          setIsProjectAdmin(isAdmin);
        });
    }
  }, [user, currentProjectId]);

  // Function to update current project
  const updateCurrentProject = useCallback((projectId: string) => {
    localStorage.setItem('currentProjectId', projectId);
    sessionStorage.setItem('currentProjectId', projectId);
    setCurrentProjectId(projectId);
  }, []);

  return {
    session,
    user,
    userProfile,
    isGlobalAdmin,
    isProjectAdmin,
    isLoading,
    isInitialized,
    currentProjectId,
    signOut,
    refreshAuthState,
    updateCurrentProject
  };
}
