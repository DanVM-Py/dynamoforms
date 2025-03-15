
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const PublicFormView = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (formId) {
      fetchForm(formId);
    }
  }, [formId]);
  
  const fetchForm = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .eq('status', 'active') // Only fetch active forms
        .single();
      
      if (error) throw error;
      
      if (data) {
        setForm(data);
      } else {
        setError("Formulario no encontrado o no está activo.");
      }
    } catch (error: any) {
      console.error('Error al cargar el formulario:', error);
      setError("No se pudo cargar el formulario. Puede que no exista o no esté activo.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (formData: any) => {
    if (!formId || !form) return;
    
    try {
      setSubmitting(true);
      
      // Create an anonymous user ID for tracking purposes
      const anonymousUserId = uuidv4();
      
      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          user_id: anonymousUserId, // Using a UUID as anonymous user ID
          response_data: formData,
          submitted_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido registrada correctamente. ¡Gracias!",
      });
      
      // Reset the form or show a success page
      navigate(`/public/forms/${formId}/success`);
      
    } catch (error: any) {
      console.error('Error al enviar el formulario:', error);
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar tu respuesta. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-gray-500">Cargando formulario...</div>
      </div>
    );
  }
  
  if (error || !form) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-500 flex items-center justify-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Formulario no disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error || "Este formulario no está disponible o no existe."}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form.title}</CardTitle>
            {form.description && (
              <p className="text-gray-500 mt-2">{form.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <FormRenderer 
              formId={form.id} 
              schema={form.schema}
              onSubmit={handleSubmit}
              readOnly={false}
              isPublic={true}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-xs text-gray-500">Las respuestas a este formulario serán almacenadas para su análisis.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PublicFormView;
