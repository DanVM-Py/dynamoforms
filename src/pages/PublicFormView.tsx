
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import { supabase } from "@/integrations/supabase/client";
import { customSupabase } from "@/integrations/supabase/customClient";
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
      
      console.log("[PublicFormView] Fetching public form with ID:", id);
      
      // First try getting form without the single() to avoid errors
      const { data, error: queryError } = await customSupabase
        .from('forms')
        .select('*')
        .eq('id', id);
        
      console.log("[PublicFormView] Fetched form data:", data);
      
      if (queryError) {
        console.error('[PublicFormView] Error querying form:', queryError);
        throw queryError;
      }
      
      if (!data || data.length === 0) {
        console.error('[PublicFormView] No form found with ID:', id);
        setError("Formulario no encontrado.");
        setLoading(false);
        return;
      }
      
      const formData = data[0];
      
      console.log("[PublicFormView] Form status:", formData.status);
      console.log("[PublicFormView] Form is_public:", formData.is_public);
      
      // Check if form is active and public
      if (formData.status !== 'active') {
        console.error('[PublicFormView] Form is not active:', formData.status);
        setError("Este formulario no está activo.");
        setLoading(false);
        return;
      }
      
      if (!formData.is_public) {
        console.error('[PublicFormView] Form is not public');
        setError("Este formulario no está disponible públicamente.");
        setLoading(false);
        return;
      }
      
      console.log("[PublicFormView] Form data is valid, setting form");
      setForm(formData);
      
    } catch (error: any) {
      console.error('[PublicFormView] Error loading form:', error);
      setError("No se pudo cargar el formulario. Error: " + (error.message || "Desconocido"));
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
      
      console.log("[PublicFormView] Submitting public form response:", {
        form_id: formId,
        user_id: anonymousUserId,
        response_data: formData
      });
      
      const { data, error } = await customSupabase
        .from('form_responses')
        .insert({
          form_id: formId,
          user_id: anonymousUserId, // Using a UUID as anonymous user ID
          response_data: formData,
          submitted_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('[PublicFormView] Error submitting form:', error);
        throw error;
      }
      
      console.log('[PublicFormView] Form submission successful:', data);
      
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido registrada correctamente. ¡Gracias!",
      });
      
      // Reset the form or show a success page
      navigate(`/public/forms/${formId}/success`);
      
    } catch (error: any) {
      console.error('[PublicFormView] Error submitting form:', error);
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar tu respuesta: " + (error.message || "Error desconocido"),
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
