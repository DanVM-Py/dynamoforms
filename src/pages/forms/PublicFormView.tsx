import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Import the custom Supabase client configured for public/anonymous use
import { customSupabase as supabase } from '@/integrations/supabase/client'; 
import { FormRenderer } from '@/components/forms/form-renderer/FormRenderer';
import { toast } from '@/components/ui/use-toast';
import { processUploadFields } from '@/utils/fileUploadUtils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormResponseHandler } from '@/components/forms/form-renderer/FormResponseHandler';
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';
import { CheckCircle } from 'lucide-react';

export function PublicFormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function fetchForm() {
      if (!formId) return;
      
      setLoading(true);
      setAccessError(null);
      setFormData(null);

      try {
        logger.info("[PublicFormView] Fetching public form with ID using custom client:", formId);
        const { data, error } = await supabase
          .from(Tables.forms)
          .select('*')
          .eq('id', formId)
          .eq('is_public', true)
          .eq('status', 'active')
          .single();

          if (error) {
            logger.error("[PublicFormView] Error fetching active public form:", error);
            if (error.code === 'PGRST116') {
              setAccessError("Este formulario no existe, no es público o no está activo.");
            } else {
              setAccessError("Error al cargar el formulario. Intenta de nuevo más tarde.");
            }
            return;
          }
          
          if (!data) {
             logger.warn("[PublicFormView] No data returned even without error.");
             setAccessError("Formulario no encontrado o inaccesible.");
             return;
          }

          if (!data.schema || typeof data.schema !== 'object' || (!Array.isArray(data.schema.components) && !Array.isArray(data.schema.groups)) ) {
             logger.error("[PublicFormView] Form data found, but schema structure is invalid. Form ID:", formId, "Schema:", data.schema);
             setAccessError("La estructura interna de este formulario es inválida.");
             return;
          }

        logger.debug("[PublicFormView] Form loaded successfully:", data.title);
        setFormData(data);

      } catch (error: any) {
        logger.error("[PublicFormView] Error in form fetch process:", error);
        setAccessError(error.message || "Ha ocurrido un error inesperado al cargar el formulario.");
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [formId, navigate]);

  const submitForm = async (formValues: any) => {
    if (!formData || !formId) return;

    try {
      setSubmitting(true);
      setSubmissionSuccess(false);

      const processedFormData = await processUploadFields(formValues, formData.schema?.components || []);
      
      const submissionData = {
        form_id: formId,
        response_data: processedFormData,
        is_anonymous: true,
        user_id: null
      };

      logger.debug("[PublicFormView] Data prepared for insert:", { 
         form_id_to_insert: submissionData.form_id,
         is_anonymous_to_insert: submissionData.is_anonymous,
         user_id_to_insert: submissionData.user_id
      });
      
      const { error } = await supabase
        .from(Tables.form_responses)
        .insert(submissionData);

      if (error) {
        logger.error("[PublicFormView] Error submitting form:", error);
        toast({ title: "Error al enviar formulario", description: error.message, variant: "destructive" });
        throw error;
      }

      logger.info("[PublicFormView] Form submitted successfully.");
      setSubmissionSuccess(true);
      toast({ title: "Formulario enviado", description: "Tu respuesta ha sido registrada exitosamente." });

    } catch (error: any) {
      logger.error("[PublicFormView] Error in form submission process:", error);
      if (!error.message?.includes('violates row-level security policy')) {
         toast({ title: "Error al procesar el formulario", description: error.message || "Ha ocurrido un error. Por favor, intenta nuevamente.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
       <div className="container mx-auto py-16 px-4 text-center">
         <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
         <h1 className="text-2xl font-bold mb-2">¡Gracias!</h1>
         <p className="text-lg text-gray-600 mb-8">Tu respuesta ha sido enviada correctamente.</p>
       </div>
     );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-6" />
          <Skeleton className="h-8 w-1/2 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error al Cargar Formulario</h1>
        <p className="mb-6 text-red-500">{accessError}</p>
        <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }
  
  if (!formData || typeof formData.schema !== 'object' || formData.schema === null) {
      logger.error("[PublicFormView] Attempting to render but formData or formData.schema is invalid.", formData);
      return (
         <div className="container mx-auto py-8 px-4 text-center">
           <h1 className="text-2xl font-bold mb-4 text-red-600">Error Interno</h1>
           <p className="mb-6 text-red-500">No se pudo procesar la estructura del formulario.</p>
           <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
         </div>
       );
   }

  const schemaToRender = {
    title: formData.title, 
    description: formData.description,
    components: formData.schema?.components || [], 
    groups: formData.schema?.groups || [] 
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <FormRenderer
          schema={schemaToRender} 
          onSubmit={submitForm}
          formId={formId || ''}
          readOnly={false}
          isPublic={true}
          isSubmitting={submitting}
        />
      </div>
    </div>
  );
}

export default PublicFormView;
