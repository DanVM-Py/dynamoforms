import { useState, useEffect, useCallback } from "react";
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
import { Tables } from "@/config/environment";
import { Role, UserRole } from "@/types/database-entities";
import { logger } from '@/lib/logger';

const ProjectRoles = () => {
  const { projectId: projectIdFromUrl } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, currentProjectId, isGlobalAdmin, isProjectAdmin } = useAuth();
  
  logger.info(`[ProjectRoles] Initializing. currentProjectId from context: ${currentProjectId}, projectId from URL: ${projectIdFromUrl}`);
  
  if (currentProjectId !== projectIdFromUrl && projectIdFromUrl) {
      logger.warn(`[ProjectRoles] Mismatch between context project ID (${currentProjectId}) and URL project ID (${projectIdFromUrl}). Prioritizing context ID.`);
  }
  
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
  
  const fetchProject = useCallback(async (id: string) => {
     try {
       logger.debug(`[ProjectRoles] Fetching project info for ID: ${id}`);
       const { data, error } = await supabase
         .from(Tables.projects)
         .select('id, name')
         .eq('id', id)
         .single();
       if (error) throw error;
       setProject(data);
     } catch (error) {
       logger.error(`[ProjectRoles] Error fetching project info for ID: ${id}`, error);
       toast({ title: "Error", description: "No se pudo cargar la información del proyecto.", variant: "destructive" });
       setProject(null);
     }
   }, [toast]);

  const fetchRoles = useCallback(async (id: string) => {
     try {
       logger.debug(`[ProjectRoles] Fetching roles for project ID: ${id}`);
       const { data, error } = await supabase
         .from(Tables.roles)
         .select('*')
         .eq('project_id', id)
         .order('name', { ascending: true });
       if (error) throw error;
        logger.debug(`[ProjectRoles] Found ${data?.length ?? 0} roles for project ID: ${id}`);
       setRoles(data || []);
     } catch (error) {
       logger.error(`[ProjectRoles] Error fetching roles for project ID: ${id}`, error);
       toast({ title: "Error", description: "No se pudieron cargar los roles del proyecto.", variant: "destructive"});
       setRoles([]);
     }
  }, [toast]);

  const fetchUserRoles = useCallback(async (id: string) => {
    try {
      logger.debug(`[ProjectRoles] Fetching user roles for project ID: ${id}`);
      const { data: userRolesData, error: userRolesError } = await supabase
        .from(Tables.user_roles)
        .select('*')
        .eq('project_id', id);
        
      if (userRolesError) throw userRolesError;
      
      if (!userRolesData || userRolesData.length === 0) {
        setUserRoles([]);
        logger.debug(`[ProjectRoles] No user roles found for project ID: ${id}`);
        return;
      }
      
      // Fetch related data efficiently
      const userIds = [...new Set(userRolesData.map(ur => ur.user_id))]; // Unique IDs
      const roleIds = [...new Set(userRolesData.map(ur => ur.role_id))]; // Unique IDs

      const [profilesResult, rolesResult, projectUsersResult] = await Promise.all([
        supabase.from(Tables.profiles).select('id, name, email').in('id', userIds),
        supabase.from(Tables.roles).select('id, name').in('id', roleIds),
        supabase.from(Tables.project_users).select('user_id, is_admin').eq('project_id', id).in('user_id', userIds)
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (projectUsersResult.error) throw projectUsersResult.error;

      const profilesData = profilesResult.data;
      const rolesData = rolesResult.data;
      const projectUsersData = projectUsersResult.data;

      // Transform data carefully
      const transformedData = userRolesData.map(userRole => {
        const profile = profilesData?.find(p => p.id === userRole.user_id);
        const role = rolesData?.find(r => r.id === userRole.role_id);
        const projectUser = projectUsersData?.find(pu => pu.user_id === userRole.user_id);
        
        // Log if essential linked data is missing
        if (!profile) logger.warn(`[ProjectRoles] Profile not found for user_id ${userRole.user_id} in user_role ${userRole.id}`);
        if (!role) logger.warn(`[ProjectRoles] Role not found for role_id ${userRole.role_id} in user_role ${userRole.id}`);
        
        return {
          ...userRole,
          user_name: profile?.name || `Usuario ID: ${userRole.user_id.substring(0, 8)}...`, // Provide fallback
          user_email: profile?.email || 'Correo no disponible',
          role_name: role?.name || `Rol ID: ${userRole.role_id.substring(0, 8)}...`, // Provide fallback
          is_project_admin: projectUser?.is_admin || false
        };
      }).filter(ur => ur.role_name && !ur.role_name.startsWith('Rol ID:')); // Filter out entries where the role itself couldn't be found
      
      logger.debug(`[ProjectRoles] Transformed ${transformedData.length} valid user roles for project ID: ${id}`);
      setUserRoles(transformedData as UserRole[]);

    } catch (error) {
      logger.error(`[ProjectRoles] Error fetching user roles complex data for project ID: ${id}`, error);
      toast({ title: "Error", description: "No se pudieron cargar las asignaciones de roles.", variant: "destructive" });
      setUserRoles([]);
    }
  }, [toast]);

  const fetchUsers = useCallback(async (id: string) => {
     try {
       logger.debug(`[ProjectRoles] Fetching users associated with project ID: ${id}`);
       // Get user IDs from project_users table first
       const { data: projectUsers, error: projectUsersError } = await supabase
         .from(Tables.project_users)
         .select('user_id')
         .eq('project_id', id);
         
       if (projectUsersError) throw projectUsersError;
       
       if (!projectUsers || projectUsers.length === 0) {
         setUsers([]);
         logger.debug(`[ProjectRoles] No users found associated with project ID: ${id}`);
         return;
       }
       
       const userIds = projectUsers.map(pu => pu.user_id);
       
       // Then fetch profiles for those user IDs
       const { data: profilesData, error: profilesError } = await supabase
         .from(Tables.profiles)
         .select('id, name, email')
         .in('id', userIds)
         .order('name', { ascending: true });
         
       if (profilesError) throw profilesError;
       
       logger.debug(`[ProjectRoles] Found ${profilesData?.length ?? 0} user profiles for project ID: ${id}`);
       setUsers(profilesData || []);
     } catch (error) {
       logger.error(`[ProjectRoles] Error fetching users for project ID: ${id}`, error);
       toast({ title: "Error", description: "No se pudieron cargar los usuarios del proyecto.", variant: "destructive"});
       setUsers([]);
     }
  }, [toast]);
  
  useEffect(() => {
    const loadPageData = async (id: string) => {
      setLoading(true);
      logger.info(`[ProjectRoles] loadPageData triggered for project ID: ${id}`);
      // Reset states before loading new data to avoid showing stale data briefly
      setProject(null);
      setRoles([]);
      setUserRoles([]);
      setUsers([]);
      setNewRoleName("");
      setSelectedUser("");
      setSelectedRole("");
      
      try {
        await Promise.all([
          fetchProject(id),
          fetchRoles(id),
          fetchUserRoles(id),
          fetchUsers(id)
        ]);
         logger.info(`[ProjectRoles] Successfully finished loading data via Promise.all for project ID: ${id}`);
      } catch (error) {
        // Individual fetches handle their own errors/toasts, this catches Promise.all rejection
        logger.error(`[ProjectRoles] Error during Promise.all execution for project ID: ${id}`, error);
      } finally {
        setLoading(false);
         logger.info(`[ProjectRoles] Set loading to false for project ID: ${id}`);
      }
    };

    // Trigger loading only when currentProjectId is valid
    if (currentProjectId) {
      loadPageData(currentProjectId);
    } else {
      // Handle the case where no project is selected
      logger.warn("[ProjectRoles] No currentProjectId available. Clearing data and stopping load.");
      setLoading(false);
      setProject(null);
      setRoles([]);
      setUserRoles([]);
      setUsers([]);
      // Optional: Consider navigating away if a project context is always expected here
      // navigate("/projects"); 
    }
    // Dependency array relies on currentProjectId and the stable fetch function references
  }, [currentProjectId, fetchProject, fetchRoles, fetchUserRoles, fetchUsers]); 
  
  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !currentProjectId) {
      toast({
        title: "Error",
        description: !currentProjectId
          ? "No hay un proyecto activo seleccionado."
          : "Por favor ingresa un nombre para el rol.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare the data object that will be inserted
    const roleToInsert = {
      name: newRoleName.trim(),
      project_id: currentProjectId, // Use currentProjectId
      created_by: user?.id || '' // Ensure user context is available if needed
    };

    // Log the data object right before the insert attempt
    logger.info(`[ProjectRoles] Attempting to insert role. Data: ${JSON.stringify(roleToInsert)}`); 
    
    try {
      setSubmitting(true);
      // Pass the prepared object to the insert method
      const { data, error } = await supabase
        .from(Tables.roles)
        .insert(roleToInsert) 
        .select()
        .single();
        
      if (error) {
         logger.error(`[ProjectRoles] Error creating role in project ${currentProjectId}`, error);
         // Log the specific Supabase error object
         logger.debug(`[ProjectRoles] Supabase error details:`, error); 
         if (error.code === '23505') { // Unique constraint violation
           toast({ title: "Error", description: "Ya existe un rol con ese nombre en este proyecto.", variant: "destructive" });
         } else if (error.code === '42501') { // Explicit check for RLS violation
            toast({ title: "Error de Permiso", description: "No tienes permiso para crear un rol en este proyecto (RLS).", variant: "destructive" });
         } else {
           toast({ title: "Error", description: "No se pudo crear el rol. Error del servidor.", variant: "destructive" });
         }
         return; // Stop execution on error
      }
      
      logger.info(`[ProjectRoles] Role created successfully (ID: ${data.id}). Fetching updated roles list for project: ${currentProjectId}.`);
      fetchRoles(currentProjectId); // Re-fetch roles for the current project
      setNewRoleName(""); // Clear input field
      
      toast({
        title: "Rol creado",
        description: `El rol "${data.name}" ha sido creado exitosamente.`,
      });
    } catch (error) {
      // Catch any unexpected errors not handled by Supabase error object check
      logger.error('[ProjectRoles] Unexpected error during handleCreateRole:', error);
      // Also log the error object here for unexpected issues
      logger.debug('[ProjectRoles] Unexpected error details:', error); 
      toast({ title: "Error", description: "Ocurrió un error inesperado al crear el rol.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole || !currentProjectId) {
      toast({
        title: "Error",
        description: !currentProjectId
          ? "No hay un proyecto activo seleccionado."
          : "Por favor selecciona un usuario y un rol.",
        variant: "destructive",
      });
      return;
    }
    
    logger.info(`[ProjectRoles] Attempting to assign role ${selectedRole} to user ${selectedUser} in project: ${currentProjectId}`);
    
    try {
      setSubmitting(true); // Use submitting state for assignment too
      const { data, error } = await supabase
        .from(Tables.user_roles)
        .insert({
          user_id: selectedUser,
          role_id: selectedRole,
          project_id: currentProjectId // Use currentProjectId
        })
        .select()
        .single();
        
       if (error) {
         logger.error(`[ProjectRoles] Error assigning role in project ${currentProjectId}`, error);
         if (error.code === '23505') { // Unique constraint violation
           toast({ title: "Error", description: "Este usuario ya tiene asignado este rol en este proyecto.", variant: "destructive" });
         } else {
           toast({ title: "Error", description: "No se pudo asignar el rol al usuario.", variant: "destructive" });
         }
         return; // Stop execution on error
       }
      
      logger.info(`[ProjectRoles] Role assigned successfully (ID: ${data.id}). Fetching updated user roles list for project: ${currentProjectId}.`);
      fetchUserRoles(currentProjectId); // Re-fetch user roles for the current project
      
      // Reset selection
      setSelectedUser("");
      setSelectedRole("");
      
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado al usuario exitosamente.",
      });
    } catch (error) {
       logger.error('[ProjectRoles] Unexpected error during handleAssignRole:', error);
       toast({ title: "Error", description: "Ocurrió un error inesperado al asignar el rol.", variant: "destructive" });
    } finally {
       setSubmitting(false); // Ensure submitting is always reset
    }
  };

  const handleDeleteRole = async (roleId: string) => {
      if (!currentProjectId) {
           logger.error("[ProjectRoles] Cannot delete role without active project context.");
           toast({title: "Error", description: "No hay un proyecto activo.", variant: "destructive"});
           return;
       }
     logger.warn(`[ProjectRoles] Attempting to delete role ID: ${roleId} from project ${currentProjectId}`);
     try {

       const { error } = await supabase.from(Tables.roles).delete().eq('id', roleId);
       if (error) throw error;
       
       logger.info(`[ProjectRoles] Role ID ${roleId} deleted. Fetching updated roles list for project: ${currentProjectId}.`);
       toast({ title: "Rol eliminado", description: "El rol ha sido eliminado exitosamente." });
       fetchRoles(currentProjectId); // Re-fetch roles

     } catch (error) {
        logger.error(`[ProjectRoles] Error deleting role ID: ${roleId} from project ${currentProjectId}`, error);
        // Check for foreign key violation if delete fails because it's in use
        if (error.code === '23503') { 
             toast({ title: "Error", description: "No se puede eliminar el rol porque está asignado a uno o más usuarios.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: "No se pudo eliminar el rol.", variant: "destructive" });
        }
     } finally {
       setDeleteRoleId(null); // Close the dialog
     }
   };

   const handleRemoveUserRole = async (userRoleId: string) => {
       if (!currentProjectId) {
            logger.error("[ProjectRoles] Cannot remove user role without active project context.");
            toast({title: "Error", description: "No hay un proyecto activo.", variant: "destructive"});
            return;
       }
      logger.warn(`[ProjectRoles] Attempting to remove user_role assignment ID: ${userRoleId} from project ${currentProjectId}`);
     try {
       const { error } = await supabase.from(Tables.user_roles).delete().eq('id', userRoleId);
       if (error) throw error;
       
       logger.info(`[ProjectRoles] User role ID ${userRoleId} removed. Fetching updated user roles list for project: ${currentProjectId}.`);
       toast({ title: "Rol removido", description: "El rol ha sido removido del usuario exitosamente." });
       fetchUserRoles(currentProjectId); // Re-fetch user roles

     } catch (error) {
        logger.error(`[ProjectRoles] Error removing user_role ID: ${userRoleId} from project ${currentProjectId}`, error);
       toast({ title: "Error", description: "No se pudo remover el rol del usuario.", variant: "destructive" });
     } finally {
       setDeleteUserRoleId(null); // Close the dialog
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
                    disabled={submitting}
                  />
                </div>
                <Button 
                  onClick={handleCreateRole} 
                  className="flex-shrink-0 bg-dynamo-600 hover:bg-dynamo-700"
                  disabled={submitting || !newRoleName.trim() || !currentProjectId}
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
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-dynamo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                  </div>
                  <p className="mt-2 text-gray-600">Cargando roles...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="rounded-full bg-gray-100 p-3 w-12 h-12 inline-flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p>No hay roles creados para este proyecto.</p>
                  <p className="text-sm mt-2">
                    Usa el formulario anterior para crear el primer rol.
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
                            {deleteRoleId === role.id && (
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta acción eliminará el rol "{role.name}". 
                                    Si el rol está asignado a usuarios, no se podrá eliminar.
                                    Esta acción no se puede deshacer directamente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeleteRoleId(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => handleDeleteRole(role.id)}
                                    >
                                    Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                             )}
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
                Selecciona un usuario del proyecto y un rol existente para asignarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 items-end">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="user">Usuario</Label>
                   <Select 
                     value={selectedUser} 
                     onValueChange={setSelectedUser}
                     disabled={users.length === 0 || submitting}
                   >
                    <SelectTrigger id="user">
                      <SelectValue placeholder={users.length === 0 ? "No hay usuarios en este proyecto" : "Seleccionar usuario"} />
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
                  <Select 
                    value={selectedRole} 
                    onValueChange={setSelectedRole}
                    disabled={roles.length === 0 || submitting}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder={roles.length === 0 ? "No hay roles creados" : "Seleccionar rol"} />
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
                  className="flex-shrink-0 bg-dynamo-600 hover:bg-dynamo-700"
                  disabled={!selectedUser || !selectedRole || !currentProjectId || submitting}
                >
                   {submitting ? (
                     <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                   ) : (
                     <UserPlus className="h-4 w-4 mr-2" />
                   )}
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
              {loading ? (
                 <div className="text-center py-8">
                   <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-dynamo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                     <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                   </div>
                   <p className="mt-2 text-gray-600">Cargando asignaciones de roles...</p>
                 </div>
              ) : userRoles.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   <div className="rounded-full bg-gray-100 p-3 w-12 h-12 inline-flex items-center justify-center mb-4">
                     <AlertCircle className="h-6 w-6 text-gray-400" />
                   </div>
                   <p>No hay usuarios con roles asignados en este proyecto.</p>
                   <p className="text-sm mt-2">
                     Usa el formulario anterior para asignar roles a los usuarios del proyecto.
                   </p>
                 </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Admin Proyecto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{userRole.user_name}</div>
                            {userRole.user_email !== 'Correo no disponible' && (
                                <div className="text-sm text-gray-500">{userRole.user_email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{userRole.role_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userRole.is_project_admin ? "default" : "outline"}>
                            {userRole.is_project_admin ? "Sí" : "No"}
                          </Badge>
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
                            {deleteUserRoleId === userRole.id && (
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Remover rol?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta acción removerá el rol "{userRole.role_name}" del usuario {userRole.user_name}. 
                                    El usuario podría perder acceso a ciertos formularios. Esta acción no se puede deshacer directamente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeleteUserRoleId(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => handleRemoveUserRole(userRole.id)}
                                    >
                                    Remover Rol
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            )}
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
