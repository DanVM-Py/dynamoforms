
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
import { 
  CalendarDays, 
  Check, 
  ChevronRight, 
  Clock, 
  ClipboardList, 
  FileText, 
  Filter, 
  Plus, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { formatRelative, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/supabase";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Filter states
interface TaskFilters {
  status: string;
  search: string;
  priority: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const getTasks = async (filters: TaskFilters, projectId?: string) => {
  let query = supabase
    .from("tasks")
    .select(`
      *,
      source_form:source_form_id(id, title)
    `);
  
  // Apply status filter
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as "pending" | "in_progress" | "completed");
  }
  
  // Apply project filter if provided
  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  
  // Apply priority filter if provided
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  
  // Determine sort field and order
  let sortField = "created_at";
  if (filters.sortBy === "due_date") sortField = "due_date";
  if (filters.sortBy === "title") sortField = "title";
  
  query = query.order(sortField, { ascending: filters.sortOrder === 'asc' });
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Fetch user info for assignees
  const userIds = data.map(task => task.assigned_to);
  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);
  
  // Enhance tasks with assignee information and default values
  const enhancedTasks = data.map(task => {
    const assigneeUser = users?.find(u => u.id === task.assigned_to);
    
    const enhancedTask = {
      ...task,
      source_form: task.source_form && 'id' in task.source_form ? task.source_form : null,
      assignee_name: assigneeUser?.name || assigneeUser?.email || "Unknown",
      priority: task.priority || "medium"
    };
    
    return enhancedTask;
  });
  
  // Apply search filter on the client side
  let filteredTasks = enhancedTasks;
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredTasks = enhancedTasks.filter(task => 
      task.title.toLowerCase().includes(searchLower) || 
      (task.description && task.description.toLowerCase().includes(searchLower)) ||
      (task.assignee_name && task.assignee_name.toLowerCase().includes(searchLower))
    );
  }
  
  return filteredTasks as Task[];
};

const Tasks = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Filter state
  const [filters, setFilters] = useState<TaskFilters>({
    status: "pending",
    search: "",
    priority: "all",
    sortBy: "created_at",
    sortOrder: "desc"
  });
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Task data query
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId, filters, user?.id],
    queryFn: async () => {
      return getTasks(filters, projectId);
    },
    enabled: !!user?.id,
  });
  
  // Mutation for updating task status
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
  
  // Mutation for deleting a task
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
  
  // Utility functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return formatRelative(parseISO(dateString), new Date(), { locale: es });
  };
  
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
  
  const isDueDateSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays <= 2 && diffDays >= 0;
  };
  
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    const today = new Date();
    const due = new Date(dueDate);
    
    return due < today;
  };
  
  // Status change handlers
  const handleMarkAsCompleted = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'completed' });
  };
  
  const handleMarkAsInProgress = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'in_progress' });
  };
  
  const handleMarkAsPending = (taskId: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: 'pending' });
  };
  
  // Filter handlers
  const handleStatusChange = (status: string) => {
    setFilters({ ...filters, status });
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };
  
  const handlePriorityChange = (priority: string) => {
    setFilters({ ...filters, priority });
  };
  
  const handleSortChange = (sortBy: string) => {
    setFilters({ ...filters, sortBy });
  };
  
  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    setFilters({ ...filters, sortOrder });
  };
  
  const resetFilters = () => {
    setFilters({
      status: "pending",
      search: "",
      priority: "all",
      sortBy: "created_at",
      sortOrder: "desc"
    });
    setIsFiltersOpen(false);
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tareas</h1>
          <div className="flex gap-2">
            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filtrar Tareas</DialogTitle>
                  <DialogDescription>
                    Ajusta los filtros para encontrar tareas específicas.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <Input 
                      placeholder="Buscar por título, descripción o asignado"
                      value={filters.search}
                      onChange={handleSearchChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={filters.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las prioridades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={filters.status} onValueChange={handleStatusChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendientes</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="completed">Completadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ordenar por</Label>
                      <Select value={filters.sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Fecha de creación</SelectItem>
                          <SelectItem value="due_date">Fecha de vencimiento</SelectItem>
                          <SelectItem value="title">Título</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Orden</Label>
                      <Select value={filters.sortOrder} onValueChange={handleSortOrderChange as (value: string) => void}>
                        <SelectTrigger>
                          <SelectValue placeholder="Orden" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascendente</SelectItem>
                          <SelectItem value="desc">Descendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={resetFilters}>
                    Restablecer
                  </Button>
                  <Button onClick={() => setIsFiltersOpen(false)}>
                    Aplicar Filtros
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              className="bg-dynamo-600 hover:bg-dynamo-700"
              disabled
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </div>
        </div>
        <p className="text-gray-500 mt-1">
          Gestione y realice un seguimiento de las tareas asignadas a usted
        </p>
      </div>
      
      <Tabs defaultValue={filters.status} value={filters.status} onValueChange={handleStatusChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
        
        {filters.search && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span>Mostrando resultados para: </span>
            <Badge variant="secondary" className="font-normal">
              {filters.search}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, search: "" })}>
              Limpiar búsqueda
            </Button>
          </div>
        )}
        
        <TabsContent value={filters.status} className="mt-0">
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
                          <CalendarDays className={`h-4 w-4 mr-2 ${isOverdue(task.due_date) ? 'text-red-500' : isDueDateSoon(task.due_date) ? 'text-amber-500' : 'text-gray-500'}`} />
                          <span className={isOverdue(task.due_date) ? 'text-red-500 font-medium' : isDueDateSoon(task.due_date) ? 'text-amber-500 font-medium' : ''}>
                            Vence: {formatDate(task.due_date)}
                            {isOverdue(task.due_date) && (
                              <span className="ml-2 text-red-500">
                                <AlertCircle className="h-3 w-3 inline" /> Vencida
                              </span>
                            )}
                          </span>
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
                            onClick={() => navigate(`/forms/${task.form_id}/view?taskId=${task.id}`)}
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
                <h3 className="text-lg font-medium mb-2">No hay tareas {filters.status !== 'all' ? getStatusLabel(filters.status).toLowerCase() + 's' : ''}</h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  {filters.status === 'completed' 
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
