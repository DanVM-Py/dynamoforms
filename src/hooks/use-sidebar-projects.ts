import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/config/environment';

export function useSidebarProjects() {
  const { user, isGlobalAdmin, currentProjectId: authProjectId, loading: authLoading, isProjectAdmin } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const getProjectIdFromUrl = () => {
      const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
      return projectMatch ? projectMatch[1] : null;
    };

    const urlProjectId = getProjectIdFromUrl();
    const determinedProjectId = urlProjectId || authProjectId;

    if (determinedProjectId !== currentProjectId) {
      if (urlProjectId) {
        console.log(`[useSidebarProjects] Using project ID from URL: ${urlProjectId}`);
      } else if (authProjectId) {
        console.log(`[useSidebarProjects] Using initial project ID from useAuth: ${authProjectId}`);
      } else {
         console.log(`[useSidebarProjects] No project ID determined from URL or useAuth.`);
      }

      setCurrentProjectId(determinedProjectId);
      if (determinedProjectId) {
        sessionStorage.setItem('currentProjectId', determinedProjectId);
      } else {
        sessionStorage.removeItem('currentProjectId');
      }
    }

  }, [location.pathname, authProjectId, authLoading, currentProjectId]);

  useEffect(() => {
    if (authLoading || !user) {
      setProjects([]);
      setLoading(true);
      return;
    }

    const fetchProjects = async () => {
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
            .eq('user_id', user.id)
            .eq('status', 'active');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching projects:', error);
          setProjects([]);
          return;
        }

        let projectsData: { id: string; name: string }[] = [];
        if (data) {
          if (isGlobalAdmin) {
            projectsData = data as { id: string; name: string }[];
          } else {
            projectsData = data
              .map((item: any) => item.project)
              .filter(p => p && p.id && p.name) as { id: string; name: string }[];
            projectsData.sort((a, b) => a.name.localeCompare(b.name));
          }
        }
        setProjects(projectsData);

      } catch (error) {
        console.error('Error processing fetched projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, isGlobalAdmin, isProjectAdmin, authLoading]);

  const updateCurrentProjectId = (id: string | null) => {
    console.log(`[useSidebarProjects] Manually setting project ID to: ${id} (use URL navigation for primary changes)`);
    setCurrentProjectId(id);
    if (id) {
      sessionStorage.setItem('currentProjectId', id);
    } else {
      sessionStorage.removeItem('currentProjectId');
    }
  };

  const combinedLoading = authLoading || loading;

  return {
    projects,
    loading: combinedLoading,
    currentProjectId,
    setCurrentProjectId: updateCurrentProjectId
  };
}
