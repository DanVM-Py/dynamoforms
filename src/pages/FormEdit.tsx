
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";

const FormEdit = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
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
        // Ensure schema has components array and groups array
        let formSchema: FormSchema;
        
        if (data.schema && typeof data.schema === 'object') {
          // Initialize schema with components array if it doesn't exist
          formSchema = {
            components: Array.isArray((data.schema as any).components) 
              ? (data.schema as any).components 
              : [],
            groups: Array.isArray((data.schema as any).groups)
              ? (data.schema as any).groups
              : []
          };
        } else {
          // Default empty schema
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
      
      // Convert FormSchema to Json compatible object before saving
      const { error } = await supabase
        .from('forms')
        .update({
          title: form.title,
          description: form.description,
          schema: form.schema as any, // Cast to any to satisfy TypeScript
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSchemaChange = (updatedSchema: FormSchema) => {
    setForm(prev => ({ ...prev, schema: updatedSchema }));
  };

  // Filtrar componentes para la vista previa según condiciones
  const getFilteredComponents = () => {
    // Si no hay componentes, devolver un array vacío
    if (!form.schema.components.length) {
      return [];
    }
    
    // Copiar los componentes para no modificar el original
    const components = [...form.schema.components];
    
    // Para cada componente, verificar si tiene una condición y si esa condición se cumple
    return components.filter(component => {
      // Si no tiene condición, se muestra siempre
      if (!component.conditionalDisplay) {
        return true;
      }
      
      // Encontrar el componente que controla este
      const controllingComponent = components.find(
        c => c.id === component.conditionalDisplay?.controlledBy
      );
      
      // Si no se encuentra el componente controlador, no mostrar
      if (!controllingComponent) {
        return false;
      }
      
      // En vista previa, asumimos que el valor controlador siempre es la primera opción
      // La lógica real se aplicará en el FormRenderer
      return true;
    });
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
      </div>

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
