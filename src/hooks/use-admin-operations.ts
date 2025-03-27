
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

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
        .from('profiles')
        .update({ role: 'global_admin' })
        .eq('id', userId)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido ascendido a Administrador Global",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error de operación",
        description: error.message || "No se pudo completar la operación",
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
  const removeUserFromProject = async (userId: string, projectId: string, isAdmin: boolean) => {
    setIsLoading(true);
    try {
      checkGlobalAdminAccess();
      
      // Using project_users table for both regular users and admins, checking is_admin flag
      const { error } = await supabase
        .from('project_users')
        .delete()
        .match({ user_id: userId, project_id: projectId });
      
      if (error) throw error;
      
      toast({
        title: "Usuario removido",
        description: `El usuario ha sido desvinculado ${isAdmin ? 'como administrador' : ''} del proyecto exitosamente.`,
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error de operación",
        description: error.message || "No se pudo completar la operación",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Directly sets a new password for a user (admin only)
   */
  const setUserPassword = async (userId: string, newPassword: string) => {
    setIsLoading(true);
    try {
      checkGlobalAdminAccess();
      
      if (!user) throw new Error('No authenticated user found');
      
      // Call the edge function to reset the password
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId,
          password: newPassword,
          requesterId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data.error) throw new Error(data.error);
      
      toast({
        title: "Contraseña actualizada",
        description: "La contraseña del usuario ha sido actualizada exitosamente.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error al actualizar contraseña",
        description: error.message || "No se pudo actualizar la contraseña",
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
    removeUserFromProject,
    setUserPassword
  };
}
