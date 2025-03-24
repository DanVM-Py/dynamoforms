
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  email_confirmed: boolean;
  created_at?: string;
  project_id?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isGlobalAdmin: boolean;
  isProjectAdmin: boolean;
  isApprover: boolean;
  currentProjectId: string | null;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Function to initialize user and session state
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // First set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log(`Auth state changed: ${event}`, newSession?.user?.email);
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              // Clear user state on sign out
              setUserProfile(null);
              setIsGlobalAdmin(false);
              setIsProjectAdmin(false);
              setIsApprover(false);
              setCurrentProjectId(null);
              localStorage.removeItem('currentProjectId');
            } 
            else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              // Fetch user profile on sign in or token refresh
              await fetchUserProfile(newSession.user.id);
            }
          }
        );
        
        // Then check for existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        // If we have a session, fetch the user profile
        if (existingSession?.user) {
          await fetchUserProfile(existingSession.user.id);
        } else {
          setLoading(false);
        }
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error in auth initialization:", error);
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  // Function to fetch user profile and role information
  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      console.log("Fetching user profile for ID:", userId);
      
      // Check if user is global admin
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        console.log("User is global admin:", isAdminData);
        setIsGlobalAdmin(isAdminData === true);
      }
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        setUserProfile(null);
      } else if (profileData) {
        console.log("User profile found:", profileData);
        setUserProfile(profileData as UserProfile);
        // Set approver status based on role
        setIsApprover(profileData.role === "approver");
      } else {
        console.log("No user profile found");
        setUserProfile(null);
      }
      
      // Get current project ID from localStorage
      const storedProjectId = localStorage.getItem('currentProjectId');
      
      if (storedProjectId) {
        setCurrentProjectId(storedProjectId);
        
        // Check if user is project admin for the current project
        const { data: isProjectAdminData, error: isProjectAdminError } = await supabase
          .rpc('is_project_admin', { 
            user_uuid: userId,
            project_uuid: storedProjectId 
          });
          
        if (isProjectAdminError) {
          console.error("Error checking project admin status:", isProjectAdminError);
        } else {
          console.log("User is project admin for current project:", isProjectAdminData);
          setIsProjectAdmin(isProjectAdminData === true);
        }
      } else if (!isAdminData) {
        // If no current project and not global admin, try to find a project
        const { data: projectUserData, error: projectUserError } = await supabase
          .from("project_users")
          .select("project_id, is_admin")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1);
          
        if (projectUserError) {
          console.error("Error fetching project admin status:", projectUserError);
        } else if (projectUserData && projectUserData.length > 0) {
          const projectId = projectUserData[0].project_id;
          console.log("Found project for user:", projectId);
          setCurrentProjectId(projectId);
          localStorage.setItem('currentProjectId', projectId);
          
          // Set project admin status
          setIsProjectAdmin(projectUserData[0].is_admin === true);
        }
      }
    } catch (error) {
      console.error("Error in user profile workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      console.log("Starting sign out process");
      
      // Clear state before the Supabase call for immediate UI response
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setIsApprover(false);
      setCurrentProjectId(null);
      
      // Clear local storage
      localStorage.removeItem('currentProjectId');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        throw error;
      }
      
      // Force redirect to the authentication page
      window.location.href = '/auth';
      
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
    } catch (error: any) {
      console.error("Error in signOut function:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión completamente.",
        variant: "destructive"
      });
      // Force redirect despite the error
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    await fetchUserProfile(user.id);
  };

  const value = {
    session,
    user,
    userProfile,
    loading,
    isGlobalAdmin,
    isProjectAdmin,
    isApprover,
    currentProjectId,
    signOut,
    refreshUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
