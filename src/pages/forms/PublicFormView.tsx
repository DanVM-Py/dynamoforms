import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormRenderer } from '@/components/forms/form-renderer/FormRenderer';
import { toast } from '@/components/ui/use-toast';
import { processUploadFields } from '@/utils/fileUploadUtils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormResponseHandler } from '@/components/forms/form-renderer/FormResponseHandler';
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

export function PublicFormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForm() {
      if (!formId) return;

      try {
        logger.info("[PublicFormView] Fetching public form with ID:", formId);
        const { data, error } = await supabase
          .from(Tables.forms)
          .select('*')
          .eq('id', formId)
          .eq('is_public', true)
          .single();

          if (error || !data) {
          logger.error("[PublicFormView] Error fetching form:", error);
          toast({
            title: "Error",
            description: "No se pudo cargar el formulario o no existe.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        logger.debug("[PublicFormView] Form loaded successfully:", data.title);
        setFormData(data);
      } catch (error: any) {
        logger.error("[PublicFormView] Error in form fetch process:", error);
        toast({
          title: "Error",
          description: error.message || "Ha ocurrido un error al cargar el formulario.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [formId, navigate]);

  // Function to handle form submission
  const submitForm = async (formValues: any) => {
    if (!formData || !formId) return;

    try {
      setSubmitting(true);

      // First, check if we need to upload any files
      const processedFormData = await processUploadFields(formValues, formData.components);
      
      // Create the submission data object
      const submissionData = {
        form_id: formId,
        response_data: processedFormData,
        submitted_at: new Date().toISOString(),
        is_anonymous: true,
        user_id: null // Set to null for anonymous submissions
      };

      logger.info("[PublicFormView] Submitting form response:", {formId, isAnonymous: true});
      
      // Submit the form response
      const { data, error } = await supabase
        .from(Tables.form_responses)
        .insert(submissionData)
        .select('id')
        .single();

      if (error) {
        logger.error("[PublicFormView] Error submitting form:", error);
        toast({
          title: "Error al enviar formulario",
          description: error.message,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      logger.info("[PublicFormView] Form submitted successfully with ID:", data.id);
      // Store the response ID and let the FormResponseHandler handle the redirect
      setSubmittedResponseId(data.id);
    } catch (error: any) {
      logger.error("[PublicFormView] Error in form submission process:", error);
      toast({
        title: "Error al procesar el formulario",
        description: error.message || "Ha ocurrido un error. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
      setSubmitting(false);
    }
  };

  // If we have a submitted response ID, show the FormResponseHandler
  if (submittedResponseId && formId) {
    return (
      <FormResponseHandler 
        formId={formId} 
        responseId={submittedResponseId} 
        isPublic={true} 
      />
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

  if (!formData || !formData.schema) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Formulario no encontrado o inválido</h1>
        <p className="mb-6">El formulario que buscas no existe, no está disponible públicamente, no está activo o su estructura interna es inválida.</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  // Define the schema object to pass, including title and description from formData
  const schemaToRender = {
    // Use title/description from the main formData record
    title: formData.title, 
    description: formData.description,
    // Use components/groups from the nested schema column, providing fallbacks
    components: formData.schema?.components || [], 
    groups: formData.schema?.groups || [] 
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <FormRenderer
          // Pass the correctly structured schema object
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
