import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PageContainer } from "@/components/layout/PageContainer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from 'lucide-react';
import { Tables } from '@/config/environment';
import { useAuth } from '@/contexts/AuthContext';

// Define Task type to match what we're getting from Supabase
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'Pendiente' | 'En Progreso' | 'Completado';
  assigned_to: string;
  due_date: string | null;
  form_id: string | null;
  project_id: string | null;
  priority: string | null;
  form_response_id: string | null;
  created_at: string;
  updated_at: string;
  source_form_id: string | null;
  source_form?: { id: string; title: string };
  assignee_name?: string;
}

const TasksPage = () => {
  const [currentFilter, setCurrentFilter] = useState<string>('Pendiente');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { currentProjectId: projectId, user } = useAuth();

  useEffect(() => {
    logger.debug(`[TasksPage] Initializing/Project ID changed. Current Project ID from useAuth: ${projectId}`);
    if (!projectId && user) {
      logger.warn("[TasksPage] Project ID is missing from useAuth context. Tasks might not be filtered correctly or fetched.");
    }
  }, [projectId, user]);

  // Fetch tasks
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks', projectId, user?.id, currentFilter, searchQuery],
    queryFn: async () => {
      if (!projectId) {
        logger.warn("[TasksPage] Project ID is missing from context, cannot fetch tasks.");
        return [];
      }
      if (!user?.id) {
        logger.warn("[TasksPage] User ID is missing from context, cannot filter by assigned_to. Fetching all tasks for project.");
      }

      let query = supabase
        .from(Tables.tasks)
        .select(`
          *,
          profiles:assigned_to (name, email)
        `)
        .eq('project_id', projectId);

      if (user?.id) {
        query = query.eq('assigned_to', user.id);
      }

      // Apply filters
      if (currentFilter === 'Pendiente') {
        query = query.eq('status', 'Pendiente');
      } else if (currentFilter === 'En Progreso') {
        query = query.eq('status', 'En Progreso');
      } else if (currentFilter === 'Completado') {
        query = query.eq('status', 'Completado');
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      query = query.order('due_date', { ascending: true, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        logger.error("[TasksPage] Error fetching raw tasks from Supabase:", error);
        throw error;
      }

      logger.info("[TasksPage] Raw tasks data fetched from Supabase:", data);

      if (!data || data.length === 0) {
        logger.info("[TasksPage] No tasks found for the current filters from Supabase.");
        return [];
      }
      
      const enhancedTasks = await Promise.all((data || []).map(async (task) => {
        const assigneeName = task.profiles?.name || task.profiles?.email || 'Unknown';
        let sourceForm = undefined;
        if (task.source_form_id) {
          try {
            const { data: formData, error: formError } = await supabase
              .from(Tables.forms)
              .select('id, title')
              .eq('id', task.source_form_id)
              .single();
            if (formError) {
              logger.warn(`[TasksPage] Error fetching source form ${task.source_form_id} for task ${task.id}:`, formError);
            } else if (formData) {
              sourceForm = formData;
            }
          } catch (e) {
            logger.error(`[TasksPage] Exception fetching source form ${task.source_form_id} for task ${task.id}:`, e);
          }
        }
        return { ...task, assignee_name: assigneeName, source_form: sourceForm } as Task;
      }));

      logger.info("[TasksPage] Enhanced tasks data prepared:", enhancedTasks);
      return enhancedTasks;
    },
    enabled: !!projectId,
  });

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
          <p className="text-gray-500 mt-1">Aquí puedes ver las tareas que te han sido asignadas en este proyecto.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <Label htmlFor="status-filter-top" className="sm:mb-0 whitespace-nowrap">
            Filtrar por estado:
          </Label>
          <Select value={currentFilter} onValueChange={handleFilterChange} name="status-filter-top">
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="Pendiente">Pendientes</SelectItem>
              <SelectItem value="En Progreso">En Progreso</SelectItem>
              <SelectItem value="Completado">Completadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tareas Asignadas</CardTitle>
          <CardDescription className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label htmlFor="title-search-card" className="sm:mb-0 whitespace-nowrap">
                Buscar por título:
              </Label>
              <Input
                id="title-search-card"
                type="text"
                placeholder="Escribe para buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full sm:w-auto sm:min-w-[200px] sm:flex-grow"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.assignee_name}</TableCell>
                    <TableCell>{task.status}</TableCell>
                    <TableCell>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No tienes tareas asignadas que coincidan con los filtros actuales.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default TasksPage;
