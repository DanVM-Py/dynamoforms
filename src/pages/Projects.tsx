import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, RefreshCw, Users, Pencil, Trash2, PenLine, Settings } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  admin_count?: number;
  forms_count?: number;
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
        
        // Obtener administradores de proyecto
        for (const project of formattedProjects) {
          fetchProjectAdmins(project.id);
          fetchProjectFormCount(project.id);
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
      const { data, error } = await supabase
        .from('project_admins')
        .select(`
          user_id,
          profiles:user_id (name, email)
        `)
        .eq('project_id', projectId);
        
      if (error) throw error;
      
      if (data) {
        const admins = data.map(admin => admin.user_id);
        setProjectAdmins(prev => ({
          ...prev,
          [projectId]: admins
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
      
      setFormCounts(prev => ({
        ...prev,
        [projectId]: count || 0
      }));
    } catch (error) {
      console.error(`Error fetching form count for project ${projectId}:`, error);
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

  const getUserNameById = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Usuario desconocido';
  };

  const ProjectCard = ({ project, onDelete, onEdit }: ProjectCardProps) => {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = `/projects/${project.id}/roles`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Administrar Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(project)}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="mt-2">
            {project.description || "Sin descripción"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado:</span>
              <span>{project.created_at}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formularios:</span>
              <span>{formCounts[project.id] || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Administradores:</span>
              <span>{projectAdmins[project.id]?.length || 0}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <Users className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium">Administradores</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectAdmins[project.id]?.map(adminId => (
                <Badge key={adminId} variant="secondary">
                  {getUserNameById(adminId)}
                </Badge>
              ))}
              {(!projectAdmins[project.id] || projectAdmins[project.id].length === 0) && (
                <span className="text-sm text-gray-500">No hay administradores asignados</span>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Si no es administrador global, no mostrar esta página
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
              <ProjectCard key={project.id} project={project} onDelete={() => {}} onEdit={() => {}} />
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
    </PageContainer>
  );
};

export default Projects;
