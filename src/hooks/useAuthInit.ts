
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

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
  // Use refs to prevent unnecessary re-renders and track initialization
  const initialized = useRef(false);
  const authListenerRef = useRef<{ subscription?: { unsubscribe?: () => void } } | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const stageRef = useRef<string>("not_started");

  useEffect(() => {
    // Prevent duplicate initialization
    if (initialized.current) {
      logger.debug("Auth already initialized, skipping. Current stage:", stageRef.current);
      return;
    }
    initialized.current = true;

    // Setting up auth state tracking
    const initializeAuth = async () => {
      try {
        logger.info("Initializing authentication...");
        stageRef.current = "initializing";
        setLoading(true);
        setFetchComplete(false);
        
        // Set a timeout to prevent hanging forever
        timeoutRef.current = window.setTimeout(() => {
          logger.warn("Auth initialization timeout reached after 30 seconds");
          logger.warn("Current initialization state:");
          logger.warn("- Auth listener:", !!authListenerRef.current);
          logger.warn("- Initialization completed:", initialized.current);
          logger.warn("- Current stage:", stageRef.current);
          setLoading(false);
          setFetchComplete(true);
        }, 30000);
        
        // Set up auth listener FIRST (before checking session)
        logger.debug("Setting up auth state listener...");
        stageRef.current = "setting_up_listener";
        
        // Set up auth state change listener with detailed logging
        const { data } = await supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            logger.debug(`Auth state changed: ${event}`, !!newSession, "User:", newSession?.user?.email);
            logger.debug(`Auth state change occurred at: ${Date.now()}`);
            stageRef.current = `auth_event_${event}`;
            
            // Update session state immediately on any auth event
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              // For signout, clear all auth-related state
              logger.info("User signed out, clearing auth state");
              stageRef.current = "signed_out";
              setFetchComplete(true);
              setLoading(false);
            } 
            else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              // For sign in and token refresh, fetch user profile
              logger.debug("User authenticated, fetching profile for:", newSession.user.email);
              stageRef.current = "fetching_profile_after_auth_event";
              try {
                logger.debug("Starting profile fetch at:", Date.now());
                await fetchUserProfile(newSession.user.id, true);
                logger.debug("Profile fetch completed successfully at:", Date.now(), "for:", newSession.user.email);
                stageRef.current = "profile_fetch_complete";
              } catch (error) {
                logger.error("Profile fetch failed after auth event:", error);
                stageRef.current = "profile_fetch_error";
              } finally {
                setFetchComplete(true);
                setLoading(false);
              }
            } 
            else {
              // For other events, just update state
              logger.debug("Other auth event:", event);
              stageRef.current = `other_auth_event_${event}`;
              setFetchComplete(true);
              setLoading(false);
            }
          }
        );
        
        // Store the subscription reference properly for cleanup
        if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
          authListenerRef.current = { subscription: data.subscription };
        }
        
        logger.debug("Auth listener set up successfully");
        stageRef.current = "listener_setup_complete";
        
        // SECOND: Check for existing session AFTER listener is set
        try {
          logger.debug("Checking for existing session...");
          logger.debug("Session check started at:", Date.now());
          stageRef.current = "checking_existing_session";
          
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          logger.debug("Session check completed at:", Date.now());
          stageRef.current = "session_check_complete";
          
          if (sessionError) {
            logger.error("Error retrieving session:", sessionError);
            stageRef.current = "session_check_error";
          } else {
            logger.debug("Initial session check:", !!data.session, "User:", data.session?.user?.email);
            stageRef.current = data.session ? "session_found" : "no_session_found";
            
            // Update state with current session info
            setSession(data.session);
            setUser(data.session?.user ?? null);
            
            // Only fetch profile if we have a user
            if (data.session?.user) {
              logger.debug("Fetching profile for existing user:", data.session.user.email);
              logger.debug("Profile fetch started at:", Date.now());
              stageRef.current = "fetching_profile_for_existing_session";
              
              try {
                await fetchUserProfile(data.session.user.id, true);
                logger.debug("Initial profile fetch succeeded at:", Date.now(), "for:", data.session.user.email);
                stageRef.current = "initial_profile_fetch_complete";
              } catch (error) {
                logger.error("Initial profile fetch failed:", error);
                stageRef.current = "initial_profile_fetch_error";
              }
            } else {
              logger.info("No existing user session found");
              stageRef.current = "confirmed_no_session";
            }
          }
        } catch (error) {
          logger.error("Session check failed:", error);
          stageRef.current = "session_check_exception";
        }
        
        // Clear the timeout since we've completed the session check
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Complete initialization regardless of profile fetch
        logger.info("Auth initialization complete. Final stage:", stageRef.current);
        stageRef.current = "initialization_complete";
        setFetchComplete(true);
        setLoading(false);
      } catch (error) {
        logger.error("Auth initialization failed:", error);
        stageRef.current = "initialization_failed";
        setFetchComplete(true);
        setLoading(false);
      }
    };

    // Start the initialization process
    initializeAuth();
    
    // Clean up listener and timeouts on component unmount
    return () => {
      if (authListenerRef.current && authListenerRef.current.subscription) {
        try {
          logger.debug("Cleaning up auth listener. Final stage:", stageRef.current);
          // Only try to unsubscribe if the subscription exists and has unsubscribe method
          if (typeof authListenerRef.current.subscription.unsubscribe === 'function') {
            authListenerRef.current.subscription.unsubscribe();
          }
          authListenerRef.current = null;
        } catch (error) {
          logger.error("Auth listener cleanup failed:", error);
        }
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [setSession, setUser, setLoading, fetchUserProfile, setFetchComplete]);
}
