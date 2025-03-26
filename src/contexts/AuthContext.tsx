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
    const initAuth = async () => {
      try {
        setLoading(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log(`Auth state changed: ${event}`, newSession?.user?.email);
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              setUserProfile(null);
              setIsGlobalAdmin(false);
              setIsProjectAdmin(false);
              setIsApprover(false);
              setCurrentProjectId(null);
              localStorage.removeItem('currentProjectId');
              sessionStorage.removeItem('currentProjectId');
            } 
            else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              await fetchUserProfile(newSession.user.id);
            }
          }
        );
        
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
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

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      console.log("Fetching user profile for ID:", userId);
      
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        console.log("User is global admin:", isAdminData);
        setIsGlobalAdmin(isAdminData === true);
      }
      
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
        setIsApprover(profileData.role === "approver");
      } else {
        console.log("No user profile found");
        setUserProfile(null);
      }
      
      const storedProjectId = localStorage.getItem('currentProjectId');
      
      if (storedProjectId) {
        setCurrentProjectId(storedProjectId);
        
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
      
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setIsApprover(false);
      setCurrentProjectId(null);
      
      localStorage.removeItem('currentProjectId');
      sessionStorage.removeItem('currentProjectId');
      
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error("Error during Supabase signOut:", error);
        } else {
          console.log("Supabase signOut completed successfully");
        }
      } catch (supabaseError) {
        console.error("Exception during Supabase signOut:", supabaseError);
      }
      
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
      
      console.log("Sign out process completed");
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
