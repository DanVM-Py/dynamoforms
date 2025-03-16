
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Copy } from "lucide-react";

interface Form {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  project_name?: string;
}

interface Project {
  id: string;
  name: string;
}

interface CloneFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newFormId: string) => void;
}

export const CloneFormModal = ({ open, onOpenChange, onSuccess }: CloneFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [targetProject, setTargetProject] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [cloneRoles, setCloneRoles] = useState<boolean>(true);
  const { toast } = useToast();
  const { isGlobalAdmin } = useAuth();

  useEffect(() => {
    if (open && isGlobalAdmin) {
      fetchForms();
      fetchProjects();
    }
  }, [open, isGlobalAdmin]);

  useEffect(() => {
    if (selectedForm) {
      const form = forms.find(f => f.id === selectedForm);
      if (form) {
        setNewTitle(`${form.title} (Copia)`);
        setNewDescription(form.description || "");
      }
    }
  }, [selectedForm, forms]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          projects:project_id (name)
        `);
        
      if (error) throw error;
      
      if (data) {
        const formattedForms = data.map(form => ({
          ...form,
          project_name: form.projects?.name || 'Sin proyecto'
        }));
        
        setForms(formattedForms);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error al cargar formularios",
        description: "No se pudieron cargar los formularios. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name');
        
      if (error) throw error;
      
      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error al cargar proyectos",
        description: "No se pudieron cargar los proyectos. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleCloneForm = async () => {
    if (!selectedForm || !targetProject || !newTitle) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const { data, error } = await supabase.functions.invoke('clone-form', {
        body: {
          sourceFormId: selectedForm,
          targetProjectId: targetProject,
          newTitle,
          newDescription,
          cloneRoles
        }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: "Formulario clonado",
        description: "El formulario ha sido clonado exitosamente al proyecto seleccionado",
      });
      
      onOpenChange(false);
      
      if (onSuccess && data.data.newFormId) {
        onSuccess(data.data.newFormId);
      }
      
    } catch (error) {
      console.error('Error cloning form:', error);
      toast({
        title: "Error al clonar formulario",
        description: error.message || "No se pudo clonar el formulario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedForm("");
    setTargetProject("");
    setNewTitle("");
    setNewDescription("");
    setCloneRoles(true);
  };

  // Only global admins can access this feature
  if (!isGlobalAdmin) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clonar Formulario</DialogTitle>
          <DialogDescription>
            Selecciona un formulario existente para clonarlo en otro proyecto.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-dynamo-600" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="source-form">Formulario origen</Label>
              <Select 
                value={selectedForm} 
                onValueChange={setSelectedForm}
              >
                <SelectTrigger id="source-form">
                  <SelectValue placeholder="Selecciona un formulario" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title} ({form.project_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-project">Proyecto destino</Label>
              <Select 
                value={targetProject} 
                onValueChange={setTargetProject}
              >
                <SelectTrigger id="target-project">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-title">Título del nuevo formulario *</Label>
              <Input 
                id="new-title" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ingresa un título para el nuevo formulario" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-description">Descripción (opcional)</Label>
              <Textarea 
                id="new-description" 
                value={newDescription} 
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ingresa una descripción para el nuevo formulario" 
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="clone-roles" 
                checked={cloneRoles}
                onCheckedChange={(checked) => setCloneRoles(checked as boolean)}
              />
              <Label htmlFor="clone-roles" className="cursor-pointer">
                Copiar configuración de roles de acceso
              </Label>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCloneForm}
            disabled={!selectedForm || !targetProject || !newTitle || submitting}
            className="bg-dynamo-600 hover:bg-dynamo-700"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clonando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Clonar Formulario
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
