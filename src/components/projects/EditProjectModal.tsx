
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
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

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description: string;
    adminId?: string; // ID del administrador actual
  };
  onSave: (data: { name: string; description: string; adminId?: string }) => void;
}

export const EditProjectModal = ({ isOpen, onClose, project, onSave }: EditProjectModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [adminId, setAdminId] = useState(project.adminId || "");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setName(project.name);
      setDescription(project.description);
      setAdminId(project.adminId || "");
      fetchUsers();
    }
  }, [isOpen, project]);

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
        title: "Error al cargar usuarios",
        description: error?.message || "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del proyecto es obligatorio.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      await onSave({ name, description, adminId });
      toast({
        title: "Proyecto actualizado",
        description: "El proyecto se ha actualizado correctamente.",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el proyecto. Inténtelo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Proyecto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nombre del proyecto</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa el nombre del proyecto"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-description">Descripción</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el propósito del proyecto"
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-admin">Administrador del proyecto</Label>
            <Select 
              value={adminId} 
              onValueChange={(value) => setAdminId(value)}
            >
              <SelectTrigger id="project-admin" className={loadingUsers ? "opacity-70" : ""}>
                <SelectValue placeholder="Selecciona un administrador" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => u.role !== 'global_admin')
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
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
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-dynamo-600 hover:bg-dynamo-700"
              disabled={loading || !name.trim()}
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
