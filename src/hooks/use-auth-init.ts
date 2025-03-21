
import { useEffect, useRef } from "react";
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
  // Use a ref to prevent unnecessary re-renders and track initialization
  const initialized = useRef(false);
  const authListenerRef = useRef<any>(null);

  useEffect(() => {
    // Prevent duplicate initialization
    if (initialized.current) {
      console.log("Auth already initialized, skipping");
      return;
    }
    initialized.current = true;

    // Setting up auth state tracking
    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");
        setLoading(true);
        setFetchComplete(false);
        
        // Set up auth listener FIRST (before checking session)
        authListenerRef.current = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, !!newSession, "User:", newSession?.user?.email);
            
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
              console.log("User authenticated, fetching profile for:", newSession.user.email);
              try {
                await fetchUserProfile(newSession.user.id, true);
                console.log("Profile fetch completed successfully for:", newSession.user.email);
              } catch (error) {
                console.error("Profile fetch failed after auth event:", error);
              } finally {
                setFetchComplete(true);
                setLoading(false);
              }
            } 
            else {
              // For other events, just update state
              console.log("Other auth event:", event);
              setFetchComplete(true);
              setLoading(false);
            }
          }
        );
        
        // Add a timeout to prevent hanging
        const authTimeout = setTimeout(() => {
          console.log("Auth initialization timeout reached, continuing...");
          setLoading(false);
          setFetchComplete(true);
        }, 10000);
        
        // SECOND: Check for existing session AFTER listener is set
        try {
          console.log("Checking for existing session...");
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Error retrieving session:", sessionError);
          } else {
            console.log("Initial session check:", !!data.session, "User:", data.session?.user?.email);
            
            // Update state with current session info
            setSession(data.session);
            setUser(data.session?.user ?? null);
            
            // Only fetch profile if we have a user
            if (data.session?.user) {
              console.log("Fetching profile for existing user:", data.session.user.email);
              try {
                await fetchUserProfile(data.session.user.id, true);
                console.log("Initial profile fetch succeeded for:", data.session.user.email);
              } catch (error) {
                console.error("Initial profile fetch failed:", error);
              }
            } else {
              console.log("No existing user session found");
            }
          }
        } catch (error) {
          console.error("Session check failed:", error);
        }
        
        // Clear the timeout since we've completed the session check
        clearTimeout(authTimeout);
        
        // Complete initialization regardless of profile fetch
        console.log("Auth initialization complete");
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
      if (authListenerRef.current) {
        try {
          console.log("Cleaning up auth listener");
          authListenerRef.current.data.subscription.unsubscribe();
          authListenerRef.current = null;
        } catch (error) {
          console.error("Auth listener cleanup failed:", error);
        }
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
