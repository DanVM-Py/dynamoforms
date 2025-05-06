import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Share2, Copy, Check, ExternalLink, Shield, Table, X } from "lucide-react";
import { FormBuilder, FormSchema } from "@/components/forms/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormRenderer } from "@/components/forms/form-renderer/FormRenderer";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';
import { useSupabaseClientForFormEdit } from "@/hooks/useSupabaseClientForFormEdit";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { FormRoleManager } from "@/components/forms/form-access/FormRoleManager";

const formEditSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  project_id: z.string().uuid("Debe seleccionar un proyecto válido"),
  is_public: z.boolean().default(false),
});

type FormEditData = z.infer<typeof formEditSchema>;

const FormEdit = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const formId = routeId;
  const supabaseClient = useSupabaseClientForFormEdit();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isGlobalAdmin, currentProjectId } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("basic-info");
  const [copied, setCopied] = useState(false);
  const [formSchemaState, setFormSchemaState] = useState<FormSchema>({ components: [], groups: [] });
  const [formStatus, setFormStatus] = useState<string>("draft");

  const methods = useForm<FormEditData>({
    resolver: zodResolver(formEditSchema),
    defaultValues: {
      title: "",
      description: "",
      project_id: "",
      is_public: false,
    },
  });
  const { control, handleSubmit, reset, formState: { errors, isSubmitting: isSavingForm }, watch } = methods;

  const watchedProjectId = watch("project_id");
  const watchedIsPublic = watch("is_public");
  const currentTitle = watch("title");

  logger.debug(`[FormEdit Step 5] Rendering with formId: ${formId}`);

  const { data: formData, isLoading: isLoadingForm, isError: isErrorForm, error: formError } = useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      console.log(`--- FORM EDIT QUERY FN EXECUTING FOR formId: ${formId} ---`); 
      
      logger.debug(`[FormEdit Query] Running for formId: ${formId}`);
      logger.debug(`[FormEdit Query] INSIDE queryFn - supabaseClient defined: ${supabaseClient ? 'Yes' : 'No'}`);
      if (!formId) {
        logger.warn("[FormEdit Query] No formId provided.");
        return null;
      }
      try {
        const client = supabaseClient;
        logger.debug("[FormEdit Query] Using Supabase client:", client === supabase ? "Standard" : "Admin (if hook reverted)");
        
        logger.debug(`[FormEdit Query] Attempting to fetch from ${Tables.forms} with id: ${formId}`);
        const { data, error } = await client 
          .from(Tables.forms)
          .select('*')
          .eq('id', formId)
          .single();

        logger.debug("[FormEdit Query] Supabase call result - data:", data); 
        logger.debug("[FormEdit Query] Supabase call result - error:", error); 

        if (error && error.code !== 'PGRST116') {
          logger.error("[FormEdit Query] Supabase query error (excluding PGRST116):", error);
          throw error;
        }
        
        if (!data) {
           logger.warn(`[FormEdit Query] No data returned from Supabase for formId: ${formId}. Result was null/undefined (potentially RLS or non-existent ID).`);
        }
        
        return data;
      } catch (catchError: any) {
         logger.error("[FormEdit Query] Error caught in queryFn:", catchError);
         throw catchError;
      }
    },
    enabled: !!formId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const saveFormMutation = useMutation({
    mutationFn: async (dataToSave: FormEditData & { schema: FormSchema }) => {
      if (!formId) throw new Error("Form ID no está disponible");
      const { error } = await supabaseClient
        .from(Tables.forms)
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', formId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Formulario guardado", description: "Los cambios han sido guardados exitosamente." });
       queryClient.invalidateQueries({ queryKey: ['form', formId] });
    },
    onError: (error: Error) => {
      logger.error('Error al guardar el formulario:', error);
      toast({ title: "Error al guardar", description: error.message || "No se pudieron guardar los cambios.", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'draft') => {
      if (!formId) throw new Error("Form ID no está disponible");
      const { error } = await supabaseClient
        .from(Tables.forms)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', formId);
      if (error) throw error;
      return newStatus;
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previousForm = queryClient.getQueryData(['form', formId]);
      setFormStatus(newStatus); 
      return { previousForm };
    },
    onSuccess: (newStatus) => {
      toast({ title: "Estado actualizado", description: `El formulario ahora está ${newStatus === 'active' ? 'activo' : 'en borrador'}.` });
    },
    onError: (err: Error, newStatus: 'active' | 'draft', context?: { previousForm?: any }) => {
      logger.error('Error al cambiar el estado del formulario:', err);
      toast({ title: "Error al actualizar estado", description: err.message || "No se pudo actualizar el estado del formulario.", variant: "destructive" });
      if (context?.previousForm) {
         const prevStatus = context.previousForm?.status || 'draft';
         setFormStatus(prevStatus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] });
    },
  });

  const isProcessing = isSavingForm || toggleStatusMutation.isPending;

  useEffect(() => {
    if (formData) {
      logger.debug('[FormEdit] Populating form with formData:', formData);
      reset({
        title: formData.title || '',
        description: formData.description || '',
        project_id: formData.project_id || '',
        is_public: formData.is_public || false,
      });
      setFormSchemaState(formData.schema || { components: [], groups: [] });
      setFormStatus(formData.status || 'draft');

      if (currentProjectId && formData.project_id && formData.project_id !== currentProjectId) {
        logger.warn(`[FormEdit] Mismatch: Form project ID (${formData.project_id}) vs Current context project ID (${currentProjectId}). Redirecting.`);
        toast({ 
          title: "Acceso denegado", 
          description: "Este formulario pertenece a un proyecto diferente.", 
          variant: "destructive" 
        });
        navigate('/forms-management', { replace: true });
      }
    }
  }, [formData, reset, currentProjectId, navigate, toast]);

  const onSubmit = (formData: FormEditData) => {
    saveFormMutation.mutate({ ...formData, schema: formSchemaState });
  };

  const handleToggleFormStatus = () => {
    const newStatus = formStatus === 'draft' ? 'active' : 'draft';
    toggleStatusMutation.mutate(newStatus);
  };

  const handleSchemaChange = (updatedSchema: FormSchema) => {
    setFormSchemaState(updatedSchema);
  };

  const getPublicFormUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/forms/${formId}`;
  };

  const handleCopyLink = () => {
    // ... lógica existente ...
  };

  const handleOpenForm = () => {
    // ... lógica existente ...
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return "Activo";
      case 'draft': return "Borrador";
      case 'closed': return "Cerrado";
      default: return status;
    }
  };

  const isLoading = isLoadingForm;

  logger.debug('[FormEdit] isLoadingForm:', isLoadingForm);
  logger.debug('[FormEdit] isErrorForm:', isErrorForm);
  logger.debug('[FormEdit] formData (before render):', formData);

  if (isLoading) {
    // ... render de carga ...
  }
  if (isErrorForm && !formData) {
    // ... render de error ...
  }

  return (
    <FormProvider {...methods}>
      <PageContainer>
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate('/forms-management')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">
             {`Editar formulario: ${currentTitle || (formData?.title) || formId}`}
          </h1>
          
          <div className="ml-auto flex items-center gap-3">
             <span className={formStatus === "active" ? "text-green-600" : "text-gray-500"}>
               {getStatusLabel(formStatus)}
             </span>
             <Switch
               checked={formStatus === "active"}
               onCheckedChange={handleToggleFormStatus}
               disabled={isProcessing}
               aria-label="Estado del formulario"
               className="data-[state=checked]:bg-green-500"
             />
          </div>
        </div>

        {formStatus === "active" && watchedIsPublic && (
          <Card className="mb-6 border-green-100 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-green-600" /> Enlace público para compartir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input value={getPublicFormUrl()} readOnly className="flex-1 bg-white"/>
                <Button onClick={handleCopyLink} variant="outline" className="flex-shrink-0">
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button onClick={handleOpenForm} variant="outline" className="flex-shrink-0">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir
                </Button>
              </div>
              <p className="mt-2 text-sm text-green-600">
                Este formulario está activo y puede ser compartido con cualquier persona usando este enlace.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic-info">Información Básica</TabsTrigger>
              <TabsTrigger value="access-control">Control de Acceso</TabsTrigger>
              <TabsTrigger value="form-builder">Editor de Componentes</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <TabsContent value="basic-info">
                <Card>
                  <CardHeader>
                    <CardTitle>Información básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="title">Título</FormLabel>
                          <FormControl>
                            <Input 
                              id="title" 
                              placeholder="Título del formulario" 
                              {...field}
                              disabled={isProcessing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="description">Descripción</FormLabel>
                          <FormControl>
                            <Textarea 
                              id="description" 
                              placeholder="Descripción del formulario (opcional)"
                              rows={4}
                              {...field}
                              value={field.value ?? ''}
                              disabled={isProcessing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit"
                      disabled={isProcessing}
                      className="bg-dynamo-600 hover:bg-dynamo-700"
                    >
                      {isSavingForm ? 'Guardando...' : 'Guardar cambios'}
                      {!isSavingForm && <Save className="ml-2 h-4 w-4" />}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </form>
            
            <TabsContent value="access-control">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" /> Control de Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Acceso público</h3>
                    <FormField
                      control={control}
                      name="is_public"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Permitir acceso público</FormLabel>
                            <FormDescription>
                              {field.value ? "Cualquier persona con el enlace podrá ver y enviar el formulario." : "Solo usuarios autenticados con roles específicos podrán acceder."}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isProcessing}
                              aria-label="Permitir acceso público"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {watchedIsPublic === false && formData?.project_id && (
                    <FormRoleManager
                      formId={formId!}
                      projectId={formData.project_id}
                      isProcessing={isProcessing}
                    />
                  )}
                </CardContent>
                 <CardFooter>
                   <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isProcessing} className="bg-dynamo-600 hover:bg-dynamo-700">
                     {isSavingForm ? 'Guardando...' : 'Guardar cambios'}
                     {!isSavingForm && <Save className="ml-2 h-4 w-4" />}
                   </Button>
                 </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="form-builder">
              <FormBuilder 
                schema={formSchemaState} 
                onChange={handleSchemaChange}
                onSave={handleSubmit(onSubmit)}
                saving={isSavingForm}
              />
            </TabsContent>
            
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Vista previa del formulario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 border rounded-md">
                    {(formSchemaState?.components?.length ?? 0) === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                         <p>Este formulario aún no tiene componentes.</p>
                         <p className="text-sm mt-2">Agrega componentes en la pestaña "Editor de Componentes".</p>
                      </div>
                    ) : (
                      <FormRenderer 
                        formId={formId!}
                        schema={{ ...formSchemaState, title: currentTitle, description: watch("description") }}
                        readOnly={true}
                      />
                    )}
                  </div>
                </CardContent>
                 <CardFooter>
                   <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isProcessing} className="bg-dynamo-600 hover:bg-dynamo-700">
                     {isSavingForm ? 'Guardando...' : 'Guardar cambios'}
                     {!isSavingForm && <Save className="ml-2 h-4 w-4" />}
                   </Button>
                 </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </FormProvider>
  );
};

export default FormEdit;
