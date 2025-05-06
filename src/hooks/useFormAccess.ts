import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebarProjects } from './use-sidebar-projects';
import { FormAccessControl } from '../types/forms';
import { supabase, supabaseAdmin } from '../integrations/supabase/client';
import { Tables } from '../config/environment';
import { logger } from "@/lib/logger";

export const useFormAccess = () => {
  const { isGlobalAdmin, isProjectAdmin, user } = useAuth();
  const { currentProjectId } = useSidebarProjects();
  logger.info(`[useFormAccess] Hook initialized/re-evaluated. currentProjectId: ${currentProjectId}, isGlobalAdmin: ${isGlobalAdmin}, isProjectAdmin: ${isProjectAdmin}`);
  
  const [accessControl, setAccessControl] = useState<FormAccessControl>({
    canEdit: false,
    canView: false,
    canDelete: false,
    projectForms: []
  });

  useEffect(() => {
    const fetchAccessControl = async () => {
      if (!user?.id) return;
      logger.info(`[useFormAccess] Fetching forms. Filtering by project ID: ${!isGlobalAdmin && currentProjectId ? currentProjectId : 'None (Global Admin or no project selected)'}`);

      try {
        const client = isGlobalAdmin ? supabaseAdmin : supabase;
        
        // Obtener formularios accesibles
        let query = client.from(Tables.forms).select('id, project_id');
        
        if (!isGlobalAdmin && currentProjectId) {
          query = query.eq('project_id', currentProjectId);
        }

        const { data: forms, error: formsError } = await query;
        
        if (formsError) throw formsError;

        // Determinar permisos
        const canEdit = Boolean(isGlobalAdmin || (isProjectAdmin && currentProjectId));
        const canView = Boolean(true); // Todos los usuarios pueden ver formularios
        const canDelete = Boolean(isGlobalAdmin || isProjectAdmin);
        const projectForms = forms?.map(form => form.id) || [];

        setAccessControl({
          canEdit,
          canView,
          canDelete,
          projectForms
        });
      } catch (error) {
        logger.error('Error fetching form access control:', error);
      }
    };

    fetchAccessControl();
  }, [user?.id, isGlobalAdmin, isProjectAdmin, currentProjectId]);

  return accessControl;
}; 
