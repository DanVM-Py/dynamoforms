import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, AlertCircle, CheckCircle, Activity, Database, Server, Network, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

interface ServiceMetric {
  id: string;
  service_id: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
  request_count: number;
  checked_at: string;
  metrics_data?: {
    responseTime: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
    requestCount: Array<{ timestamp: number; value: number }>;
  };
  trends?: {
    responseTimeTrend: number;
    errorRateTrend: number;
    cpuUsageTrend: number;
    memoryUsageTrend: number;
    requestCountTrend: number;
  };
}

interface ServiceHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  requestCount: number;
  cpuUsage: number;
  memoryUsage: number;
  lastChecked: Date;
  metrics: {
    responseTime: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
    requestCount: Array<{ timestamp: number; value: number }>;
  };
  trends: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
  };
}

const serviceConfig = [
  { 
    id: 'auth', 
    name: 'Auth Service',
    endpoint: '/api/auth/health'
  },
  { 
    id: 'projects', 
    name: 'Projects Service',
    endpoint: '/api/projects/health'
  },
  { 
    id: 'forms', 
    name: 'Forms Service',
    endpoint: '/api/forms/health'
  },
  { 
    id: 'tasks', 
    name: 'Tasks Service',
    endpoint: '/api/tasks/health'
  },
  { 
    id: 'notifications', 
    name: 'Notifications Service',
    endpoint: '/api/notifications/health'
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    endpoint: '/api/health'
  }
];

const mapServiceMetrics = (metricsData: ServiceMetric[]): ServiceHealth[] => {
  if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
    logger.warn("No hay datos de métricas disponibles o formato incorrecto", metricsData);
    return serviceConfig.map(service => ({
      id: service.id,
      name: service.name,
      status: 'down' as const,
      responseTime: 0,
      errorRate: 0,
      requestCount: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      lastChecked: new Date(),
      metrics: {
        responseTime: [],
        errorRate: [],
        requestCount: []
      },
      trends: {
        responseTime: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        requestCount: 0
      }
    }));
  }

  logger.debug("Mapeando métricas de servicios:", metricsData);
  
  const latestMetricsByService = metricsData.reduce((acc, metric) => {
    if (!acc[metric.service_id] || 
        new Date(metric.checked_at) > new Date(acc[metric.service_id].checked_at)) {
      acc[metric.service_id] = metric;
    }
    return acc;
  }, {} as Record<string, ServiceMetric>);

  return serviceConfig.map(service => {
    const serviceMetric = latestMetricsByService[service.id];
    
    if (!serviceMetric) {
      logger.debug(`No se encontraron métricas para el servicio: ${service.id}`);
      return {
        id: service.id,
        name: service.name,
        status: 'down' as const,
        responseTime: 0,
        errorRate: 0,
        requestCount: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        lastChecked: new Date(),
        metrics: {
          responseTime: [],
          errorRate: [],
          requestCount: []
        },
        trends: {
          responseTime: 0,
          errorRate: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          requestCount: 0
        }
      };
    }
    
    return {
      id: service.id,
      name: service.name,
      status: serviceMetric.status,
      responseTime: serviceMetric.response_time,
      errorRate: serviceMetric.error_rate,
      requestCount: serviceMetric.request_count,
      cpuUsage: serviceMetric.cpu_usage,
      memoryUsage: serviceMetric.memory_usage,
      lastChecked: new Date(serviceMetric.checked_at),
      metrics: serviceMetric.metrics_data || {
        responseTime: [],
        errorRate: [],
        requestCount: []
      },
      trends: {
        responseTime: serviceMetric.trends?.responseTimeTrend || 0,
        errorRate: serviceMetric.trends?.errorRateTrend || 0,
        cpuUsage: serviceMetric.trends?.cpuUsageTrend || 0,
        memoryUsage: serviceMetric.trends?.memoryUsageTrend || 0,
        requestCount: serviceMetric.trends?.requestCountTrend || 0
      }
    };
  });
};

const fetchServiceMetrics = async (): Promise<ServiceHealth[]> => {
  logger.info("Obteniendo métricas de servicios...");
  
  try {
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'GET',
    });

    if (error) {
      logger.error('Error fetching service metrics:', error);
      throw error;
    }

    logger.debug('Received metrics data:', data);
    
    if (!data || !data.metrics) {
      logger.warn('Formato de datos de métricas no válido recibido', data);
      return [];
    }
    
    const metricsArray = Array.isArray(data.metrics) ? data.metrics : [];
    
    if (metricsArray.length === 0) {
      logger.warn('No se recibieron métricas de servicios');
    }

    return mapServiceMetrics(metricsArray);
  } catch (error) {
    logger.error('Error al obtener métricas:', error);
    throw error;
  }
};

const refreshServiceMetrics = async (): Promise<ServiceHealth[]> => {
  logger.info("Actualizando métricas de servicios con limpieza previa...");
  
  try {
    const { data, error } = await supabase.functions.invoke('collect-metrics', {
      method: 'POST',
      body: { 
        clearBeforeInsert: true,
        forceFetch: true
      }
    });

    if (error) {
      logger.error('Error refreshing service metrics:', error);
      throw error;
    }

    logger.debug('Refreshed metrics data:', data);
    
    if (!data || !data.metrics) {
      logger.warn('Formato de datos de métricas no válido recibido', data);
      return [];
    }
    
    const metricsArray = Array.isArray(data.metrics) ? data.metrics : [];
    
    if (metricsArray.length === 0) {
      logger.warn('No se recibieron métricas nuevas de servicios');
    }

    return mapServiceMetrics(metricsArray);
  } catch (error) {
    logger.error('Error al actualizar métricas:', error);
    throw error;
  }
};

export function ServiceMetrics() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['serviceMetrics'],
    queryFn: fetchServiceMetrics,
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      toast({
        title: "Actualizando métricas",
        description: "Obteniendo datos en tiempo real..."
      });
      
      logger.info("Iniciando actualización manual de métricas");
      await refreshServiceMetrics();
      await refetch();
      
      toast({
        title: "Métricas actualizadas",
        description: "Los datos de los servicios han sido actualizados correctamente."
      });
    } catch (error) {
      logger.error('Error refreshing metrics:', error);
      toast({
        title: "Error al actualizar métricas",
        description: "No se pudieron actualizar los datos de los servicios.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-amber-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'down': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (value < -5) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-gray-500" />;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const healthPercentage = services.length ? Math.round((healthyCount / services.length) * 100) : 0;

  const responseTimeChartData = services.map(service => ({
    name: service.name,
    value: service.responseTime
  }));

  const errorRateChartData = services.map(service => ({
    name: service.name,
    value: service.errorRate
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monitor de Microservicios</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <span>Estado del sistema y métricas de rendimiento</span>
              <Badge variant={healthPercentage === 100 ? "success" : "outline"} className="ml-2">
                {healthPercentage}% operativo
              </Badge>
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="services">
              <Server className="h-4 w-4 mr-2" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Base de Datos
            </TabsTrigger>
            <TabsTrigger value="network">
              <Network className="h-4 w-4 mr-2" />
              Red
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Estado de Servicios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Saludables: {healthyCount}</span>
                    <span>Degradados: {degradedCount}</span>
                    <span>Caídos: {downCount}</span>
                  </div>
                  <Progress value={healthPercentage} className="h-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tiempo de Respuesta Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(services.reduce((acc, s) => acc + s.responseTime, 0) / Math.max(1, services.length))}ms
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    Últimos 5 minutos
                    {getTrendIcon(services.reduce((acc, s) => acc + s.trends.responseTime, 0) / services.length)}
                    <span className="ml-1">
                      {(services.reduce((acc, s) => acc + s.trends.responseTime, 0) / services.length).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tasa de Error Promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(services.reduce((acc, s) => acc + s.errorRate, 0) / Math.max(1, services.length)).toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    Últimos 5 minutos
                    {getTrendIcon(services.reduce((acc, s) => acc + s.trends.errorRate, 0) / services.length)}
                    <span className="ml-1">
                      {(services.reduce((acc, s) => acc + s.trends.errorRate, 0) / services.length).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tiempo de Respuesta por Servicio</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={responseTimeChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit="ms" />
                      <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 12}} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded-md p-2 text-xs shadow-md">
                                <p>{payload[0].payload.name}</p>
                                <p className="font-bold">{payload[0].value}ms</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tasa de Error por Servicio</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={errorRateChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" unit="%" domain={[0, 5]} />
                      <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 12}} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded-md p-2 text-xs shadow-md">
                                <p>{payload[0].payload.name}</p>
                                <p className="font-bold">{payload[0].value}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" fill="#ff8042" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="overflow-hidden">
                  <div className={`h-1.5 w-full ${getStatusColor(service.status)}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{service.name}</CardTitle>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(service.status)}
                        <span className="text-xs">
                          {service.status === 'healthy' ? 'Operativo' : 
                           service.status === 'degraded' ? 'Degradado' : 'Caído'}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      Última actualización: {formatTime(service.lastChecked)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          Tiempo de respuesta
                          {getTrendIcon(service.trends.responseTime)}
                        </div>
                        <div className="font-medium">{service.responseTime}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          Tasa de error
                          {getTrendIcon(service.trends.errorRate)}
                        </div>
                        <div className="font-medium">{service.errorRate}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          CPU
                          {getTrendIcon(service.trends.cpuUsage)}
                        </div>
                        <div className="font-medium">{service.cpuUsage}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          Memoria
                          {getTrendIcon(service.trends.memoryUsage)}
                        </div>
                        <div className="font-medium">{service.memoryUsage}%</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="w-full h-[100px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={service.metrics.responseTime.map(metric => ({
                            time: formatTimestamp(metric.timestamp),
                            value: metric.value
                          }))}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d880" />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border rounded-md p-2 text-xs shadow-md">
                                    <p>{payload[0].payload.time}</p>
                                    <p className="font-bold">{payload[0].value}ms</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Métricas de Base de Datos por Servicio</CardTitle>
                <CardDescription>
                  Estado de conexión a bases de datos individuales para cada microservicio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={`db-${service.id}`} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Database className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{service.name} DB</span>
                      </div>
                      <div className="space-x-4 flex items-center">
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-1">Conexiones:</span>
                          <span>{Math.round(10 + Math.random() * 40)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-1">Consultas/s:</span>
                          <span>{Math.round(5 + Math.random() * 95)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-1">Latencia:</span>
                          <span>{Math.round(5 + Math.random() * 30)}ms</span>
                        </div>
                        <Badge variant={service.status === 'healthy' ? 'success' : 'outline'}>
                          {service.status === 'healthy' ? 'Conectado' : 'Problemas'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comunicación entre Servicios</CardTitle>
                <CardDescription>
                  Latencia y tasa de éxito en las comunicaciones inter-servicios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="pb-2">Origen / Destino</th>
                        {serviceConfig.map(service => (
                          <th key={`header-${service.id}`} className="pb-2">{service.name.replace(' Service', '')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {serviceConfig.slice(0, -1).map((source) => (
                        <tr key={`row-${source.id}`} className="border-b">
                          <td className="py-2 font-medium">{source.name.replace(' Service', '')}</td>
                          {serviceConfig.map((target) => {
                            if (source.id === target.id) {
                              return <td key={`cell-${source.id}-${target.id}`} className="py-2 text-center">-</td>;
                            }
                            
                            const sourceMetric = services.find(s => s.id === source.id);
                            const targetMetric = services.find(s => s.id === target.id);
                            
                            const bothActive = sourceMetric?.status !== 'down' && targetMetric?.status !== 'down';
                            const sourceResponseTime = sourceMetric?.responseTime || 0;
                            const targetResponseTime = targetMetric?.responseTime || 0;
                            
                            const latency = bothActive 
                              ? Math.round((sourceResponseTime + targetResponseTime) * 0.3) 
                              : 0;
                              
                            const success = bothActive
                              ? Math.round(98 - (sourceMetric?.errorRate || 0) * 0.5 - (targetMetric?.errorRate || 0) * 0.5)
                              : 0;
                              
                            const isHealthy = success > 97;
                            
                            return (
                              <td key={`cell-${source.id}-${target.id}`} className="py-2">
                                {bothActive ? (
                                  <div className="flex items-center space-x-1">
                                    <span className={isHealthy ? 'text-green-500' : 'text-amber-500'}>•</span>
                                    <span>{latency}ms</span>
                                    <span className="text-muted-foreground">({success}%)</span>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground">N/A</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Latencia de API Gateway</CardTitle>
                <CardDescription>
                  Tiempo de respuesta desde el API Gateway a cada servicio
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={Array.from({ length: 24 }).map((_, i) => {
                      const hour = new Date();
                      hour.setHours(hour.getHours() - 23 + i);
                      
                      const authService = services.find(s => s.id === 'auth');
                      const projectsService = services.find(s => s.id === 'projects');
                      const formsService = services.find(s => s.id === 'forms');
                      const tasksService = services.find(s => s.id === 'tasks');
                      const notificationsService = services.find(s => s.id === 'notifications');
                      
                      return {
                        name: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        auth: Math.round((authService?.responseTime || 50) * (0.7 + Math.random() * 0.6)),
                        projects: Math.round((projectsService?.responseTime || 60) * (0.7 + Math.random() * 0.6)),
                        forms: Math.round((formsService?.responseTime || 70) * (0.7 + Math.random() * 0.6)),
                        tasks: Math.round((tasksService?.responseTime || 55) * (0.7 + Math.random() * 0.6)),
                        notifications: Math.round((notificationsService?.responseTime || 45) * (0.7 + Math.random() * 0.6)),
                      };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="ms" />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-md p-2 shadow-md">
                              <p className="font-medium text-xs">{label}</p>
                              <div className="space-y-1 pt-2">
                                {payload.map((entry, index) => (
                                  <div key={`item-${index}`} className="flex items-center">
                                    <div 
                                      className="w-3 h-3 mr-2 rounded-full" 
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-xs capitalize">{entry.name}: </span>
                                    <span className="text-xs font-medium ml-1">{entry.value}ms</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="auth" stackId="1" stroke="#8884d8" fill="#8884d880" />
                    <Area type="monotone" dataKey="projects" stackId="2" stroke="#ffc658" fill="#ffc65880" />
                    <Area type="monotone" dataKey="forms" stackId="3" stroke="#ff8042" fill="#ff804280" />
                    <Area type="monotone" dataKey="tasks" stackId="4" stroke="#0088fe" fill="#0088fe80" />
                    <Area type="monotone" dataKey="notifications" stackId="5" stroke="#82ca9d" fill="#82ca9d80" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
