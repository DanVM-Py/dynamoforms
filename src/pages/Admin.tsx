
import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnvironmentIndicator } from '@/components/environment/EnvironmentIndicator';
import { MicroserviceStatus } from '@/components/environment/MicroserviceStatus';
import { BuildVerification } from '@/components/environment/BuildVerification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { environment } from '@/config/environment';

const Admin = () => {
  return (
    <PageContainer
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
        <p className="text-muted-foreground">
          Panel de administración y configuración del sistema
        </p>
      </div>
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="environment">Entorno</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Panel de Administración</CardTitle>
              <CardDescription>
                Resumen del estado del sistema y configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Bienvenido al panel de administración. Utilice las pestañas para navegar
                entre las diferentes secciones.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Entorno Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{environment.toUpperCase()}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Estado de Servicios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-500">Operativo</p>
                  </CardContent>
                </Card>
              </div>
              
              <BuildVerification />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Entorno</CardTitle>
                <CardDescription>
                  Información sobre el entorno actual y estado de los servicios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BuildVerification />
                <MicroserviceStatus />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Administración de Usuarios</CardTitle>
              <CardDescription>
                Gestión de usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>La administración de usuarios se implementará próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Administración de Roles</CardTitle>
              <CardDescription>
                Gestión de roles y permisos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>La administración de roles se implementará próximamente...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EnvironmentIndicator />
    </PageContainer>
  );
};

export default Admin;
