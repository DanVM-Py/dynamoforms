
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CloneFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newFormId: string) => void;
  currentProjectId?: string | null;
}

export function CloneFormModal({ open, onOpenChange, onSuccess, currentProjectId }: CloneFormModalProps) {
  const [formId, setFormId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setFormId("");
      setNewTitle("");
      fetchForms();
      fetchProjects();
      
      if (currentProjectId) {
        setSelectedProjectId(currentProjectId);
      }
    }
  }, [open, currentProjectId]);

  const fetchForms = async () => {
    try {
      setFetching(true);
      
      // Get forms from the current project if specified
      let query = supabase.from('forms').select('id, title, project_id, projects:project_id(name)');
      
      if (currentProjectId) {
        query = query.eq('project_id', currentProjectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        setForms(data);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error al cargar formularios",
        description: "No se pudieron cargar los formularios para clonar.",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name');
        
      if (error) throw error;
      
      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleFormChange = (id: string) => {
    setFormId(id);
    const selectedForm = forms.find(form => form.id === id);
    if (selectedForm) {
      setNewTitle(`Copia de ${selectedForm.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formId) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un formulario para clonar.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newTitle) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un título para el nuevo formulario.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un proyecto para el nuevo formulario.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('clone-form', {
        body: {
          sourceFormId: formId,
          newTitle,
          projectId: selectedProjectId
        },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const data = response.data;
      
      toast({
        title: "Formulario clonado",
        description: "El formulario ha sido clonado exitosamente.",
      });
      
      onOpenChange(false);
      
      if (onSuccess && data.newFormId) {
        onSuccess(data.newFormId);
      }
    } catch (error: any) {
      console.error('Error cloning form:', error);
      toast({
        title: "Error al clonar formulario",
        description: error?.message || "No se pudo clonar el formulario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Clonar Formulario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="form-id">Formulario a clonar</Label>
            <Select value={formId} onValueChange={handleFormChange}>
              <SelectTrigger id="form-id">
                <SelectValue placeholder="Seleccionar formulario" />
              </SelectTrigger>
              <SelectContent>
                {forms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.title} {form.projects && `(${form.projects.name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-title">Título del nuevo formulario</Label>
            <Input 
              id="new-title" 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              placeholder="Ingresa un título" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-id">Proyecto destino</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project-id">
                <SelectValue placeholder="Seleccionar proyecto destino" />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formId || !newTitle || !selectedProjectId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clonando...
                </>
              ) : (
                "Clonar Formulario"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
