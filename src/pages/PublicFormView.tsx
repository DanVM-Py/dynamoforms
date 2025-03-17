
// Find and update the submitForm function to properly handle anonymous submissions
const submitForm = async () => {
  if (!formData) return;

  try {
    setSubmitting(true);

    // First, check if we need to upload any files
    const processedFormData = await processUploadFields(formData, formData.components);
    
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
