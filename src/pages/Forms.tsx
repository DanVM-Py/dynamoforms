
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, MoreVertical, Clock, RefreshCw, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Form {
  id: string;
  title: string;
  created_at: string;
  status: string;
  created_by: string;
  description: string | null;
  project_id: string | null;
  project_name?: string;
  responseCount?: number;
}

interface Project {
  id: string;
  name: string;
}

const Forms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGlobalAdmin, isProjectAdmin, user, refreshUserProfile } = useAuth();
  
  // Variable para determinar si el usuario puede crear formularios
  const canCreateForms = isGlobalAdmin || isProjectAdmin;

  useEffect(() => {
    fetchForms();
    if (isGlobalAdmin) {
      fetchProjects();
    } else if (isProjectAdmin) {
      fetchUserProjects();
    }
  }, [isGlobalAdmin, isProjectAdmin]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para ver tus formularios.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Intentar obtener el perfil para actualizar roles
      await refreshUserProfile();
      
      let query = supabase.from('forms').select(`
        *,
        projects:project_id (name)
      `);
      
      // Si no es global_admin, filtramos por proyectos donde es project_admin
      if (!isGlobalAdmin) {
        // Primero obtenemos los proyectos donde el usuario es admin
        const { data: projectAdminData } = await supabase
          .from('project_admins')
          .select('project_id')
          .eq('user_id', session.user.id);
          
        if (projectAdminData && projectAdminData.length > 0) {
          const projectIds = projectAdminData.map(item => item.project_id);
          query = query.in('project_id', projectIds);
        } else {
          // Si no es admin de ningún proyecto, no mostramos formularios
          setForms([]);
          setLoading(false);
          return;
        }
      }
      
      // Obtener los formularios con manejo de errores mejorado
      const { data, error } = await query;
        
      if (error) {
        console.error('Error fetching forms:', error);
        throw error;
      }
      
      if (data) {
        // Si no hay error, procesar los datos normalmente
        const formattedForms = data.map(form => ({
          ...form,
          project_name: form.projects?.name || 'Sin proyecto',
          responseCount: 0,
          created_at: new Date(form.created_at).toLocaleDateString('es-ES')
        }));
        
        setForms(formattedForms);
        
        // Intentar obtener los conteos de respuestas
        try {
          const formsWithResponses = await Promise.all(
            data.map(async (form) => {
              try {
                const { count, error: countError } = await supabase
                  .from('form_responses')
                  .select('*', { count: 'exact', head: true })
                  .eq('form_id', form.id);
                  
                return {
                  ...form,
                  project_name: form.projects?.name || 'Sin proyecto',
                  responseCount: countError ? 0 : (count || 0),
                  created_at: new Date(form.created_at).toLocaleDateString('es-ES')
                };
              } catch (err) {
                console.error(`Error fetching response count for form ${form.id}:`, err);
                return {
                  ...form,
                  project_name: form.projects?.name || 'Sin proyecto',
                  responseCount: 0,
                  created_at: new Date(form.created_at).toLocaleDateString('es-ES')
                };
              }
            })
          );
          
          setForms(formsWithResponses);
        } catch (err) {
          console.error('Error fetching form responses:', err);
        }
      }
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      setError(error?.message || 'Error al cargar formularios');
      toast({
        title: "Error al cargar formularios",
        description: error?.message || "No se pudieron cargar los formularios. Por favor, intenta nuevamente.",
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
    }
  };

  const fetchUserProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const { data, error } = await supabase
        .from('project_admins')
        .select(`
          project_id,
          projects:project_id (id, name)
        `)
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const projectsData = data.map(item => ({
          id: item.projects.id,
          name: item.projects.name
        }));
        
        setProjects(projectsData);
        
        // Seleccionar el primer proyecto por defecto
        if (projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const createForm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      // Solo permitir a administradores crear formularios
      if (!canCreateForms) {
        toast({
          title: "Permiso denegado",
          description: "Solo los administradores pueden crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      // Si es project_admin, debe seleccionar un proyecto
      if (isProjectAdmin && !isGlobalAdmin && !selectedProject) {
        toast({
          title: "Proyecto requerido",
          description: "Debes seleccionar un proyecto para crear el formulario.",
          variant: "destructive",
        });
        return;
      }
      
      // Determinar el project_id
      let projectId = null;
      
      if (isProjectAdmin && !isGlobalAdmin) {
        // Para project_admin, usar el proyecto seleccionado
        projectId = selectedProject;
      } else if (isGlobalAdmin && selectedProject) {
        // Para global_admin, usar el proyecto seleccionado si hay uno
        projectId = selectedProject;
      }
      
      const { data, error } = await supabase
        .from('forms')
        .insert([
          { 
            title: 'Nuevo formulario', 
            description: 'Descripción del formulario',
            created_by: session.user.id,
            project_id: projectId,
            schema: {}, 
            status: 'draft'
          }
        ])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Formulario creado",
        description: "Tu nuevo formulario ha sido creado. Ahora puedes editarlo.",
      });
      
      if (data) {
        navigate(`/forms/${data.id}/edit`);
      } else {
        // Actualizamos la lista de formularios después de crear uno nuevo
        fetchForms();
      }
    } catch (error: any) {
      console.error('Error creating form:', error);
      toast({
        title: "Error al crear formulario",
        description: error?.message || "No se pudo crear el formulario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (formId: string) => {
    navigate(`/forms/${formId}/edit`);
  };

  const handleViewResponses = (formId: string) => {
    navigate(`/forms/${formId}/responses`);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return "Activo";
      case 'draft': return "Borrador";
      case 'closed': return "Cerrado";
      default: return status;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    return `Creado: ${dateStr}`;
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-500 mt-1">Gestiona tus formularios y plantillas</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={fetchForms}
            disabled={loading}
            className="mr-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1 md:inline hidden">Actualizar</span>
          </Button>
          {canCreateForms && (
            <Button 
              className="bg-dynamo-600 hover:bg-dynamo-700"
              onClick={createForm}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" /> Crear formulario
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando formularios...</div>
        </div>
      ) : error ? (
        <div className="text-center p-8">
          <div className="mb-4 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium text-red-600">Error al cargar formularios</p>
            <p className="text-sm text-gray-500">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => fetchForms()}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.length > 0 ? (
            forms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-dynamo-50 rounded-md">
                        <FileText className="h-4 w-4 text-dynamo-600" />
                      </div>
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-center mt-2">
                    <Clock className="h-3 w-3 mr-1" /> {getTimeAgo(form.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className={form.status === "active" ? "text-green-600" : "text-gray-500"}>
                        {getStatusLabel(form.status)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Respuestas:</span>
                      <span>{form.responseCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proyecto:</span>
                      <div className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1 text-dynamo-600" />
                        <span>{form.project_name}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewDetails(form.id)}
                  >
                    Ver detalles
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleViewResponses(form.id)}
                  >
                    Ver respuestas
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay formularios disponibles</p>
                <p className="text-sm text-gray-500">
                  {canCreateForms 
                    ? "Crea tu primer formulario para comenzar" 
                    : "No hay formularios disponibles para mostrar"}
                </p>
              </div>
            </div>
          )}

          {canCreateForms && forms.length > 0 && (
            <Card 
              className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer" 
              onClick={createForm}
            >
              <div className="p-3 bg-dynamo-50 rounded-full mb-3">
                <Plus className="h-6 w-6 text-dynamo-600" />
              </div>
              <p className="text-lg font-medium text-dynamo-600">Crear nuevo formulario</p>
              <p className="text-sm text-gray-500 text-center mt-2">
                Diseña formularios personalizados<br />con lógica avanzada
              </p>
            </Card>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default Forms;
