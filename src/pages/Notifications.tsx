
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, Clock, Mail, MessageSquare, RefreshCw, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Notifications = () => {
  const demoNotifications = [
    { 
      id: 1, 
      title: "Nueva tarea asignada", 
      message: "Se te ha asignado la tarea 'Revisar solicitud de vacaciones'", 
      time: "Hace 10 minutos", 
      type: "task",
      read: false
    },
    { 
      id: 2, 
      title: "Formulario aprobado", 
      message: "Tu solicitud de reembolso ha sido aprobada por María López", 
      time: "Hace 2 horas", 
      type: "form",
      read: false
    },
    { 
      id: 3, 
      title: "Recordatorio de tarea", 
      message: "La tarea 'Completar evaluación' vence mañana", 
      time: "Hace 5 horas", 
      type: "reminder",
      read: true
    },
    { 
      id: 4, 
      title: "Email enviado", 
      message: "Se ha enviado un correo de notificación a juan@ejemplo.com", 
      time: "Hace 1 día", 
      type: "email",
      read: true
    },
    { 
      id: 5, 
      title: "WhatsApp enviado", 
      message: "Se ha enviado un mensaje de WhatsApp al +34 612 345 678", 
      time: "Hace 1 día", 
      type: "whatsapp",
      read: true
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task": return <Bell className="h-4 w-4 text-dynamo-600" />;
      case "form": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "reminder": return <Clock className="h-4 w-4 text-amber-600" />;
      case "email": return <Mail className="h-4 w-4 text-blue-600" />;
      case "whatsapp": return <MessageSquare className="h-4 w-4 text-green-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 mt-1">Gestiona tus notificaciones y alertas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Trash2 className="h-4 w-4" /> Limpiar todo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">No leídas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {demoNotifications.map((notification) => (
            <Card key={notification.id} className={`hover:shadow-md transition-shadow ${notification.read ? 'bg-white' : 'bg-dynamo-50'}`}>
              <CardHeader className="pb-2">
                <div className="flex gap-3">
                  <div className={`p-2 ${notification.read ? 'bg-gray-100' : 'bg-white'} rounded-md h-fit`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <CardTitle className="text-lg font-medium">
                        {notification.title}
                        {!notification.read && (
                          <Badge className="ml-2 bg-dynamo-600">Nueva</Badge>
                        )}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mt-1">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{notification.time}</span>
                  </div>
                  {!notification.read ? (
                    <Button variant="ghost" size="sm">Marcar como leída</Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-gray-400">Eliminar</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {demoNotifications.filter(n => !n.read).map((notification) => (
            <Card key={notification.id} className="bg-dynamo-50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex gap-3">
                  <div className="p-2 bg-white rounded-md h-fit">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <CardTitle className="text-lg font-medium">
                        {notification.title}
                        <Badge className="ml-2 bg-dynamo-600">Nueva</Badge>
                      </CardTitle>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mt-1">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{notification.time}</span>
                  </div>
                  <Button variant="ghost" size="sm">Marcar como leída</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 bg-gray-100 rounded-full mb-3">
              <Mail className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No hay notificaciones enviadas</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              Las notificaciones enviadas a tus usuarios aparecerán aquí para que puedas hacer un seguimiento.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Notifications;
