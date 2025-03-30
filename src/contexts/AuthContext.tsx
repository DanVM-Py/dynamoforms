
import { createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UserProfile } from "@/services/authService";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isGlobalAdmin: boolean;
  isProjectAdmin: boolean;
  currentProjectId: string | null;
  signOut: () => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
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
    refreshAuthState
  } = useAuth();

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
