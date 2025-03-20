
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Clock, RefreshCw, Building2, Trash2, Edit, Eye, ExternalLink, Copy } from "lucide-react";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloneFormModal } from "@/components/forms/CloneFormModal";
import { useSidebarProjects } from "@/hooks/use-sidebar-projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  hasAccess?: boolean;
}

interface Project {
  id: string;
  name: string;
}

const Forms = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGlobalAdmin, isProjectAdmin, user, refreshUserProfile } = useAuth();
  const { currentProjectId } = useSidebarProjects();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("forms");
  const [showCloneModal, setShowCloneModal] = useState(false);

  useEffect(() => {
    if (currentProjectId && !selectedProjectId) {
      setSelectedProjectId(currentProjectId);
    }
    fetchProjects();
    
    refreshUserProfile().then(() => {
      fetchForms();
    });
  }, [isGlobalAdmin, currentProjectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      let data;
      
      if (isGlobalAdmin) {
        // Los admin globales pueden ver todos los proyectos
        const { data: projectsData, error } = await supabaseAdmin
          .from('projects')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        data = projectsData;
      } else if (isProjectAdmin) {
        // Los admin de proyecto pueden ver solo sus proyectos
        const { data: projectAdminsData, error } = await supabase
          .from('project_admins')
          .select('project_id, projects(id, name)')
          .eq('user_id', user?.id || '')
          .order('projects(name)', { ascending: true });
          
        if (error) throw error;
        
        data = projectAdminsData
          .filter(pa => pa.projects)
          .map(pa => ({
            id: pa.projects.id,
            name: pa.projects.name
          }));
      } else {
        // Usuarios normales pueden ver los proyectos a los que tienen acceso
        const { data: userProjectsData, error } = await supabase
          .from('project_users')
          .select('project_id, projects(id, name)')
          .eq('user_id', user?.id || '')
          .eq('status', 'active')
          .order('projects(name)', { ascending: true });
          
        if (error) throw error;
        
        data = userProjectsData
          .filter(up => up.projects)
          .map(up => ({
            id: up.projects.id,
            name: up.projects.name
          }));
      }
      
      if (data && data.length > 0) {
        setProjects(data);
        
        // Si no hay proyecto seleccionado, seleccionamos el primero
        if (!selectedProjectId) {
          setSelectedProjectId(data[0].id);
        } 
        // Si el proyecto seleccionado no está en la lista, seleccionamos el primero
        else if (!data.some(p => p.id === selectedProjectId)) {
          setSelectedProjectId(data[0].id);
        }
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error al cargar proyectos",
        description: "No se pudieron cargar los proyectos. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);
      
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

      // Si no hay proyecto seleccionado y no es admin global, no mostramos nada
      if (!selectedProjectId && !isGlobalAdmin) {
        setForms([]);
        setLoading(false);
        return;
      }

      console.log("Fetching forms for user:", session.user.id);
      console.log("User roles:", { isGlobalAdmin, isProjectAdmin });
      console.log("Selected project ID:", selectedProjectId);

      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      let query = client.from('forms').select(`
        *,
        projects:project_id (name)
      `);
      
      // Filtrar por proyecto seleccionado si hay uno
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      // Para usuarios normales y project_admin, filtramos por status='active' si están en la pestaña de formularios
      if (!isGlobalAdmin && activeTab === 'forms') {
        query = query.eq('status', 'active');
      }
      
      // Para admin de proyectos sin proyecto seleccionado, mostramos todos sus proyectos
      if (isProjectAdmin && !isGlobalAdmin && !selectedProjectId) {
        const { data: projectAdminData } = await client
          .from('project_admins')
          .select('project_id')
          .eq('user_id', session.user.id);
          
        if (projectAdminData && projectAdminData.length > 0) {
          const projectIds = projectAdminData.map(item => item.project_id);
          query = query.in('project_id', projectIds);
        }
      }
      
      // Para usuarios normales sin proyecto seleccionado, mostramos sus formularios según roles
      if (!isGlobalAdmin && !isProjectAdmin && !selectedProjectId) {
        const { data: userRolesData } = await client
          .from('user_roles')
          .select(`
            role_id,
            project_id
          `)
          .eq('user_id', session.user.id);
          
        if (userRolesData && userRolesData.length > 0) {
          const projectIds = userRolesData
            .map(ur => ur.project_id)
            .filter(Boolean) as string[];
            
          if (projectIds.length > 0) {
            query = query.in('project_id', projectIds);
          }
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching forms:', error);
        throw error;
      }
      
      if (data) {
        console.log("Forms retrieved:", data.length);
        
        const formattedForms = data.map(form => ({
          ...form,
          project_name: form.projects?.name || 'Sin proyecto',
          responseCount: 0,
          created_at: new Date(form.created_at).toLocaleDateString('es-ES')
        }));
        
        setForms(formattedForms);
        
        try {
          const formsWithResponses = await Promise.all(
            data.map(async (form) => {
              try {
                const { count, error: countError } = await client
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
      } else {
        setForms([]);
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

  const createForm = async () => {
    try {
      if (!selectedProjectId && isGlobalAdmin) {
        toast({
          title: "Proyecto requerido",
          description: "Debes seleccionar un proyecto para crear el formulario.",
          variant: "destructive",
        });
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      if (!isGlobalAdmin) {
        toast({
          title: "Permiso denegado",
          description: "Solo los administradores globales pueden crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      const projectId = isGlobalAdmin ? selectedProjectId : currentProjectId;
      
      if (!projectId) {
        toast({
          title: "Proyecto requerido",
          description: "Debes seleccionar un proyecto para crear el formulario.",
          variant: "destructive",
        });
        return;
      }
      
      const { data, error } = await supabaseAdmin
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

  const handleOpenPublicFormLink = (formId: string) => {
    window.open(`/public/forms/${formId}`, '_blank');
  };

  const renderEditorFormCard = (form: Form) => {
    return (
      <Card key={form.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-dynamo-50 rounded-md">
                <FileText className="h-4 w-4 text-dynamo-600" />
              </div>
              <CardTitle className="text-lg">{form.title}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => openDeleteDialog(form)}
            >
              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
            </Button>
          </div>
          <CardDescription className="flex items-center mt-2">
            <Clock className="h-3 w-3 mr-1" /> {getTimeAgo(form.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div className="flex justify-between mb-1 items-center">
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
            <Edit className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleViewResponses(form.id)}
          >
            <Eye className="w-4 h-4 mr-1" /> Ver respuestas
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderOperationalFormCard = (form: Form) => {
    return (
      <Card key={form.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-dynamo-50 rounded-md">
              <FileText className="h-4 w-4 text-dynamo-600" />
            </div>
            <CardTitle className="text-lg">{form.title}</CardTitle>
          </div>
          <CardDescription className="mt-2">
            {form.description || 'Sin descripción'}
          </CardDescription>
        </CardHeader>
        <CardContent>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Button 
            className="w-full"
            onClick={() => handleOpenPublicFormLink(form.id)}
          >
            <ExternalLink className="w-4 h-4 mr-1" /> Ejecutar formulario
          </Button>
        </CardFooter>
      </Card>
    );
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
  
  const openDeleteDialog = (form: Form) => {
    setFormToDelete(form);
  };
  
  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    
    try {
      setDeleting(true);
      
      const client = supabaseAdmin;
      
      const { count, error: countError } = await client
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formToDelete.id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        const { error: responsesDeleteError } = await client
          .from('form_responses')
          .delete()
          .eq('form_id', formToDelete.id);
        
        if (responsesDeleteError) throw responsesDeleteError;
      }
      
      const { error: formDeleteError } = await client
        .from('forms')
        .delete()
        .eq('id', formToDelete.id);
      
      if (formDeleteError) throw formDeleteError;
      
      setForms(forms.filter(form => form.id !== formToDelete.id));
      
      toast({
        title: "Formulario eliminado",
        description: `El formulario "${formToDelete.title}" ha sido eliminado correctamente.`,
      });
      
    } catch (error: any) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error al eliminar el formulario",
        description: error?.message || "No se pudo eliminar el formulario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setFormToDelete(null);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setLoading(true);
    setTimeout(() => {
      fetchForms();
    }, 100);
  };

  const handleCloneSuccess = (newFormId: string) => {
    fetchForms();
    toast({
      title: "Formulario clonado exitosamente",
      description: "¿Deseas editar el formulario clonado ahora?",
      action: (
        <Button 
          onClick={() => navigate(`/forms/${newFormId}/edit`)} 
          variant="outline"
          size="sm"
        >
          Editar
        </Button>
      ),
    });
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-500 mt-1">
            {isGlobalAdmin 
              ? (selectedProjectId 
                ? `Formularios del proyecto seleccionado` 
                : "Selecciona un proyecto para ver sus formularios")
              : (selectedProjectId 
                ? `Formularios del proyecto actual`
                : "Selecciona un proyecto para ver sus formularios")}
          </p>
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
          
          {isGlobalAdmin && (
            <Button 
              variant="outline"
              onClick={() => setShowCloneModal(true)}
              disabled={loading}
              className="mr-2"
            >
              <Copy className="h-4 w-4 mr-1" />
              <span className="md:inline hidden">Clonar Formulario</span>
            </Button>
          )}
          
          {isGlobalAdmin && activeTab === "editor" && (
            <Button 
              className="bg-dynamo-600 hover:bg-dynamo-700"
              onClick={createForm}
              disabled={loading || (isGlobalAdmin && !selectedProjectId)}
            >
              <Plus className="h-4 w-4 mr-2" /> Crear formulario
            </Button>
          )}
        </div>
      </div>

      {/* Selector de proyecto para todos los usuarios */}
      {projects.length > 0 && (
        <div className="mb-6">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-1">
            Seleccionar Proyecto
          </label>
          <Select 
            value={selectedProjectId || ''} 
            onValueChange={(value) => {
              setSelectedProjectId(value);
              setTimeout(() => fetchForms(), 100);
            }}
          >
            <SelectTrigger id="project-select" className="w-full md:w-80">
              <SelectValue placeholder="Seleccionar proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isGlobalAdmin && (
        <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="forms">Formularios</TabsTrigger>
            <TabsTrigger value="editor">Edición de Formularios</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {!selectedProjectId && projects.length === 0 ? (
        <div className="text-center p-8">
          <div className="mb-4 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">No tienes acceso a ningún proyecto</p>
            <p className="text-sm text-gray-500">
              Contacta al administrador para que te asigne a un proyecto
            </p>
          </div>
        </div>
      ) : !selectedProjectId ? (
        <div className="text-center p-8">
          <div className="mb-4 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">No hay proyecto seleccionado</p>
            <p className="text-sm text-gray-500">
              Selecciona un proyecto del desplegable superior para ver sus formularios
            </p>
          </div>
        </div>
      ) : loading ? (
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
              onClick={fetchForms}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.length > 0 ? (
            forms.map((form) => 
              (!isGlobalAdmin || activeTab === "editor") 
                ? renderEditorFormCard(form) 
                : renderOperationalFormCard(form)
            )
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay formularios disponibles</p>
                <p className="text-sm text-gray-500">
                  {activeTab === "editor" && isGlobalAdmin && selectedProjectId
                    ? "Crea tu primer formulario para comenzar" 
                    : "No tienes acceso a ningún formulario en este momento"
                  }
                </p>
              </div>
            </div>
          )}

          {activeTab === "editor" && isGlobalAdmin && selectedProjectId && (
            <Card 
              className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer" 
              onClick={createForm}
            >
              <div className="p-3 bg-dynamo-50 rounded-full mb-3">
                <Plus className="h-6 w-6 text-dynamo-600" />
              </div>
              <p className="text-lg font-medium text-dynamo-600">Crear nuevo formulario</p>
              <p className="text-sm text-gray-500 text-center mt-2">
                Diseña formularios personalizados<br />para el proyecto seleccionado
              </p>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={!!formToDelete} onOpenChange={(open) => !open && setFormToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el formulario "{formToDelete?.title}" y no puede ser revertida. 
              {formToDelete?.responseCount && formToDelete.responseCount > 0 
                ? ` También se eliminarán ${formToDelete.responseCount} respuestas asociadas a este formulario.` 
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteForm} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CloneFormModal 
        open={showCloneModal} 
        onOpenChange={setShowCloneModal}
        onSuccess={handleCloneSuccess}
        isGlobalAdmin={isGlobalAdmin}
      />
    </PageContainer>
  );
};

export default Forms;
