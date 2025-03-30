
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, cleanupAuthState, supabaseApiUrl } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuthState } from "@/hooks/use-auth-state";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { useAuthInit } from "@/hooks/useAuthInit";

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
  // Use the custom hook for auth state
  const {
    session, setSession,
    user, setUser,
    userProfile, setUserProfile,
    loading, setLoading,
    isGlobalAdmin, setIsGlobalAdmin,
    isProjectAdmin, setIsProjectAdmin,
    isApprover, setIsApprover,
    fetchComplete, setFetchComplete,
    fetchUserProfile,
    profileFetchStage
  } = useAuthState();

  // Use the custom hook for auth actions
  const { signOut, refreshUserProfile } = useAuthActions(
    setUser,
    setSession,
    setUserProfile,
    setIsGlobalAdmin,
    setIsProjectAdmin,
    setIsApprover,
    setLoading
  );

  // Current project ID state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize auth
  useAuthInit({
    setSession,
    setUser,
    setLoading,
    fetchUserProfile,
    setFetchComplete
  });

  // Effect to check and set localStorage global admin status
  useEffect(() => {
    // Check if there's a stored isGlobalAdmin flag from login
    const storedIsGlobalAdmin = localStorage.getItem('isGlobalAdmin') === 'true';
    if (storedIsGlobalAdmin) {
      console.log("Found stored global admin status: true");
      setIsGlobalAdmin(true);
    }
  }, [setIsGlobalAdmin]);

  // Effect to set current project ID
  useEffect(() => {
    const storedProjectId = localStorage.getItem('currentProjectId');
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId);
    }
  }, []);

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
