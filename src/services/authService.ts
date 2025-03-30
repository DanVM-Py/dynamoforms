
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import { Session, User, AuthError } from "@supabase/supabase-js";

// Interface for user profile data
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  email_confirmed?: boolean;
  created_at?: string | null;
  project_id?: string;
}

// Interface for auth status return data
export interface AuthStatus {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isGlobalAdmin: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

class AuthService {
  // Check if user is a global admin
  private async isGlobalAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_global_admin', { user_uuid: userId });
      
      if (error) {
        console.error("Error checking global admin status:", error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error("Exception checking global admin status:", error);
      return false;
    }
  }
  
  // Get user profile data
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Exception fetching profile:", error);
      return null;
    }
  }
  
  // Check if user is a project admin
  async isProjectAdmin(userId: string, projectId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_project_admin', { 
          user_uuid: userId,
          project_uuid: projectId 
        });
        
      if (error) {
        console.error("Error checking project admin status:", error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error("Exception checking project admin status:", error);
      return false;
    }
  }
  
  // Get current authentication status
  async getAuthStatus(): Promise<AuthStatus> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          session: null,
          user: null,
          profile: null,
          isGlobalAdmin: false,
          isLoading: false,
          error
        };
      }
      
      const session = data.session;
      const user = session?.user || null;
      
      if (!user) {
        return {
          session: null,
          user: null,
          profile: null,
          isGlobalAdmin: false,
          isLoading: false,
          error: null
        };
      }
      
      // Get user profile and admin status in parallel
      const [profile, isGlobalAdmin] = await Promise.all([
        this.getUserProfile(user.id),
        this.isGlobalAdmin(user.id)
      ]);
      
      return {
        session,
        user,
        profile,
        isGlobalAdmin,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error("Error getting auth status:", error);
      return {
        session: null,
        user: null,
        profile: null,
        isGlobalAdmin: false,
        isLoading: false,
        error: error as AuthError
      };
    }
  }
  
  // Sign out the user
  async signOut(): Promise<{ success: boolean; error: AuthError | null }> {
    try {
      // First, clean up all local auth state
      cleanupAuthState();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error("Exception during signOut:", error);
      return { 
        success: false, 
        error: { 
          name: 'SignOutError', 
          message: error instanceof Error ? error.message : 'Unknown error during sign out'
        } as AuthError 
      };
    }
  }
  
  // Subscribe to auth state changes
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_, session) => {
      callback(session);
    });
  }
}

// Export a singleton instance
export const authService = new AuthService();
