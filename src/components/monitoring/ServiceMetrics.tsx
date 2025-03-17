
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { RefreshCw, AlertCircle, CheckCircle, Activity, Database, Server, Network } from 'lucide-react';
import { SERVICES } from '@/integrations/supabase/client';
import { environment } from '@/config/environment';
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';

// Tipos para los datos de métricas
interface ServiceMetric {
  timestamp: number;
  value: number;
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
    responseTime: ServiceMetric[];
    errorRate: ServiceMetric[];
    requestCount: ServiceMetric[];
  };
}

// Servicios a monitorear
const serviceConfig = [
  { 
    id: SERVICES.AUTH, 
    name: 'Auth Service',
    endpoint: '/api/auth/health'
  },
  { 
    id: SERVICES.PROJECTS, 
    name: 'Projects Service',
    endpoint: '/api/projects/health'
  },
  { 
    id: SERVICES.FORMS, 
    name: 'Forms Service',
    endpoint: '/api/forms/health'
  },
  { 
    id: SERVICES.TASKS, 
    name: 'Tasks Service',
    endpoint: '/api/tasks/health'
  },
  { 
    id: SERVICES.NOTIFICATIONS, 
    name: 'Notifications Service',
    endpoint: '/api/notifications/health'
  },
  {
    id: 'gateway',
    name: 'API Gateway',
    endpoint: '/api/health'
  }
];

// Función para generar datos simulados (en producción, esto vendría de una API real)
const generateMockMetrics = (): ServiceHealth[] => {
  return serviceConfig.map(service => {
    // Generar datos históricos para gráficos (últimas 24 horas)
    const responseTimeData: ServiceMetric[] = [];
    const errorRateData: ServiceMetric[] = [];
    const requestCountData: ServiceMetric[] = [];
    
    // Datos para las últimas 24 horas, en intervalos de 1 hora
    const now = Date.now();
    for (let i = 0; i < 24; i++) {
      const timestamp = now - (i * 60 * 60 * 1000);
      
      // Valores aleatorios realistas para cada métrica
      responseTimeData.unshift({
        timestamp,
        value: Math.round(50 + Math.random() * 150) // 50-200ms
      });
      
      errorRateData.unshift({
        timestamp,
        value: Math.min(5, Math.max(0, Math.random() * 3)) // 0-3%
      });
      
      requestCountData.unshift({
        timestamp,
        value: Math.round(100 + Math.random() * 400) // 100-500 requests
      });
    }

    // Valores actuales
    const responseTime = responseTimeData[responseTimeData.length - 1].value;
    const errorRate = errorRateData[errorRateData.length - 1].value;
    const requestCount = requestCountData[requestCountData.length - 1].value;
    
    // Determinar estado basado en valores actuales
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (errorRate > 3 || responseTime > 200) {
      status = 'degraded';
    }
    if (errorRate > 8 || responseTime > 500) {
      status = 'down';
    }
    
    return {
      id: service.id,
      name: service.name,
      status,
      responseTime,
      errorRate,
      requestCount,
      cpuUsage: Math.round(10 + Math.random() * 40), // 10-50%
      memoryUsage: Math.round(20 + Math.random() * 50), // 20-70%
      lastChecked: new Date(),
      metrics: {
        responseTime: responseTimeData,
        errorRate: errorRateData,
        requestCount: requestCountData
      }
    };
  });
};

// En el futuro, esto se conectaría a endpoints reales
const fetchServiceMetrics = async (): Promise<ServiceHealth[]> => {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // En un entorno real, se haría una solicitud HTTP a cada servicio
  // para obtener sus métricas. Por ahora, generamos datos simulados.
  return generateMockMetrics();
};

// Componente principal de métricas de servicio
export function ServiceMetrics() {
  const { data: services = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['serviceMetrics'],
    queryFn: fetchServiceMetrics,
    refetchInterval: 30000, // Actualizar cada 30 segundos
    staleTime: 15000
  });

  const handleRefresh = () => {
    refetch();
  };

  // Función para obtener color basado en estado
  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-amber-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Función para obtener icono basado en estado
  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'down': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  // Función para formatear fecha
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Función para formatear timestamp para gráficos
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calcular estadísticas generales
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const healthPercentage = services.length ? Math.round((healthyCount / services.length) * 100) : 0;

  // Preparar datos para gráficos de resumen
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
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
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
            {/* Resumen de estado del sistema */}
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
                  <div className="text-xs text-muted-foreground mt-1">
                    Últimos 5 minutos
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
                  <div className="text-xs text-muted-foreground mt-1">
                    Últimos 5 minutos
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráficos de métricas */}
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
                        <div className="text-xs text-muted-foreground">Tiempo de respuesta</div>
                        <div className="font-medium">{service.responseTime}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tasa de error</div>
                        <div className="font-medium">{service.errorRate}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CPU</div>
                        <div className="font-medium">{service.cpuUsage}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Memoria</div>
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
                  {/* Matriz de comunicación entre servicios */}
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
                            // No mostrar comunicación consigo mismo
                            if (source.id === target.id) {
                              return <td key={`cell-${source.id}-${target.id}`} className="py-2 text-center">-</td>;
                            }
                            
                            // Valores simulados de latencia y éxito
                            const latency = Math.round(20 + Math.random() * 60);
                            const success = Math.round(95 + Math.random() * 5);
                            const isHealthy = success > 97;
                            
                            return (
                              <td key={`cell-${source.id}-${target.id}`} className="py-2">
                                <div className="flex items-center space-x-1">
                                  <span className={isHealthy ? 'text-green-500' : 'text-amber-500'}>•</span>
                                  <span>{latency}ms</span>
                                  <span className="text-muted-foreground">({success}%)</span>
                                </div>
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
                      
                      return {
                        name: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        auth: Math.round(30 + Math.random() * 50),
                        projects: Math.round(35 + Math.random() * 60),
                        forms: Math.round(40 + Math.random() * 70),
                        tasks: Math.round(35 + Math.random() * 55),
                        notifications: Math.round(25 + Math.random() * 45),
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
                    <Area type="monotone" dataKey="projects" stackId="2" stroke="#82ca9d" fill="#82ca9d80" />
                    <Area type="monotone" dataKey="forms" stackId="3" stroke="#ffc658" fill="#ffc65880" />
                    <Area type="monotone" dataKey="tasks" stackId="4" stroke="#ff8042" fill="#ff804280" />
                    <Area type="monotone" dataKey="notifications" stackId="5" stroke="#0088fe" fill="#0088fe80" />
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
