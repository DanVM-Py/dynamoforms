
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
    // Setting up auth state tracking
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    
    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");
        setLoading(true);
        setFetchComplete(false);
        
        // FIRST: Set up auth listener before checking session
        authListener = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, !!newSession);
            
            // Update session state immediately on any auth event
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              // For signout, clear all auth-related state
              console.log("User signed out, clearing auth state");
              setFetchComplete(true);
              setLoading(false);
            } 
            else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              // For sign in and token refresh, fetch user profile
              console.log("User authenticated, fetching profile");
              try {
                await fetchUserProfile(newSession.user.id, true);
              } catch (error) {
                console.error("Profile fetch failed after auth event:", error);
              } finally {
                setFetchComplete(true);
                setLoading(false);
              }
            } 
            else {
              // For other events, just update state
              setFetchComplete(true);
              setLoading(false);
            }
          }
        );
        
        // SECOND: Check for existing session AFTER listener is set
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error retrieving session:", sessionError);
          setFetchComplete(true);
          setLoading(false);
          return;
        }
        
        console.log("Initial session check:", !!session);
        
        // Update state with current session info
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile if we have a user
        if (session?.user) {
          try {
            await fetchUserProfile(session.user.id, true);
          } catch (error) {
            console.error("Initial profile fetch failed:", error);
          }
        }
        
        // Complete initialization regardless of profile fetch
        setFetchComplete(true);
        setLoading(false);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setFetchComplete(true);
        setLoading(false);
      }
    };

    // Start the initialization process
    initializeAuth();
    
    // Clean up listener on component unmount
    return () => {
      if (authListener) {
        try {
          console.log("Cleaning up auth listener");
          authListener.data.subscription.unsubscribe();
        } catch (error) {
          console.error("Auth listener cleanup failed:", error);
        }
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
