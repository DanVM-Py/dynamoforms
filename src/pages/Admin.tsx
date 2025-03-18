
import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { isDevelopment } from '@/config/environment';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Admin = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch profiles with auth data
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
          
        if (profilesError) {
          throw profilesError;
        }
        
        // Get user-project relationships
        const { data: projectUsers, error: projectUsersError } = await supabase
          .from('project_users')
          .select('*');
          
        if (projectUsersError) {
          throw projectUsersError;
        }
        
        // Get project admin assignments
        const { data: projectAdmins, error: projectAdminsError } = await supabase
          .from('project_admins')
          .select('*');
          
        if (projectAdminsError) {
          throw projectAdminsError;
        }
        
        // Combine data
        const enrichedUsers = profiles.map((profile: any) => {
          const userProjects = projectUsers.filter((pu: any) => pu.user_id === profile.id);
          const adminProjects = projectAdmins.filter((pa: any) => pa.user_id === profile.id);
          
          return {
            ...profile,
            projectCount: userProjects.length,
            isProjectAdmin: adminProjects.length > 0,
            projectIds: [...userProjects.map((pu: any) => pu.project_id), ...adminProjects.map((pa: any) => pa.project_id)]
          };
        });
        
        setUsers(enrichedUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const { data, error } = await supabase.from('projects').select('*');
        
        if (error) {
          throw error;
        }
        
        setProjects(data || []);
      } catch (error: any) {
        console.error("Error fetching projects:", error);
      } finally {
        setProjectsLoading(false);
      }
    };
    
    fetchUsers();
    fetchProjects();
  }, []);
  
  const promoteToGlobalAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'global_admin' })
        .eq('id', userId)
        .select();
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: 'global_admin' } : user
      ));
      
      // Refresh the current user's profile if they promoted themselves
      await refreshUserProfile();
      
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido ascendido a Administrador Global",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error promoting user:", error);
      toast({
        title: "Error",
        description: `No se pudo actualizar el usuario: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  const getUserProjectNames = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.projectIds || user.projectIds.length === 0) {
      return "Sin proyectos";
    }
    
    return user.projectIds.map((projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      return project ? project.name : "Proyecto desconocido";
    }).join(", ");
  };
  
  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'global_admin':
        return <Badge className="bg-purple-700">Administrador Global</Badge>;
      case 'project_admin':
        return <Badge className="bg-blue-600">Administrador de Proyecto</Badge>;
      case 'approver':
        return <Badge className="bg-green-600">Aprobador</Badge>;
      default:
        return <Badge className="bg-gray-500">Usuario</Badge>;
    }
  };

  return (
    <PageContainer title="Administración del Sistema">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          Panel de Administración
          <EnvironmentBadge />
        </h2>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuarios Globales</TabsTrigger>
          {isDevelopment && <TabsTrigger value="debug">Herramientas de Desarrollo</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios Globales</CardTitle>
              <CardDescription>
                Administrar usuarios de la plataforma y sus roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
                  <p className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Error al cargar usuarios: {error}</span>
                  </p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[70vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Email</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Proyectos</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map(user => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.email}
                            </TableCell>
                            <TableCell>{user.name || "Sin nombre"}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                              {projectsLoading ? (
                                <span className="text-gray-400">Cargando...</span>
                              ) : (
                                getUserProjectNames(user.id)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {user.role !== 'global_admin' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => promoteToGlobalAdmin(user.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Shield className="h-4 w-4" />
                                  <span>Promover a Admin</span>
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm flex items-center justify-end gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Admin Global</span>
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
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
