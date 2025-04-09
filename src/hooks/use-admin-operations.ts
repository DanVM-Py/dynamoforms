import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/config/environment';

export function useAdminOperations() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { user, isGlobalAdmin } = useAuth();

  // Helper to ensure the current user is a global admin
  const checkGlobalAdminAccess = () => {
    if (!user || !isGlobalAdmin) {
      throw new Error('Unauthorized: Only global administrators can perform this operation');
    }
  };

  /**
   * Promotes a user to global admin role
   */
  const promoteToGlobalAdmin = async (userId: string) => {
    setIsLoading(true);
    try {
      checkGlobalAdminAccess();
      
      const { data, error } = await supabase
        .from(Tables.profiles)
        .update({ role: 'global_admin' })
        .eq('id', userId)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido ascendido a Administrador Global",
      });
      
      return data;
    } catch (error: unknown) {
      toast({
        title: "Error de operación",
        description: error instanceof Error ? error.message : "No se pudo completar la operación",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggles a user's project admin status
   */
  const toggleProjectAdmin = async (userId: string, projectId: string, makeAdmin: boolean) => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('No authenticated user found');
      
      // Check if user exists in project
      const { data: existingUser, error: fetchError } = await supabase
        .from(Tables.project_users)
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
        
      if (fetchError) throw fetchError;
      
      if (existingUser) {
        // Update existing project user
        const { error: updateError } = await supabase
          .from(Tables.project_users)
          .update({ 
            is_admin: makeAdmin
          })
          .eq('id', existingUser.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new project user as admin
        const { error: insertError } = await supabase
          .from(Tables.project_users)
          .insert({
            project_id: projectId,
            user_id: userId,
            is_admin: makeAdmin
          });
          
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Usuario actualizado",
        description: `El usuario ha sido ${makeAdmin ? 'promocionado a' : 'removido como'} administrador del proyecto`,
      });
      
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error de operación",
        description: error instanceof Error ? error.message : "No se pudo completar la operación",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Removes a user from a project (either as a regular user or as a project admin)
   */
  const removeUserFromProject = async (userId: string, projectId: string) => {
    setIsLoading(true);
    try {
      // Using project_users table for both regular users and admins, checking is_admin flag
      const { error } = await supabase
        .from(Tables.project_users)
        .delete()
        .match({ user_id: userId, project_id: projectId });
      
      if (error) throw error;
      
      toast({
        title: "Usuario removido",
        description: "El usuario ha sido desvinculado del proyecto exitosamente.",
      });
      
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error de operación",
        description: error instanceof Error ? error.message : "No se pudo completar la operación",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    promoteToGlobalAdmin,
    toggleProjectAdmin,
    removeUserFromProject
  };
}
