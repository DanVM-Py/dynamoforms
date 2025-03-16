
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
import { ProjectUser, Role } from "@/types/supabase";
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
import { 
  ArrowLeft, 
  Plus, 
  UserPlus, 
  Users, 
  AlertCircle, 
  Mail,
  CheckCircle2,
  XCircle,
  Ban,
  ClockIcon,
  Loader2
} from "lucide-react";
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
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the form schema for inviting users
const inviteUserSchema = z.object({
  email: z.string().email({ message: "Debe ingresar un correo electrónico válido" }),
  role: z.string().optional(),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;

// Status badge component to display user status
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Activo
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
          <ClockIcon className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-700 border-gray-200">
          <Ban className="h-3 w-3" />
          Inactivo
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rechazado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">{status}</Badge>
      );
  }
};

const ProjectUsers = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isGlobalAdmin, isProjectAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<{id: string, name: string} | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  // Initialize form using react-hook-form
  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  });
  
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchProjectUsers();
      fetchRoles();
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
  
  const fetchProjectUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          *,
          profiles!user_id(name, email),
          projects!project_id(name)
        `)
        .eq('project_id', projectId)
        .order('invited_at', { ascending: false });
        
      if (error) throw error;
      
      const transformedData = data.map(item => ({
        ...item,
        user_name: item.profiles?.name,
        user_email: item.profiles?.email,
        project_name: item.projects?.name
      })) as ProjectUser[];
      
      setProjectUsers(transformedData);
    } catch (error) {
      console.error('Error fetching project users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios del proyecto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      setRoles(data || [] as Role[]);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };
  
  const onSubmitInviteUser = async (values: InviteUserForm) => {
    if (!projectId || !user?.id) return;
    
    try {
      setSubmitting(true);
      
      // 1. First check if user exists in our system
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', values.email)
        .maybeSingle();
        
      if (userError) throw userError;
      
      if (!existingUser) {
        toast({
          title: "Usuario no encontrado",
          description: "El usuario con este correo no está registrado en el sistema.",
          variant: "destructive",
        });
        return;
      }
      
      // 2. Check if user is already in another project
      const { data: existingProjectUser, error: projectUserError } = await supabase
        .from('project_users')
        .select('id, project_id, status')
        .eq('user_id', existingUser.id)
        .maybeSingle();
        
      if (projectUserError) throw projectUserError;
      
      if (existingProjectUser && existingProjectUser.project_id !== projectId) {
        toast({
          title: "Usuario ya asignado",
          description: "Este usuario ya está asignado a otro proyecto.",
          variant: "destructive",
        });
        return;
      }
      
      if (existingProjectUser && existingProjectUser.project_id === projectId) {
        toast({
          title: "Usuario ya invitado",
          description: "Este usuario ya ha sido invitado a este proyecto.",
          variant: "destructive",
        });
        return;
      }
      
      // 3. Add user to project
      const { data: newProjectUser, error: createError } = await supabase
        .from('project_users')
        .insert({
          project_id: projectId,
          user_id: existingUser.id,
          status: 'pending',
          invited_by: user.id
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // 4. If a role was selected, assign it to the user
      if (values.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: existingUser.id,
            role_id: values.role,
            project_id: projectId,
            assigned_by: user.id
          });
          
        if (roleError) throw roleError;
      }
      
      // 5. Create a notification for the user (could be expanded to send an email)
      await supabase
        .from('notifications')
        .insert({
          user_id: existingUser.id,
          title: 'Invitación a Proyecto',
          message: `Has sido invitado al proyecto "${project?.name}".`,
          type: 'email',
          project_id: projectId
        });
      
      // 6. Refresh the user list
      fetchProjectUsers();
      
      toast({
        title: "Usuario invitado",
        description: `Se ha enviado una invitación a ${values.email}.`,
      });
      
      // Reset form and close dialog
      form.reset();
      setInviteUserOpen(false);
      
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "No se pudo invitar al usuario. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleChangeUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('project_users')
        .update({ 
          status: newStatus,
          ...(newStatus === 'active' ? { activated_at: new Date().toISOString() } : {})
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      fetchProjectUsers();
      
      toast({
        title: "Estado actualizado",
        description: "El estado del usuario ha sido actualizado.",
      });
    } catch (error) {
      console.error('Error changing user status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario.",
        variant: "destructive",
      });
    }
  };
  
  const handleRemoveUser = async (userId: string) => {
    try {
      // Get the user's ID
      const userToRemove = projectUsers.find(pu => pu.id === userId);
      if (!userToRemove) return;
      
      // Delete any role assignments first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToRemove.user_id)
        .eq('project_id', projectId);
        
      if (roleError) throw roleError;
      
      // Then delete the project user
      const { error } = await supabase
        .from('project_users')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
      
      // Create a notification for the user
      await supabase
        .from('notifications')
        .insert({
          user_id: userToRemove.user_id,
          title: 'Eliminado del Proyecto',
          message: `Has sido eliminado del proyecto "${project?.name}".`,
          type: 'email',
          project_id: projectId
        });
      
      fetchProjectUsers();
      
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado del proyecto.",
      });
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al usuario del proyecto.",
        variant: "destructive",
      });
    } finally {
      setDeleteUserId(null);
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
          {project ? `Usuarios del proyecto: ${project.name}` : 'Usuarios del proyecto'}
        </h1>
      </div>
      
      <div className="flex justify-between mb-6">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/projects/${projectId}/roles`)}
          >
            <Users className="h-4 w-4 mr-2" />
            Gestionar Roles
          </Button>
        </div>
        
        <Dialog open={inviteUserOpen} onOpenChange={setInviteUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-dynamo-600 hover:bg-dynamo-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar usuario al proyecto</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInviteUser)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="usuario@ejemplo.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        El usuario debe estar registrado en el sistema.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {roles.length > 0 && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol (opcional)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Puedes asignar un rol al usuario directamente o hacerlo más tarde.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Invitando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Invitar Usuario
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del proyecto</CardTitle>
          <CardDescription>
            Aquí puedes ver y gestionar los usuarios asignados a este proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-dynamo-600" />
              <p>Cargando usuarios...</p>
            </div>
          ) : projectUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="rounded-full bg-gray-100 p-3 w-12 h-12 inline-flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p>No hay usuarios asignados a este proyecto.</p>
              <p className="text-sm mt-2">
                Para empezar, invita a usuarios haciendo clic en el botón "Invitar Usuario".
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de invitación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectUsers.map((projectUser) => (
                  <TableRow key={projectUser.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{projectUser.user_name}</div>
                        <div className="text-sm text-gray-500">{projectUser.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={projectUser.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(projectUser.invited_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {projectUser.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => handleChangeUserStatus(projectUser.id, 'active')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Activar
                          </Button>
                        )}
                        {projectUser.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                            onClick={() => handleChangeUserStatus(projectUser.id, 'inactive')}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Desactivar
                          </Button>
                        )}
                        {projectUser.status === 'inactive' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => handleChangeUserStatus(projectUser.id, 'active')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Reactivar
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteUserId(projectUser.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará a {projectUser.user_name} ({projectUser.user_email}) del proyecto.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleRemoveUser(projectUser.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Opciones futuras de integración</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gray-50 opacity-70">
            <CardHeader>
              <CardTitle className="text-lg">Importar usuarios desde CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Próximamente: Importa múltiples usuarios al proyecto desde un archivo CSV.
              </p>
              <Button className="mt-4" variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Importar desde CSV
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50 opacity-70">
            <CardHeader>
              <CardTitle className="text-lg">Conectar con Active Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Próximamente: Conecta con Microsoft Active Directory para sincronizar usuarios.
              </p>
              <Button className="mt-4" variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Configurar conexión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProjectUsers;
