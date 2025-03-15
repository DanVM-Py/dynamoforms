
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, FileText, LogIn, Plus, User, Users } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, userProfile, isGlobalAdmin } = useAuth();

  if (!user) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-md mx-auto">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Bienvenido al Sistema de Gestión</CardTitle>
              <CardDescription className="text-center">
                Inicia sesión para acceder a todas las funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Este sistema te permite gestionar formularios, tareas y notificaciones.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-3 border rounded-lg">
                  <FileText className="h-6 w-6 text-dynamo-600 mb-2" />
                  <span className="text-sm font-medium">Formularios</span>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-lg">
                  <Users className="h-6 w-6 text-dynamo-600 mb-2" />
                  <span className="text-sm font-medium">Colaboradores</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-dynamo-600 hover:bg-dynamo-700"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-4 w-4 mr-2" /> Iniciar Sesión
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <p className="text-gray-500 mt-1">
            Bienvenido, {userProfile?.name || user.email}
          </p>
        </div>

        <DashboardSummary />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Formularios</CardTitle>
              <CardDescription>Gestiona tus formularios</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Crea y administra formularios personalizados para tu organización.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate("/forms")} className="w-full">
                Ver Formularios
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tareas</CardTitle>
              <CardDescription>Seguimiento de tareas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualiza y gestiona las tareas asignadas y su estado actual.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate("/tasks")} className="w-full">
                Ver Tareas
              </Button>
            </CardFooter>
          </Card>

          {isGlobalAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Administración</CardTitle>
                <CardDescription>Panel de Administración</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gestiona usuarios, proyectos y permisos del sistema.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => navigate("/admin")} 
                  className="w-full bg-dynamo-600 hover:bg-dynamo-700"
                >
                  <Building2 className="h-4 w-4 mr-2" /> Administración
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer" onClick={() => navigate("/forms")}>
            <div className="p-3 bg-dynamo-50 rounded-full mb-3">
              <Plus className="h-6 w-6 text-dynamo-600" />
            </div>
            <p className="text-lg font-medium text-dynamo-600">Crear formulario</p>
            <p className="text-sm text-gray-500 text-center mt-2">
              Diseña formularios personalizados<br />para tu organización
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
