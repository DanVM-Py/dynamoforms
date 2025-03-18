
import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { EnvironmentIndicator } from '@/components/environment/EnvironmentIndicator';
import { environment, isProduction } from '@/config/environment';
import { DeploymentDiagnostic } from '@/components/environment/DeploymentDiagnostic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const welcomeMessage = "Bienvenido al Panel de Administración de Dynamo";
  
  return (
    <PageContainer title={welcomeMessage}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">Dynamo</CardTitle>
              <CardDescription>Sistema de Administración</CardDescription>
            </div>
            <EnvironmentBadge />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>Utiliza el menú de navegación para acceder a las diferentes secciones del sistema.</p>
              
              {!isProduction && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Entorno de {environment}</AlertTitle>
                  <AlertDescription>
                    Estás utilizando una versión de {environment} del sistema. 
                    Algunos módulos pueden estar en desarrollo.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Quick links or stats */}
        <Card>
          <CardHeader>
            <CardTitle>Entorno Actual: {environment}</CardTitle>
            <CardDescription>
              Información sobre el entorno y configuración actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-medium">URL: </span>
                {window.location.origin}
              </div>
              <div>
                <span className="font-medium">Entorno: </span>
                {environment}
              </div>
              <div>
                <span className="font-medium">Debug Habilitado: </span>
                {isProduction ? 'No' : 'Sí'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico de Despliegue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Regular dashboard content */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Formularios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Gestión de Formularios</div>
                <p className="text-xs text-muted-foreground">
                  Crea y administra formularios dinámicos.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Tareas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Gestión de Tareas</div>
                <p className="text-xs text-muted-foreground">
                  Administra flujos de trabajo y tareas.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Gestión de Proyectos</div>
                <p className="text-xs text-muted-foreground">
                  Administra proyectos y usuarios.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="diagnostics">
          <DeploymentDiagnostic />
        </TabsContent>
      </Tabs>
      
      <EnvironmentIndicator />
    </PageContainer>
  );
};

export default Index;
