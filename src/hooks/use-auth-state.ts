
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { ProjectUser } from "@/types/custom";

export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [fetchComplete, setFetchComplete] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string, skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      
      console.log("Fetching user profile for ID:", userId);
      
      // Step 1: Call the is_global_admin function first to avoid recursion
      // This bypasses RLS completely using SECURITY DEFINER
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        console.log("User is global admin:", isAdminData);
        setIsGlobalAdmin(isAdminData === true);
      }
      
      // Step 2: Fetch user profile - now that we know admin status, RLS should work correctly
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching user profile:", error);
        return;
      }
      
      if (data) {
        console.log("User profile found:", data);
        setUserProfile(data);
        
        // For approver, check the role field
        setIsApprover(data.role === "approver");
      } else {
        console.log("No user profile found");
        setUserProfile(null);
      }
      
      // Step 3: Check if user is project admin for any project - using project_id null to check all projects
      const currentProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
      
      if (currentProjectId) {
        // If we have a current project, use the is_project_admin function to check project admin status
        const { data: isProjectAdminData, error: isProjectAdminError } = await supabase
          .rpc('is_project_admin', { 
            user_uuid: userId,
            project_uuid: currentProjectId 
          });
          
        if (isProjectAdminError) {
          console.error("Error checking project admin status:", isProjectAdminError);
        } else {
          console.log("User is project admin for current project:", isProjectAdminData);
          setIsProjectAdmin(isProjectAdminData === true);
        }
      } else {
        // Fallback - if no current project, check all project_users
        const { data: projectUserData, error: projectUserError } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active");
          
        if (projectUserError) {
          console.error("Error fetching project admin status:", projectUserError);
        } else {
          // Check if any project has admin rights - using type assertion to help TypeScript
          const isAdmin = projectUserData && projectUserData.some(pu => {
            const projectUser = pu as unknown as ProjectUser;
            return projectUser.is_admin === true;
          });
          console.log("User is project admin (from all projects check):", isAdmin);
          setIsProjectAdmin(!!isAdmin);
        }
      }
      
      setFetchComplete(true);
    } catch (error) {
      console.error("Error in user profile workflow:", error);
      setFetchComplete(true);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, []);

  return {
    session,
    setSession,
    user, 
    setUser,
    userProfile,
    setUserProfile,
    loading,
    setLoading,
    isGlobalAdmin,
    setIsGlobalAdmin,
    isProjectAdmin, 
    setIsProjectAdmin,
    isApprover,
    setIsApprover,
    fetchComplete,
    setFetchComplete,
    fetchUserProfile
  };
}
