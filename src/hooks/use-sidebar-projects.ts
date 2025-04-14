import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/config/environment';
import { logger } from "@/lib/logger";

export function useSidebarProjects() {
  const { 
    user, 
    isGlobalAdmin, 
    currentProjectId,
    loading: authLoading, 
    isProjectAdmin,
    updateCurrentProject
  } = useAuth();
  
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    logger.debug(`[Sidebar DEBUG] Effect 2 TRIGGERED. User available: ${!!user}, isGlobalAdmin: ${isGlobalAdmin}`);
    if (!user) {
      logger.debug(`[Sidebar DEBUG] Effect 2 SKIPPING fetchProjects: No user.`);
      setProjects([]);
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      logger.debug(`[Sidebar DEBUG] Effect 2 fetchProjects STARTING. User ID: ${user.id}, isGlobalAdmin: ${isGlobalAdmin}`);
      setLoading(true);
      try {
        const projectUsersTable = Tables.project_users;
        const projectsTable = Tables.projects;
        let query;
        if (isGlobalAdmin) {
          query = supabase
            .from(projectsTable)
            .select('id, name')
            .order('name', { ascending: true });
        } else {
          query = supabase
            .from(projectUsersTable)
            .select(`project: ${projectsTable}(id, name)`)
            .eq('user_id', user.id);
        }
        const { data, error } = await query;
        if (error) {
          logger.error('Error fetching projects:', error);
          setProjects([]);
          return;
        }
        let projectsData: { id: string; name: string }[] = [];
        if (data) {
          if (isGlobalAdmin) {
            projectsData = data as { id: string; name: string }[];
          } else {
            type ProjectSelectItem = { project: { id: string; name: string } | null };
            projectsData = data
              .map((item: ProjectSelectItem) => item.project)
              .filter((p): p is { id: string; name: string } => p !== null && p.id !== null && p.name !== null)
              .sort((a, b) => a.name.localeCompare(b.name));
          }
        }
        setProjects(projectsData);
      } catch (error) {
        logger.error('Error processing fetched projects:', error);
        setProjects([]);
      } finally {
        logger.debug('[Sidebar DEBUG] Effect 2 fetchProjects FINALLY block. Setting internal loading=false.');
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user, isGlobalAdmin]);

  const combinedLoading = authLoading || loading;

  return {
    projects,
    loading: combinedLoading,
    currentProjectId,
    setCurrentProjectId: updateCurrentProject
  };
}
