
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
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Define the FormComponent interface
interface FormComponent {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
}

// Define the FormSchema interface
interface FormSchema {
  components: FormComponent[];
}

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
    schema: { components: [] } as FormSchema
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
        // Ensure schema has components array
        let formSchema: FormSchema;
        
        if (data.schema && typeof data.schema === 'object') {
          // Initialize schema with components array if it doesn't exist
          formSchema = {
            components: Array.isArray((data.schema as any).components) 
              ? (data.schema as any).components 
              : []
          };
        } else {
          // Default empty schema
          formSchema = { components: [] };
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
          schema: form.schema,
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
          </Tabs>
        </div>
      )}
    </PageContainer>
  );
};

export default FormEdit;
