
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cog, RefreshCw, Server, Shield, FileText, CheckSquare, Bell } from 'lucide-react';
import { environment } from '@/config/environment';
import { SERVICES } from '@/integrations/supabase/client';

// Información sobre los microservicios disponibles
const services = [
  { 
    id: SERVICES.AUTH, 
    name: 'Auth Service', 
    description: 'Gestión de usuarios y autenticación',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    id: SERVICES.PROJECTS, 
    name: 'Projects Service', 
    description: 'Administración de proyectos',
    icon: <Server className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    id: SERVICES.FORMS, 
    name: 'Forms Service', 
    description: 'Gestión de formularios',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800'
  },
  { 
    id: SERVICES.TASKS, 
    name: 'Tasks Service', 
    description: 'Gestión de tareas',
    icon: <CheckSquare className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800'
  },
  { 
    id: SERVICES.NOTIFICATIONS, 
    name: 'Notifications Service', 
    description: 'Sistema de notificaciones',
    icon: <Bell className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800'
  }
];

export function MicroserviceConfig() {
  const [refreshing, setRefreshing] = useState(false);

  // Simula una verificación de estado de los servicios
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuración de Microservicios</CardTitle>
            <CardDescription>
              Estado y configuración de los servicios del sistema
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {environment}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="services">
          <TabsList className="mb-4">
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Todos los servicios están funcionando correctamente
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="overflow-hidden">
                  <div className={`h-1.5 w-full ${service.color.split(' ')[0]}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-1.5 rounded-md ${service.color}`}>
                          {service.icon}
                        </div>
                        <CardTitle className="text-sm font-medium ml-2">
                          {service.name}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Activo</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="config">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <Cog className="h-4 w-4 mr-2" />
                    <p className="text-sm font-medium">Configuración de conexión</p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">API Gateway</p>
                      <pre className="text-xs bg-secondary p-2 rounded-md overflow-x-auto">
                        {`${window.location.protocol}//${window.location.host}/api`}
                      </pre>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Modo de conexión</p>
                      <Badge>
                        {environment === 'development' 
                          ? 'Unificado (desarrollo)' 
                          : 'Distribuido (producción)'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {environment === 'development'
                          ? 'En desarrollo, todos los servicios se conectan a la misma instancia de Supabase'
                          : 'En producción, cada servicio tiene su propia instancia de Supabase'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
