
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

const FormEdit = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    status: "draft",
    schema: {}
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
        setForm(data);
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
        <div className="grid gap-6">
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
                <Input 
                  id="description" 
                  name="description" 
                  value={form.description || ''} 
                  onChange={handleChange}
                  placeholder="Descripción del formulario (opcional)"
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

          <Card>
            <CardHeader>
              <CardTitle>Componentes del formulario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Aquí irá el editor de componentes del formulario. Funcionalidad en desarrollo.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};

export default FormEdit;
