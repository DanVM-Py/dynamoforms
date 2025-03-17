import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
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
      
      // Check if the form exists and is public and active
      const { data: formCheck, error: checkError } = await customSupabase
        .from('forms')
        .select('id, title, description, schema, status, is_public')
        .eq('id', id)
        .eq('status', 'active')
        .eq('is_public', true)
        .maybeSingle();
      
      console.log("[PublicFormView] Form check response:", { formCheck, checkError });
      
      if (checkError) {
        // Handle different error types
        if (checkError.code === 'PGRST116') {
          console.error('[PublicFormView] No form found with ID:', id);
          setError("Este formulario no existe o no está disponible públicamente.");
        } else if (checkError.message.includes('JWT') || checkError.message.includes('API key')) {
          console.error('[PublicFormView] Authentication error:', checkError);
          setError("Error de autenticación. Por favor contacte al administrador.");
        } else {
          console.error('[PublicFormView] Error checking form:', checkError);
          setError(`Error al verificar el formulario: ${checkError.message || 'Error desconocido'}`);
        }
        setLoading(false);
        return;
      }
      
      if (!formCheck) {
        console.error('[PublicFormView] No active public form found with ID:', id);
        setError("Este formulario no está disponible públicamente o no está activo.");
        setLoading(false);
        return;
      }
      
      console.log("[PublicFormView] Form data found:", formCheck);
      setForm(formCheck);
      
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
      
      const responsePayload = {
        form_id: formId,
        response_data: formData,
        submitted_at: new Date().toISOString(),
        is_anonymous: true, // Mark this as an anonymous submission
        // Don't include user_id for anonymous submissions
      };
      
      console.log("[PublicFormView] Sending payload:", responsePayload);
      
      const { data: responseData, error: responseError } = await customSupabase
        .from('form_responses')
        .insert(responsePayload)
        .select('id')
        .single();
      
      if (responseError) {
        console.error('[PublicFormView] Error submitting form:', responseError);
        throw new Error(responseError.message || 'Error al enviar el formulario');
      }
      
      console.log('[PublicFormView] Form submission successful:', responseData);
      
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido registrada correctamente. ¡Gracias!",
      });
      
      // If we have a response ID, use the FormResponseHandler to process it
      if (responseData && responseData.id) {
        navigate(`/public/forms/${formId}/response/${responseData.id}`, { 
          state: { isPublic: true }
        });
      } else {
        // Fallback to success page if we don't have a response ID
        navigate(`/public/forms/${formId}/success`);
      }
      
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
