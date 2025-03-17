
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ServiceMetrics } from "./ServiceMetrics";
import { MicroserviceConfig } from "@/components/environment/MicroserviceConfig";
import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';

// Componente para mostrar logs del sistema
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

// Datos de ejemplo para logs del sistema
const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  const services = ['auth', 'projects', 'forms', 'tasks', 'notifications', 'gateway'];
  const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];
  const messages = [
    'Solicitud procesada correctamente',
    'Conexión con base de datos establecida',
    'Usuario autenticado',
    'Formulario enviado',
    'Tarea completada',
    'Error al procesar solicitud',
    'Tiempo de espera excedido',
    'Conexión rechazada',
    'Error de validación de datos',
    'Servicio reiniciado'
  ];
  
  // Generar 30 entradas de log aleatorias
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const level = levels[Math.floor(Math.random() * (levels.length))];
    const service = services[Math.floor(Math.random() * services.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    logs.push({
      id: `log-${i}`,
      timestamp,
      level,
      service,
      message
    });
  }
  
  // Ordenar por timestamp (más reciente primero)
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Función para obtener logs del sistema (simulada)
const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 500));
  return generateMockLogs();
};

// Componente de Log Viewer
function LogViewer() {
  const { data: logs = [] } = useQuery({
    queryKey: ['systemLogs'],
    queryFn: fetchSystemLogs,
    refetchInterval: 60000, // Refrescar cada minuto
  });
  
  // Filtrar logs por nivel
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Logs del Sistema</CardTitle>
          <div className="flex space-x-1">
            <Badge 
              variant={filter === 'all' ? "default" : "outline"} 
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              Todos
            </Badge>
            <Badge 
              variant={filter === 'info' ? "default" : "outline"} 
              className="cursor-pointer"
              onClick={() => setFilter('info')}
            >
              Info
            </Badge>
            <Badge 
              variant={filter === 'warn' ? "default" : "outline"} 
              className="cursor-pointer bg-amber-100 text-amber-800 hover:bg-amber-200"
              onClick={() => setFilter('warn')}
            >
              Avisos
            </Badge>
            <Badge 
              variant={filter === 'error' ? "default" : "outline"} 
              className="cursor-pointer bg-red-100 text-red-800 hover:bg-red-200"
              onClick={() => setFilter('error')}
            >
              Errores
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border h-[400px] overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="font-medium p-2 text-left">Hora</th>
                <th className="font-medium p-2 text-left">Nivel</th>
                <th className="font-medium p-2 text-left">Servicio</th>
                <th className="font-medium p-2 text-left">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-muted/50">
                  <td className="p-2 align-top">
                    {log.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="p-2 align-top">
                    <Badge variant="outline" className={
                      log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                      log.level === 'warn' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {log.level}
                    </Badge>
                  </td>
                  <td className="p-2 align-top whitespace-nowrap">
                    {log.service}
                  </td>
                  <td className="p-2 align-top">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente principal del Dashboard de Monitoreo
export function MonitoringDashboard() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Monitor del Sistema</h2>
        <p className="text-muted-foreground">
          Monitoreo en tiempo real de la infraestructura de microservicios
        </p>
      </div>
      
      <Tabs defaultValue="metrics">
        <TabsList className="mb-4">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="space-y-4">
          <ServiceMetrics />
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alertas Activas</CardTitle>
                <CardDescription>
                  Problemas detectados que requieren atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  No hay alertas activas en este momento.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="logs">
          <LogViewer />
        </TabsContent>
        
        <TabsContent value="config">
          <MicroserviceConfig />
        </TabsContent>
      </Tabs>
      
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <p>Monitor interno de microservicios - Entorno: {environment}</p>
        <p>Todos los datos son simulados con fines de demostración</p>
      </div>
    </div>
  );
}
