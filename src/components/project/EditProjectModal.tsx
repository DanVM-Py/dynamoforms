import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ProjectErrors } from "@/types/custom";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';
import { UserX, UserCheck, PlusCircle, Trash2, Save } from 'lucide-react';

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
}

interface ProjectAdmin {
  user_id: string;
  is_admin: boolean;
  profiles?: UserProfile | null;
}

export interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  onProjectUpdated: () => void;
}

export const EditProjectModal = ({ open, onOpenChange, project, onProjectUpdated }: EditProjectModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [projectAdmins, setProjectAdmins] = useState<ProjectAdmin[]>([]);
  const [loadingProjectAdmins, setLoadingProjectAdmins] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [selectedUserToAddAsAdmin, setSelectedUserToAddAsAdmin] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [processingAdminAction, setProcessingAdminAction] = useState(false);
  const [errors, setErrors] = useState<ProjectErrors>({
    name: "",
    description: "",
    admin: ""
  });

  useEffect(() => {
    if (open && project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setErrors({ name: "", description: "", admin: "" });
      fetchAllUsers();
      fetchProjectAdmins();
      setSelectedUserToAddAsAdmin('');
    }
  }, [open, project]);

  const fetchProjectAdmins = async () => {
    if (!project?.id) return;
    setLoadingProjectAdmins(true);
    try {
      const { data, error } = await supabase
        .from(Tables.project_users)
        .select(`
          user_id,
          is_admin,
          profiles:user_id (id, name, email)
        `)
        .eq('project_id', project.id)
        .eq('is_admin', true);
      
      if (error) throw error;
      
      setProjectAdmins(data || []);
    } catch (error) {
      logger.error(`Error fetching admins for project ${project.id}:`, error);
      toast({
        title: "Error al cargar administradores",
        description: error?.message || "No se pudo cargar la información de los administradores.",
        variant: "destructive",
      });
      setProjectAdmins([]);
    } finally {
      setLoadingProjectAdmins(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      const { data, error } = await supabase
        .from(Tables.profiles)
        .select('id, name, email')
        .not('role', 'eq', 'global_admin');
        
      if (error) throw error;
      
      if (data) {
        setAllUsers(data.map(u => ({ ...u, name: u.name })));
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      logger.error('Error fetching all users:', error);
      toast({
        title: "Error al cargar usuarios",
        description: error?.message || "No se pudo cargar la lista de usuarios.",
        variant: "destructive",
      });
      setAllUsers([]);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const validateProjectDetails = (): boolean => {
    const newErrors: ProjectErrors = { name: "", description: "", admin: "" };
    
    if (!name.trim()) {
      newErrors.name = "El nombre del proyecto es obligatorio";
    }
    
    if (!description?.trim()) {
      newErrors.description = "La descripción del proyecto es obligatoria";
    }
    
    setErrors(newErrors);
    return !newErrors.name && !newErrors.description;
  };

  const handleUpdateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !validateProjectDetails()) return;
    setLoading(true);

    try {
      const projectUpdateData = {
        name,
        description,
      };

      logger.info("Updating project details with data:", projectUpdateData);

      const { error: projectUpdateError } = await supabase
        .from(Tables.projects)
        .update(projectUpdateData)
        .eq('id', project.id);

      if (projectUpdateError) throw projectUpdateError;
      
      await onProjectUpdated();
      
      toast({
        title: "Proyecto actualizado",
        description: "Los detalles del proyecto han sido actualizados exitosamente.",
      });
    } catch (error) {
      logger.error("Error updating project details:", error);
      toast({
        title: "Error al actualizar detalles",
        description: error?.message || "No se pudo actualizar el proyecto. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!project?.id || !selectedUserToAddAsAdmin) {
      toast({ title: "Información", description: "Selecciona un usuario para añadir.", variant: "default" });
      return;
    }
    setProcessingAdminAction(true);
    try {
      const { data: existingMembership, error: fetchError } = await supabase
        .from(Tables.project_users)
        .select('user_id, is_admin')
        .eq('project_id', project.id)
        .eq('user_id', selectedUserToAddAsAdmin)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingMembership) {
        if (existingMembership.is_admin) {
          toast({ title: 'Información', description: 'Este usuario ya es administrador del proyecto.', variant: 'default' });
          setProcessingAdminAction(false);
          return;
        }
        const { error: updateError } = await supabase
          .from(Tables.project_users)
          .update({ is_admin: true })
          .eq('project_id', project.id)
          .eq('user_id', selectedUserToAddAsAdmin);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from(Tables.project_users)
          .insert({
            project_id: project.id,
            user_id: selectedUserToAddAsAdmin,
            is_admin: true,
          });
        if (insertError) throw insertError;
      }
      toast({ title: 'Administrador añadido', description: 'El usuario ahora es administrador del proyecto.' });
      fetchProjectAdmins();
      setSelectedUserToAddAsAdmin('');
    } catch (error) {
      logger.error('Error adding project admin:', error);
      toast({ title: 'Error', description: `No se pudo añadir el administrador: ${error.message}`, variant: 'destructive' });
    } finally {
      setProcessingAdminAction(false);
    }
  };

  const handleRemoveAdmin = async (userIdToRemove: string) => {
    if (!project?.id) return;

    if (projectAdmins.length <= 1) {
      toast({ title: 'Acción no permitida', description: 'Un proyecto debe tener al menos un administrador.', variant: 'destructive'});
      return;
    }
    
    setProcessingAdminAction(true);
    try {
      const { error } = await supabase
        .from(Tables.project_users)
        .update({ is_admin: false })
        .eq('project_id', project.id)
        .eq('user_id', userIdToRemove);
      if (error) throw error;

      toast({ title: 'Administrador removido', description: 'El usuario ya no es administrador del proyecto.' });
      fetchProjectAdmins();
    } catch (error) {
      logger.error('Error removing project admin:', error);
      toast({ title: 'Error', description: `No se pudo remover el administrador: ${error.message}`, variant: 'destructive' });
    } finally {
      setProcessingAdminAction(false);
    }
  };

  const handleClose = () => {
    if (!loading && !processingAdminAction) {
      onOpenChange(false);
    }
  };

  const usersAvailableToAddAsAdmin = allUsers.filter(
    (user) => !projectAdmins.some((admin) => admin.user_id === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Proyecto: {project?.name}</DialogTitle>
          <DialogDescription>
            Actualiza los detalles y gestiona los administradores del proyecto.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdateProjectDetails} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Nombre del Proyecto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa el nombre del proyecto"
              className={errors.name ? "border-red-500" : ""}
              disabled={loading || processingAdminAction}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="project-description"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el propósito del proyecto"
              rows={3}
              className={errors.description ? "border-red-500" : ""}
              disabled={loading || processingAdminAction}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={loading || processingAdminAction}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando Detalles...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Guardar Detalles</>
            )}
          </Button>
        </form>

        <hr className="my-4" />

        <div className="space-y-4 py-2">
          <h3 className="text-lg font-medium">Administradores del Proyecto</h3>
          {loadingProjectAdmins && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando administradores...</div>}
          {!loadingProjectAdmins && projectAdmins.length === 0 && (
            <p className="text-sm text-muted-foreground">Este proyecto aún no tiene administradores asignados.</p>
          )}
          {!loadingProjectAdmins && projectAdmins.length > 0 && (
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {projectAdmins.map((admin) => (
                <li key={admin.user_id} className="flex items-center justify-between p-2 border rounded-md bg-slate-50 dark:bg-slate-800">
                  <div>
                    <p className="font-medium">{admin.profiles?.name || admin.profiles?.email || admin.user_id}</p>
                    {admin.profiles?.name && admin.profiles?.email && <p className="text-sm text-muted-foreground">{admin.profiles.email}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAdmin(admin.user_id)}
                    disabled={processingAdminAction || (projectAdmins.length <= 1)}
                    title={projectAdmins.length <= 1 ? "Un proyecto debe tener al menos un administrador" : "Quitar administrador"}
                  >
                    <UserX className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="add-project-admin">Añadir nuevo administrador</Label>
            <div className="flex items-center gap-2">
              <Select 
                value={selectedUserToAddAsAdmin}
                onValueChange={setSelectedUserToAddAsAdmin}
                disabled={loadingAllUsers || processingAdminAction}
              >
                <SelectTrigger 
                  id="add-project-admin" 
                  className={`${loadingAllUsers ? "opacity-70" : ""}`}
                >
                  <SelectValue placeholder={loadingAllUsers ? "Cargando usuarios..." : "Seleccionar usuario"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingAllUsers && <div className="p-2 text-center text-sm text-muted-foreground">Cargando...</div>}
                  {!loadingAllUsers && usersAvailableToAddAsAdmin.length === 0 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">No hay usuarios disponibles para añadir.</div>
                  )}
                  {usersAvailableToAddAsAdmin.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                onClick={handleAddAdmin} 
                disabled={!selectedUserToAddAsAdmin || loadingAllUsers || processingAdminAction}
                variant="outline"
              >
                {processingAdminAction && selectedUserToAddAsAdmin ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                Añadir
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={loading || processingAdminAction}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
