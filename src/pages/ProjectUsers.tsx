
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileSpreadsheet, UsersRound, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  email: z
    .string()
    .email("Por favor ingresa una dirección de correo válida")
    .min(1, "El correo es requerido"),
  roleId: z.string().optional(),
});

type ProjectUserStatus = "active" | "pending" | "inactive" | "rejected";

type ProjectUser = {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectUserStatus;
  invited_at: string;
  invited_by: string;
  activated_at: string | null;
  email?: string;
  full_name?: string;
  role_name?: string;
};

const ProjectUsers = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isGlobalAdmin, isProjectAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectUserStatus | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      roleId: undefined,
    },
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["projectRoles", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  const { data: projectUsers, isLoading } = useQuery({
    queryKey: ["projectUsers", projectId, roleFilter, statusFilter],
    queryFn: async () => {
      try {
        if (!user) return [];
        
        let query = supabase
          .from("project_users")
          .select("*")
          .eq("project_id", projectId);

        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data: projectUsersData, error: projectUsersError } = await query;
        
        if (projectUsersError) {
          console.error("Error fetching project users:", projectUsersError);
          return [];
        }
        
        if (!projectUsersData) return [];

        const enrichedUsers = await Promise.all(
          projectUsersData.map(async (pu) => {
            try {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("email, name")
                .eq("id", pu.user_id)
                .maybeSingle();

              let roleName = undefined;
              if (roleFilter) {
                const { data: userRoleData } = await supabase
                  .from("user_roles")
                  .select("roles(name)")
                  .eq("user_id", pu.user_id)
                  .eq("role_id", roleFilter)
                  .eq("project_id", projectId)
                  .maybeSingle();

                if (!userRoleData) return null;
                
                roleName = userRoleData.roles?.name;
              } else {
                const { data: userRoleData } = await supabase
                  .from("user_roles")
                  .select("roles(name)")
                  .eq("user_id", pu.user_id)
                  .eq("project_id", projectId);

                if (userRoleData && userRoleData.length > 0 && userRoleData[0].roles) {
                  roleName = userRoleData[0].roles.name;
                }
              }

              return {
                ...pu,
                email: profileData?.email || "Unknown email",
                full_name: profileData?.name || "Unknown name",
                role_name: roleName,
              } as ProjectUser;
            } catch (profileError) {
              console.error("Error enriching user data:", profileError);
              return {
                ...pu,
                email: "Error loading email",
                full_name: "Error loading name",
                role_name: undefined,
              } as ProjectUser;
            }
          })
        );

        return enrichedUsers.filter(Boolean) as ProjectUser[];
      } catch (error) {
        console.error("Error in projectUsers query:", error);
        return [];
      }
    },
  });

  // Simplified invitation mutation that only invites registered users
  const inviteUserMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      try {
        console.log("Inviting user with email:", values.email);
        
        if (!user?.id) {
          throw new Error("Debes iniciar sesión para invitar usuarios");
        }
        
        if (!projectId) {
          throw new Error("ID del proyecto es requerido");
        }
        
        // Check if user exists in the system
        const { data: existingUserProfile, error: userProfileError } = await supabase
          .from("profiles")
          .select("id, email")
          .ilike("email", values.email);
          
        if (userProfileError) {
          console.error("Error checking if user profile exists:", userProfileError);
          throw new Error(`Error al verificar si el perfil de usuario existe: ${userProfileError.message}`);
        }
        
        // If user doesn't exist, return a clear error
        if (!existingUserProfile || existingUserProfile.length === 0) {
          throw new Error(`El usuario con correo ${values.email} no está registrado en el sistema. Solo se pueden invitar usuarios registrados.`);
        }
        
        const userId = existingUserProfile[0].id;
        
        // Check if user is already in the project
        const { data: existingProjectUser, error: projectUserError } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", userId)
          .eq("project_id", projectId);

        if (projectUserError) {
          console.error("Error checking project user existence:", projectUserError);
          throw new Error(`Error al comprobar si el usuario ya está en el proyecto: ${projectUserError.message}`);
        }

        if (existingProjectUser && existingProjectUser.length > 0) {
          throw new Error(`El usuario ${existingUserProfile[0].email} ya está asignado a este proyecto`);
        }

        // Add user to project
        const { error: insertError } = await supabase
          .from("project_users")
          .insert({
            project_id: projectId,
            user_id: userId,
            status: "pending",
            invited_by: user.id
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          if (insertError.code === "23505") {
            throw new Error(`El usuario ${values.email} ya está asignado a este proyecto`);
          }
          throw new Error(`Error al añadir usuario al proyecto: ${insertError.message}`);
        }

        // Assign role if provided
        if (values.roleId) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: userId,
              role_id: values.roleId,
              project_id: projectId,
              assigned_by: user.id
            });

          if (roleError) {
            console.error("Error assigning role:", roleError);
            // Don't fail the whole operation if role assignment fails
            toast({
              title: "Advertencia",
              description: `Usuario añadido pero hubo un error al asignar el rol: ${roleError.message}`,
              variant: "destructive",
            });
          }
        }

        return { success: true, email: values.email };
      } catch (error: any) {
        console.error("Error in inviteUserMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Usuario invitado con éxito",
        description: `${data.email} ha sido invitado al proyecto.`,
      });
      form.reset();
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error: any) => {
      console.error("Full invitation error:", error);
      toast({
        title: "Error al invitar usuario",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: ProjectUserStatus }) => {
      const { error } = await supabase
        .from("project_users")
        .update({ 
          status,
          ...(status === "active" ? { activated_at: new Date().toISOString() } : {})
        })
        .eq("user_id", userId)
        .eq("project_id", projectId);

      if (error) throw error;
      return { userId, status };
    },
    onSuccess: () => {
      toast({
        title: "Estado del usuario actualizado",
        description: "El estado del usuario ha sido actualizado con éxito.",
      });
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar el estado del usuario",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    inviteUserMutation.mutate(values);
  };

  const renderStatusBadge = (status: ProjectUserStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Activo</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "inactive":
        return <Badge>Inactivo</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios del Proyecto</h1>
          <p className="text-muted-foreground">
            Administrar usuarios para el proyecto: {project?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/roles`)}>
            Administrar Roles
          </Button>
          <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Invitar Usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar a un Usuario</DialogTitle>
                <DialogDescription>
                  Ingresa el correo electrónico del usuario que deseas invitar a este proyecto.
                </DialogDescription>
              </DialogHeader>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Solo puedes invitar usuarios que ya estén registrados en el sistema.
                </AlertDescription>
              </Alert>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input placeholder="Dirección de correo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {roles && roles.length > 0 && (
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol (Opcional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar un rol" />
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setInviteModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={inviteUserMutation.isPending}
                    >
                      {inviteUserMutation.isPending ? "Invitando..." : "Invitar Usuario"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Separator className="my-6" />

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">
            <UsersRound className="mr-2 h-4 w-4" /> 
            Lista de Usuarios
          </TabsTrigger>
          <TabsTrigger value="bulk" disabled>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> 
            Importación Masiva (Próximamente)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Proyecto</CardTitle>
              <CardDescription>
                Administra todos los usuarios asignados a este proyecto.
              </CardDescription>
              <div className="flex flex-wrap gap-4 mt-4">
                <div>
                  <Select
                    onValueChange={(value) => setRoleFilter(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Roles</SelectItem>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    onValueChange={(value: string) => 
                      setStatusFilter(value === "all" ? null : value as ProjectUserStatus)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Estados</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Cargando usuarios...</div>
              ) : projectUsers && projectUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectUsers.map((projectUser) => (
                      <TableRow key={projectUser.id}>
                        <TableCell>{projectUser.full_name || "—"}</TableCell>
                        <TableCell>{projectUser.email}</TableCell>
                        <TableCell>{projectUser.role_name || "—"}</TableCell>
                        <TableCell>
                          {renderStatusBadge(projectUser.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {projectUser.status === "pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => 
                                    updateUserStatusMutation.mutate({
                                      userId: projectUser.user_id,
                                      status: "active"
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Activar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => 
                                    updateUserStatusMutation.mutate({
                                      userId: projectUser.user_id,
                                      status: "rejected"
                                    })
                                  }
                                >
                                  <AlertCircle className="mr-1 h-4 w-4" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                            {projectUser.status === "active" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                onClick={() => 
                                  updateUserStatusMutation.mutate({
                                    userId: projectUser.user_id,
                                    status: "inactive"
                                  })
                                }
                              >
                                Desactivar
                              </Button>
                            )}
                            {(projectUser.status === "inactive" || projectUser.status === "rejected") && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                onClick={() => 
                                  updateUserStatusMutation.mutate({
                                    userId: projectUser.user_id,
                                    status: "active"
                                  })
                                }
                              >
                                Activar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No se encontraron usuarios</h3>
                  <p className="text-muted-foreground mb-4">
                    Aún no hay usuarios en este proyecto.
                  </p>
                  <Button onClick={() => setInviteModalOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Invitar a un Usuario
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Importación Masiva</CardTitle>
              <CardDescription>
                Importa múltiples usuarios a la vez usando un archivo CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Importación masiva próximamente</h3>
                <p className="text-muted-foreground mb-4">
                  Esta funcionalidad te permitirá importar múltiples usuarios desde un archivo CSV o sincronizar con Active Directory.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ProjectUsers;
