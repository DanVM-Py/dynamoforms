import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormRenderer } from '@/components/forms/form-renderer/FormRenderer';
import { FormResponseHandler } from '@/components/forms/form-renderer/FormResponseHandler';
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
import { useQuery } from '@tanstack/react-query';

// Define interface for user roles needed in this component
interface UserProjectRole {
  role_id: string;
}

// Define interface for form data including roles
interface FormDataWithRoles {
  id: string;
  project_id: string;
  is_public: boolean;
  form_roles: { role_id: string }[];
  // Add other fields from your forms table as needed
  [key: string]: any; // Allow other properties
}

export function PrivateFormView() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, isGlobalAdmin } = useAuth();
  
  const [formData, setFormData] = useState<FormDataWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  
  // Get the project ID from the form data once it's loaded
  const formProjectId = formData?.project_id;

  // Query to get user's roles for the specific project of this form
  const { data: userRolesData, isLoading: isLoadingUserRoles } = useQuery<UserProjectRole[], Error>({
    queryKey: [Tables.user_roles, 'userRolesForProject', formProjectId, user?.id],
    queryFn: async () => {
      if (!formProjectId || !user?.id) return [];
      logger.debug(`[PrivateFormView] Fetching user roles for project ${formProjectId}`);
      const { data, error } = await supabase
        .from(Tables.user_roles)
        .select('role_id')
        .eq('project_id', formProjectId)
        .eq('user_id', user.id);
      
      if (error) {
        logger.error('[PrivateFormView] Error fetching user roles:', error);
        throw new Error('Error al obtener roles del usuario: ' + error.message);
      }
      return (data || []).filter(ur => !!ur.role_id) as UserProjectRole[];
    },
    enabled: !!formProjectId && !!user?.id && !isGlobalAdmin, // Enable only when formProjectId is known and user is logged in (and not global admin)
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
      async function checkFormAccess() {
        if (!formId || !user) return;
 
      logger.debug(`[PrivateFormView] Checking access for form ${formId} and user ${user.id}`);
      setLoading(true);
      setAccessError(null);
      setHasAccess(false);
      // Reset form data on each check
      setFormData(null); 

      try {
        // 1. Obtener datos del formulario Y sus roles requeridos Y el nombre del proyecto
        // Corrected to use Tables.projects for the relation name
        const formSelectString = `*, ${Tables.projects}(name), ${Tables.form_roles}(role_id)`;
        logger.debug(`[PrivateFormView] Fetching form data with select: ${formSelectString}`);
        
        const { data: fetchedFormData, error: formError } = await supabase
          .from(Tables.forms)
          .select(formSelectString)
          .eq('id', formId)
          .single();

        if (formError) {
          logger.error("[PrivateFormView] Error fetching form data:", formError);
           if (formError.code === 'PGRST116') {
             throw new Error("Formulario no encontrado.");
           } else {
             throw new Error(`Error al cargar el formulario: ${formError.message}`);
           }
        }
        
        // Process fetched data to ensure form_roles and project data are handled correctly
        const rolesData = fetchedFormData[Tables.form_roles] && Array.isArray(fetchedFormData[Tables.form_roles])
                          ? fetchedFormData[Tables.form_roles]
                          : [];
        // Extract project data correctly using the dynamic key
        const projectData = fetchedFormData[Tables.projects] || null; 
        const { 
          [Tables.form_roles]: _, 
          [Tables.projects]: __, 
          ...restOfData 
        } = fetchedFormData;
        
        // Reconstruct the object with consistent property names ('project' and 'form_roles')
        const processedFormData: FormDataWithRoles = { 
          ...restOfData, 
          project: projectData, // Add project data under the 'project' key
          form_roles: rolesData 
        };

        logger.debug("[PrivateFormView] Processed form data fetched:", processedFormData);
        setFormData(processedFormData); // Set processed data to state

        // --- Access Check Logic --- 
        // This logic runs AFTER form data is fetched. We wait for userRolesData if needed.

        // 2. Si es público, redirigir (check remains the same)
        if (processedFormData.is_public) {
          logger.info("[PrivateFormView] Form is public, redirecting...");
          navigate(`/public/forms/${formId}`, { replace: true });
          // No need to setLoading(false) here as navigate will unmount
          return; 
        }

        // 3. Verificar Acceso
        // Si es Global Admin, tiene acceso directo
        if (isGlobalAdmin) {
          logger.info("[PrivateFormView] Global admin access granted.");
          setHasAccess(true);
          setLoading(false);
          return;
        }
        
        // --- Checks for non-Global Admins --- 
        // We need project membership info and potentially user roles.

        // Fetch project membership (is_admin status)
        const { data: projectUserData, error: projectUserError } = await supabase
          .from(Tables.project_users)
          .select('is_admin')
          .eq('project_id', processedFormData.project_id)
          .eq('user_id', user.id)
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
           setLoading(false);
           return;
         }
         
        // Si es miembro del proyecto (no admin), verificar roles.
        // userRolesData should be available here because the query is enabled by formProjectId
        if (isProjectMember) {
           if (isLoadingUserRoles) {
             // If user roles are still loading, keep the main loading state true
             logger.debug("[PrivateFormView] Waiting for user roles to load...");
             return; // Re-run useEffect when isLoadingUserRoles changes
           }
           
           // Roles required by the form (already fetched)
           const requiredRoleIds = (processedFormData.form_roles || []).map(fr => fr.role_id);
           logger.trace("[PrivateFormView] Form requires roles:", requiredRoleIds);
           
           // Si el formulario no requiere roles específicos, el miembro tiene acceso
           if (requiredRoleIds.length === 0) {
              logger.debug("[PrivateFormView] Form requires no specific roles, project member access granted.");
              setHasAccess(true);
              setLoading(false);
              return;
            }
            
           // Si requiere roles, verificar si el usuario tiene alguno de ellos
           // Use userRolesData from the useQuery hook
           const userRoleIds = new Set((userRolesData || []).map(role => role.role_id));
           const hasRequiredRole = requiredRoleIds.some(reqRoleId => userRoleIds.has(reqRoleId));
           
           logger.info(`[PrivateFormView] User roles check: User has roles [${Array.from(userRoleIds).join(', ')}]. Form requires [${requiredRoleIds.join(', ')}]. Access granted: ${hasRequiredRole}`);
           
           if (hasRequiredRole) {
             logger.info("[PrivateFormView] User has required role, access granted.");
             setHasAccess(true);
             setLoading(false);
             return;
           }
        }

        // Si llegamos aquí, no es Global Admin, ni Project Admin, 
        // ni miembro con el rol requerido (o no es miembro)
        logger.warn("[PrivateFormView] Access Denied: User does not meet role requirements or is not a project member.");
        throw new Error("No tienes permiso para acceder a este formulario. Verifica tus roles asignados o contacta al administrador del proyecto.");

      } catch (error: any) {
        logger.error("[PrivateFormView] Access check failed:", error);
        setAccessError(error.message || "Error al verificar acceso. Intenta nuevamente.");
        setFormData(null); // Clear potentially incomplete form data on error
        setLoading(false);
      }
    }

    // Redirigir si no está autenticado (logic remains the same)
    if (!authLoading && !user) {
      logger.warn("[PrivateFormView] User not authenticated, redirecting to login");
      navigate(`/auth?redirect=/forms/${formId}`, { replace: true });
      return;
    }

    // Ejecutar chequeo de acceso si el usuario está listo y hay formId
    // UseEffect will re-run if userRolesData loading state changes
    if (!authLoading && user && formId) {
      checkFormAccess();
    }
    
  // Update dependencies: Add userRolesData loading state
  }, [formId, user, authLoading, isGlobalAdmin, navigate, isLoadingUserRoles, userRolesData]); 

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

  // --- Render Logic --- //

  // Combined loading state
  const showLoading = loading || authLoading || (formData && !isGlobalAdmin && !formData.is_public && isLoadingUserRoles && !accessError);

  if (showLoading) {
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

  // Render form only if access is granted and form data is loaded
  if (hasAccess && formData) {
    // If already submitted, show success message
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
    
    // Otherwise, show the form renderer
    return (
      <PageContainer title={formData?.title || 'Formulario'}>
        <Card>
          <CardHeader>
             {formData.title && <CardTitle>{formData.title}</CardTitle>}
             {formData.description && <CardDescription>{formData.description}</CardDescription>}
          </CardHeader>
          <CardContent>
             <FormRenderer
               schema={formData.schema} // Assuming schema is part of formData
               onSubmit={handleFormSubmit}
               isSubmitting={submitting}
               formId={formId || ''}
             />
           </CardContent>
         </Card>
       </PageContainer>
     );
  }

  // Fallback if something unexpected happens (should not be reached if logic is correct)
  return (
     <PageContainer className="flex justify-center items-center h-screen">
        <Alert variant="destructive">
          <AlertTitle>Error Inesperado</AlertTitle>
          <AlertDescription>No se pudo determinar el estado del formulario. Contacta al soporte.</AlertDescription>
        </Alert>
     </PageContainer>
   );
}

export default PrivateFormView;
