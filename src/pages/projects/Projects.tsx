import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Tables, Project, Profile } from '@/types/database-entities';
import { EditProjectModal } from "@/components/project/EditProjectModal";
import ProjectCard from "@/components/project/ProjectCard";
import { logger } from '@/lib/logger';

// Define extended project type that includes adminId, using the imported Project type
interface ExtendedProject extends Project {
  adminId?: string;
}

// Type for available users, picking only needed fields from Profile
type AvailableUser = Pick<Profile, 'id' | 'name' | 'email'>;

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ExtendedProject | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectAdminId, setProjectAdminId] = useState("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
    admin?: string;
  }>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: projects, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(Tables.projects)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching projects",
          description: error.message,
          variant: "destructive"
        });
      }
      return (data as Project[]) || [];
    }
  });

  useEffect(() => {
    if (open) {
      const fetchUsers = async () => {
        try {
          const { data, error } = await supabase
          .from(Tables.profiles)
          .select('id, name, email')
          .not('role', 'eq', 'global_admin');
          
        if (error) throw error;

        setAvailableUsers((data as AvailableUser[]) || []);
      } catch (error) {
        logger.error('Error fetching users:', error);
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
      // Añade un log aquí si la validación falla (opcional)
      logger.warn("[handleCreateProject] Validación falló. Errores:", formErrors);
      return;
    }
    // Si pasa la validación, loguea aquí:
    logger.info("[handleCreateProject] Validación del formulario SUPERADA."); // <-- Log 1

    setIsLoading(true);
    
    try {
      logger.info("[handleCreateProject] Intentando insertar en Tables.projects...");
      logger.info(`[handleCreateProject] Using table name for projects: ${Tables.projects}`); // <-- Log del nombre de tabla

      // --- Crear el objeto de datos a insertar ---
      const projectInsertData = {
        name: projectName,
        description: projectDescription,
        created_by: user?.id || '' // Asegúrate que user?.id no sea null si la columna es NOT NULL
      };

      // --- Loguear el objeto de datos ---
      logger.info("[handleCreateProject] Data to be inserted into projects:", projectInsertData); // <-- Log de los datos

      const { data: projectData, error: projectError } = await supabaseAdmin
        .from(Tables.projects)
        .insert([projectInsertData]) // <-- Usar la variable con los datos
        .select()
        .single();

      if (projectError) {
         logger.error("[handleCreateProject] ERROR en insert de Tables.projects:", projectError);
         throw projectError;
      }
      
      const newProject = projectData as Project;
      if (!newProject) throw new Error("Project creation did not return data.");
        
      logger.debug(`[handleCreateProject] Attempting to insert into project_users. Project ID: ${newProject.id}, User ID (Admin): ${projectAdminId}`);
      logger.info(`[handleCreateProject] Using table name for project_users: ${Tables.project_users}`); // <-- Log nombre tabla project_users

      const projectUserInsertData = {
        project_id: newProject.id,
        user_id: projectAdminId,
        is_admin: true
      };

      logger.info("[handleCreateProject] Data to be inserted into project_users:", projectUserInsertData); // <-- Log datos project_users

      const { error: adminError } = await supabaseAdmin
        .from(Tables.project_users)
        .insert([projectUserInsertData]); // <-- Usar variable

      if (adminError) {
        logger.error(`[handleCreateProject] Error inserting into project_users:`, adminError);
        throw adminError;
      }
        
      toast({
        title: "Proyecto creado exitosamente",
        description: "El proyecto y su administrador han sido configurados."
      });
        
      setOpen(false);
      refetch();
    } catch (error) {
      // Este log es crucial si algo falla ANTES de tu logger.debug original
      logger.error("Error al crear el proyecto (Bloque Catch General):", error); // <-- Log 5 (si falla en CUALQUIER try)
      toast({
        title: "Error al crear el proyecto",
        description: error?.message || "No se pudo crear el proyecto. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = async (project: Project) => {
      try {
        const { data: adminData, error: adminError } = await supabase
          .from(Tables.project_users)
          .select('user_id')
          .eq('project_id', project.id)
          .eq('is_admin', true)
          .maybeSingle();
        
        if (adminError && adminError.code !== 'PGRST116') {
          logger.error("Error fetching project admin:", adminError);
          throw adminError;
        }

        const extendedProject: ExtendedProject = {
          ...project,
          adminId: adminData?.user_id
        };
        
        setProjectToEdit(extendedProject);
        setIsEditModalOpen(true);
        
      } catch (error) {
        logger.error("Error preparing project edit:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información del proyecto para editar.",
          variant: "destructive"
        });
      }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      setIsDeleting(true);
      try {
        const { error } = await supabase
        .from(Tables.projects)
        .delete()
        .eq('id', projectToDelete.id);

      if (error) {
          logger.error("Error deleting project:", error);
          toast({
            title: "Error deleting project",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Project deleted successfully",
            description: "The project and all associated data have been removed.",
          });
          refetch();
        }
      } catch (error) {
        logger.error("Exception during project deletion:", error);
        toast({
          title: "Failed to delete project",
          description: error?.message || "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(false);
        setProjectToDelete(null);
      }
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
            onEdit={() => handleEditProject(project)}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>

      <AlertDialog open={projectToDelete !== null} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all related data including forms, roles, and user assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProject} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </AlertDialogAction>
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
            description: projectToEdit.description,
            adminId: projectToEdit.adminId
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
