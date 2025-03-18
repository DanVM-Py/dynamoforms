import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/types/supabase";
import { EditProjectModal } from "@/components/projects/EditProjectModal";
import ProjectCard from "@/components/projects/ProjectCard";

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectAdminId, setProjectAdminId] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
    admin?: string;
  }>({});

  const { data: projects, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching projects",
          description: error.message,
          variant: "destructive"
        });
      }

      return data || [];
    }
  });

  useEffect(() => {
    if (open) {
      const fetchUsers = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email')
            .not('role', 'eq', 'global_admin');
            
          if (error) throw error;
          
          setAvailableUsers(data || []);
        } catch (error: any) {
          console.error('Error fetching users:', error);
          toast({
            title: "Error loading users",
            description: error?.message || "Could not load users.",
            variant: "destructive",
          });
        }
      };
      
      fetchUsers();
      setProjectName("");
      setProjectDescription("");
      setProjectAdminId("");
      setFormErrors({});
    }
  }, [open, toast]);

  const validateForm = () => {
    const errors: {
      name?: string;
      description?: string;
      admin?: string;
    } = {};
    
    if (!projectName.trim()) {
      errors.name = "El nombre del proyecto es obligatorio";
    }
    
    if (!projectDescription.trim()) {
      errors.description = "La descripción del proyecto es obligatoria";
    }
    
    if (!projectAdminId) {
      errors.admin = "Debes seleccionar un administrador para el proyecto";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          { 
            name: projectName, 
            description: projectDescription, 
            created_by: user?.id 
          },
        ])
        .select();

      if (projectError) throw projectError;
      
      if (projectData && projectData.length > 0) {
        const newProject = projectData[0];
        
        const { error: adminError } = await supabase
          .from('project_admins')
          .insert({
            project_id: newProject.id, 
            user_id: projectAdminId,
            created_by: user?.id
          });
          
        if (adminError) throw adminError;
        
        toast({
          title: "Proyecto creado exitosamente",
          description: "El proyecto y su administrador han sido configurados."
        });
        
        setOpen(false);
        refetch();
      }
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error al crear el proyecto",
        description: error?.message || "No se pudo crear el proyecto. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) {
        toast({
          title: "Error deleting project",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Project deleted successfully!",
        });
        refetch();
      }
      setProjectToDelete(null);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Add a new project to start managing forms.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-right">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-right">
                  Descripción <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the purpose of the project"
                  className={formErrors.description ? "border-red-500" : ""}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project-admin" className="text-right">
                  Administrador <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={projectAdminId} 
                  onValueChange={setProjectAdminId}
                >
                  <SelectTrigger id="project-admin" className={formErrors.admin ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a project administrator" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.admin && (
                  <p className="text-sm text-red-500">{formErrors.admin}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                onClick={handleCreateProject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Creando...
                  </>
                ) : (
                  'Crear Proyecto'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Separator className="my-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>

      <AlertDialog open={projectToDelete !== null} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and remove all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {projectToEdit && (
        <EditProjectModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          project={{
            id: projectToEdit.id,
            name: projectToEdit.name,
            description: projectToEdit.description
          }}
          onProjectUpdated={() => {
            setIsEditModalOpen(false);
            refetch();
          }}
        />
      )}
    </PageContainer>
  );
};

export default Projects;
