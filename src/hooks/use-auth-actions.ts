
import { useCallback } from "react";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
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
      
      // Use the centralized cleanup function
      cleanupAuthState();
      
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
      
      return true;
    } catch (error: any) {
      console.error("Error in signOut function:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión completamente.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [setUser, setSession, setUserProfile, setIsGlobalAdmin, setIsProjectAdmin, setIsApprover, setLoading]);

  const refreshUserProfile = useCallback(async () => {
    if (!supabase.auth || !setUser || !setUserProfile) return;
    
    try {
      setLoading(true);
      
      // First get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        return;
      }
      
      const userId = session.user.id;
      
      // Check global admin status first (bypasses RLS)
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        setIsGlobalAdmin(isAdminData === true);
      }
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setUserProfile(profileData);
        setIsApprover(profileData.role === "approver");
      }
      
      // Check project admin status
      const currentProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
      
      if (currentProjectId) {
        const { data: isProjectAdminData, error: isProjectAdminError } = await supabase
          .rpc('is_project_admin', { 
            user_uuid: userId,
            project_uuid: currentProjectId 
          });
          
        if (isProjectAdminError) {
          console.error("Error checking project admin status:", isProjectAdminError);
        } else {
          setIsProjectAdmin(isProjectAdminData === true);
        }
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setIsGlobalAdmin, setUserProfile, setIsApprover, setIsProjectAdmin]);

  return { signOut, refreshUserProfile };
}
