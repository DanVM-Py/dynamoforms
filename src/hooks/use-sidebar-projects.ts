
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebarProjects() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const location = useLocation();
  const { user, isProjectAdmin, isGlobalAdmin } = useAuth();

  // First effect - get project ID from storage or URL
  useEffect(() => {
    const getProjectIdFromStorage = () => {
      return sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
    };
    
    const getProjectIdFromUrl = () => {
      const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
      return projectMatch ? projectMatch[1] : null;
    };
    
    const urlProjectId = getProjectIdFromUrl();
    const storedProjectId = getProjectIdFromStorage();
    
    const projectId = urlProjectId || storedProjectId;
    
    if (projectId) {
      sessionStorage.setItem('currentProjectId', projectId);
      setCurrentProjectId(projectId);
    }
  }, [location.pathname]);

  // Second effect - fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || (!isProjectAdmin && !isGlobalAdmin)) {
        return;
      }
      
      try {
        let query;
        
        if (isGlobalAdmin) {
          query = supabase
            .from('projects')
            .select('id, name')
            .order('name', { ascending: true });
        } else if (isProjectAdmin) {
          query = supabase
            .from('project_admins')
            .select('project_id, projects(id, name)')
            .eq('user_id', user.id)
            .order('projects(name)', { ascending: true });
        }
        
        if (query) {
          const { data, error } = await query;
          
          if (error) {
            console.error('Error fetching projects:', error);
            return;
          }
          
          if (data && data.length > 0) {
            let projectsData;
            
            if (isGlobalAdmin) {
              projectsData = data;
            } else {
              projectsData = data.map((item: any) => item.projects).filter(Boolean);
            }
            
            setProjects(projectsData);
            
            if (projectsData.length > 0 && !currentProjectId) {
              const firstProjectId = isGlobalAdmin ? 
                projectsData[0].id : 
                projectsData[0].id;
                
              setCurrentProjectId(firstProjectId);
              sessionStorage.setItem('currentProjectId', firstProjectId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    fetchProjects();
  }, [user, isProjectAdmin, isGlobalAdmin, currentProjectId]);

  const updateCurrentProjectId = (id: string) => {
    setCurrentProjectId(id);
    sessionStorage.setItem('currentProjectId', id);
  };

  return {
    currentProjectId,
    projects,
    setCurrentProjectId: updateCurrentProjectId
  };
}
