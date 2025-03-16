
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, ChevronRight, Clock, ClipboardList, FileText, Filter, Plus, Trash2 } from "lucide-react";
import { formatRelative, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

// Definir la interfaz de tarea
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  form_id: string | null;
  form_response_id: string | null;
  priority: string;
  project_id: string | null;
  source_form_id?: string | null;
  source_form?: {
    id: string;
    title: string;
  };
}

const Tasks = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>("pending");
  
  // Obtener tareas para el usuario actual o el proyecto
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId, activeTab, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          source_form:form_id(id, title)
        `);
      
      // Filtrar por estado
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      // Filtrar por proyecto si se especifica
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        // Si no hay proyecto, mostrar solo las tareas asignadas al usuario actual
        query = query.eq('assigned_to', user?.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Obtener nombres de usuarios asignados
      const userIds = [...new Set(data.map(task => task.assigned_to))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        // Añadir nombre del asignado a las tareas
        return data.map(task => {
          const assignee = profiles?.find(profile => profile.id === task.assigned_to);
          return {
            ...task,
            assignee_name: assignee?.name || assignee?.email || 'Usuario desconocido',
            priority: task.priority || 'medium',
          };
        }) as Task[];
      }
      
      return data.map(task => ({
        ...task,
        assignee_name: 'Usuario desconocido',
        priority: task.priority || 'medium',
      })) as Task[];
    },
    enabled: !!user?.id,
  });
  
  // Mutación para actualizar el estado de una tarea
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'pending' | 'in_progress' | 'completed' }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarea actualizada",
        description: "El estado de la tarea ha sido actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    },
  });
  
  // Mutación para eliminar una tarea
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Tarea eliminada",
        description: "La tarea ha sido eliminada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea.",
        variant: "destructive",
      });
    },
  });
  
  // Formatear la fecha relativa en español
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return formatRelative(parseISO(dateString), new Date(), { locale: es });
  };
  
  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Obtener la etiqueta de prioridad en español
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Normal';
    }
  };
  
  // Obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Obtener la etiqueta del estado en español
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En progreso';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };
  
  // Marcar como completada
  const handleMarkAsCompleted = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'completed' });
  };
  
  // Marcar como en progreso
  const handleMarkAsInProgress = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'in_progress' });
  };
  
  // Marcar como pendiente
  const handleMarkAsPending = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'pending' });
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tareas</h1>
          <Button 
            className="bg-dynamo-600 hover:bg-dynamo-700"
            disabled
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
        <p className="text-gray-500 mt-1">
          Gestione y realice un seguimiento de las tareas asignadas a usted
        </p>
      </div>
      
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-pulse text-gray-500">Cargando tareas...</div>
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between mb-2">
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2 text-lg">{task.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      {task.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {task.assignee_name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>Asignado a: {task.assignee_name}</span>
                      </div>
                      
                      {task.due_date && (
                        <div className="flex items-center text-sm">
                          <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
                          <span>Vence: {formatDate(task.due_date)}</span>
                        </div>
                      )}
                      
                      {task.source_form && (
                        <div className="flex items-center text-sm">
                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="truncate">Formulario: {task.source_form.title}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Creado: {formatDate(task.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between border-t pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Eliminar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Eliminar Tarea</DialogTitle>
                          <DialogDescription>
                            ¿Está seguro de que desea eliminar esta tarea? Esta acción no se puede deshacer.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancelar</Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            disabled={deleteTaskMutation.isPending}
                          >
                            {deleteTaskMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="bg-dynamo-600 hover:bg-dynamo-700">
                          {task.form_id ? 'Ver Formulario' : 'Cambiar Estado'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {task.form_id && (
                          <DropdownMenuItem 
                            onClick={() => navigate(`/forms/${task.form_id}/view`)}
                            className="cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            <span>Ver Formulario</span>
                          </DropdownMenuItem>
                        )}
                        
                        {task.status !== 'completed' && (
                          <DropdownMenuItem 
                            onClick={() => handleMarkAsCompleted(task.id)}
                            className="cursor-pointer"
                          >
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span>Marcar como Completada</span>
                          </DropdownMenuItem>
                        )}
                        
                        {task.status !== 'in_progress' && (
                          <DropdownMenuItem 
                            onClick={() => handleMarkAsInProgress(task.id)}
                            className="cursor-pointer"
                          >
                            <ClipboardList className="h-4 w-4 mr-2 text-blue-500" />
                            <span>Marcar En Progreso</span>
                          </DropdownMenuItem>
                        )}
                        
                        {task.status !== 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleMarkAsPending(task.id)}
                            className="cursor-pointer"
                          >
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span>Marcar como Pendiente</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-gray-100 p-3 mb-4">
                  <ClipboardList className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay tareas {activeTab !== 'all' ? getStatusLabel(activeTab).toLowerCase() + 's' : ''}</h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  {activeTab === 'completed' 
                    ? 'No ha completado ninguna tarea todavía.'
                    : 'No tiene tareas asignadas en este momento.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Tasks;
