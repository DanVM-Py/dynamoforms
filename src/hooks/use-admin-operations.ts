
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
      
      // Determine which table to operate on based on the user's role in the project
      const table = isAdmin ? 'project_admins' : 'project_users';
      
      const { error } = await supabase
        .from(table)
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
   * Initiates a password reset for a user
   */
  const initiatePasswordReset = async (email: string) => {
    setIsLoading(true);
    try {
      checkGlobalAdminAccess();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Solicitud enviada",
        description: "Se ha enviado un correo con instrucciones para restablecer la contraseña.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error de operación",
        description: error.message || "No se pudo enviar la solicitud de restablecimiento",
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
    initiatePasswordReset,
  };
}
