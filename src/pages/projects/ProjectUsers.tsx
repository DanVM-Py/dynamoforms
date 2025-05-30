import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, FileSpreadsheet, UsersRound, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { UserFilters } from "@/components/project/project-users/UserFilters";
import { EmptyUsersList } from "@/components/project/project-users/EmptyUsersList";
import { InviteUserForm, InviteFormValues } from "@/components/project/project-users/InviteUserForm";
import { UsersList } from "@/components/project/project-users/UsersList";
import { Tables } from "@/config/environment";
import { ProjectUser } from "@/types/database-entities";
const ProjectUsers = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isGlobalAdmin, isProjectAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(Tables.projects)
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
        .from(Tables.roles)
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  const { data: projectUsers, isLoading } = useQuery({
    queryKey: ["projectUsers", projectId, roleFilter],
    queryFn: async () => {
      try {
        if (!user) return [];
        
        const query = supabase
          .from(Tables.project_users)
          .select("*")
          .eq("project_id", projectId);

        const { data: projectUsersData, error: projectUsersError } = await query;
        
        if (projectUsersError) {
          logger.error("Error fetching project users:", projectUsersError);
          return [];
        }
        
        if (!projectUsersData) return [];

        const enrichedUsers = await Promise.all(
          projectUsersData.map(async (pu) => {
            try {
              const { data: profileData } = await supabase
                .from(Tables.profiles)
                .select("email, name")
                .eq("id", pu.user_id)
                .maybeSingle();

              let roleName = undefined;
              if (roleFilter) {
                const { data: userRoleData } = await supabase
                  .from(Tables.user_roles)
                  .select("roles(name)")
                  .eq("user_id", pu.user_id)
                  .eq("role_id", roleFilter)
                  .eq("project_id", projectId)
                  .maybeSingle();

                if (!userRoleData) return null;
                
                roleName = userRoleData.roles?.name;
              } else {
                const { data: userRoleData } = await supabase
                  .from(Tables.user_roles)
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
                role_name: roleName
              };
            } catch (profileError) {
              logger.error("Error enriching user data:", profileError);
              return {
                ...pu,
                email: "Error loading email",
                full_name: "Error loading name",
                role_name: undefined
              };
            }
          })
        );

        return enrichedUsers.filter(Boolean) as ProjectUser[];
      } catch (error) {
        logger.error("Error in projectUsers query:", error);
        return [];
      }
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (values: InviteFormValues) => {
      try {
        logger.info("Inviting user with email:", values.email);
        
        if (!user?.id) {
          throw new Error("Debes iniciar sesión para invitar usuarios");
        }
        
        if (!projectId) {
          throw new Error("ID del proyecto es requerido");
        }
        
        // 1. Verificar si el usuario existe en profiles
        const { data: existingUserProfile, error: userProfileError } = await supabase
          .from(Tables.profiles)
          .select("id, email")
          .ilike("email", values.email)
          .maybeSingle();
          
        if (userProfileError) {
          logger.error("[InviteUser] Error al verificar perfil:", { error: userProfileError, email: values.email });
          throw new Error("Ha ocurrido un error al verificar el perfil de usuario");
        }
        
        if (!existingUserProfile) {
          logger.info("[InviteUser] Usuario no encontrado:", { email: values.email });
          throw new Error(`No se encontró ningún usuario registrado con el correo ${values.email}`);
        }
        
        // 2. Verificar si ya está en project_users
        const { data: existingProjectUser, error: projectUserError } = await supabase
          .from(Tables.project_users)
          .select("*")
          .eq("user_id", existingUserProfile.id)
          .eq("project_id", projectId)
          .maybeSingle();

        if (projectUserError) {
          logger.error("Error checking project user existence:", projectUserError);
          throw new Error(`Error al comprobar si el usuario ya está en el proyecto: ${projectUserError.message}`);
        }

        if (existingProjectUser) {
          throw new Error(`El usuario ${existingUserProfile.email} ya está asignado a este proyecto`);
        }

        // 3. Si pasa las validaciones, crear el registro
        const { error: insertError } = await supabase
          .from(Tables.project_users)
          .insert({
            project_id: projectId,
            user_id: existingUserProfile.id,
            is_admin: values.isAdmin || false,
            invited_at: new Date().toISOString()
          });

        if (insertError) {
          logger.error("[InviteUser] Error al insertar:", { 
            error: insertError, 
            projectId, 
            userId: existingUserProfile.id 
          });

          // Manejar errores específicos
          switch (insertError.code) {
            case '23505': // Unique violation
              throw new Error(`El usuario ${existingUserProfile.email} ya está registrado en este proyecto`);
            case '23503': // Foreign key violation
              if (insertError.message.includes('project_id_fkey')) {
                logger.error("[InviteUser] Proyecto no encontrado:", { projectId });
                throw new Error("El proyecto al que intentas invitar no existe");
              }
              if (insertError.message.includes('user_id_fkey')) {
                logger.error("[InviteUser] Usuario no encontrado:", { userId: existingUserProfile.id });
                throw new Error("El usuario al que intentas invitar ya no existe");
              }
              throw new Error("Error de referencia en la base de datos");
            default:
              throw new Error(`Error al añadir usuario al proyecto: ${insertError.message}`);
          }
        }

        if (values.roleId) {
          const { error: roleError } = await supabase
            .from(Tables.user_roles)
            .insert({
              user_id: existingUserProfile.id,
              role_id: values.roleId,
              project_id: projectId,
            });

          if (roleError) {
            logger.error("Error assigning role:", roleError);
            toast({
              title: "Advertencia",
              description: `Usuario añadido pero hubo un error al asignar el rol: ${roleError.message}`,
              variant: "destructive",
            });
          }
        }

        return { success: true, email: values.email };
      } catch (error: unknown) {
        logger.error("Error in inviteUserMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Usuario invitado con éxito",
        description: `${data.email} ha sido invitado al proyecto.`,
      });
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error: unknown) => {
      logger.error("Full invitation error:", error);
      toast({
        title: "Error al invitar usuario",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const toggleAdminStatusMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase
        .from(Tables.project_users)
        .update({ 
          is_admin: isAdmin
        })
        .eq("user_id", userId)
        .eq("project_id", projectId);

      if (error) throw error;
      return { userId, isAdmin };
    },
    onSuccess: (data) => {
      toast({
        title: data.isAdmin ? "Administrador asignado" : "Administrador removido",
        description: data.isAdmin 
          ? "El usuario ha sido promovido a administrador del proyecto"
          : "El usuario ya no es administrador del proyecto",
      });
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al actualizar el rol de administrador",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    },
  });

  const handleInviteUser = (values: InviteFormValues) => {
    inviteUserMutation.mutate(values);
  };

  const handleAdminToggle = (userId: string, isAdmin: boolean) => {
    toggleAdminStatusMutation.mutate({ userId, isAdmin });
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
              <InviteUserForm
                roles={roles} 
                isLoading={inviteUserMutation.isPending}
                onSubmit={handleInviteUser}
                onCancel={() => setInviteModalOpen(false)}
              />
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
              <UserFilters 
                roles={roles} 
                onRoleChange={setRoleFilter}
              />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Cargando usuarios...</div>
              ) : projectUsers && projectUsers.length > 0 ? (
                <UsersList 
                  users={projectUsers} 
                  onAdminToggle={handleAdminToggle} 
                />
              ) : (
                <EmptyUsersList onInviteClick={() => setInviteModalOpen(true)} />
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
