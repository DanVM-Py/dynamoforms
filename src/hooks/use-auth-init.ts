
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
    // Get initial session and set up auth state change listener
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setFetchComplete(false);
        
        // Set up auth state change listener FIRST
        authListener = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, !!newSession);
            
            // Update state based on auth event
            if (event === 'SIGNED_OUT') {
              // Clear all auth-related state
              setSession(null);
              setUser(null);
              setFetchComplete(true);
              setLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              // For other events, update session and user
              setSession(newSession);
              setUser(newSession?.user ?? null);
              
              if (newSession?.user) {
                try {
                  await fetchUserProfile(newSession.user.id, true);
                } catch (error) {
                  console.error("Error fetching user profile after auth state change:", error);
                } finally {
                  setFetchComplete(true);
                  setLoading(false);
                }
              } else {
                setFetchComplete(true);
                setLoading(false);
              }
            } else {
              // For other events, just update session and user
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setFetchComplete(true);
              setLoading(false);
            }
          }
        );
        
        // THEN check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setFetchComplete(true);
          setLoading(false);
          return;
        }
        
        console.log("Auth state initialized:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            await fetchUserProfile(session.user.id, true);
          } catch (error) {
            console.error("Error fetching initial user profile:", error);
          } finally {
            setFetchComplete(true);
            setLoading(false);
          }
        } else {
          setFetchComplete(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setFetchComplete(true);
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      // Clean up auth listener on unmount
      if (authListener) {
        try {
          authListener.data.subscription.unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing from auth listener:", error);
        }
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
