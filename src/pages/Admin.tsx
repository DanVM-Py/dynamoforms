import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { isDevelopment } from '@/config/environment';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  UserMinus, 
  UserX, 
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdminOperations } from '@/hooks/use-admin-operations';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .max(72, { message: "La contraseña no puede exceder 72 caracteres" })
});

const Admin = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [removeUserData, setRemoveUserData] = useState<{userId: string, projectId: string, userName: string, projectName: string} | null>(null);
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();
  const { isLoading: actionLoading, promoteToGlobalAdmin, removeUserFromProject, setUserPassword } = useAdminOperations();
  
  const resetPasswordForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
          
        if (profilesError) {
          throw profilesError;
        }
        
        const { data: projectUsers, error: projectUsersError } = await supabase
          .from('project_users')
          .select('*, projects(name)');
          
        if (projectUsersError) {
          throw projectUsersError;
        }
        
        const projectAdmins = projectUsers.filter((pu: any) => pu.is_admin === true);
        
        const enrichedUsers = profiles.map((profile: any) => {
          const userProjects = projectUsers.filter((pu: any) => pu.user_id === profile.id && !pu.is_admin)
            .map((pu: any) => ({
              id: pu.project_id,
              name: pu.projects?.name || 'Unknown Project',
              role: 'user',
              relationId: pu.id
            }));
            
          const adminProjects = projectUsers.filter((pu: any) => pu.user_id === profile.id && pu.is_admin === true)
            .map((pu: any) => ({
              id: pu.project_id,
              name: pu.projects?.name || 'Unknown Project',
              role: 'project_admin',
              relationId: pu.id
            }));
          
          const allProjects = [...userProjects, ...adminProjects];
          
          return {
            ...profile,
            projectCount: allProjects.length,
            isProjectAdmin: adminProjects.length > 0,
            projects: allProjects
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
  
  const handlePasswordResetClick = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    resetPasswordForm.reset({ password: "" });
    setResetPasswordDialogOpen(true);
  };
  
  const handleRemoveFromProjectClick = (user: any, project: any) => {
    setRemoveUserData({
      userId: user.id,
      projectId: project.id,
      userName: user.name || user.email,
      projectName: project.name
    });
    setRemoveUserDialogOpen(true);
  };

  const handlePasswordReset = async (data: z.infer<typeof passwordResetSchema>) => {
    try {
      await setUserPassword(selectedUserId, data.password);
      setResetPasswordDialogOpen(false);
    } catch (error) {
      console.error("Error in password reset:", error);
    }
  };

  const getRoleBadge = (role: string, isProjectAdmin: boolean) => {
    if (role === 'global_admin') {
      return <Badge className="bg-purple-700">Administrador Global</Badge>;
    } else if (isProjectAdmin) {
      return <Badge className="bg-blue-600">Administrador de Proyecto</Badge>;
    } else if (role === 'approver') {
      return <Badge className="bg-green-600">Aprobador</Badge>;
    } else {
      return <Badge className="bg-gray-500">Usuario</Badge>;
    }
  };

  const renderUserProjects = (user: any) => {
    if (!user.projects || user.projects.length === 0) {
      return <span className="text-gray-500 italic">Sin proyectos</span>;
    }

    return (
      <div className="space-y-1 max-w-md">
        {user.projects.map((project: any) => (
          <div key={`${project.id}-${project.role}`} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{project.name}</span>
              {project.role === 'project_admin' && 
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Admin</Badge>
              }
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 text-gray-600 hover:text-red-600 hover:bg-red-50"
              disabled={actionLoading}
              onClick={() => handleRemoveFromProjectClick(user, project)}
            >
              {project.role === 'project_admin' ? <UserX className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </div>
    );
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
                Administrar usuarios de la plataforma, sus roles y permisos
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
                        <TableHead className="w-[250px]">Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="w-[300px]">Proyectos</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map(user => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{user.name || "Sin nombre"}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role, user.isProjectAdmin)}</TableCell>
                            <TableCell>
                              {projectsLoading ? (
                                <span className="text-gray-400">Cargando...</span>
                              ) : (
                                renderUserProjects(user)
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                {user.role !== 'global_admin' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => promoteToGlobalAdmin(user.id)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1"
                                  >
                                    <Shield className="h-4 w-4" />
                                    <span>Promover a Admin</span>
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => handlePasswordResetClick(user.id, user.email)}
                                  disabled={actionLoading}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  <span>Cambiar Contraseña</span>
                                </Button>
                              </div>
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

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña de usuario</DialogTitle>
            <DialogDescription>
              Ingresa una nueva contraseña para el usuario {selectedUserEmail}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Ingresa la nueva contraseña" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setResetPasswordDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cambiar contraseña
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeUserDialogOpen} onOpenChange={setRemoveUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar desvinculación?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeUserData && (
                <>
                  Estás a punto de desvincular a <strong>{removeUserData.userName}</strong> del proyecto <strong>{removeUserData.projectName}</strong>.
                  <br /><br />
                  Esta acción no puede deshacerse y el usuario perderá acceso a los recursos del proyecto.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeUserData) {
                  removeUserFromProject(
                    removeUserData.userId,
                    removeUserData.projectId
                  );
                }
              }}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default Admin;
