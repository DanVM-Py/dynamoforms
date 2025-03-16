import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, MoreVertical, Clock, RefreshCw, Building2, Trash2, Edit, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [userAccessibleForms, setUserAccessibleForms] = useState<Form[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("operation");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGlobalAdmin, isProjectAdmin, user, refreshUserProfile } = useAuth();
  
  // Variable para determinar si el usuario puede crear formularios
  const canCreateForms = isGlobalAdmin || isProjectAdmin;

  // Add state for delete confirmation dialog
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Add state for the form being toggled
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  useEffect(() => {
    refreshUserProfile().then(() => {
      fetchForms();
      fetchUserAccessibleForms();
      
      if (isGlobalAdmin) {
        fetchProjects();
      } else if (isProjectAdmin) {
        fetchUserProjects();
      }
    });
  }, [isGlobalAdmin, isProjectAdmin]);
  
  // Fetch forms that the user has access to via project roles
  const fetchUserAccessibleForms = async () => {
    try {
      setLoading(true);
      
      // Verificar la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }
      
      // Get user roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles:role_id (
            id,
            name,
            project_id
          ),
          project_id
        `)
        .eq('user_id', session.user.id);
        
      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
        setLoading(false);
        return;
      }
      
      if (!userRolesData || userRolesData.length === 0) {
        console.log('User has no roles');
        setLoading(false);
        return;
      }
      
      // Extract role IDs
      const roleIds = userRolesData.map(ur => ur.role_id);
      const projectIds = userRolesData.map(ur => ur.project_id).filter(Boolean);
      
      console.log('User roles:', roleIds);
      console.log('User project IDs:', projectIds);
      
      // Get forms that have form_roles for the user's roles OR forms in the user's projects
      let query = supabase
        .from('forms')
        .select(`
          *,
          projects:project_id (name)
        `);
      
      // For regular users, fetch forms only from their accessible projects
      if (!isGlobalAdmin && !isProjectAdmin) {
        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds);
        } else {
          // If user has no projects, return empty array
          setUserAccessibleForms([]);
          setLoading(false);
          return;
        }
      }
      
      // For admins, we'll fetch all forms (handled by fetchForms)
      // For regular users, we get forms from their authorized projects
      const { data: formsData, error: formsError } = await query;
      
      if (formsError) {
        console.error('Error fetching accessible forms:', formsError);
        setLoading(false);
        return;
      }
      
      // Format forms and add response counts
      if (formsData && formsData.length > 0) {
        const formattedForms = await Promise.all(
          formsData.map(async (form) => {
            try {
              const { count, error: countError } = await supabase
                .from('form_responses')
                .select('*', { count: 'exact', head: true })
                .eq('form_id', form.id);
              
              return {
                ...form,
                project_name: form.projects?.name || 'Sin proyecto',
                responseCount: countError ? 0 : (count || 0),
                created_at: new Date(form.created_at).toLocaleDateString('es-ES'),
                hasAccess: true
              };
            } catch (err) {
              return {
                ...form,
                project_name: form.projects?.name || 'Sin proyecto',
                responseCount: 0,
                created_at: new Date(form.created_at).toLocaleDateString('es-ES'),
                hasAccess: true
              };
            }
          })
        );
        
        console.log('User accessible forms:', formattedForms);
        setUserAccessibleForms(formattedForms);
      } else {
        setUserAccessibleForms([]);
      }
    } catch (error) {
      console.error('Error in fetchUserAccessibleForms:', error);
    } finally {
      setLoading(false);
    }
  };

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

      // Skip fetching all forms for regular users
      if (!isGlobalAdmin && !isProjectAdmin) {
        setForms([]);
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

  const renderFormCard = (form: Form, canEdit: boolean = false) => {
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
            {canEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => openDeleteDialog(form)}
              >
                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
              </Button>
            )}
          </div>
          <CardDescription className="flex items-center mt-2">
            <Clock className="h-3 w-3 mr-1" /> {getTimeAgo(form.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div className="flex justify-between mb-1 items-center">
              <span className="text-muted-foreground">Estado:</span>
              <div className="flex items-center space-x-2">
                <span className={form.status === "active" ? "text-green-600" : "text-gray-500"}>
                  {getStatusLabel(form.status)}
                </span>
                {canEdit && (
                  <Switch
                    checked={form.status === "active"}
                    onCheckedChange={() => toggleFormStatus(form)}
                    disabled={togglingStatus === form.id}
                    aria-label="Toggle form status"
                    className="data-[state=checked]:bg-green-500"
                  />
                )}
              </div>
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
          {canEdit ? (
            <>
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
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewDetails(form.id)}
              >
                <Eye className="w-4 h-4 mr-1" /> Ver formulario
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleViewResponses(form.id)}
              >
                <Eye className="w-4 h-4 mr-1" /> Ver respuestas
              </Button>
            </>
          )}
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

  const toggleFormStatus = async (form: Form) => {
    try {
      setTogglingStatus(form.id);
      
      // Toggle between 'draft' and 'active'
      const newStatus = form.status === 'draft' ? 'active' : 'draft';
      
      const { error } = await supabase
        .from('forms')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', form.id);
        
      if (error) throw error;
      
      // Update both form lists
      setForms(forms.map(f => 
        f.id === form.id ? { ...f, status: newStatus } : f
      ));
      
      setUserAccessibleForms(userAccessibleForms.map(f => 
        f.id === form.id ? { ...f, status: newStatus } : f
      ));
      
      toast({
        title: "Estado actualizado",
        description: `El formulario ahora está ${newStatus === 'active' ? 'activo' : 'en borrador'}.`,
      });
      
    } catch (error: any) {
      console.error('Error al cambiar el estado del formulario:', error);
      toast({
        title: "Error al actualizar estado",
        description: error?.message || "No se pudo actualizar el estado del formulario.",
        variant: "destructive",
      });
    } finally {
      setTogglingStatus(null);
    }
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
      
      // Check if there are any responses to this form
      const { count, error: countError } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formToDelete.id);
      
      if (countError) throw countError;
      
      // If there are responses, delete them first
      if (count && count > 0) {
        const { error: responsesDeleteError } = await supabase
          .from('form_responses')
          .delete()
          .eq('form_id', formToDelete.id);
        
        if (responsesDeleteError) throw responsesDeleteError;
      }
      
      // Now delete the form
      const { error: formDeleteError } = await supabase
        .from('forms')
        .delete()
        .eq('id', formToDelete.id);
      
      if (formDeleteError) throw formDeleteError;
      
      // Update both form lists
      setForms(forms.filter(form => form.id !== formToDelete.id));
      setUserAccessibleForms(userAccessibleForms.filter(form => form.id !== formToDelete.id));
      
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
            onClick={() => {
              fetchForms();
              fetchUserAccessibleForms();
            }}
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
              onClick={() => {
                fetchForms();
                fetchUserAccessibleForms();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="operation" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="operation">Formularios operativos</TabsTrigger>
            {canCreateForms && (
              <TabsTrigger value="admin">Administración de formularios</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="operation">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userAccessibleForms.length > 0 ? (
                userAccessibleForms.map((form) => renderFormCard(form, false))
              ) : (
                <div className="col-span-full text-center p-8">
                  <div className="mb-4 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">No tienes formularios disponibles</p>
                    <p className="text-sm text-gray-500">
                      No tienes acceso a ningún formulario en este momento
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {canCreateForms && (
            <TabsContent value="admin">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.length > 0 ? (
                  forms.map((form) => renderFormCard(form, true))
                ) : (
                  <div className="col-span-full text-center p-8">
                    <div className="mb-4 text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-lg font-medium">No hay formularios disponibles</p>
                      <p className="text-sm text-gray-500">
                        Crea tu primer formulario para comenzar
                      </p>
                    </div>
                  </div>
                )}

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
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
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
    </PageContainer>
  );
};

export default Forms;
