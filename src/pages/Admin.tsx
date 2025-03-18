
import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { isDevelopment } from '@/config/environment';

const Admin = () => {
  return (
    <PageContainer title="Administración del Sistema">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Panel de Administración
          <EnvironmentBadge />
        </h2>
      </div>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList>
          <TabsTrigger value="database">Base de Datos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          {isDevelopment && <TabsTrigger value="debug">Herramientas de Desarrollo</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Base de Datos</CardTitle>
              <CardDescription>
                Estadísticas y operaciones de la base de datos
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
                Gestionar usuarios de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Herramientas de administración de usuarios en construcción</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isDevelopment && (
          <TabsContent value="debug" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Herramientas de Desarrollo</CardTitle>
                <CardDescription>
                  Opciones solo disponibles en ambiente de desarrollo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">Información de Despliegue</h3>
                  <p className="text-sm text-blue-700">
                    El sistema de despliegue ha sido simplificado. Ahora se utiliza el sistema predeterminado de Lovable:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-blue-700">
                    <li>Para desarrollo local, ejecuta la aplicación normalmente</li>
                    <li>Para publicar a producción, utiliza el botón "Publish" de Lovable</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
};

export default Admin;
