
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, UserProfile } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  
  // Use a ref to track the subscription to avoid multiple listeners
  const authListenerRef = useRef<{ data?: { subscription?: { unsubscribe?: () => void } } }>(null);

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
    
    // Clean up any existing listeners before setting a new one
    if (authListenerRef.current?.data?.subscription?.unsubscribe) {
      console.log("Cleaning up existing auth listener before setting up a new one");
      authListenerRef.current.data.subscription.unsubscribe();
    }
    
    // Avoid creating multiple listeners
    console.log("Setting up auth listener");
    
    // Set up the auth state change listener - IMPORTANT: Use the primary client
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed, event:", event, "session:", !!newSession);
      
      // For immediate UI updates
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // Then refresh full auth state
      if (event !== 'INITIAL_SESSION') {
        refreshAuthState();
      }
    });
    
    // Store the listener reference
    authListenerRef.current = { data };
    
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
      console.log("Cleaning up auth listener");
      if (authListenerRef.current?.data?.subscription?.unsubscribe) {
        authListenerRef.current.data.subscription.unsubscribe();
      }
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
