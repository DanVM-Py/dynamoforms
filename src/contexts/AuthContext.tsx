
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuthState } from "@/hooks/use-auth-state";
import { useAuthInit } from "@/hooks/useAuthInit";

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
  const { toast } = useToast();
  
  // Use the extracted auth state hooks
  const {
    session,
    setSession,
    user,
    setUser,
    userProfile,
    setUserProfile,
    loading,
    setLoading,
    isGlobalAdmin,
    setIsGlobalAdmin,
    isProjectAdmin, 
    setIsProjectAdmin,
    isApprover,
    setIsApprover,
    fetchComplete,
    fetchUserProfile,
    profileFetchStage,
    setFetchComplete
  } = useAuthState();

  // Use the extracted auth initialization hook
  useAuthInit({
    setSession,
    setUser,
    setLoading,
    fetchUserProfile,
    setFetchComplete
  });

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
