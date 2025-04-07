import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnvironmentBadge } from '@/components/environment/EnvironmentBadge';
import { isDevelopment, Tables } from '@/config/environment';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  UserMinus, 
  UserX, 
  KeyRound,
  RefreshCw,
  Crown,
  UserCog,
  Search
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
  DialogTitle,
  DialogTrigger,
  DialogClose
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
import { Project } from '@/types/supabase';
import { logger } from '@/lib/logger';

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .max(72, { message: "La contraseña no puede exceder 72 caracteres" })
});

const Admin = () => {
  const { isGlobalAdmin } = useAuth();
  const { 
    promoteToGlobalAdmin, 
    isLoading: operationLoading,
    removeUserFromProject
  } = useAdminOperations();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [removeUserData, setRemoveUserData] = useState<any>(null);

  const resetPasswordForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    if (!isGlobalAdmin) {
      logger.error("Access Denied: Admin page requires global admin privileges.");
      return;
    }

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const { data, error } = await supabase
          .from(Tables.profiles)
          .select(`
            id,
            email,
            name,
            role,
            project_users: ${Tables.project_users}(project_id, is_admin, projects: ${Tables.projects}(id, name))
          `);
          
        if (error) throw error;
        
        setUsers(data || []);
        setFilteredUsers(data || []);
      } catch (error: any) {
        logger.error("Error fetching users:", error);
      } finally {
        setUsersLoading(false);
      }
    };
    
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const { data, error } = await supabase.from(Tables.projects).select('*');
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (error: any) {
        logger.error("Error fetching projects:", error);
      } finally {
        setProjectsLoading(false);
      }
    };
    
    fetchUsers();
    fetchProjects();
  }, [isGlobalAdmin]);
  
  useEffect(() => {
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(lowerCaseSearch) || 
        user.email?.toLowerCase().includes(lowerCaseSearch)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);
  
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
      // NOTA: setUserPassword no está disponible desde useAdminOperations ni definido localmente.
      // Comentado para evitar error de linter. Se necesita implementar esta función.
      // await setUserPassword(selectedUserId, data.password);
      logger.warn('setUserPassword function is not available, password reset skipped.'); // Añadir advertencia
      setResetPasswordDialogOpen(false);
      toast({ title: "Funcionalidad incompleta", description: "La función para resetear contraseña no está implementada.", variant: "destructive"});
      // toast({ title: "Contraseña actualizada", description: "La contraseña del usuario ha sido cambiada." });
    } catch (error) {
      logger.error("Error in password reset:", error);
      toast({ title: "Error", description: "No se pudo completar la acción.", variant: "destructive" });
      // toast({ title: "Error", description: "No se pudo resetear la contraseña.", variant: "destructive" });
    }
  };

  const getRoleBadge = (user: any) => {
    if (user.role === 'global_admin') {
      return <Badge className="bg-purple-700 text-white hover:bg-purple-800"><Crown className="h-3 w-3 mr-1"/>Admin Global</Badge>;
    }
    const isProjectAdminAny = user.project_users?.some((pu: any) => pu.is_admin);
    if (isProjectAdminAny) {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700"><UserCog className="h-3 w-3 mr-1"/>Admin Proyecto</Badge>;
    }
    return <Badge variant="secondary"><UserCog className="h-3 w-3 mr-1"/>Usuario</Badge>;
  };

  const renderUserProjects = (user: any) => {
    if (!user.project_users || user.project_users.length === 0) {
      return <span className="text-gray-500 italic">Sin proyectos</span>;
    }

    return (
      <div className="space-y-1 max-w-md">
        {user.project_users.map((pu: any) => (
          <div key={`${pu.project_id}-${pu.is_admin}`} className="flex items-center justify-between bg-gray-50 p-1.5 rounded text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{pu.projects?.name || 'Unknown Project'}</span>
              {pu.is_admin && 
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Admin</Badge>
              }
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 text-gray-600 hover:text-red-600 hover:bg-red-50"
              disabled={operationLoading}
              onClick={() => handleRemoveFromProjectClick(user, pu.projects)}
            >
              {pu.is_admin ? <UserX className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const handleRemoveFromProject = async () => {
    if (!removeUserData) return;
    try {
      const { error } = await supabaseAdmin
        .from(Tables.project_users)
        .delete()
        .match({ user_id: removeUserData.userId, project_id: removeUserData.projectId });

      if (error) throw error;

      toast({ title: "Usuario removido", description: `${removeUserData.userName} ha sido removido de ${removeUserData.projectName}` });
      setRemoveUserDialogOpen(false);
      setRemoveUserData(null);
    } catch (error: any) {
      logger.error("Error removing user from project:", error);
      toast({ title: "Error", description: "No se pudo remover al usuario del proyecto.", variant: "destructive" });
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      await promoteToGlobalAdmin(userId);
    } catch (error) { /* handled in hook */ }
  };

  if (!isGlobalAdmin && !usersLoading) {
    return (
      <PageContainer>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p>Necesitas ser Administrador Global para acceder a esta página.</p>
        </div>
      </PageContainer>
    );
  }
  
  if (usersLoading || projectsLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-dynamo-600" />
          <p className="ml-2">Cargando datos de administración...</p>
        </div>
      </PageContainer>
    );
  }
  
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
              <div className="mb-4">
                <Label htmlFor="search-users">Buscar Usuarios</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="search-users"
                    type="search" 
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                  />
                </div>
              </div>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(user => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{user.name || "Sin nombre"}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user)}</TableCell>
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
                                    onClick={() => handlePromote(user.id)}
                                    disabled={operationLoading}
                                    className="flex items-center gap-1"
                                  >
                                    <Crown className="h-4 w-4" />
                                    <span>Promover a Admin</span>
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => handlePasswordResetClick(user.id, user.email)}
                                  disabled={operationLoading}
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
                  disabled={operationLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={operationLoading}
                  className="flex items-center gap-2"
                >
                  {operationLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
            <AlertDialogCancel disabled={operationLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromProject}
              disabled={operationLoading}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
            >
              {operationLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default Admin;
