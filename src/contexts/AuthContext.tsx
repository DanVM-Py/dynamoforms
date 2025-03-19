
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
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
  const [fetchComplete, setFetchComplete] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string, skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      
      console.log("Fetching user profile for ID:", userId);
      
      // Try to fetch the user profile
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
        setIsGlobalAdmin(data.role === "global_admin");
        setIsApprover(data.role === "approver");
      } else {
        console.log("No user profile found");
        setUserProfile(null);
      }
      
      // Check if user is project admin for any project
      const { data: projectAdminData, error: projectAdminError } = await supabase
        .from("project_admins")
        .select("*")
        .eq("user_id", userId);
        
      if (projectAdminError) {
        console.error("Error fetching project admin status:", projectAdminError);
      } else {
        const isAdmin = projectAdminData && projectAdminData.length > 0;
        console.log("User is project admin:", isAdmin);
        setIsProjectAdmin(isAdmin);
      }
      
      setFetchComplete(true);
    } catch (error) {
      console.error("Error in user profile workflow:", error);
      setFetchComplete(true);
    } finally {
      if (!skipLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session and set up auth state change listener
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setFetchComplete(false);
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
        }
        
        console.log("Auth state initialized:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id, true);
        } else {
          setFetchComplete(true);
        }
        
        // Set up auth state change listener
        authListener = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state changed:", event, !!newSession);
            
            // Update state based on auth event
            if (event === 'SIGNED_OUT') {
              // Clear all auth-related state
              setSession(null);
              setUser(null);
              setUserProfile(null);
              setIsGlobalAdmin(false);
              setIsProjectAdmin(false);
              setIsApprover(false);
              setFetchComplete(true);
            } else {
              // For other events, update session and user
              setSession(newSession);
              setUser(newSession?.user ?? null);
              
              if (newSession?.user) {
                await fetchUserProfile(newSession.user.id, true);
              } else {
                setFetchComplete(true);
              }
            }
          }
        );
      } catch (error) {
        console.error("Error initializing auth:", error);
        setFetchComplete(true);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      // Clean up auth listener on unmount
      if (authListener) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [fetchUserProfile]);

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

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
  }, []);

  // Use memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    session,
    user,
    userProfile,
    loading: loading || !fetchComplete, // Consider loading until fetch is complete
    signOut,
    isGlobalAdmin,
    isProjectAdmin,
    isApprover,
    refreshUserProfile
  }), [session, user, userProfile, loading, fetchComplete, signOut, isGlobalAdmin, isProjectAdmin, isApprover, refreshUserProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
