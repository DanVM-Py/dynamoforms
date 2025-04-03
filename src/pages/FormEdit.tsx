
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Share2, Copy, Check, ExternalLink, Shield, Table } from "lucide-react";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import { Switch } from "@/components/ui/switch";
import { Role, FormRole } from "@/types/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSidebarProjects } from "@/hooks/use-sidebar-projects";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/config/environment";
const FormEdit = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProjectId } = useSidebarProjects();
  const { isGlobalAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [copied, setCopied] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formRoles, setFormRoles] = useState<FormRole[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    status: "draft",
    project_id: "",
    is_public: false,
    schema: { components: [], groups: [] } as FormSchema
  });

  useEffect(() => {
    if (isGlobalAdmin) {
      fetchProjects();
    }
    
    if (formId) {
      fetchForm(formId);
    }
  }, [formId, isGlobalAdmin]);

  useEffect(() => {
    if (form.project_id) {
      fetchRoles();
      fetchFormRoles();
    }
  }, [form.project_id]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from(Tables.projects)
        .select('id, name')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error al cargar proyectos",
        description: "No se pudieron cargar los proyectos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchForm = async (id: string) => {
    try {
      setLoading(true);
      
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { data, error } = await client
        .from(Tables.forms)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Global admins can edit any form
        if (!isGlobalAdmin && currentProjectId && data.project_id !== currentProjectId) {
          toast({
            title: "Acceso denegado",
            description: "Este formulario no pertenece al proyecto actual.",
            variant: "destructive",
          });
          navigate('/forms');
          return;
        }
        
        let formSchema: FormSchema;
        
        if (data.schema && typeof data.schema === 'object') {
          formSchema = {
            components: Array.isArray((data.schema as any).components) 
              ? (data.schema as any).components 
              : [],
            groups: Array.isArray((data.schema as any).groups)
              ? (data.schema as any).groups
              : []
          };
        } else {
          formSchema = { components: [], groups: [] };
        }
        
        setForm({
          ...data,
          schema: formSchema,
          is_public: data.is_public || false
        });
        
        setIsPublic(data.is_public || false);
      } else {
        toast({
          title: "Formulario no encontrado",
          description: "No se encontró el formulario solicitado.",
          variant: "destructive",
        });
        navigate('/forms');
      }
    } catch (error) {
      console.error('Error al cargar el formulario:', error);
      toast({
        title: "Error al cargar formulario",
        description: "No se pudo cargar la información del formulario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { data, error } = await client
        .from(Tables.roles)
        .select('*')
        .eq('project_id', form.project_id)
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      setRoles(data || []);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const fetchFormRoles = async () => {
    try {
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { data, error } = await client
        .from(Tables.form_roles)
        .select(`
          *,
          roles:role_id (name)
        `)
        .eq('form_id', formId);
        
      if (error) throw error;
      
      const transformedData = data.map(item => ({
        ...item,
        role_name: item.roles?.name
      })) as FormRole[];
      
      setFormRoles(transformedData);
    } catch (error) {
      console.error('Error al cargar roles del formulario:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { error } = await client
        .from(Tables.forms)
        .update({
          title: form.title,
          description: form.description,
          schema: form.schema as any,
          is_public: isPublic,
          project_id: form.project_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', form.id);
        
      if (error) throw error;
      
      toast({
        title: "Formulario guardado",
        description: "Los cambios han sido guardados exitosamente.",
      });
    } catch (error) {
      console.error('Error al guardar el formulario:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFormStatus = async () => {
    try {
      setSaving(true);
      
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const newStatus = form.status === 'draft' ? 'active' : 'draft';
      
      const { error } = await client
        .from(Tables.forms)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', form.id);
        
      if (error) throw error;
      
      setForm(prev => ({ ...prev, status: newStatus }));
      
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
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (projectId: string) => {
    setForm(prev => ({ ...prev, project_id: projectId }));
    
    // Reset roles when project changes
    setRoles([]);
    setFormRoles([]);
    setSelectedRole("");
    
    // Fetch new roles for the selected project
    setTimeout(() => {
      fetchRoles();
      fetchFormRoles();
    }, 100);
  };

  const handleSchemaChange = (updatedSchema: FormSchema) => {
    setForm(prev => ({ ...prev, schema: updatedSchema }));
  };

  const getPublicFormUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/forms/${form.id}`;
  };

  const handleCopyLink = () => {
    const link = getPublicFormUrl();
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopied(true);
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles.",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        console.error('Error al copiar enlace:', error);
        toast({
          title: "Error al copiar",
          description: "No se pudo copiar el enlace.",
          variant: "destructive",
        });
      });
  };

  const handleOpenForm = () => {
    window.open(getPublicFormUrl(), '_blank');
  };

  const handleAddRole = async () => {
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Por favor selecciona un rol.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const { data, error } = await client
        .from(Tables.form_roles)
        .insert({
          form_id: formId!,
          role_id: selectedRole,
          created_by: userId!
        })
        .select(`
          *,
          roles:role_id (name)
        `)
        .single();
        
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Error",
            description: "Este rol ya está asignado a este formulario.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      const newFormRole: FormRole = {
        ...data,
        role_name: data.roles?.name
      };
      
      setFormRoles([...formRoles, newFormRole]);
      setSelectedRole("");
      
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado al formulario exitosamente.",
      });
    } catch (error) {
      console.error('Error al asignar rol:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el rol al formulario.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (formRoleId: string) => {
    try {
      // For global admins, we use the admin client to bypass the project header
      const client = isGlobalAdmin ? supabaseAdmin : supabase;
      
      const { error } = await client
        .from(Tables.form_roles)
        .delete()
        .eq('id', formRoleId);
        
      if (error) throw error;
      
      setFormRoles(formRoles.filter(fr => fr.id !== formRoleId));
      
      toast({
        title: "Rol removido",
        description: "El rol ha sido removido del formulario exitosamente.",
      });
    } catch (error) {
      console.error('Error al remover rol:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el rol del formulario.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublic = (checked: boolean) => {
    setIsPublic(checked);
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return "Activo";
      case 'draft': return "Borrador";
      case 'closed': return "Cerrado";
      default: return status;
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-2"
          onClick={() => navigate('/forms')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">
          {loading ? "Cargando..." : `Editar formulario: ${form.title}`}
        </h1>
        
        {!loading && (
          <div className="ml-auto flex items-center gap-3">
            <span className={form.status === "active" ? "text-green-600" : "text-gray-500"}>
              {getStatusLabel(form.status)}
            </span>
            <Switch
              checked={form.status === "active"}
              onCheckedChange={toggleFormStatus}
              disabled={saving}
              aria-label="Estado del formulario"
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        )}
      </div>

      {!loading && form.status === "active" && (
        <Card className="mb-6 border-green-100 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Share2 className="h-5 w-5 mr-2 text-green-600" />
              Enlace público para compartir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input 
                value={getPublicFormUrl()} 
                readOnly 
                className="flex-1 bg-white"
              />
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button 
                onClick={handleOpenForm}
                variant="outline"
                className="flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir
              </Button>
            </div>
            <p className="mt-2 text-sm text-green-600">
              Este formulario está activo y puede ser compartido con cualquier persona usando este enlace.
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando formulario...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic-info">Información Básica</TabsTrigger>
              <TabsTrigger value="access-control">Control de Acceso</TabsTrigger>
              <TabsTrigger value="form-builder">Editor de Componentes</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic-info">
              <Card>
                <CardHeader>
                  <CardTitle>Información básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGlobalAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="project-id">Proyecto</Label>
                      <Select 
                        value={form.project_id} 
                        onValueChange={handleProjectChange}
                      >
                        <SelectTrigger id="project-id">
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        El proyecto al que pertenece este formulario. Esto determina qué roles están disponibles para asignar.
                      </p>
                    </div>
                  )}
                
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input 
                      id="title" 
                      name="title" 
                      value={form.title} 
                      onChange={handleChange}
                      placeholder="Título del formulario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      value={form.description || ''} 
                      onChange={handleChange}
                      placeholder="Descripción del formulario (opcional)"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado del formulario</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="status"
                        checked={form.status === "active"}
                        onCheckedChange={toggleFormStatus}
                        disabled={saving}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <span className={form.status === "active" ? "text-green-600" : "text-gray-500"}>
                        {form.status === "active" ? "Activo (aceptando respuestas)" : "Borrador (no acepta respuestas)"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {form.status === "active" 
                        ? "El formulario está publicado y puede recibir respuestas." 
                        : "El formulario está en modo borrador y no puede recibir respuestas."}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                    {!saving && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="access-control">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Control de Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Acceso público</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublic"
                        checked={isPublic}
                        onCheckedChange={handleTogglePublic}
                        disabled={saving}
                      />
                      <span>
                        {isPublic 
                          ? "Permitir acceso público (cualquier persona con el enlace)" 
                          : "Solo usuarios autenticados con roles asignados"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {isPublic 
                        ? "Este formulario será accesible para cualquier persona con el enlace, sin necesidad de autenticación." 
                        : "Este formulario solo será accesible para usuarios autenticados que tengan uno de los roles asignados a continuación."}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Roles con acceso</h3>
                    {!isPublic && (
                      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                        <div className="grid w-full gap-1.5">
                          <Label htmlFor="role">Rol</Label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger id="role">
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button 
                          onClick={handleAddRole} 
                          className="mt-auto bg-dynamo-600 hover:bg-dynamo-700"
                          disabled={!selectedRole}
                        >
                          Agregar Rol
                        </Button>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      {formRoles.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200">
                          <p className="text-gray-500">
                            {isPublic 
                              ? "Este formulario es público, cualquier persona puede acceder." 
                              : "No hay roles asignados a este formulario. Solo los administradores podrán acceder."}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {formRoles.map((formRole) => (
                            <Badge key={formRole.id} variant="secondary" className="py-1.5 px-3">
                              {formRole.role_name}
                              <Button
                                onClick={() => handleRemoveRole(formRole.id)}
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-2 -mr-1 text-gray-500 hover:text-red-500 hover:bg-transparent"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                    {!saving && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="form-builder">
              <FormBuilder 
                schema={form.schema} 
                onChange={handleSchemaChange}
                onSave={handleSave}
                saving={saving}
              />
            </TabsContent>
            
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Vista previa del formulario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">{form.title}</h2>
                    {form.description && (
                      <p className="text-gray-600 mt-2">{form.description}</p>
                    )}
                  </div>
                  
                  <div className="bg-white p-4 border rounded-md">
                    {form.schema.components.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Este formulario aún no tiene componentes.</p>
                        <p className="text-sm mt-2">
                          Agrega componentes en la pestaña "Editor de Componentes".
                        </p>
                      </div>
                    ) : (
                      <FormRenderer 
                        formId={form.id}
                        schema={{
                          ...form.schema,
                          title: form.title,
                          description: form.description
                        }}
                        readOnly={true}
                      />
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setActiveTab("form-builder")}
                    variant="outline"
                    className="mr-2"
                  >
                    Volver al editor
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                    {!saving && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PageContainer>
  );
};

export default FormEdit;
