
import { createContext, useContext, ReactNode, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useAuth as useAuthHook } from "@/hooks/useAuth";
import { UserProfile } from "@/services/authService";

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
  verifyAuthentication: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    session,
    user,
    userProfile,
    isGlobalAdmin,
    isProjectAdmin,
    isLoading: loading,
    currentProjectId,
    signOut,
    refreshAuthState,
    verifyAuthentication
  } = useAuthHook();

  // Add isApprover state (defaulting to false)
  const isApprover = userProfile?.role === 'approver' || false;
  
  // Setup a verification heartbeat to ensure auth state stays valid
  useEffect(() => {
    // Verify authentication at key moments (first load, window focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Window became visible, verifying auth state");
        verifyAuthentication();
      }
    };
    
    // Setup verification on window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Do an initial verification
    verifyAuthentication();
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifyAuthentication]);

  const refreshUserProfile = async () => {
    try {
      await refreshAuthState();
      toast({
        title: "Perfil actualizado",
        description: "La información de tu perfil ha sido actualizada."
      });
    } catch (error) {
      console.error("Error refreshing user profile:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del perfil.",
        variant: "destructive"
      });
    }
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
    refreshUserProfile,
    verifyAuthentication
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
