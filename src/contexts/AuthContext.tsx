
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, cleanupAuthState, supabaseApiUrl } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  email_confirmed?: boolean;  // Made optional since it might not exist in older profiles
  created_at?: string | null;
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
  signOut: () => Promise<boolean>;
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
        
        // Check if there's a stored isGlobalAdmin flag from login
        const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
        if (storedIsGlobalAdmin) {
          console.log("Found stored global admin status: true");
          setIsGlobalAdmin(true);
        }
        
        // Set up auth state change listener with detailed logging
        const { data } = await supabase.auth.onAuthStateChange(
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
          if (data?.subscription?.unsubscribe) {
            data.subscription.unsubscribe();
          }
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
      
      // Check global admin status with direct RPC call
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: userId });
        
      if (isAdminError) {
        console.error("Error checking global admin status:", isAdminError);
      } else {
        console.log("User is global admin:", isAdminData);
        
        // Store the global admin status in localStorage for persistence
        if (isAdminData === true) {
          localStorage.setItem('isGlobalAdmin', 'true');
        } else {
          localStorage.removeItem('isGlobalAdmin');
        }
        
        setIsGlobalAdmin(isAdminData === true);
      }
      
      // Fetch profile data
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
        // Type assertion here to allow for missing fields
        setUserProfile(profileData as UserProfile);
        
        // Double-check global admin status from profile
        if (profileData.role === 'global_admin' && !isAdminData) {
          console.log("Profile indicates user is global admin, updating state");
          setIsGlobalAdmin(true);
          localStorage.setItem('isGlobalAdmin', 'true');
        }
        
        setIsApprover(profileData.role === "approver");
      } else {
        console.log("No user profile found");
        setUserProfile(null);
      }
      
      // Check for project access only if not a global admin
      if (!isAdminData) {
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
        } else {
          // Query for project users with the is_admin field - adjust query
          const { data: projectUserData, error: projectUserError } = await supabase
            .from("project_users")
            .select("project_id, is_admin")
            .eq("user_id", userId)
            .eq("status", "active")
            .limit(1);
            
          if (projectUserError) {
            console.error("Error fetching project user status:", projectUserError);
          } else if (projectUserData && projectUserData.length > 0) {
            // Check if data was returned and contains proper properties
            if (projectUserData[0] && 'project_id' in projectUserData[0]) {
              // Explicitly cast to string to satisfy TypeScript
              const projectId = String(projectUserData[0].project_id);
              console.log("Found project for user:", projectId);
              setCurrentProjectId(projectId);
              localStorage.setItem('currentProjectId', projectId);
              
              // Check is_admin property safely
              if ('is_admin' in projectUserData[0]) {
                setIsProjectAdmin(!!projectUserData[0].is_admin);
              } else {
                console.warn("is_admin property not found in project_users");
                setIsProjectAdmin(false);
              }
            } else {
              console.warn("project_id not found in project_users response");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in user profile workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      console.log("Starting sign out process");
      
      // First, clear all local state BEFORE calling supabase.auth.signOut()
      // This ensures we have a clean state even if the supabase call fails
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsGlobalAdmin(false);
      setIsProjectAdmin(false);
      setIsApprover(false);
      setCurrentProjectId(null);
      
      // Use the centralized cleanup function
      cleanupAuthState();
      
      // Use a timeout to give state updates time to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now attempt the Supabase signOut with a timeout to prevent hanging
      const signOutPromise = new Promise<boolean>(async (resolve) => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Error during Supabase signOut:", error);
            // Still return true since we've already cleared local state
            resolve(true);
          } else {
            console.log("Supabase signOut completed successfully");
            resolve(true);
          }
        } catch (error) {
          console.error("Exception during Supabase signOut:", error);
          // Still return true since we've already cleared local state
          resolve(true);
        }
      });
      
      // Add a timeout to ensure promise resolves
      const timeoutPromise = new Promise<boolean>(resolve => {
        setTimeout(() => {
          console.log("Supabase signOut timed out, forcing completion");
          resolve(true);
        }, 2000); // 2 second timeout
      });
      
      // Race the promises to ensure we don't hang
      const result = await Promise.race([signOutPromise, timeoutPromise]);
      
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
      
      // Even if there was an error, return true to allow navigation away
      return true;
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
