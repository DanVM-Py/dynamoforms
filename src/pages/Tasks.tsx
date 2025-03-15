import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Clock, Filter, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority?: string;
  status: Database["public"]["Enums"]["task_status"];
  assigned_to: string;
  assignee_name?: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchTasks();
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to (name)
        `);

      if (error) {
        throw error;
      }

      if (data) {
        const formattedTasks = data.map(task => ({
          ...task,
          priority: getPriorityFromDueDate(task.due_date),
          assignee_name: task.profiles?.name || 'Usuario desconocido'
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error al cargar tareas",
        description: "No se pudieron cargar las tareas. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityFromDueDate = (dueDate: string | null): string => {
    if (!dueDate) return "Baja";
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return "Alta";
    if (diffDays <= 3) return "Media";
    return "Baja";
  };

  const getTaskDeadlineText = (dueDate: string | null): string => {
    if (!dueDate) return "Sin fecha límite";
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Vencida";
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    if (diffDays < 7) return `${diffDays} días`;
    return new Date(dueDate).toLocaleDateString('es-ES');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta": return "text-red-600 bg-red-50";
      case "Media": return "text-amber-600 bg-amber-50";
      case "Baja": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Database["public"]["Enums"]["task_status"]) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      fetchTasks();
      toast({
        title: "Tarea actualizada",
        description: "El estado de la tarea ha sido actualizado correctamente.",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error al actualizar tarea",
        description: "No se pudo actualizar el estado de la tarea.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-500 mt-1">Gestiona tus tareas pendientes y asignadas</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
      </div>

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="mine">Mis tareas</TabsTrigger>
          <TabsTrigger value="assigned">Tareas asignadas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse text-gray-500">Cargando tareas...</div>
          </div>
        ) : (
          <>
            <TabsContent value="mine" className="space-y-4">
              {tasks.filter(task => task.assigned_to === currentUserId && task.status !== 'completed').length > 0 ? (
                tasks
                  .filter(task => task.assigned_to === currentUserId && task.status !== 'completed')
                  .map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="p-2 bg-dynamo-50 rounded-md h-fit">
                              <CheckSquare className="h-4 w-4 text-dynamo-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">{task.description || "Sin descripción"}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(task.priority || "Baja")}>
                            {task.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm mt-2">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-4 w-4" />
                            <span>Vence: {getTaskDeadlineText(task.due_date)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            >
                              Rechazar
                            </Button>
                            <Button 
                              className="bg-dynamo-600 hover:bg-dynamo-700" 
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                            >
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <EmptyState message="No tienes tareas pendientes asignadas" />
              )}
            </TabsContent>

            <TabsContent value="assigned" className="space-y-4">
              {tasks.filter(task => task.assigned_to !== currentUserId && task.status !== 'completed').length > 0 ? (
                tasks
                  .filter(task => task.assigned_to !== currentUserId && task.status !== 'completed')
                  .map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="p-2 bg-dynamo-50 rounded-md h-fit">
                              <CheckSquare className="h-4 w-4 text-dynamo-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">{task.description || "Sin descripción"}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(task.priority || "Baja")}>
                            {task.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between text-sm mt-2">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-4 w-4" />
                            <span>Vence: {getTaskDeadlineText(task.due_date)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <UserCircle className="h-4 w-4" />
                            <span>Asignada a: {task.assignee_name}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <EmptyState message="No hay tareas asignadas a otros usuarios" />
              )}
            </TabsContent>

            <TabsContent value="completed">
              {tasks.filter(task => task.status === 'completed').length > 0 ? (
                <div className="space-y-4">
                  {tasks
                    .filter(task => task.status === 'completed')
                    .map((task) => (
                      <Card key={task.id} className="hover:shadow-md transition-shadow opacity-75">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              <div className="p-2 bg-gray-100 rounded-md h-fit">
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">{task.description || "Sin descripción"}</p>
                              </div>
                            </div>
                            <Badge className="bg-green-50 text-green-600">
                              Completada
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between text-sm mt-2">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>Completada: {new Date().toLocaleDateString('es-ES')}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <EmptyState message="No hay tareas completadas" />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageContainer>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="p-3 bg-gray-100 rounded-full mb-3">
      <CheckSquare className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900">{message}</h3>
    <p className="text-sm text-gray-500 max-w-sm mt-2">
      Las tareas aparecerán aquí cuando se generen o sean completadas.
    </p>
  </div>
);

export default Tasks;
