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
    console.log('[authService DEBUG] Private isGlobalAdmin START for user:', userId);
    try {
      console.log("[authService DEBUG] Attempting RPC is_global_admin for user:", userId);
      const { data, error } = await supabase.rpc('is_global_admin', { user_uuid: userId });
      console.log("[authService DEBUG] RPC is_global_admin RESULT:", { data, error });
      
      if (error) {
        console.error("Error checking global admin status:", error);
        console.log('[authService DEBUG] Private isGlobalAdmin END (Error)');
        return false;
      }
      
      const isAdmin = data === true;
      console.log("User global admin status:", isAdmin);
      
      // Store the result in localStorage and sessionStorage to ensure it persists
      if (isAdmin) {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
        
        // Also store in the enhanced auth state object
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: userId,
          isGlobalAdmin: true,
          timestamp: Date.now()
        }));
      }
      
      console.log('[authService DEBUG] Private isGlobalAdmin END (Success)');
      return isAdmin;
    } catch (error) {
      console.error("Exception checking global admin status:", error);
      console.log('[authService DEBUG] Private isGlobalAdmin END (Exception)');
      return false;
    }
  }
  
  // Get user profile data
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('[authService DEBUG] Private getUserProfile START for user:', userId);
    try {
      console.log("[authService DEBUG] Attempting SELECT from profiles for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      console.log("[authService DEBUG] SELECT from profiles RESULT:", { data, error });
        
      if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
        console.error("Error fetching profile (and not PGRST116):", error);
        return null;
      }
      
      // If profile indicates user is global admin, set storage flag
      if (data && data.role === 'global_admin') {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
        
        // Also store in the enhanced auth state object
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: userId,
          isGlobalAdmin: true,
          timestamp: Date.now()
        }));
      }
      
      console.log('[authService DEBUG] Private getUserProfile END (Success)');
      return data;
    } catch (error) {
      console.error("Exception fetching profile:", error);
      console.log('[authService DEBUG] Private getUserProfile END (Exception)');
      return null;
    }
  }
  
  // Check if user is a project admin
  async isProjectAdmin(userId: string, projectId: string): Promise<boolean> {
    console.log('[authService DEBUG] Public isProjectAdmin START for user:', userId, 'project:', projectId);
    try {
      // Check global admin first - global admins are always project admins
      console.log('[authService DEBUG] Checking global admin status within isProjectAdmin...');
      const isAdmin = await this.isGlobalAdmin(userId);
      console.log('[authService DEBUG] Global admin check returned:', isAdmin);
      if (isAdmin) {
        console.log('[authService DEBUG] User is global admin, returning true for project admin.');
        return true;
      }
      
      const { data, error } = await supabase
        .rpc('is_project_admin', { 
          user_uuid: userId,
          project_uuid: projectId 
        });
        
      if (error) {
        console.error("Error checking project admin status:", error);
        console.log('[authService DEBUG] Public isProjectAdmin END (Error)');
        return false;
      }
      
      console.log('[authService DEBUG] Public isProjectAdmin END (Success), result:', data === true);
      return data === true;
    } catch (error) {
      console.error("Exception checking project admin status:", error);
      console.log('[authService DEBUG] Public isProjectAdmin END (Exception)');
      return false;
    }
  }
  
  // Get current authentication status
  async getAuthStatus(): Promise<AuthStatus> {
    console.log('[authService DEBUG] Public getAuthStatus START');
    try {
      console.log("[authService DEBUG] Attempting supabase.auth.getSession()");
      const { data, error } = await supabase.auth.getSession();
      console.log("[authService DEBUG] supabase.auth.getSession() RESULT:", { session: data?.session, error });
      
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
        console.log("[authService DEBUG] No authenticated user found after getSession.");
        return {
          session: null,
          user: null,
          profile: null,
          isGlobalAdmin: false,
          isLoading: false,
          error: null
        };
      }
      
      // Store basic auth state in localStorage for resilience 
      localStorage.setItem('authState', JSON.stringify({
        isAuthenticated: true,
        userId: user.id,
        timestamp: Date.now()
      }));
      
      console.log('[authService DEBUG] Attempting Promise.all for getUserProfile and isGlobalAdmin');
      // Get user profile and admin status in parallel
      const [profile, isGlobalAdmin] = await Promise.all([
        this.getUserProfile(user.id),
        this.isGlobalAdmin(user.id)
      ]);
      console.log('[authService DEBUG] Promise.all COMPLETED', { profile: !!profile, isGlobalAdmin });
      
      console.log("Auth status retrieved (Summary):", {
        hasUser: !!user,
        hasProfile: !!profile,
        isGlobalAdmin
      });
      
      // Update the auth state with admin status if needed
      if (isGlobalAdmin) {
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: user.id,
          isGlobalAdmin: true,
          timestamp: Date.now()
        }));
      }
      
      console.log('[authService DEBUG] Public getAuthStatus END - Success');
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
      console.log('[authService DEBUG] Public getAuthStatus END (Exception)');
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
    console.log('[authService DEBUG] Public signOut START');
    try {
      // First, clean up all local auth state
      console.log('[authService DEBUG] Calling cleanupAuthState()');
      cleanupAuthState();
      
      // Then sign out from Supabase
      console.log('[authService DEBUG] Attempting supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();
      console.log('[authService DEBUG] supabase.auth.signOut() RESULT:', { error });
      
      if (error) {
        console.error("Error during signOut:", error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error("Exception during signOut:", error);
      console.log('[authService DEBUG] Public signOut END (Exception)');
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
