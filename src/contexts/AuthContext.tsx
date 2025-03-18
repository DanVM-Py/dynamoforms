
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
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session:", session ? "exists" : "null");
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
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
      
      // Try to fetch the user profile
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching user profile:", error);
          // Continue without throwing
        }
        
        if (data) {
          console.log("User profile retrieved:", data.role);
          setUserProfile(data);
          
          // Check if user has global_admin role
          setIsGlobalAdmin(data.role === "global_admin");
          
          // Check if user is approver
          setIsApprover(data.role === "approver");
        } else {
          // No profile found, but we'll continue with the session
          console.log("No user profile found, continuing with session only");
          setUserProfile(null);
        }
      } catch (profileError) {
        console.error("Error in profile fetch:", profileError);
        // Continue with auth - don't let profile issues block login
      }
      
      // Check if user is project admin for any project
      try {
        const { data: projectAdminData, error: projectAdminError } = await supabase
          .from("project_admins")
          .select("*")
          .eq("user_id", userId);
          
        if (projectAdminError) {
          console.error("Error fetching project admin status:", projectAdminError);
        } else {
          const isAdmin = projectAdminData && projectAdminData.length > 0;
          setIsProjectAdmin(isAdmin);
          console.log("Project admin status:", isAdmin);
        }
      } catch (projectAdminError) {
        console.error("Error in project admin check:", projectAdminError);
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
      console.log("Starting signOut process...");
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setIsApprover(false);
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error from Supabase signOut:", error);
        // Continue with local signout even if there's an error
      }
      
      console.log("Sign out completed");
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
      
      // Force navigation to home/auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("Error in signOut function:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "No se pudo cerrar sesión completamente. Redirigiendo a la página de inicio de sesión.",
        variant: "destructive"
      });
      
      // Attempt to force navigation even with error
      window.location.href = "/auth";
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
