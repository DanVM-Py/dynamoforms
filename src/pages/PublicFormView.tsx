
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormRenderer } from '@/components/form-renderer/FormRenderer';
import { toast } from '@/components/ui/use-toast';
import { processUploadFields } from '@/utils/fileUploadUtils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function PublicFormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      if (!formId) return;

      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .eq('is_public', true)
          .single();

        if (error || !data) {
          console.error("Error fetching form:", error);
          toast({
            title: "Error",
            description: "No se pudo cargar el formulario o no existe.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setFormData(data);
      } catch (error: any) {
        console.error("Error in form fetch process:", error);
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

      // Submit the form response
      const { data, error } = await supabase
        .from('form_responses')
        .insert(submissionData);

      if (error) {
        console.error("Error submitting form:", error);
        toast({
          title: "Error al enviar formulario",
          description: error.message,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      // On success, redirect to the success page
      navigate(`/public/forms/${formId}/success`);
    } catch (error: any) {
      console.error("Error in form submission process:", error);
      toast({
        title: "Error al procesar el formulario",
        description: error.message || "Ha ocurrido un error. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
      setSubmitting(false);
    }
  };

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

  if (!formData) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Formulario no encontrado</h1>
        <p className="mb-6">El formulario que buscas no existe o no está disponible públicamente.</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <FormRenderer
          formSchema={formData}
          onSubmit={submitForm}
          isSubmitting={submitting}
          isPublic={true}
        />
      </div>
    </div>
  );
}

export default PublicFormView;
