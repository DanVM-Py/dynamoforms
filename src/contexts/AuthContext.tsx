
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
  const { toast } = useToast();

  // Initialize auth state with proper order: listener first, then session check
  useEffect(() => {
    console.log("Initializing authentication...");
    
    // 1. Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, !!newSession, "User:", newSession?.user?.email);
        
        // Update session state immediately on any auth event
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          // Clear all auth-related state
          console.log("User signed out, clearing auth state");
          setUserProfile(null);
          setIsGlobalAdmin(false);
          setIsProjectAdmin(false);
          setIsApprover(false);
          setLoading(false);
        } 
        else if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Fetch user profile for sign in and token refresh
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
          // For other events, just update state
          console.log("Other auth event:", event);
          setLoading(false);
        }
      }
    );
    
    // 2. THEN check for existing session
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
        
        // Update state with current session info
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile if we have a user
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
    
    // Clean up listener on component unmount
    return () => {
      console.log("Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  // Function to fetch user profile and role information
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching user profile for ID:", userId);
      
      // Step 1: Check global admin status first (bypasses RLS)
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        console.log("User is global admin:", isAdminData);
        setIsGlobalAdmin(isAdminData === true);
      }
      
      // Step 2: Fetch user profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
      } else if (data) {
        console.log("User profile found:", data);
        setUserProfile(data);
        
        // For approver, check the role field
        setIsApprover(data.role === "approver");
      } else {
        console.log("No user profile found");
        
        // If no profile exists but we have a user, create a basic profile with email_confirmed=false
        try {
          // First get the user email from the auth user
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("Error getting user data:", userError);
          } else if (userData?.user) {
            console.log("Creating new profile for user:", userData.user.email);
            
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
            } else if (newProfile) {
              console.log("New profile created:", newProfile);
              setUserProfile(newProfile);
            }
          }
        } catch (err) {
          console.error("Error in profile creation workflow:", err);
        }
      }
      
      // Step 3: Check project admin status
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
          console.log("User is project admin for current project:", isProjectAdminData);
          setIsProjectAdmin(isProjectAdminData === true);
        }
      }
    } catch (error) {
      console.error("Error in user profile workflow:", error);
    }
  };

  // Sign out function
  const signOut = async () => {
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        throw error;
      }
      
      // Clear project selection from storage
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

  // Function to refresh user profile
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

  // Context value
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
