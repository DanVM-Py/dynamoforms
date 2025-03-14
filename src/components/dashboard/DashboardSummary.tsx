
import { 
  FileText, 
  CheckSquare, 
  Bell, 
  Clock, 
  Users 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, description, icon, trend }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="bg-dynamo-50 text-dynamo-600 p-2 rounded-full">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className={`flex items-center text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </CardContent>
  </Card>
);

export const DashboardSummary = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de control</h1>
        <p className="text-gray-500 mt-1">Bienvenido, aquí tienes un resumen de tu actividad reciente.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Formularios activos"
          value="8"
          description="2 formularios creados esta semana"
          icon={<FileText className="h-4 w-4" />}
          trend={{ value: "14%", isPositive: true }}
        />
        <StatCard
          title="Tareas pendientes"
          value="12"
          description="5 requieren tu atención"
          icon={<CheckSquare className="h-4 w-4" />}
          trend={{ value: "5%", isPositive: false }}
        />
        <StatCard
          title="Notificaciones"
          value="24"
          description="8 sin leer"
          icon={<Bell className="h-4 w-4" />}
        />
        <StatCard
          title="Tiempo promedio"
          value="2.5h"
          description="Resolución de tareas"
          icon={<Clock className="h-4 w-4" />}
          trend={{ value: "10%", isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Últimas acciones en la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="bg-dynamo-50 p-2 rounded-full">
                    <Users className="h-4 w-4 text-dynamo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Formulario de vacaciones aprobado</p>
                    <p className="text-xs text-muted-foreground">Hace {i} hora{i > 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Próximas tareas</CardTitle>
            <CardDescription>Tareas que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="bg-dynamo-50 p-2 rounded-full">
                    <CheckSquare className="h-4 w-4 text-dynamo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Revisión de solicitud #{i}</p>
                    <p className="text-xs text-muted-foreground">Vence en {i*2} día{i > 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
