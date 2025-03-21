
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { config } from "@/config/environment";

export function useAuthActions(
  setUser: (user: any) => void,
  setSession: (session: any) => void,
  setUserProfile: (profile: any) => void,
  setIsGlobalAdmin: (isAdmin: boolean) => void,
  setIsProjectAdmin: (isAdmin: boolean) => void,
  setIsApprover: (isApprover: boolean) => void,
  setLoading: (loading: boolean) => void
) {
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log("Starting sign out process");
      
      // Clear local state first - this ensures UI responds immediately
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setIsApprover(false);
      
      // Clear local storage manually to ensure all auth data is removed
      localStorage.removeItem(config.storage.authTokenKey);
      
      try {
        // Then sign out from Supabase - this may fail if session is already gone
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.warn("Supabase signOut warning:", error.message);
          // Don't throw on AuthSessionMissingError since that's expected in some cases
          if (error.name !== 'AuthSessionMissingError') {
            console.error("Error during signOut:", error);
          }
        }
      } catch (err: any) {
        // Log but don't rethrow, since we've already cleared local state
        console.warn("Error in Supabase signOut:", err.message || err);
      }
      
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
      
      // Force navigation to auth page
      window.location.href = "/auth";
    } catch (error: any) {
      console.error("Error in signOut function:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión completamente, pero se te ha redirigido a la página de inicio de sesión.",
        variant: "destructive"
      });
      
      // Attempt to force navigation even with error
      window.location.href = "/auth";
    } finally {
      setLoading(false);
    }
  }, [setUser, setSession, setUserProfile, setIsGlobalAdmin, setIsProjectAdmin, setIsApprover, setLoading]);

  const refreshUserProfile = useCallback(async (user: any, fetchUserProfile: Function) => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, []);

  return { signOut, refreshUserProfile };
}
