
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Clock, Filter, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Tasks = () => {
  const demoTasks = [
    { 
      id: 1, 
      title: "Revisar solicitud de vacaciones", 
      description: "De Juan Pérez para el periodo 10-20 de julio", 
      deadline: "Hoy", 
      priority: "Alta", 
      status: "Pendiente",
      assignee: "Tú"
    },
    { 
      id: 2, 
      title: "Aprobar reporte de gastos", 
      description: "Reporte mensual del departamento de marketing", 
      deadline: "Mañana", 
      priority: "Media", 
      status: "En progreso",
      assignee: "María López"
    },
    { 
      id: 3, 
      title: "Completar evaluación de desempeño", 
      description: "Evaluación trimestral para el equipo de desarrollo", 
      deadline: "3 días", 
      priority: "Baja", 
      status: "Pendiente",
      assignee: "Tú"
    },
    { 
      id: 4, 
      title: "Validar documentación técnica", 
      description: "Revisión de la documentación del nuevo producto", 
      deadline: "5 días", 
      priority: "Media", 
      status: "Pendiente",
      assignee: "Carlos Gómez"
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta": return "text-red-600 bg-red-50";
      case "Media": return "text-amber-600 bg-amber-50";
      case "Baja": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
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

        <TabsContent value="mine" className="space-y-4">
          {demoTasks.filter(task => task.assignee === "Tú").map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="p-2 bg-dynamo-50 rounded-md h-fit">
                      <CheckSquare className="h-4 w-4 text-dynamo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mt-2">
                  <div className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>Vence: {task.deadline}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Rechazar</Button>
                    <Button className="bg-dynamo-600 hover:bg-dynamo-700" size="sm">Aprobar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          {demoTasks.filter(task => task.assignee !== "Tú").map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="p-2 bg-dynamo-50 rounded-md h-fit">
                      <CheckSquare className="h-4 w-4 text-dynamo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mt-2">
                  <div className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>Vence: {task.deadline}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <UserCircle className="h-4 w-4" />
                    <span>Asignada a: {task.assignee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 bg-gray-100 rounded-full mb-3">
              <CheckSquare className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No hay tareas completadas</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              Las tareas que completes aparecerán aquí para que puedas hacer un seguimiento de tu progreso.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Tasks;
