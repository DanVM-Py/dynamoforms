import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EditProjectModal } from "@/components/projects/EditProjectModal";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  admin_count?: number;
  forms_count?: number;
  users_count?: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projectAdmins, setProjectAdmins] = useState<{[key: string]: string[]}>({});
  const [formCounts, setFormCounts] = useState<{[key: string]: number}>({});
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    adminId: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectAdminIds, setProjectAdminIds] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const { isGlobalAdmin, user } = useAuth();

  useEffect(() => {
    if (isGlobalAdmin) {
      fetchProjects();
      fetchUsers();
    }
  }, [isGlobalAdmin]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');
        
      if (projectsError) throw projectsError;
      
      if (projectsData) {
        // Formatear fechas
        const formattedProjects = projectsData.map(project => ({
          ...project,
          created_at: new Date(project.created_at).toLocaleDateString('es-ES')
        }));
        
        setProjects(formattedProjects);
        
        // Fetch metrics for each project
        for (const project of formattedProjects) {
          fetchProjectAdmins(project.id);
          fetchProjectFormCount(project.id);
          fetchProjectUserCount(project.id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error al cargar proyectos",
        description: error?.message || "No se pudieron cargar los proyectos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
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
    }
  };

  const fetchProjectAdmins = async (projectId: string) => {
    try {
      const { data, error, count } = await supabase
        .from('project_admins')
        .select(`
          user_id,
          profiles:user_id (name, email)
        `, { count: 'exact' })
        .eq('project_id', projectId);
        
      if (error) throw error;
      
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId ? { ...p, admin_count: count || 0 } : p
        )
      );
      
      if (data && data.length > 0) {
        setProjectAdminIds(prev => ({
          ...prev,
          [projectId]: data[0].user_id
        }));
      }
    } catch (error) {
      console.error(`Error fetching admins for project ${projectId}:`, error);
    }
  };

  const fetchProjectFormCount = async (projectId: string) => {
    try {
      const { count, error } = await supabase
        .from('forms')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
        
      if (error) throw error;
      
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId ? { ...p, forms_count: count || 0 } : p
        )
      );
    } catch (error) {
      console.error(`Error fetching form count for project ${projectId}:`, error);
    }
  };

  const fetchProjectUserCount = async (projectId: string) => {
    try {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
        
      if (error) throw error;
      
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId ? { ...p, users_count: count || 0 } : p
        )
      );
    } catch (error) {
      console.error(`Error fetching user count for project ${projectId}:`, error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del proyecto es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    if (!newProject.adminId) {
      toast({
        title: "Campo requerido",
        description: "Debes seleccionar un administrador de proyecto.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Insertar el nuevo proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: newProject.name,
          description: newProject.description || null,
          created_by: user?.id
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      if (projectData) {
        // 2. Asignar el administrador de proyecto
        const { error: adminError } = await supabase
          .from('project_admins')
          .insert([{
            project_id: projectData.id,
            user_id: newProject.adminId,
            assigned_by: user?.id
          }]);

        if (adminError) throw adminError;

        toast({
          title: "Proyecto creado",
          description: `El proyecto "${newProject.name}" ha sido creado correctamente.`,
        });

        // Resetear el formulario
        setNewProject({
          name: "",
          description: "",
          adminId: ""
        });

        // Cerrar el diálogo
        setIsDialogOpen(false);

        // Actualizar la lista de proyectos
        fetchProjects();
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error al crear proyecto",
        description: error?.message || "No se pudo crear el proyecto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // 1. Eliminar administradores de proyecto
      const { error: adminError } = await supabase
        .from('project_admins')
        .delete()
        .eq('project_id', projectId);

      if (adminError) throw adminError;

      // 2. Eliminar el proyecto
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) throw projectError;

      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente.",
      });

      // Actualizar la lista de proyectos
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error al eliminar proyecto",
        description: error?.message || "No se pudo eliminar el proyecto.",
        variant: "destructive",
      });
    }
  };

  const handleEditProject = async (projectId: string, data: { name: string; description: string; adminId?: string }) => {
    try {
      // 1. Actualizar la información del proyecto
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description || null
        })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // 2. Actualizar el administrador si ha cambiado
      if (data.adminId && data.adminId !== projectAdminIds[projectId]) {
        // Primero eliminar los administradores anteriores
        const { error: deleteError } = await supabase
          .from('project_admins')
          .delete()
          .eq('project_id', projectId);

        if (deleteError) throw deleteError;

        // Luego agregar el nuevo administrador
        const { error: adminError } = await supabase
          .from('project_admins')
          .insert([{
            project_id: projectId,
            user_id: data.adminId,
            assigned_by: user?.id
          }]);

        if (adminError) throw adminError;
      }

      toast({
        title: "Proyecto actualizado",
        description: "El proyecto ha sido actualizado correctamente.",
      });

      // Actualizar la lista de proyectos
      fetchProjects();
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: "Error al actualizar proyecto",
        description: error?.message || "No se pudo actualizar el proyecto.",
        variant: "destructive",
      });
      throw error; // Re-lanzar para que el componente pueda manejarlo
    }
  };

  const handleEditClick = (project: Project) => {
    setEditingProject({
      ...project,
    });
  };

  const getUserNameById = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Usuario desconocido';
  };

  if (!isGlobalAdmin) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center p-8">
          <Building2 className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700">Acceso restringido</h2>
          <p className="text-gray-500 mt-2">
            No tienes permisos para acceder a la gestión de proyectos.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 mt-1">Gestiona los proyectos y sus administradores</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={fetchProjects}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1 md:inline hidden">Actualizar</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-dynamo-600 hover:bg-dynamo-700">
                <Plus className="h-4 w-4 mr-2" /> Crear proyecto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear nuevo proyecto</DialogTitle>
                <DialogDescription>
                  Crea un nuevo proyecto y asigna un administrador.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del proyecto</Label>
                  <Input
                    id="name"
                    placeholder="Nombre del proyecto"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción del proyecto"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin">Administrador del proyecto</Label>
                  <Select 
                    value={newProject.adminId} 
                    onValueChange={(value) => setNewProject({...newProject, adminId: value})}
                  >
                    <SelectTrigger id="admin">
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
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button 
                  onClick={handleCreateProject} 
                  disabled={loading}
                  className="bg-dynamo-600 hover:bg-dynamo-700"
                >
                  {loading ? 'Creando...' : 'Crear proyecto'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando proyectos...</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDelete={() => handleDeleteProject(project.id)} 
                onEdit={() => handleEditClick(project)} 
              />
            ))
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <Building2 className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay proyectos disponibles</p>
                <p className="text-sm text-gray-500">
                  Crea tu primer proyecto para comenzar
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={{
            id: editingProject.id,
            name: editingProject.name,
            description: editingProject.description || "",
            adminId: projectAdminIds[editingProject.id]
          }}
          onSave={(data) => handleEditProject(editingProject.id, data)}
        />
      )}
    </PageContainer>
  );
};

export default Projects;
