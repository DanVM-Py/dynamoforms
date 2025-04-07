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
import { AlertCircle, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tables } from '@/config/environment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { logger } from '@/lib/logger';

export function PrivateFormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, isGlobalAdmin } = useAuth();
  
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
      async function checkFormAccess() {
        if (!formId || !user) return;
 
      logger.debug(`[PrivateFormView] Checking access for form ${formId} and user ${user.id}`);
      setLoading(true);
      setAccessError(null);
      setHasAccess(false);

      try {
        // 1. Obtener datos del formulario
        const { data: formData, error: formError } = await supabase
          .from(Tables.forms)
          .select('*, project: projects(name)')
          .eq('id', formId)
          .single();

        if (formError) {
          logger.error("[PrivateFormView] Error fetching form data:", formError);
           if (formError.code === 'PGRST116') {
             throw new Error("Formulario no encontrado.");
           } else {
             throw new Error("Error al cargar el formulario.");
           }
        }

        logger.debug("[PrivateFormView] Form data fetched:", formData);

        // 2. Si es público, redirigir
        if (formData.is_public) {
          logger.info("[PrivateFormView] Form is public, redirecting to public view");
          navigate(`/public/forms/${formId}`, { replace: true });
          return;
        }

        // 3. Verificar Acceso
        // Si es Global Admin, tiene acceso directo
        if (isGlobalAdmin) {
          logger.info("[PrivateFormView] Global admin access granted.");
          setHasAccess(true);
          setFormData(formData);
          setLoading(false);
          return;
        }
        
        // Si no es Global Admin, verificar acceso al proyecto
        const { data: projectUserData, error: projectUserError } = await supabase
          .from(Tables.project_users)
          .select('is_admin')
          .eq('project_id', formData.project_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (projectUserError) {
          logger.error("[PrivateFormView] Error checking project access:", projectUserError);
          throw new Error("Error al verificar el acceso al proyecto.");
        }
        
        const isProjectMember = !!projectUserData;
        const isProjectAdmin = projectUserData?.is_admin === true;
        logger.info(`[PrivateFormView] Project access check: isMember=${isProjectMember}, isAdmin=${isProjectAdmin}`);

        // Si es admin del proyecto, tiene acceso
        if (isProjectAdmin) {
           logger.info("[PrivateFormView] Project admin access granted.");
           setHasAccess(true);
           setFormData(formData);
           setLoading(false);
           return;
         }
         
        // Si es miembro del proyecto (no admin), verificar roles
        if (isProjectMember) {
           // Obtener los roles requeridos por el formulario
           const { data: formRolesData, error: formRolesError } = await supabase
             .from(Tables.form_roles)
             .select('role_id')
             .eq('form_id', formId);
             
           if (formRolesError) {
              logger.error("[PrivateFormView] Error fetching required form roles:", formRolesError);
              throw new Error("Error al verificar los roles del formulario.");
            }
            
           const requiredRoleIds = formRolesData?.map(fr => fr.role_id) || [];
           logger.trace("[PrivateFormView] Form requires roles:", requiredRoleIds);
           
           // Si el formulario no requiere roles específicos, el miembro tiene acceso
           if (requiredRoleIds.length === 0) {
              logger.debug("[PrivateFormView] Form requires no specific roles, project member access granted.");
              setHasAccess(true);
              setFormData(formData);
              setLoading(false);
              return;
            }
            
           // Si requiere roles, verificar si el usuario tiene alguno de ellos en este proyecto
           const { data: userRolesData, error: userRolesError } = await supabase
             .from(Tables.user_roles)
             .select('role_id')
             .eq('user_id', user.id)
             .eq('project_id', formData.project_id)
             .in('role_id', requiredRoleIds);
             
           if (userRolesError) {
             logger.error("[PrivateFormView] Error fetching user roles:", userRolesError);
             throw new Error("Error al verificar los roles del usuario.");
           }
           
           const hasRequiredRole = (userRolesData?.length || 0) > 0;
           logger.info(`[PrivateFormView] User has required role check: ${hasRequiredRole}`);
           
           if (hasRequiredRole) {
             logger.info("[PrivateFormView] User has required role, access granted.");
             setHasAccess(true);
             setFormData(formData);
             setLoading(false);
             return;
           }
        }

        // Si llegamos aquí, no es Global Admin, ni Project Admin, 
        // ni miembro con el rol requerido (o no es miembro)
        logger.warn("[PrivateFormView] User does not have sufficient access.");
        throw new Error("No tienes permiso para acceder a este formulario. Contacta al administrador del proyecto.");

      } catch (error: any) {
        logger.error("[PrivateFormView] Access check failed:", error);
        setAccessError(error.message || "Error al verificar acceso. Intenta nuevamente.");
        setLoading(false);
      }
    }

    // Redirigir si no está autenticado
    if (!authLoading && !user) {
      logger.warn("[PrivateFormView] User not authenticated, redirecting to login");
      navigate(`/auth?redirect=/forms/${formId}`, { replace: true });
      return;
    }

    // Ejecutar chequeo de acceso si el usuario está listo y hay formId
    if (!authLoading && user && formId) {
      checkFormAccess();
    }
    
  // Depender de formId, user, authLoading, isGlobalAdmin y navigate
  }, [formId, user, authLoading, isGlobalAdmin, navigate]);

  const handleFormSubmit = async (submissionData: any) => {
    if (!formId || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from(Tables.form_responses)
        .insert({
          form_id: formId,
          user_id: user.id,
          response_data: submissionData,
          project_id: formData?.project_id
        })
        .select('id')
        .single();

      if (error) throw error;

      setSubmittedResponseId(data.id);
      toast({ title: "Formulario enviado", description: "Tu respuesta ha sido registrada exitosamente." });
    } catch (error: any) {
      logger.error('Error submitting form response:', error);
      toast({ title: "Error al enviar", description: error.message || "No se pudo guardar tu respuesta.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <PageContainer className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-dynamo-600" />
        <p className="ml-2">Verificando acceso y cargando formulario...</p>
      </PageContainer>
    );
  }

  if (accessError) {
    return (
      <PageContainer className="flex justify-center items-center h-screen">
         <Card className="w-full max-w-md shadow-lg border-red-200">
           <CardHeader className="text-center">
             <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
             <CardTitle className="mt-4 text-xl font-semibold text-red-700">Acceso Denegado</CardTitle>
             <CardDescription className="text-red-600">{accessError}</CardDescription>
           </CardHeader>
           <CardContent className="text-center">
             <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
           </CardContent>
         </Card>
       </PageContainer>
    );
  }

  if (!hasAccess || !formData) {
     // Este caso no debería ocurrir si la lógica es correcta, pero por si acaso
     return (
       <PageContainer className="flex justify-center items-center h-screen">
          <p>Error inesperado al cargar el formulario.</p>
       </PageContainer>
     );
   }

  // Si ya envió, mostrar mensaje de éxito
  if (submittedResponseId) {
    return (
      <PageContainer className="flex justify-center items-center h-screen">
         <Card className="w-full max-w-md shadow-lg border-green-200">
           <CardHeader className="text-center">
             {/* Icono de éxito */}
             <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
             <CardTitle className="mt-4 text-xl font-semibold text-green-700">¡Enviado Correctamente!</CardTitle>
             <CardDescription className="text-green-600">Tu respuesta al formulario "{formData.title}" ha sido registrada.</CardDescription>
           </CardHeader>
           <CardContent className="text-center">
             <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
           </CardContent>
         </Card>
      </PageContainer>
    );
  }

  // Renderizar el formulario
  return (
    <PageContainer title={formData.title}>
       <Card className="max-w-4xl mx-auto">
         <CardHeader>
           <CardTitle>{formData.title}</CardTitle>
           {formData.description && <CardDescription>{formData.description}</CardDescription>}
         </CardHeader>
         <CardContent>
           <FormRenderer 
             schema={formData.schema} 
             onSubmit={handleFormSubmit} 
             isSubmitting={submitting} 
             formId={formId || ''} 
             readOnly={false}
             isPublic={false}
           />
         </CardContent>
       </Card>
    </PageContainer>
  );
}

export default PrivateFormView;
