
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
      console.log("Checking global admin status for user:", userId);
      const { data, error } = await supabase.rpc('is_global_admin', { user_uuid: userId });
      
      if (error) {
        console.error("Error checking global admin status:", error);
        return false;
      }
      
      const isAdmin = data === true;
      console.log("User global admin status:", isAdmin);
      
      // Store the result in localStorage to ensure it persists
      if (isAdmin) {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
      }
      
      return isAdmin;
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
      
      // If profile indicates user is global admin, set storage flag
      if (data && data.role === 'global_admin') {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
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
      // Check global admin first - global admins are always project admins
      const isAdmin = await this.isGlobalAdmin(userId);
      if (isAdmin) {
        return true;
      }
      
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
      console.log("Getting auth status");
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
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
        console.log("No authenticated user found");
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
      
      console.log("Auth status retrieved:", {
        hasUser: !!user,
        hasProfile: !!profile,
        isGlobalAdmin
      });
      
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
}

// Export a singleton instance
export const authService = new AuthService();
