
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customSupabase } from "@/integrations/supabase/customClient";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Building2, Plus, User, Users } from "lucide-react";
import { Project, ProjectAdmin } from "@/types/supabase";

const projectCreateSchema = z.object({
  name: z.string().min(2, "Ingresa un nombre válido para el proyecto"),
  description: z.string().optional(),
});

const projectAdminSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  projectId: z.string().uuid("Selecciona un proyecto válido"),
});

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: "global_admin" | "project_admin" | "user";
}

export default function Admin() {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectAdmins, setProjectAdmins] = useState<ProjectAdmin[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Project create form
  const projectForm = useForm<z.infer<typeof projectCreateSchema>>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Project admin form
  const projectAdminForm = useForm<z.infer<typeof projectAdminSchema>>({
    resolver: zodResolver(projectAdminSchema),
    defaultValues: {
      email: "",
      projectId: "",
    },
  });

  useEffect(() => {
    // Check if user is logged in and fetch profile data
    const checkAuth = async () => {
      try {
        const { data: { session } } = await customSupabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }
        
        // Fetch user profile including role
        const { data: profileData, error: profileError } = await customSupabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setCurrentUser(profileData);
        
        // Check if user is global admin
        if (profileData.role === "global_admin") {
          setIsGlobalAdmin(true);
          fetchProjects();
          fetchProjectAdmins();
        } else {
          // If not global admin, redirect to home
          toast({
            title: "Acceso denegado",
            description: "No tienes permiso para acceder a esta página",
            variant: "destructive",
          });
          navigate("/");
        }
        
      } catch (error: any) {
        console.error("Auth check error:", error);
        toast({
          title: "Error de autenticación",
          description: error.message || "No se pudo verificar tu sesión",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };
    
    checkAuth();
  }, [navigate, toast]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await customSupabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      setProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error al cargar proyectos",
        description: error.message || "No se pudieron cargar los proyectos",
        variant: "destructive",
      });
    }
  };

  const fetchProjectAdmins = async () => {
    try {
      const { data, error } = await customSupabase
        .from("project_admins")
        .select(`
          *,
          projects:project_id (name)
        `);
        
      if (error) throw error;
      
      // Get user details for each admin
      const adminsWithDetails = await Promise.all((data || []).map(async (admin: any) => {
        const { data: userData, error: userError } = await customSupabase
          .from("profiles")
          .select("email, name")
          .eq("id", admin.user_id)
          .single();
          
        if (userError) {
          console.error("Error fetching user details:", userError);
          return {
            ...admin,
            user_email: "Error al cargar",
            user_name: "Error al cargar",
            project_name: admin.projects?.name || "Error al cargar",
          };
        }
        
        return {
          ...admin,
          user_email: userData.email,
          user_name: userData.name,
          project_name: admin.projects?.name || "Error al cargar",
        };
      }));
      
      setProjectAdmins(adminsWithDetails);
    } catch (error: any) {
      console.error("Error fetching project admins:", error);
      toast({
        title: "Error al cargar administradores",
        description: error.message || "No se pudieron cargar los administradores de proyectos",
        variant: "destructive",
      });
    }
  };

  const handleCreateProject = async (data: z.infer<typeof projectCreateSchema>) => {
    try {
      setLoading(true);
      setAuthError(null);

      // Get current user session
      const { data: { session } } = await customSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("No hay sesión activa");
      }

      // Create the project
      const { error } = await customSupabase
        .from("projects")
        .insert({
          name: data.name,
          description: data.description || null,
          created_by: session.user.id
        });

      if (error) throw error;

      toast({
        title: "Proyecto creado",
        description: `Se ha creado el proyecto "${data.name}"`,
      });

      projectForm.reset();
      fetchProjects();
    } catch (error: any) {
      console.error("Error creating project:", error);
      setAuthError(error.message || "Error al crear proyecto");
      toast({
        title: "Error al crear proyecto",
        description: error.message || "No se pudo crear el proyecto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProjectAdmin = async (data: z.infer<typeof projectAdminSchema>) => {
    try {
      setLoading(true);
      setAuthError(null);

      // Get current user session
      const { data: { session } } = await customSupabase.auth.getSession();
      
      if (!session) {
        throw new Error("No hay sesión activa");
      }

      // Find user by email
      const { data: userData, error: userError } = await customSupabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .single();
        
      if (userError) {
        throw new Error(`No se encontró usuario con email ${data.email}`);
      }

      // Assign user as project admin
      const { error } = await customSupabase
        .from("project_admins")
        .insert({
          project_id: data.projectId,
          user_id: userData.id,
          assigned_by: session.user.id
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error(`El usuario ya es administrador de este proyecto`);
        }
        throw error;
      }

      toast({
        title: "Administrador asignado",
        description: `Se ha asignado a ${data.email} como administrador del proyecto`,
      });

      projectAdminForm.reset();
      fetchProjectAdmins();
    } catch (error: any) {
      console.error("Error assigning project admin:", error);
      setAuthError(error.message || "Error al asignar administrador");
      toast({
        title: "Error al asignar administrador",
        description: error.message || "No se pudo asignar el administrador al proyecto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isGlobalAdmin) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Acceso restringido</CardTitle>
              <CardDescription className="text-center">
                Esta página es solo para administradores globales
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => navigate("/")}
              >
                Volver al inicio
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        
        {authError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="projects">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="projects">
              <Building2 className="mr-2 h-4 w-4" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Users className="mr-2 h-4 w-4" />
              Administradores de Proyecto
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crear Nuevo Proyecto</CardTitle>
                  <CardDescription>
                    Crea un nuevo proyecto en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...projectForm}>
                    <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4">
                      <FormField
                        control={projectForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Proyecto</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre del proyecto" 
                                {...field} 
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción del proyecto" 
                                {...field} 
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-dynamo-600 hover:bg-dynamo-700" 
                        disabled={loading}
                      >
                        {loading ? "Creando..." : "Crear Proyecto"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Proyectos Existentes</CardTitle>
                  <CardDescription>
                    Lista de proyectos en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No hay proyectos creados aún
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => (
                        <div key={project.id} className="p-4 border rounded-lg">
                          <h3 className="font-medium">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {project.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Creado: {new Date(project.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="admins">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Asignar Administrador de Proyecto</CardTitle>
                  <CardDescription>
                    Asigna un usuario como administrador de un proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...projectAdminForm}>
                    <form onSubmit={projectAdminForm.handleSubmit(handleAssignProjectAdmin)} className="space-y-4">
                      <FormField
                        control={projectAdminForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email del Usuario</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="usuario@ejemplo.com" 
                                {...field} 
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={projectAdminForm.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Proyecto</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                                disabled={loading || projects.length === 0}
                              >
                                <option value="">Selecciona un proyecto</option>
                                {projects.map((project) => (
                                  <option key={project.id} value={project.id}>
                                    {project.name}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-dynamo-600 hover:bg-dynamo-700" 
                        disabled={loading || projects.length === 0}
                      >
                        {loading ? "Asignando..." : "Asignar como Administrador"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Administradores de Proyectos</CardTitle>
                  <CardDescription>
                    Lista de administradores asignados a proyectos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {projectAdmins.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No hay administradores de proyectos asignados aún
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectAdmins.map((admin) => (
                        <div key={admin.id} className="p-4 border rounded-lg">
                          <h3 className="font-medium">{admin.user_name || admin.user_email}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Email: {admin.user_email}
                          </p>
                          <p className="text-sm font-medium mt-2">
                            Proyecto: {admin.project_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Asignado: {new Date(admin.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
