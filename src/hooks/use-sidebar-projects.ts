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
    console.log(`[Sidebar DEBUG] Effect 1 RUNNING. authLoading: ${authLoading}`);
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

      console.log(`[Sidebar DEBUG] Effect 1 Determined ID: ${determinedProjectId}. Setting state.`);
      setCurrentProjectId(determinedProjectId);
      if (determinedProjectId) {
        sessionStorage.setItem('currentProjectId', determinedProjectId);
      } else {
        sessionStorage.removeItem('currentProjectId');
      }
    }

  }, [location.pathname, authProjectId, authLoading, currentProjectId]);

  useEffect(() => {
    // Log entrada efecto (modificado para claridad)
    console.log(`[Sidebar DEBUG] Effect 2 TRIGGERED. User available: ${!!user}, isGlobalAdmin: ${isGlobalAdmin}`);

    // Condición principal: Necesitamos un usuario para buscar proyectos
    if (!user) {
      console.log(`[Sidebar DEBUG] Effect 2 SKIPPING fetchProjects: No user.`);
      setProjects([]);
      // Si no hay usuario, no estamos 'cargando' proyectos para él.
      // Establecer loading a false aquí evita el bloqueo si el usuario se desloguea.
      setLoading(false);
      return; // Salir si no hay usuario
    }

    // Si llegamos aquí, hay un usuario. Procedemos a cargar.
    const fetchProjects = async () => {
      // Usar JSON.stringify para el log por si 'user' es complejo, pero user.id es suficiente aquí
      console.log(`[Sidebar DEBUG] Effect 2 fetchProjects STARTING. User ID: ${user.id}, isGlobalAdmin: ${isGlobalAdmin}`);
      // Iniciar carga AHORA que sabemos que tenemos usuario y vamos a buscar
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
          // 'user' está garantizado como no nulo aquí por la condición de arriba
          query = supabase
            .from(projectUsersTable)
            .select(`project: ${projectsTable}(id, name)`)
            .eq('user_id', user.id) // Usar user.id directamente
            .eq('status', 'active');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching projects:', error);
          setProjects([]);
          // Podríamos mantener loading=true o false aquí, pero finally lo manejará
          return; // Salir en caso de error de fetch
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
        setProjects([]); // Limpiar en caso de error de procesamiento
      } finally {
        console.log('[Sidebar DEBUG] Effect 2 fetchProjects FINALLY block. Setting internal loading=false.');
        // Asegurarse de poner loading=false independientemente del resultado
        setLoading(false);
      }
    };

    fetchProjects();
    // Dependencias: Ejecutar la lógica de fetch SOLO si 'user' o 'isGlobalAdmin' cambian.
    // 'authLoading' ya no es necesario aquí porque esperamos directamente a 'user'.
  }, [user, isGlobalAdmin]); // <--- Dependencias actualizadas

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
