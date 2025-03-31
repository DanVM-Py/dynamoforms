
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
import { useAuth } from "@/contexts/AuthContext";
import { ProjectUserStatus } from "@/types/custom";

export interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    description: string | null;
    adminId?: string; // ID of the current admin
  };
  onProjectUpdated: () => void;
}

export const EditProjectModal = ({ open, onOpenChange, project, onProjectUpdated }: EditProjectModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [adminId, setAdminId] = useState(project?.adminId || "");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Define a simple error state object to avoid recursive type issues
  const [errors, setErrors] = useState({
    name: "",
    description: "",
    adminId: ""
  });

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setName(project?.name || "");
      setDescription(project?.description || "");
      setAdminId(project?.adminId || "");
      setErrors({
        name: "",
        description: "",
        adminId: ""
      });
      fetchUsers();
      
      // Fetch current admin if not provided
      if (!project?.adminId) {
        fetchCurrentAdmin();
      }
    }
  }, [open, project]);

  const fetchCurrentAdmin = async () => {
    try {
      // Check for existing project admin in project_users table
      const { data, error } = await supabase
        .from('project_users')
        .select('user_id')
        .eq('project_id', project.id)
        .eq('is_admin', true)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setAdminId(data.user_id);
      }
    } catch (error: any) {
      console.error('Error fetching current admin:', error);
      toast({
        title: "Error loading project admin",
        description: error?.message || "Could not load project admin information.",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('role', 'eq', 'global_admin');
        
      if (error) throw error;
      
      if (data) {
        setUsers(data);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error loading users",
        description: error?.message || "Could not load users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: "",
      description: "",
      adminId: ""
    };
    
    if (!name.trim()) {
      newErrors.name = "El nombre del proyecto es obligatorio";
    }
    
    if (!description?.trim()) {
      newErrors.description = "La descripción del proyecto es obligatoria";
    }
    
    if (adminId === "") {
      newErrors.adminId = "Debes seleccionar un administrador para el proyecto";
    }
    
    setErrors(newErrors);
    return !newErrors.name && !newErrors.description && !newErrors.adminId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Update project details
      const { error } = await supabase
        .from('projects')
        .update({ 
          name, 
          description 
        })
        .eq('id', project.id);
      
      if (error) throw error;
      
      // If adminId has changed and is not empty, update project admin
      if (adminId) {
        // First check if there's an existing admin
        const { data: existingAdmin, error: fetchError } = await supabase
          .from('project_users')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_admin', true)
          .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        // If there's an existing admin that is different from new one, update their status
        if (existingAdmin && existingAdmin.user_id !== adminId) {
          // Deactivate the current admin
          const { error: updateError } = await supabase
            .from('project_users')
            .update({ is_admin: false })
            .eq('id', existingAdmin.id);
            
          if (updateError) throw updateError;
          
          // Check if new admin is already a project user
          const { data: existingUser, error: userError } = await supabase
            .from('project_users')
            .select('*')
            .eq('project_id', project.id)
            .eq('user_id', adminId)
            .maybeSingle();
            
          if (userError && userError.code !== 'PGRST116') {
            throw userError;
          }
          
          if (existingUser) {
            // Update existing user to be admin
            const { error: promoteError } = await supabase
              .from('project_users')
              .update({
                is_admin: true,
                status: 'active' as ProjectUserStatus
              })
              .eq('id', existingUser.id);
              
            if (promoteError) throw promoteError;
          } else {
            // Create new admin with explicit object
            const { error: insertError } = await supabase
              .from('project_users')
              .insert({
                project_id: project.id,
                user_id: adminId,
                is_admin: true,
                status: 'active' as ProjectUserStatus,
                invited_by: user?.id || '',
                created_by: user?.id || null
              });
              
            if (insertError) throw insertError;
          }
        } else if (!existingAdmin) {
          // No admin exists, insert a new one with explicit object
          const { error: insertError } = await supabase
            .from('project_users')
            .insert({
              project_id: project.id,
              user_id: adminId,
              is_admin: true,
              status: 'active' as ProjectUserStatus,
              invited_by: user?.id || '',
              created_by: user?.id || null
            });
            
          if (insertError) throw insertError;
        }
        // If admin is the same, no changes needed
      }
      
      // Complete the update process
      await onProjectUpdated();
      
      toast({
        title: "Proyecto actualizado",
        description: "El proyecto ha sido actualizado exitosamente.",
      });
      
      // Safely close the modal after everything is done
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating project:", error);
      toast({
        title: "Error al actualizar",
        description: error?.message || "No se pudo actualizar el proyecto. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Safe close handler to ensure we're not in loading state when closing
  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Proyecto</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del proyecto. Asegúrate de guardar los cambios.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
              rows={4}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-admin">
              Administrador del Proyecto <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={adminId} 
              onValueChange={(value) => setAdminId(value)}
            >
              <SelectTrigger 
                id="project-admin" 
                className={`${loadingUsers ? "opacity-70" : ""} ${errors.adminId ? "border-red-500" : ""}`}
              >
                <SelectValue placeholder="Selecciona un administrador" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.adminId && (
              <p className="text-sm text-red-500">{errors.adminId}</p>
            )}
            {loadingUsers && (
              <div className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> 
                Cargando usuarios...
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
