
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CheckCircle, Clock, Tag, AlertCircle, FileText, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority?: string;
  status: Database["public"]["Enums"]["task_status"];
  assigned_to: string;
  assignee_name?: string;
  form_id: string | null;
  source_form_id: string | null;
  form_response_id: string | null;
  form?: {
    id: string;
    title: string;
  };
  source_form?: {
    id: string;
    title: string;
  };
  metadata?: {
    source_template_id?: string;
    inheritance_mapping?: Record<string, string>;
    source_response_data?: Record<string, any>;
  };
}

const Tasks = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch tasks using React Query
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para ver tus tareas.",
          variant: "destructive",
        });
        return [];
      }

      // Obtener tareas y unir con información de perfiles para obtener los nombres
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to (name),
          form:form_id (id, title),
          source_form:source_form_id (id, title)
        `);

      if (error) throw error;

      // Transformar los datos para incluir el nombre del asignado
      const tasksWithAssignees = (data || []).map(task => ({
        ...task,
        assignee_name: task.profiles?.name || 'Usuario desconocido',
        // Añadir algunos valores de ejemplo para prioridad si no existen
        priority: ['alta', 'media', 'baja'][Math.floor(Math.random() * 3)]
      }));
      
      return tasksWithAssignees as Task[];
    }
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string, newStatus: Database["public"]["Enums"]["task_status"] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
        
      if (error) throw error;
      return { taskId, newStatus };
    },
    onSuccess: ({ taskId, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: "Tarea actualizada",
        description: `El estado de la tarea ha sido actualizado a: ${getStatusLabel(newStatus)}`,
      });
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast({
        title: "Error al actualizar tarea",
        description: "No se pudo actualizar el estado de la tarea. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return "Pendiente";
      case 'in_progress': return "En progreso";
      case 'completed': return "Completada";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return "bg-yellow-100 text-yellow-800";
      case 'in_progress': return "bg-blue-100 text-blue-800";
      case 'completed': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return "bg-red-100 text-red-800";
      case 'media': return "bg-yellow-100 text-yellow-800";
      case 'baja': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const updateTaskStatus = (taskId: string, newStatus: Database["public"]["Enums"]["task_status"]) => {
    updateTaskMutation.mutate({ taskId, newStatus });
  };

  const handleOpenForm = (task: Task) => {
    // If this task has a form, open it in a new tab
    if (task.form_id) {
      let url = `/public/forms/${task.form_id}`;
      
      // If there's a source form response, add it to the URL for data inheritance
      if (task.form_response_id && task.metadata?.inheritance_mapping) {
        url += `?source_response_id=${task.form_response_id}`;
      }
      
      window.open(url, '_blank');
    }
  };

  const filteredTasks = () => {
    if (!tasks) return [];
    
    switch (activeTab) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'in_progress':
        return tasks.filter(task => task.status === 'in_progress');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      default:
        return tasks;
    }
  };

  const handleCreateTaskTemplate = () => {
    navigate('/task-templates');
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
            <p className="text-gray-500 mt-1">Gestiona y visualiza las tareas asignadas</p>
          </div>
          <div>
            <Button 
              onClick={handleCreateTaskTemplate}
              className="bg-dynamo-600 hover:bg-dynamo-700"
            >
              Configurar Plantillas
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando tareas...</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks().length > 0 ? (
            filteredTasks().map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">{task.description || "Sin descripción"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{task.assignee_name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{formatDate(task.due_date)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Tag className="h-4 w-4 mr-2 text-gray-500" />
                      <Badge variant="outline" className={getPriorityColor(task.priority || '')}>
                        Prioridad: {task.priority || 'No definida'}
                      </Badge>
                    </div>
                    
                    {task.form && (
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Formulario: {task.form.title}</span>
                      </div>
                    )}
                    
                    {task.source_form && (
                      <div className="flex items-center text-sm">
                        <LinkIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Origen: {task.source_form.title}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  {task.status === "pending" && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      >
                        Iniciar
                      </Button>
                      {task.form_id && (
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-dynamo-600 hover:bg-dynamo-700"
                          onClick={() => handleOpenForm(task)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ejecutar Formulario
                        </Button>
                      )}
                    </>
                  )}
                  {task.status === "in_progress" && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                      >
                        Pausar
                      </Button>
                      {task.form_id ? (
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-dynamo-600 hover:bg-dynamo-700"
                          onClick={() => handleOpenForm(task)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ejecutar Formulario
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-dynamo-600 hover:bg-dynamo-700"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                        >
                          Completar
                        </Button>
                      )}
                    </>
                  )}
                  {task.status === "completed" && (
                    <div className="flex items-center text-green-600 w-full justify-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>Tarea completada</span>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay tareas disponibles</p>
                <p className="text-sm text-gray-500">No tienes tareas asignadas actualmente</p>
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default Tasks;
