import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Clock, RefreshCw, Building2, Trash2, Edit, Eye, ExternalLink, Copy, Search } from "lucide-react";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CloneFormModal } from "@/components/forms/CloneFormModal";
import { useSidebarProjects } from "@/hooks/use-sidebar-projects";
import { Input } from "@/components/ui/input";
import { Tables } from '@/config/environment';

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
  const [filteredForms, setFilteredForms] = useState<Form[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGlobalAdmin, isProjectAdmin, user, refreshUserProfile } = useAuth();
  const { currentProjectId } = useSidebarProjects();
  const location = useLocation();
  
  const editorMode = location.pathname.includes('/forms-editor');
  
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);

  useEffect(() => {
    refreshUserProfile().then(() => {
      fetchForms();
    });
  }, [isGlobalAdmin, currentProjectId]);

  useEffect(() => {
    if (forms.length > 0 && searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = forms.filter(form => 
        form.title.toLowerCase().includes(lowerCaseQuery) || 
        (form.project_name && form.project_name.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredForms(filtered);
    } else {
      setFilteredForms(forms);
    }
  }, [searchQuery, forms]);

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

      console.log("Fetching forms for user:", session.user.id);
      console.log("User roles:", { isGlobalAdmin, isProjectAdmin });

      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      let query = client.from(Tables.forms).select(`
        *,
        projects:project_id (name)
      `);
      
      // For editor mode (global admin), get all forms
      if (editorMode && isGlobalAdmin) {
        // No filters for global admin in editor mode
      } 
      // For regular forms view
      else {
        // For project admins, show all forms from their projects
        if (isProjectAdmin && !isGlobalAdmin) {
          const { data: projectAdminData } = await client
            .from('project_users')
            .select('project_id')
            .eq('user_id', session.user.id)
            .eq('is_admin', true);
            
          if (projectAdminData && projectAdminData.length > 0) {
            const projectIds = projectAdminData.map(item => item.project_id);
            query = query.in('project_id', projectIds);
          }
          
          // Only show active forms in the operational view
          if (!editorMode) {
            query = query.eq('status', 'active');
          }
        } 
        // For regular users
        else if (!isGlobalAdmin) {
          // Filter by current project ID from sidebar (if exists)
          if (currentProjectId) {
            query = query.eq('project_id', currentProjectId);
          }
          
          // Regular users should still have role-based access
          const { data: userRolesData } = await client
            .from(Tables.user_roles)
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
          
          // Only show active forms in the operational view
          query = query.eq('status', 'active');
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
        setFilteredForms(formattedForms);
        
        try {
          const formsWithResponses = await Promise.all(
            data.map(async (form) => {
              try {
                const { count, error: countError } = await client
                  .from(Tables.form_responses)
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
          setFilteredForms(formsWithResponses);
        } catch (err) {
          console.error('Error fetching form responses:', err);
        }
      } else {
        setForms([]);
        setFilteredForms([]);
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
      
      // Use a default project for new forms in editor mode
      // This can be enhanced to show project selection at form creation if needed
      const { data: projectsData, error: projectsError } = await supabaseAdmin
        .from(Tables.projects)
        .select('id')
        .limit(1)
        .order('created_at', { ascending: false });
      
      if (projectsError) {
        throw projectsError;
      }
      
      if (!projectsData || projectsData.length === 0) {
        toast({
          title: "No hay proyectos disponibles",
          description: "Debes crear al menos un proyecto antes de crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      const defaultProjectId = projectsData[0].id;
      
      const { data, error } = await supabaseAdmin
        .from(Tables.forms)
        .insert([
          { 
            title: 'Nuevo formulario', 
            description: 'Descripción del formulario',
            created_by: session.user.id,
            project_id: defaultProjectId,
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
        navigate(`/forms-editor/${data.id}/edit`);
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
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Proyecto:</span>
              <div className="flex items-center">
                <Building2 className="h-3 w-3 mr-1 text-dynamo-600" />
                <span>{form.project_name}</span>
              </div>
            </div>
          </div>
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
    navigate(`/forms-editor/${formId}/edit`);
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
        .from(Tables.form_responses)
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formToDelete.id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        const { error: responsesDeleteError } = await client
          .from(Tables.form_responses)
          .delete()
          .eq('form_id', formToDelete.id);
        
        if (responsesDeleteError) throw responsesDeleteError;
      }
      
      const { error: formDeleteError } = await client
        .from(Tables.forms)
        .delete()
        .eq('id', formToDelete.id);
      
      if (formDeleteError) throw formDeleteError;
      
      setForms(forms.filter(form => form.id !== formToDelete.id));
      setFilteredForms(filteredForms.filter(form => form.id !== formToDelete.id));
      
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

  const handleCloneSuccess = (newFormId: string) => {
    fetchForms();
    toast({
      title: "Formulario clonado exitosamente",
      description: "¿Deseas editar el formulario clonado ahora?",
      action: (
        <Button 
          onClick={() => navigate(`/forms-editor/${newFormId}/edit`)} 
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
          <h1 className="text-3xl font-bold text-gray-900">
            {editorMode ? "Edición de Formularios" : "Formularios"}
          </h1>
          <p className="text-gray-500 mt-1">
            {editorMode 
              ? "Gestiona y edita todos los formularios del sistema" 
              : "Ejecuta formularios disponibles según tu rol y proyecto"}
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
          
          {isGlobalAdmin && editorMode && (
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

      {/* Search bar for editor mode */}
      {editorMode && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre de formulario o proyecto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      )}

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
              onClick={fetchForms}
            >
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.length > 0 ? (
            filteredForms.map((form) => 
              editorMode
                ? renderEditorFormCard(form) 
                : renderOperationalFormCard(form)
            )
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">
                  {searchQuery 
                    ? "No se encontraron formularios que coincidan con la búsqueda" 
                    : "No hay formularios disponibles"}
                </p>
                <p className="text-sm text-gray-500">
                  {editorMode && isGlobalAdmin
                    ? "Crea tu primer formulario para comenzar" 
                    : "No tienes acceso a ningún formulario en este momento"
                  }
                </p>
              </div>
            </div>
          )}

          {editorMode && isGlobalAdmin && (
            <Card 
              className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer" 
              onClick={createForm}
            >
              <div className="p-3 bg-dynamo-50 rounded-full mb-3">
                <Plus className="h-6 w-6 text-dynamo-600" />
              </div>
              <p className="text-lg font-medium text-dynamo-600">Crear nuevo formulario</p>
              <p className="text-sm text-gray-500 text-center mt-2">
                Diseña formularios personalizados<br />para cualquier proyecto
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
