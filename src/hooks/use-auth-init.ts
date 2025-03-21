
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
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
        }
        
        console.log("Auth state initialized:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id, true);
        } else {
          setFetchComplete(true);
        }
        
        // Set up auth state change listener
        authListener = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, !!newSession);
            
            // Update state based on auth event
            if (event === 'SIGNED_OUT') {
              // Clear all auth-related state is handled in signOut function
              setFetchComplete(true);
            } else {
              // For other events, update session and user
              setSession(newSession);
              setUser(newSession?.user ?? null);
              
              if (newSession?.user) {
                await fetchUserProfile(newSession.user.id, true);
              } else {
                setFetchComplete(true);
              }
            }
          }
        );
      } catch (error) {
        console.error("Error initializing auth:", error);
        setFetchComplete(true);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      // Clean up auth listener on unmount
      if (authListener) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
