import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isGlobalAdmin: boolean;
  isProjectAdmin: boolean;
  isApprover: boolean;
  profileFetchStage: string;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [profileFetchStage, setProfileFetchStage] = useState<string>("not_started");
  const { toast } = useToast();

  useEffect(() => {
    console.log("Initializing authentication...");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, !!newSession, "User:", newSession?.user?.email);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing auth state");
          setUserProfile(null);
          setIsGlobalAdmin(false);
          setIsProjectAdmin(false);
          setIsApprover(false);
          setLoading(false);
        } 
        else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log("User authenticated, fetching profile for:", newSession.user.email);
          try {
            await fetchUserProfile(newSession.user.id);
          } catch (error) {
            console.error("Profile fetch failed after auth event:", error);
          } finally {
            setLoading(false);
          }
        } 
        else {
          console.log("Other auth event:", event);
          setLoading(false);
        }
      }
    );
    
    const checkSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error retrieving session:", error);
          setLoading(false);
          return;
        }
        
        console.log("Initial session check:", !!session, "User:", session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log("Fetching profile for existing user:", session.user.email);
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error("Initial profile fetch failed:", error);
          }
        } else {
          console.log("No existing user session found");
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setLoading(false);
      }
    };
    
    checkSession();
    
    return () => {
      console.log("Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching user profile for ID:", userId);
      setProfileFetchStage("starting");
      
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
        
        setIsApprover(data.role === "approver");
      } else {
        console.log("No user profile found");
        setProfileFetchStage("no_profile_found");
        
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("Error getting user data:", userError);
          } else if (userData?.user) {
            console.log("Creating new profile for user:", userData.user.email);
            
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
            } else if (newProfile) {
              console.log("New profile created:", newProfile);
              setUserProfile(newProfile);
            }
          }
        } catch (err) {
          console.error("Error in profile creation workflow:", err);
        }
      }
      
      const currentProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
      
      if (currentProjectId) {
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
      }
      
      setProfileFetchStage("complete");
    } catch (error) {
      console.error("Error in user profile workflow:", error);
      setProfileFetchStage("exception");
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
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        throw error;
      }
      
      sessionStorage.removeItem('currentProjectId');
      localStorage.removeItem('currentProjectId');
      
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
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await fetchUserProfile(user.id);
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    userProfile,
    loading,
    signOut,
    isGlobalAdmin,
    isProjectAdmin,
    isApprover,
    profileFetchStage,
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
