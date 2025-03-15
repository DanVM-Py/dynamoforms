
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  session: Session | null;
  user: any | null;
  userProfile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isGlobalAdmin: boolean;
  isProjectAdmin: boolean;
  isApprover: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    console.log("AuthProvider initialized");
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session ? "exists" : "null");
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          fetchUserProfile(newSession.user.id);
        } else {
          setUserProfile(null);
          setIsGlobalAdmin(false);
          setIsProjectAdmin(false);
          setIsApprover(false);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      console.log("Fetching user profile for user ID:", userId);
      
      // First attempt to get the profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching user profile:", error);
        setLoading(false);
        
        // Only show the toast for authentication errors, not for missing profiles
        if (error.code !== 'PGRST116') {
          toast({
            title: "Error de perfil",
            description: "No se pudo cargar el perfil de usuario. Por favor, inténtalo de nuevo.",
            variant: "destructive"
          });
        }
        return;
      }
      
      if (data) {
        console.log("User profile retrieved:", data.role);
        setUserProfile(data);
        
        // Check if user has global_admin role
        setIsGlobalAdmin(data.role === "global_admin");
        
        // Check if user is approver
        setIsApprover(data.role === "approver");
        
        // Check if user is project admin for any project
        const { data: projectAdminData, error: projectAdminError } = await supabase
          .from("project_admins")
          .select("*")
          .eq("user_id", userId);
          
        if (projectAdminError) {
          console.error("Error fetching project admin status:", projectAdminError);
        } else {
          setIsProjectAdmin(projectAdminData && projectAdminData.length > 0);
          console.log("Project admin status:", projectAdminData && projectAdminData.length > 0);
        }
      } else {
        // Profile doesn't exist - this is normal for new users
        console.log("No user profile found for this user. Authentication will proceed without profile data.");
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error in user profile workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión. Por favor intenta nuevamente.",
        variant: "destructive"
      });
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
