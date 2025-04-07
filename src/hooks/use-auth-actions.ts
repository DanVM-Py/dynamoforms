import { useCallback } from "react";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { config } from "@/config/environment";
import { useAuth } from './useAuth'; // Assuming useAuth provides setAuthState
import { logger } from "@/lib/logger"; // <-- Import logger

export function useAuthActions(
  setAuthState: Function,
  fetchUserProfile: Function
) {
  const signOut = useCallback(async () => {
    logger.info("Starting sign out process");
    try {
      // Clear local auth state immediately for faster UI response
      setAuthState({ 
        session: null, 
        user: null, 
        userProfile: null, 
        isGlobalAdmin: false, 
        isProjectAdmin: false, 
        loading: false, // No longer loading auth state
        error: null 
      });
      // Remove potentially sensitive items from storage
      await cleanupAuthState(); 

      // Then call Supabase signout
      const { error } = await supabase.auth.signOut();

      if (error) {
        // Even if Supabase fails, local state is cleared. Log the warning.
        logger.warn("Supabase signOut warning:", error.message);
      }

      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
      
      return true;
    } catch (error) {
      logger.error("Error during signOut:", error); 
      // Ensure state is cleared even if cleanupAuthState failed
      setAuthState({ 
         session: null, 
         user: null, 
         userProfile: null, 
         isGlobalAdmin: false, 
         isProjectAdmin: false, 
         loading: false, 
         error: 'Error during sign out process.' 
      });
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión completamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [setAuthState]);

  const refreshAuthState = useCallback(async (userId: string) => {
    try {
      // Re-fetch the user profile and associated admin states
      const profile = await fetchUserProfile(userId);
      // Update the state with the latest profile info
      setAuthState({ 
        userProfile: profile, 
        isGlobalAdmin: profile?.is_global_admin || false,
        isProjectAdmin: profile?.is_project_admin || false, 
        error: null // Clear previous errors on successful refresh
      });
    } catch (error) {
      logger.error("Error refreshing user profile:", error);
      setAuthState({ error: 'Failed to refresh user profile.' });
    }
  }, [fetchUserProfile, setAuthState]);

  return { signOut, refreshAuthState };
}
