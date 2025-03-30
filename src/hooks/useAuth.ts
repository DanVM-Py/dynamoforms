
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService, UserProfile } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  
  // Use a ref to track the subscription to avoid multiple listeners
  const authListenerRef = useRef<{ data?: { subscription?: { unsubscribe?: () => void } } }>(null);

  // On mount, check for stored global admin status
  useEffect(() => {
    const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true' || 
                               sessionStorage.getItem('isGlobalAdmin') === 'true';
    if (storedIsGlobalAdmin) {
      setIsGlobalAdmin(true);
    }
    
    // Update project ID from storage if available
    const storedProjectId = localStorage.getItem('currentProjectId') || 
                           sessionStorage.getItem('currentProjectId');
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId);
    }
  }, []);

  // Function to refresh auth state from the service
  const refreshAuthState = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Refreshing auth state");
      const authStatus = await authService.getAuthStatus();
      
      setSession(authStatus.session);
      setUser(authStatus.user);
      setUserProfile(authStatus.profile);
      
      // Always update global admin status from the auth status and store it
      const isAdmin = authStatus.isGlobalAdmin;
      setIsGlobalAdmin(isAdmin);
      
      // Store global admin status in both localStorage and sessionStorage for redundancy
      if (isAdmin) {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
        console.log("Setting global admin flag to true in storage");
      } else {
        // Only clear if we're sure user is not admin
        if (authStatus.session) {
          localStorage.removeItem('isGlobalAdmin');
          sessionStorage.removeItem('isGlobalAdmin');
        }
      }
      
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
    
    // Set up the auth state change listener
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed, event:", event, "session:", !!newSession);
      
      // For immediate UI updates
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // If the user signs out, clear global admin status
      if (event === 'SIGNED_OUT') {
        setIsGlobalAdmin(false);
        localStorage.removeItem('isGlobalAdmin');
        sessionStorage.removeItem('isGlobalAdmin');
      }
      
      // Then refresh full auth state for other events
      if (event !== 'INITIAL_SESSION') {
        refreshAuthState();
      }
    });
    
    // Store the listener reference
    authListenerRef.current = { data };
    
    // Get initial auth state
    refreshAuthState();
    
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
      // Clear admin status first
      setIsGlobalAdmin(false);
      localStorage.removeItem('isGlobalAdmin');
      sessionStorage.removeItem('isGlobalAdmin');
      
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
