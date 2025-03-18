
import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeploymentDiagnostic } from '@/components/environment/DeploymentDiagnostic';
import { BuildInfoDisplay } from '@/components/environment/BuildInfoDisplay';
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { environment, getEnvironmentName } from '@/config/environment';

const Admin = () => {
  return (
    <PageContainer title="Administración del Sistema">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Panel de Administración
          <EnvironmentBadge />
        </h2>
      </div>

      <Tabs defaultValue="deployment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deployment">Despliegue</TabsTrigger>
          <TabsTrigger value="build-info">Información de Build</TabsTrigger>
          <TabsTrigger value="database">Base de Datos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deployment" className="space-y-4">
          <DeploymentDiagnostic />
        </TabsContent>
        
        <TabsContent value="build-info" className="space-y-4">
          <BuildInfoDisplay />
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Base de Datos</CardTitle>
              <CardDescription>
                Estadísticas y operaciones de la base de datos de {getEnvironmentName()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Herramientas de base de datos en construcción</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Administración de Usuarios</CardTitle>
              <CardDescription>
                Gestionar usuarios de la plataforma en {getEnvironmentName()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Herramientas de administración de usuarios en construcción</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Admin;
