
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
  const [profileFetchStage, setProfileFetchStage] = useState<string>("not_started");

  const fetchUserProfile = useCallback(async (userId: string, skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      
      console.log("Fetching user profile for ID:", userId);
      console.log("Profile fetch started at:", Date.now());
      setProfileFetchStage("starting");
      
      // Step 1: Call the is_global_admin function first to avoid recursion
      // This bypasses RLS completely using SECURITY DEFINER
      setProfileFetchStage("checking_global_admin");
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
        setProfileFetchStage("global_admin_check_error");
      } else {
        console.log("User is global admin:", isAdminData);
        setIsGlobalAdmin(isAdminData === true);
        setProfileFetchStage("global_admin_check_complete");
      }
      
      // Step 2: Fetch user profile - now that we know admin status, RLS should work correctly
      setProfileFetchStage("fetching_profile");
      console.log("Fetching profile data at:", Date.now());
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
        setProfileFetchStage("profile_fetch_error");
      } else if (data) {
        console.log("User profile found:", data);
        setUserProfile(data);
        setProfileFetchStage("profile_found");
        
        // For approver, check the role field
        setIsApprover(data.role === "approver");
      } else {
        console.log("No user profile found");
        setProfileFetchStage("no_profile_found");
        
        // If no profile exists but we have a user, create a basic profile with email_confirmed=false
        try {
          // First get the user email from the auth user
          setProfileFetchStage("fetching_auth_user_for_new_profile");
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("Error getting user data:", userError);
            setProfileFetchStage("get_user_error_for_new_profile");
          } else if (userData?.user) {
            console.log("Creating new profile for user:", userData.user.email);
            setProfileFetchStage("creating_new_profile");
            
            // Create a basic profile for the user
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                email: userData.user.email,
                name: userData.user.email?.split('@')[0] || 'User',
                role: 'user',
                email_confirmed: false
              })
              .select("*")
              .single();
              
            if (insertError) {
              console.error("Error creating profile:", insertError);
              setProfileFetchStage("new_profile_creation_error");
            } else if (newProfile) {
              console.log("New profile created:", newProfile);
              setUserProfile(newProfile);
              setProfileFetchStage("new_profile_created");
            }
          }
        } catch (err) {
          console.error("Error in profile creation workflow:", err);
          setProfileFetchStage("profile_creation_exception");
        }
      }
      
      // Step 3: Check if user is project admin for any project - using project_id null to check all projects
      setProfileFetchStage("checking_project_admin");
      
      const currentProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
      
      if (currentProjectId) {
        // If we have a current project, use the is_project_admin function to check project admin status
        setProfileFetchStage("checking_current_project_admin");
        const { data: isProjectAdminData, error: isProjectAdminError } = await supabase
          .rpc('is_project_admin', { 
            user_uuid: userId,
            project_uuid: currentProjectId 
          });
          
        if (isProjectAdminError) {
          console.error("Error checking project admin status:", isProjectAdminError);
          setProfileFetchStage("project_admin_check_error");
        } else {
          console.log("User is project admin for current project:", isProjectAdminData);
          setIsProjectAdmin(isProjectAdminData === true);
          setProfileFetchStage("project_admin_check_complete");
        }
      } else {
        // Fallback - if no current project, check all project_users
        setProfileFetchStage("checking_all_projects_admin");
        const { data: projectUserData, error: projectUserError } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active");
          
        if (projectUserError) {
          console.error("Error fetching project admin status:", projectUserError);
          setProfileFetchStage("all_projects_admin_check_error");
        } else {
          // Check if any project has admin rights - using type assertion to help TypeScript
          const isAdmin = projectUserData && projectUserData.some(pu => {
            const projectUser = pu as unknown as ProjectUser;
            return projectUser.is_admin === true;
          });
          console.log("User is project admin (from all projects check):", isAdmin);
          setIsProjectAdmin(!!isAdmin);
          setProfileFetchStage("all_projects_admin_check_complete");
        }
      }
      
      console.log("User profile fetch completed at:", Date.now(), "Final stage:", profileFetchStage);
      setProfileFetchStage("complete");
      setFetchComplete(true);
    } catch (error) {
      console.error("Error in user profile workflow:", error);
      console.log("Profile fetch exception at stage:", profileFetchStage);
      setProfileFetchStage("exception");
      setFetchComplete(true);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, [profileFetchStage]);

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
    fetchUserProfile,
    profileFetchStage
  };
}
