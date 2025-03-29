import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ServiceMetrics } from "./ServiceMetrics";
import { MicroserviceConfig } from "@/components/environment/MicroserviceConfig";
import { environment } from '@/config/environment';
import { PageContainer } from "@/components/layout/PageContainer";
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Interface for log entries
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

// Function to fetch system logs from Supabase
const fetchSystemLogs = async (): Promise<LogEntry[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'GET',
    });
    
    if (error) throw error;
    
    if (!data || !data.metrics || data.metrics.length === 0) {
      return generateMockLogs();
    }
    
    // Convert metrics to logs
    return data.metrics.flatMap(metric => {
      const serviceName = metric.service_id;
      const timestamp = new Date(metric.checked_at);
      const logs: LogEntry[] = [];
      
      // Create a log based on the service status
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

// Mock log data function (for fallback)
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

// Function to collect metrics manually
const triggerMetricsCollection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'POST',
      body: { 
        forceFetch: true,
        clearBeforeInsert: false
      }
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

// Log Viewer Component
function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  
  const refreshLogs = async () => {
    const newLogs = await fetchSystemLogs();
    setLogs(newLogs);
  };
  
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
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    No hay logs disponibles. Actualice los datos para ver la información más reciente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function MonitoringDashboard() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState('metrics');
  
  // Single refresh function for the entire system
  const refreshAllData = async () => {
    setIsRefreshing(true);
    
    try {
      toast({
        title: "Actualizando datos",
        description: "Recolectando información de microservicios...",
      });
      
      // Trigger metrics collection
      await triggerMetricsCollection();
      
      toast({
        title: "Datos actualizados",
        description: "Información de microservicios actualizada correctamente."
      });
    } catch (error) {
      console.error("Error refreshing monitoring data:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información de microservicios",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <PageContainer>
      <div className="max-w-[1200px] mx-auto px-4 py-4 flex-1 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Monitor del Sistema</h2>
            <p className="text-muted-foreground">
              Monitoreo de la infraestructura de microservicios
            </p>
          </div>
          
          {/* Single refresh button */}
          <Button 
            onClick={refreshAllData} 
            variant="outline" 
            className="ml-auto"
            disabled={isRefreshing}
          >
            <RefreshCw 
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} 
            />
            Actualizar Datos
          </Button>
        </div>
        
        <Tabs defaultValue="metrics">
          <TabsList className="mb-4">
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="space-y-4">
            <ServiceMetrics />
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
            Cuando se actualicen los datos, se verificará el estado de los servicios en tiempo real
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
