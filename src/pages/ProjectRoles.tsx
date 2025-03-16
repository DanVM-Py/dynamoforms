import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Role, UserRole } from "@/types/supabase";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogClose 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus, PenLine, Trash2, UserPlus, Users, AlertCircle } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ProjectRoles = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isGlobalAdmin, isProjectAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<{id: string, name: string} | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleteUserRoleId, setDeleteUserRoleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchRoles();
      fetchUserRoles();
      fetchUsers();
    } else {
      console.error("No project ID found in URL");
      toast({
        title: "Error",
        description: "No se pudo encontrar el ID del proyecto.",
        variant: "destructive",
      });
      navigate("/projects");
    }
  }, [projectId]);
  
  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      
      setProject(data);
      
      if (data?.id) {
        sessionStorage.setItem('currentProjectId', data.id);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del proyecto.",
        variant: "destructive",
      });
    }
  };
  
  const fetchRoles = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      setRoles(data || [] as Role[]);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los roles del proyecto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles!user_id(name, email),
          roles!role_id(name)
        `)
        .eq('project_id', projectId);
        
      if (error) throw error;
      
      const transformedData = data.map(item => ({
        ...item,
        user_name: item.profiles?.name,
        user_email: item.profiles?.email,
        role_name: item.roles?.name
      })) as UserRole[];
      
      setUserRoles(transformedData);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !projectId) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el rol.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: newRoleName.trim(),
          project_id: projectId,
          created_by: user?.id || ''
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating role:', error);
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Error",
            description: "Ya existe un rol con ese nombre en este proyecto.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "No se pudo crear el rol. Error del servidor.",
            variant: "destructive",
          });
        }
        return;
      }
      
      setRoles([...roles, data]);
      setNewRoleName("");
      
      toast({
        title: "Rol creado",
        description: `El rol "${data.name}" ha sido creado exitosamente.`,
      });
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el rol. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
        
      if (error) throw error;
      
      setRoles(roles.filter(role => role.id !== roleId));
      
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente.",
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el rol. Puede que tenga usuarios asignados.",
        variant: "destructive",
      });
    } finally {
      setDeleteRoleId(null);
    }
  };
  
  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole || !projectId) {
      toast({
        title: "Error",
        description: "Por favor selecciona un usuario y un rol.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role_id: selectedRole,
          project_id: projectId,
          created_by: user?.id || ''
        })
        .select()
        .single();
        
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Error",
            description: "Este usuario ya tiene asignado este rol.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      fetchUserRoles();
      
      setSelectedUser("");
      setSelectedRole("");
      
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado al usuario exitosamente.",
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el rol al usuario.",
        variant: "destructive",
      });
    }
  };
  
  const handleRemoveUserRole = async (userRoleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);
        
      if (error) throw error;
      
      setUserRoles(userRoles.filter(ur => ur.id !== userRoleId));
      
      toast({
        title: "Rol removido",
        description: "El rol ha sido removido del usuario exitosamente.",
      });
    } catch (error) {
      console.error('Error removing user role:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el rol del usuario.",
        variant: "destructive",
      });
    } finally {
      setDeleteUserRoleId(null);
    }
  };
  
  return (
    <PageContainer>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-2"
          onClick={() => navigate(`/projects`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Proyectos
        </Button>
        <h1 className="text-2xl font-bold">
          {project ? `Roles del proyecto: ${project.name}` : 'Roles del proyecto'}
        </h1>
      </div>
      
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="flex items-center">
            <PenLine className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Usuarios y Roles
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear nuevo rol</CardTitle>
              <CardDescription>
                Los roles permiten definir qué formularios puede ver y completar cada usuario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="roleName">Nombre del rol</Label>
                  <Input
                    id="roleName"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ej: Supervisor, Operador, Cliente"
                  />
                </div>
                <Button 
                  onClick={handleCreateRole} 
                  className="flex-shrink-0 bg-dynamo-600 hover:bg-dynamo-700"
                  disabled={submitting || !newRoleName.trim()}
                >
                  {submitting ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crear Rol
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Roles existentes</CardTitle>
              <CardDescription>
                Aquí puedes ver todos los roles creados para este proyecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">Cargando roles...</div>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="rounded-full bg-gray-100 p-3 w-12 h-12 inline-flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p>No hay roles creados para este proyecto.</p>
                  <p className="text-sm mt-2">
                    Crea roles para poder asignarlos a los usuarios y restringir el acceso a los formularios.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteRoleId(role.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará el rol "{role.name}" y todas sus asignaciones a usuarios.
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => handleDeleteRole(role.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignar roles a usuarios</CardTitle>
              <CardDescription>
                Selecciona un usuario y un rol para asignarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="user">Usuario</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="user">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleAssignRole} 
                  className="mt-auto bg-dynamo-600 hover:bg-dynamo-700"
                  disabled={!selectedUser || !selectedRole}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar Rol
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Usuarios con roles asignados</CardTitle>
              <CardDescription>
                Aquí puedes ver todos los usuarios con roles asignados en este proyecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userRoles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="rounded-full bg-gray-100 p-3 w-12 h-12 inline-flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p>No hay usuarios con roles asignados en este proyecto.</p>
                  <p className="text-sm mt-2">
                    Asigna roles a los usuarios para controlar su acceso a los formularios.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{userRole.user_name}</div>
                            <div className="text-sm text-gray-500">{userRole.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{userRole.role_name}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteUserRoleId(userRole.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Remover rol?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción removerá el rol "{userRole.role_name}" del usuario {userRole.user_name}.
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => handleRemoveUserRole(userRole.id)}
                                >
                                  Remover Rol
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ProjectRoles;
