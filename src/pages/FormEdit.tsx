import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import { Switch } from "@/components/ui/switch";

const FormEdit = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    status: "draft",
    schema: { components: [], groups: [] } as FormSchema
  });

  useEffect(() => {
    if (formId) {
      fetchForm(formId);
    }
  }, [formId]);

  const fetchForm = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
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
          schema: formSchema
        });
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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('forms')
        .update({
          title: form.title,
          description: form.description,
          schema: form.schema as any,
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
      
      const newStatus = form.status === 'draft' ? 'active' : 'draft';
      
      const { error } = await supabase
        .from('forms')
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

  const getFilteredComponents = () => {
    if (!form.schema.components.length) {
      return [];
    }
    
    const components = [...form.schema.components];
    
    return components.filter(component => {
      if (!component.conditionalDisplay) {
        return true;
      }
      
      const controllingComponent = components.find(
        c => c.id === component.conditionalDisplay?.controlledBy
      );
      
      if (!controllingComponent) {
        return false;
      }
      
      return true;
    });
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
              <TabsTrigger value="form-builder">Editor de Componentes</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic-info">
              <Card>
                <CardHeader>
                  <CardTitle>Información básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        schema={form.schema}
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
