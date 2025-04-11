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
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormRenderer } from "@/components/form-renderer/FormRenderer";
import { Switch } from "@/components/ui/switch";
import { Role, FormRole, Project } from "@/types/database-entities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSidebarProjects } from "@/hooks/use-sidebar-projects";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';
import { useSupabaseClientForFormEdit } from "@/hooks/useSupabaseClientForFormEdit";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { FormRoleManager } from "@/components/form-access/FormRoleManager";

const formEditSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  project_id: z.string().uuid("Debe seleccionar un proyecto válido"),
  is_public: z.boolean().default(false),
});

type FormEditData = z.infer<typeof formEditSchema>;

const FormEdit = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProjectId } = useSidebarProjects();
  const { isGlobalAdmin } = useAuth();
  const supabaseClient = useSupabaseClientForFormEdit();
  
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

  const { data: formData, isLoading: isLoadingForm, isError: isErrorForm, error: formError } = useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data, error } = await supabaseClient
        .from(Tables.forms)
        .select('*')
        .eq('id', formId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from(Tables.projects)
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isGlobalAdmin,
    staleTime: Infinity,
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
    },
    onError: (error) => {
      logger.error('Error al guardar el formulario:', error);
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios.", variant: "destructive" });
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
      setFormStatus(newStatus);
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previousForm = queryClient.getQueryData(['form', formId]);
      return { previousForm };
    },
    onSuccess: (newStatus) => {
      toast({ title: "Estado actualizado", description: `El formulario ahora está ${newStatus === 'active' ? 'activo' : 'en borrador'}.` });
    },
    onError: (err: Error, newStatus: 'active' | 'draft', context?: { previousForm?: any }) => {
      logger.error('Error al cambiar el estado del formulario:', err);
      toast({ title: "Error al actualizar estado", description: "No se pudo actualizar el estado del formulario.", variant: "destructive" });
      if (context?.previousForm) {
         const prevStatus = context.previousForm?.status || 'draft';
         setFormStatus(prevStatus);
      } else {
         queryClient.invalidateQueries({ queryKey: ['form', formId] });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] });
    },
  });

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
    const link = getPublicFormUrl();
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopied(true);
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles.",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        logger.error('Error al copiar enlace:', error);
        toast({
          title: "Error al copiar",
          description: "No se pudo copiar el enlace.",
          variant: "destructive",
        });
      });
  };

  const handleOpenForm = () => {
    window.open(getPublicFormUrl(), '_blank');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return "Activo";
      case 'draft': return "Borrador";
      case 'closed': return "Cerrado";
      default: return status;
    }
  };

  const isLoading = isLoadingForm || (isGlobalAdmin && isLoadingProjects);
  const isProcessing = isSavingForm || toggleStatusMutation.isPending;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando formulario...</div>
        </div>
      </PageContainer>
    );
  }
  
  if (isErrorForm && !formData) {
     return (
      <PageContainer>
        <div className="text-center text-red-600 p-8">
           Error al cargar los datos del formulario. Inténtalo de nuevo más tarde.
        </div>
      </PageContainer>
     );
  }

  const currentTitle = watch("title");

  return (
    <FormProvider {...methods}> 
      <PageContainer>
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">
            {`Editar formulario: ${currentTitle || formId}`}
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

        {formStatus === "active" && (
          <Card className="mb-6 border-green-100 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-green-600" />
                Enlace público para compartir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input 
                  value={getPublicFormUrl()} 
                  readOnly 
                  className="flex-1 bg-white"
                />
                <Button 
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button 
                  onClick={handleOpenForm}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
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
                    {isGlobalAdmin && (
                      <FormField
                        control={control}
                        name="project_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="project-id">Proyecto</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={isLoadingProjects || isProcessing}
                            >
                              <FormControl>
                                <SelectTrigger id="project-id">
                                  <SelectValue placeholder="Seleccionar proyecto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingProjects ? (
                                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                                ) : (projects ?? []).map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              El proyecto al que pertenece este formulario. Esto determina qué roles están disponibles para asignar.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  
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
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Control de Acceso
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
                            <FormLabel className="text-base">
                              Permitir acceso público
                            </FormLabel>
                            <FormDescription>
                              {field.value 
                                ? "Cualquier persona con el enlace podrá ver y enviar el formulario."
                                : "Solo usuarios autenticados con roles específicos podrán acceder."}
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
                  
                  {watchedIsPublic === false && (
                    <FormRoleManager
                      formId={formId!}
                      projectId={watchedProjectId}
                      isProcessing={isProcessing}
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isProcessing}
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                  >
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
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">{currentTitle}</h2>
                    {watch("description") && (
                      <p className="text-gray-600 mt-2">{watch("description")}</p>
                    )}
                  </div>
                  
                  <div className="bg-white p-4 border rounded-md">
                    {formSchemaState.components.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Este formulario aún no tiene componentes.</p>
                        <p className="text-sm mt-2">
                          Agrega componentes en la pestaña "Editor de Componentes".
                        </p>
                      </div>
                    ) : (
                      <FormRenderer 
                        formId={formId!}
                        schema={{
                          ...formSchemaState,
                          title: currentTitle,
                          description: watch("description")
                        }}
                        readOnly={true}
                      />
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setActiveTab("form-builder")}
                    variant="outline"
                    className="mr-2"
                  >
                    Volver al editor
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isProcessing}
                    className="bg-dynamo-600 hover:bg-dynamo-700"
                  >
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
