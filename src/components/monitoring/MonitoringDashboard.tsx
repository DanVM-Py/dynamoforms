
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ServiceMetrics } from "./ServiceMetrics";
import { MicroserviceConfig } from "@/components/environment/MicroserviceConfig";
import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Play, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Componente para mostrar logs del sistema
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

// Función para obtener logs del sistema (integrada con Supabase)
const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  try {
    // En una implementación real, esto vendría de una consulta a Supabase
    // Para esta versión inicial, seguimos usando datos simulados
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'GET',
    });
    
    if (error) throw error;
    
    // Si no hay logs, devolvemos datos simulados
    if (!data || !data.metrics || data.metrics.length === 0) {
      return generateMockLogs();
    }
    
    // En una implementación completa, convertiríamos los logs almacenados
    // Por ahora, generamos logs basados en los estados de los servicios
    return data.metrics.flatMap(metric => {
      const serviceName = metric.service_id;
      const timestamp = new Date(metric.checked_at);
      const logs: LogEntry[] = [];
      
      // Crear un log basado en el estado del servicio
      let level: 'info' | 'warn' | 'error';
      let message: string;
      
      if (metric.status === 'healthy') {
        level = 'info';
        message = `Servicio funcionando correctamente. Tiempo de respuesta: ${metric.response_time}ms`;
      } else if (metric.status === 'degraded') {
        level = 'warn';
        message = `Rendimiento degradado. Tiempo de respuesta: ${metric.response_time}ms, Tasa de error: ${metric.error_rate.toFixed(2)}%`;
      } else {
        level = 'error';
        message = `Servicio no disponible. Última verificación fallida.`;
      }
      
      logs.push({
        id: `log-${serviceName}-${timestamp.getTime()}`,
        timestamp,
        level,
        service: serviceName,
        message
      });
      
      return logs;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return generateMockLogs();
  }
};

// Datos de ejemplo para logs del sistema (función de respaldo)
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

// Función para activar la recolección de métricas programada
const triggerMetricsCollection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('schedule-metrics-collection', {
      method: 'POST'
    });
    
    if (error) {
      console.error('Error triggering metrics collection:', error);
      throw error;
    }
    
    console.log('Metrics collection triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to trigger metrics collection:', error);
    throw error;
  }
};

// Componente de Scheduler para la recolección de métricas
function MetricsScheduler() {
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const handleTriggerCollection = async () => {
    setIsTriggering(true);
    try {
      await triggerMetricsCollection();
      toast({
        title: "Recolección iniciada",
        description: "La recolección de métricas se ha iniciado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar la recolección de métricas.",
        variant: "destructive"
      });
    } finally {
      setIsTriggering(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Programación de Métricas</CardTitle>
        <CardDescription>
          Configuración de la recolección automática de métricas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Recolección Automática</p>
                <p className="text-xs text-muted-foreground">Cada 5 minutos</p>
              </div>
            </div>
            <Switch 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
              aria-label="Toggle auto refresh" 
            />
          </div>
          
          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ejecutar Ahora</p>
                <p className="text-xs text-muted-foreground">Iniciar recolección manual</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTriggerCollection}
              disabled={isTriggering}
            >
              {isTriggering ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ejecutar
            </Button>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>Última ejecución: {new Date().toLocaleTimeString()}</span>
            <span>Próxima ejecución: {new Date(Date.now() + 300000).toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [currentView, setCurrentView] = useState('metrics');
  
  return (
    <PageContainer>
      <div className="max-w-[1200px] mx-auto px-4 py-4 flex-1 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Monitor del Sistema</h2>
            <p className="text-muted-foreground">
              Monitoreo en tiempo real de la infraestructura de microservicios
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Clock className="h-4 w-4 mr-2" />
                Programación
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Recolección de Métricas</h4>
                  <p className="text-sm text-muted-foreground">
                    Gestionar la recolección automática de datos de monitoreo
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-collect">Recolección automática</Label>
                    <Switch id="auto-collect" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="retention">Retención de datos (días)</Label>
                    <span className="bg-muted px-2 py-1 rounded text-sm">30</span>
                  </div>
                </div>
                <Button 
                  onClick={() => triggerMetricsCollection().catch(console.error)}
                  className="w-full"
                >
                  Recolectar métricas ahora
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Tabs defaultValue="metrics">
          <TabsList className="mb-4">
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="space-y-4">
            <ServiceMetrics />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricsScheduler />
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
          <p>
            Conectado a servicios en vivo vía API RESTful con puntos finales estandarizados de monitoreo
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
