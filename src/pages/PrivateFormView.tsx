import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormRenderer } from '@/components/form-renderer/FormRenderer';
import { FormResponseHandler } from '@/components/form-renderer/FormResponseHandler';
import { useToast } from '@/components/ui/use-toast';
import { processUploadFields } from '@/utils/fileUploadUtils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tables } from '@/config/environment';

export function PrivateFormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkFormAccess() {
      if (!formId || !user) return;

      try {
        console.log("[PrivateFormView] Checking form access for user", user.id, "form", formId);
        
        // First, try to fetch the form
        const { data: formData, error: formError } = await supabase
          .from(Tables.forms)
          .select('*, project_id')
          .eq('id', formId)
          .single();

        if (formError) {
          console.error("[PrivateFormView] Error fetching form:", formError);
          setAccessError("El formulario solicitado no existe o ha sido eliminado.");
          setLoading(false);
          return;
        }

        // If form is public, redirect to public form view
        if (formData.is_public) {
          console.log("[PrivateFormView] Form is public, redirecting to public view");
          navigate(`/public/forms/${formId}`);
          return;
        }

        // Check if user has access to the form's project
        const { data: projectUserData, error: projectUserError } = await supabase
          .from(Tables.project_users)
          .select('1')
          .eq('project_id', formData.project_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (projectUserError) {
          console.error("[PrivateFormView] Error checking project access:", projectUserError);
        }

        // Check if user is a project admin
        const { data: projectAdminData, error: projectAdminError } = await supabase
          .from('project_users')
          .select('id')
          .eq('project_id', formData.project_id)
          .eq('user_id', user.id)
          .eq('is_admin', true)
          .maybeSingle();

        if (projectAdminError) {
          console.error("[PrivateFormView] Error checking admin access:", projectAdminError);
        }
        // Check if user has specific role access to this form
        const { data: formRoleData, error: formRoleError } = await supabase
          .from(Tables.form_roles)
          .select('*')
          .eq('form_id', formId)
          .maybeSingle();

        if (formRoleError && formRoleError.code !== 'PGRST116') {
          console.error("[PrivateFormView] Error checking form role access:", formRoleError);
        }

        // If form requires specific roles, check if user has the required role
        let hasRoleAccess = true;
        if (formRoleData && formRoleData.role_id) {
          const { data: userRoleData, error: userRoleError } = await supabase
            .from(Tables.user_roles)
            .select('*')
            .eq('user_id', user.id)
            .eq('role_id', formRoleData.role_id)
            .eq('project_id', formData.project_id)
            .maybeSingle();

          if (userRoleError && userRoleError.code !== 'PGRST116') {
            console.error("[PrivateFormView] Error checking user role:", userRoleError);
          }

          hasRoleAccess = !!userRoleData;
        }

        // If user is a global admin, they always have access
        const { data: userProfile, error: profileError } = await supabase
          .from(Tables.profiles)
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("[PrivateFormView] Error checking user profile:", profileError);
        }

        const isGlobalAdmin = userProfile?.role === 'global_admin';

        // Determine if user has access
        const userHasAccess = isGlobalAdmin || 
                              !!projectAdminData || 
                              (!!projectUserData && hasRoleAccess);

        if (!userHasAccess) {
          console.log("[PrivateFormView] User does not have access to this form");
          setAccessError("No tienes acceso a este formulario. Por favor, contacta al administrador del proyecto.");
          setLoading(false);
          return;
        }

        // User has access, load the form
        console.log("[PrivateFormView] User has access, loading form data");
        setHasAccess(true);
        setFormData(formData);
        setLoading(false);
      } catch (error: any) {
        console.error("[PrivateFormView] Error checking form access:", error);
        setAccessError("Error al verificar acceso. Por favor, intenta nuevamente.");
        setLoading(false);
      }
    }

    if (!authLoading && !user) {
      // User is not authenticated, redirect to login
      console.log("[PrivateFormView] User not authenticated, redirecting to login");
      navigate(`/auth?redirect=/forms/${formId}`);
      return;
    }

    if (!authLoading && user && formId) {
      checkFormAccess();
    }
  }, [formId, user, authLoading, navigate]);

  // Function to handle form submission
  const submitForm = async (formValues: any) => {
    if (!formData || !formId || !user) return;

    try {
      setSubmitting(true);

      // Process any file uploads
      const processedFormData = await processUploadFields(formValues, formData.components);
      
      // Create the submission data
      const submissionData = {
        form_id: formId,
        response_data: processedFormData,
        submitted_at: new Date().toISOString(),
        is_anonymous: false,
        user_id: user.id
      };

      console.log("[PrivateFormView] Submitting form response:", {formId, userId: user.id});
      
      // Submit the form response
      const { data, error } = await supabase
        .from(Tables.form_responses)
        .insert(submissionData)
        .select('id')
        .single();

      if (error) {
        console.error("[PrivateFormView] Error submitting form:", error);
        toast({
          title: "Error al enviar formulario",
          description: error.message,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      console.log("[PrivateFormView] Form submitted successfully with ID:", data.id);
      // Store the response ID and let FormResponseHandler handle the redirect
      setSubmittedResponseId(data.id);
    } catch (error: any) {
      console.error("[PrivateFormView] Error in form submission process:", error);
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
        isPublic={false} 
      />
    );
  }

  // Show loading screen while checking authentication and form access
  if (authLoading || loading) {
    return (
      <PageContainer>
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
      </PageContainer>
    );
  }

  // Show access error if user doesn't have permission
  if (accessError) {
    return (
      <PageContainer>
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle>Acceso denegado</AlertTitle>
              <AlertDescription>{accessError}</AlertDescription>
            </Alert>
            <div className="flex justify-center mt-6">
              <Button onClick={() => navigate('/forms')}>Volver a formularios</Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Show form not found error
  if (!formData) {
    return (
      <PageContainer>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Formulario no encontrado</h1>
          <p className="mb-6">El formulario que buscas no existe o ha sido eliminado.</p>
          <Button onClick={() => navigate('/forms')}>Volver a formularios</Button>
        </div>
      </PageContainer>
    );
  }

  // Finally, render the form if user has access
  return (
    <PageContainer>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <FormRenderer
            schema={formData}
            onSubmit={submitForm}
            formId={formId || ''}
            readOnly={false}
            isPublic={false}
            isSubmitting={submitting}
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default PrivateFormView;
