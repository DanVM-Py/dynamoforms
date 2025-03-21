
import { createContext, useContext, ReactNode, useMemo } from "react";
import { Session } from "@supabase/supabase-js";
import { useAuthState } from "@/hooks/use-auth-state";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { useAuthInit } from "@/hooks/use-auth-init";

// Define the shape of our authentication context
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

// Create the context with undefined as initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use our custom hooks to manage auth state
  const authState = useAuthState();
  
  const { 
    session, user, userProfile, loading, isGlobalAdmin, isProjectAdmin, 
    isApprover, fetchComplete, fetchUserProfile, setSession, setUser, 
    setUserProfile, setIsGlobalAdmin, setIsProjectAdmin, setIsApprover, setLoading 
  } = authState;

  // Initialize auth actions
  const { signOut, refreshUserProfile: refreshProfile } = useAuthActions(
    setUser, 
    setSession, 
    setUserProfile, 
    setIsGlobalAdmin, 
    setIsProjectAdmin, 
    setIsApprover, 
    setLoading
  );

  // Initialize auth system
  useAuthInit({
    setSession,
    setUser,
    setLoading,
    fetchUserProfile,
    setFetchComplete
  });

  // Create refresh user profile function
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  // Use memoized context value to prevent unnecessary re-renders
  const contextValue: AuthContextType = useMemo(() => ({
    session,
    user,
    userProfile,
    loading: loading || !fetchComplete, 
    signOut,
    isGlobalAdmin,
    isProjectAdmin,
    isApprover,
    refreshUserProfile
  }), [session, user, userProfile, loading, fetchComplete, signOut, isGlobalAdmin, isProjectAdmin, isApprover]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
