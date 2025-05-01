import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarProjects } from '@/hooks/use-sidebar-projects';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Lock, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';

// Define interface for the form data we fetch
interface FormRole { // Assuming structure from FormRoleManager.tsx context
  role_id: string;
}
interface OperationalForm {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  form_roles: FormRole[];
}

// Define interface for user's project roles
interface UserProjectRole {
  role_id: string;
}

const OperationalFormsView: React.FC = () => {
  const { user } = useAuth();
  const { currentProjectId } = useSidebarProjects();

  // Query 1: Get user's roles in the current project using 'user_roles' table
  const { data: userRolesData, isLoading: isLoadingUserRoles, error: userRolesError } = useQuery<UserProjectRole[], Error>({
    // Corrected queryKey to use 'user_roles' table
    queryKey: [Tables.user_roles, 'userRolesForProject', currentProjectId, user?.id], 
    queryFn: async () => {
      if (!currentProjectId || !user?.id) return [];
      // Corrected query to use 'user_roles' table
      const { data, error } = await supabase
        .from(Tables.user_roles) // Use the confirmed table name
        .select('role_id') // Select the role ID
        .eq('project_id', currentProjectId) // Filter by the current project
        .eq('user_id', user.id); // Filter by the current user
      
      if (error) {
        logger.error('Error fetching user roles:', error);
        throw new Error('Error al obtener roles del usuario: ' + error.message);
      }
      // Filter out potential null/undefined roles just in case
      return (data || []).filter(userRole => !!userRole.role_id) as UserProjectRole[]; 
    },
    enabled: !!currentProjectId && !!user?.id, // Only run if project and user are available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Query 2: Get active forms for the current project, including their roles
  const { data: projectFormsData, isLoading: isLoadingProjectForms, error: projectFormsError } = useQuery<OperationalForm[], Error>({
    queryKey: [Tables.forms, 'operational', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      // Use string interpolation to include the table name from environment config
      const selectString = `id, title, description, is_public, ${Tables.form_roles}(role_id)`;
      logger.debug(`[OperationalFormsView] Fetching forms with select: ${selectString}`); // Log the actual select string
      
      const { data, error } = await supabase
        .from(Tables.forms)
        .select(selectString) // Use the dynamically constructed select string
        .eq('project_id', currentProjectId)
        .eq('status', 'active'); // Only fetch active forms

      if (error) {
        logger.error('Error fetching project forms:', error);
        // Log the detailed error if possible
        logger.error('Supabase error details:', JSON.stringify(error, null, 2)); 
        throw new Error(`Error al obtener formularios del proyecto: ${error.message}`);
      }
      
      // Ensure form_roles is always an array, even if null/undefined from DB or join error
      return (data || []).map(form => {
        // Check if the related data key (Tables.form_roles) exists and is an array
        const roles = form[Tables.form_roles] && Array.isArray(form[Tables.form_roles]) 
                      ? form[Tables.form_roles] 
                      : [];
        // Remove the original potentially problematic key before spreading
        const { [Tables.form_roles]: _, ...restOfForm } = form; 
        return { ...restOfForm, form_roles: roles };
      });
    },
    enabled: !!currentProjectId, // Only run if project is available
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });

  // Combined loading and error states
  const isLoading = isLoadingUserRoles || isLoadingProjectForms;
  const error = userRolesError || projectFormsError;

  // Process forms once data is available
  const { publicForms, privateForms } = useMemo(() => {
    if (!projectFormsData || !userRolesData) {
      return { publicForms: [], privateForms: [] };
    }

    const userRoleIds = new Set(userRolesData.map(role => role.role_id));
    logger.debug(`[OperationalFormsView] User Role IDs for project ${currentProjectId}:`, Array.from(userRoleIds));

    const allPublicForms: OperationalForm[] = [];
    const accessiblePrivateForms: OperationalForm[] = [];

    projectFormsData.forEach(form => {
      if (form.is_public) {
        allPublicForms.push(form);
      } else {
        // Check access for private forms
        // Ensure form_roles is definitely an array here before mapping
        const requiredRoleIds = (form.form_roles || []).map(fr => fr.role_id); 
        if (requiredRoleIds.length === 0) {
          // No roles required, accessible by any project member (logged in)
          accessiblePrivateForms.push(form);
          logger.debug(`[OperationalFormsView] Granting access to private form (no roles): ${form.title} (${form.id})`);
        } else {
          // Check if user has at least one required role
          const hasAccess = requiredRoleIds.some(reqRoleId => userRoleIds.has(reqRoleId));
          if (hasAccess) {
            accessiblePrivateForms.push(form);
            logger.debug(`[OperationalFormsView] Granting access to private form (role match): ${form.title} (${form.id})`);
          } else {
             logger.debug(`[OperationalFormsView] Denying access to private form (no role match): ${form.title} (${form.id}). Required: ${requiredRoleIds.join(', ')}`);
          }
        }
      }
    });

    return { publicForms: allPublicForms, privateForms: accessiblePrivateForms };

  }, [projectFormsData, userRolesData, currentProjectId]); // Added currentProjectId to dependencies

  logger.debug(`[OperationalFormsView] Rendering for project: ${currentProjectId}, user: ${user?.id}. Loading: ${isLoading}, Error: ${!!error}`);
  logger.debug(`[OperationalFormsView] Forms count - Public: ${publicForms.length}, Private (Accessible): ${privateForms.length}`);

  if (!currentProjectId) {
    return (
      <PageContainer title="Formularios Disponibles">
        <Alert>
          <AlertTitle>Selecciona un Proyecto</AlertTitle>
          <AlertDescription>
            Por favor, selecciona un proyecto en la barra lateral para ver los formularios disponibles.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer title="Formularios Disponibles">
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Cargando formularios...</span>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Formularios Disponibles">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {/* @ts-ignore */}
            Ocurrió un error al cargar los formularios: {error?.message || 'Error desconocido'}
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  // Helper to render a form card
  const renderFormCard = (form: OperationalForm) => (
    <Card key={form.id}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          {form.is_public ? <Globe className="mr-2 h-5 w-5 text-blue-500"/> : <Lock className="mr-2 h-5 w-5 text-orange-500"/>}
          {form.title}
          </CardTitle>
        {form.description && (
           <CardDescription className="text-sm">{form.description}</CardDescription>
        )}
      </CardHeader>
      <CardFooter>
         {/* Link depends on whether the form is public or private */}
        <Link to={form.is_public ? `/public/forms/${form.id}` : `/forms/${form.id}`} className="w-full">
          <Button className="w-full">
            {form.is_public ? 'Abrir Formulario Público' : 'Llenar Formulario'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );

  const hasAvailableForms = publicForms.length > 0 || privateForms.length > 0;

  return (
    <PageContainer title="Formularios Disponibles">
      <div className="space-y-8">
        {/* Section for Private Forms */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
            <Lock className="mr-2 h-5 w-5 text-orange-600"/> Formularios Privados
          </h2>
          {privateForms.length === 0 ? (
            <p className="text-gray-500 italic px-4">No tienes acceso a formularios privados en este proyecto o no existen formularios privados activos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {privateForms.map(renderFormCard)}
            </div>
          )}
        </section>

        {/* Section for Public Forms */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
             <Globe className="mr-2 h-5 w-5 text-blue-600"/> Formularios Públicos
          </h2>
          {publicForms.length === 0 ? (
            <p className="text-gray-500 italic px-4">No hay formularios públicos activos en este proyecto.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {publicForms.map(renderFormCard)}
            </div>
          )}
        </section>
        
         {/* Message if no forms are available at all */}
         {!isLoading && !error && !hasAvailableForms && (
          <Alert className="mt-6">
            <FileText className="h-4 w-4" />
            <AlertTitle>Sin Formularios Disponibles</AlertTitle>
            <AlertDescription>
              No se encontraron formularios activos (públicos o privados a los que tengas acceso) en este proyecto.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </PageContainer>
  );
};

export default OperationalFormsView; 