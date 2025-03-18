import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateTaskTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

// Define schema for task template form
const taskTemplateSchema = z.object({
  title: z.string().min(2, { message: "El título debe tener al menos 2 caracteres" }),
  description: z.string().optional(),
  source_form_id: z.string().uuid({ message: "Selecciona un formulario de origen válido" }),
  target_form_id: z.string().uuid({ message: "Selecciona un formulario de destino válido" }),
  assignment_type: z.enum(["static", "dynamic"]),
  assignee_form_field: z.string().optional(),
  default_assignee: z.string().uuid().optional(),
  due_days: z.number().min(0).optional(),
  is_active: z.boolean().default(true),
  inheritance_mapping: z.record(z.string()).optional(),
});

type TaskTemplateFormValues = z.infer<typeof taskTemplateSchema>;

// Component for field mapping between forms
interface FieldMappingProps {
  sourceFormId: string;
  targetFormId: string;
  initialMapping?: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

const FieldMapping: React.FC<FieldMappingProps> = ({ 
  sourceFormId, 
  targetFormId, 
  initialMapping = {}, 
  onChange 
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [sourceSchema, setSourceSchema] = useState<any>(null);
  const [targetSchema, setTargetSchema] = useState<any>(null);
  const [compatibleFields, setCompatibleFields] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch forms schemas
  useEffect(() => {
    const fetchFormSchemas = async () => {
      setLoading(true);
      try {
        if (!sourceFormId || !targetFormId) {
          return;
        }

        // Fetch source form schema
        const { data: sourceForm, error: sourceError } = await supabase
          .from('forms')
          .select('schema')
          .eq('id', sourceFormId)
          .single();

        if (sourceError) throw sourceError;

        // Fetch target form schema
        const { data: targetForm, error: targetError } = await supabase
          .from('forms')
          .select('schema')
          .eq('id', targetFormId)
          .single();

        if (targetError) throw targetError;

        setSourceSchema(sourceForm.schema);
        setTargetSchema(targetForm.schema);

        // Calculate compatible fields
        const compatibilityMap = calculateCompatibleFields(sourceForm.schema, targetForm.schema);
        setCompatibleFields(compatibilityMap);
      } catch (error) {
        console.error("Error fetching form schemas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormSchemas();
  }, [sourceFormId, targetFormId]);

  // Determine which fields are compatible between forms
  const calculateCompatibleFields = (sourceSchema: any, targetSchema: any) => {
    const result: Record<string, string[]> = {};

    if (!sourceSchema?.components || !targetSchema?.components) {
      return result;
    }

    // Map each target field to source fields of compatible types
    targetSchema.components.forEach((targetComp: any) => {
      if (!targetComp.key) return;

      const targetType = targetComp.type;
      const compatibleSourceFields: string[] = [];

      sourceSchema.components.forEach((sourceComp: any) => {
        if (!sourceComp.key) return;

        // Fields are compatible if they are the same type
        if (sourceComp.type === targetType) {
          compatibleSourceFields.push(sourceComp.key);
        }
      });

      if (compatibleSourceFields.length > 0) {
        result[targetComp.key] = compatibleSourceFields;
      }
    });

    return result;
  };

  // Handle field mapping change
  const handleFieldChange = (targetField: string, sourceField: string) => {
    const newMapping = { ...mapping };
    
    if (sourceField === "") {
      // If empty selection, remove the mapping
      delete newMapping[targetField];
    } else {
      // Otherwise, set the mapping
      newMapping[targetField] = sourceField;
    }
    
    setMapping(newMapping);
    onChange(newMapping);
  };

  // Get label for a field from schema
  const getFieldLabel = (schema: any, fieldKey: string) => {
    if (!schema?.components) return fieldKey;
    
    const field = schema.components.find((c: any) => c.key === fieldKey);
    return field?.label || fieldKey;
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground">Cargando esquemas de formularios...</div>;
  }

  if (!sourceSchema?.components || !targetSchema?.components) {
    return <div className="text-muted-foreground py-4">
      No se pudieron cargar los esquemas de los formularios.
    </div>;
  }

  if (Object.keys(compatibleFields).length === 0) {
    return <div className="text-amber-500 py-4 flex items-center">
      <Info className="h-4 w-4 mr-2" />
      No se encontraron campos compatibles entre los formularios.
    </div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="text-sm text-muted-foreground mb-4">
        <p>Selecciona cómo mapear campos del formulario origen al formulario destino.</p>
      </div>
      
      <div className="space-y-4">
        {Object.entries(compatibleFields).map(([targetField, sourceFields]) => (
          <div key={targetField} className="grid grid-cols-3 items-center gap-4">
            <div>
              <Label>{getFieldLabel(targetSchema, targetField)}</Label>
              <p className="text-xs text-muted-foreground">{targetField}</p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <Select
                value={mapping[targetField] || ""}
                onValueChange={(value) => handleFieldChange(targetField, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No heredar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No heredar</SelectItem>
                  {sourceFields.map((sourceField) => (
                    <SelectItem key={sourceField} value={sourceField}>
                      {getFieldLabel(sourceSchema, sourceField)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CreateTaskTemplateModal = ({ 
  open, 
  onOpenChange, 
  projectId,
  onSuccess
}: CreateTaskTemplateModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState('general');
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  
  // Setup form with react-hook-form
  const form = useForm<TaskTemplateFormValues>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      source_form_id: "",
      target_form_id: "",
      assignment_type: "static",
      assignee_form_field: "",
      default_assignee: "",
      due_days: 7,
      is_active: true,
      inheritance_mapping: {}
    },
  });

  // Watch form values for conditional rendering
  const watchSourceFormId = form.watch('source_form_id');
  const watchTargetFormId = form.watch('target_form_id');
  const watchAssignmentType = form.watch('assignment_type');

  // Fetch project forms for selection
  const { data: forms, isLoading: isLoadingForms } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('project_id', projectId)
        .order('title', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open,
  });

  // Fetch project users for assignee selection
  const { data: projectUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          user_id,
          profiles:user_id (id, name, email)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active');
        
      if (error) throw error;
      return data.map(pu => pu.profiles) || [];
    },
    enabled: !!projectId && open,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setInheritanceMapping({});
      setCurrentTab('general');
    }
  }, [open, form]);

  // Update mapping when source/target forms change
  useEffect(() => {
    if (watchSourceFormId && watchTargetFormId) {
      setInheritanceMapping({});
      form.setValue('inheritance_mapping', {});
    }
  }, [watchSourceFormId, watchTargetFormId, form]);

  // Handle field mapping changes
  const handleMappingChange = (newMapping: Record<string, string>) => {
    setInheritanceMapping(newMapping);
    form.setValue('inheritance_mapping', newMapping);
  };

  // Mutation for creating a task template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TaskTemplateFormValues) => {
      const templateData = {
        ...data,
        project_id: projectId,
        inheritance_mapping: data.inheritance_mapping || {}
      };

      const { error } = await supabase
        .from('task_templates')
        .insert(templateData);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
      toast({
        title: "Plantilla creada",
        description: "La plantilla de tarea se ha creado correctamente.",
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al crear la plantilla.",
        variant: "destructive"
      });
    },
  });

  // Submit handler
  const onSubmit = (values: TaskTemplateFormValues) => {
    // Include inheritance mapping
    const dataWithMapping = {
      ...values,
      inheritance_mapping: inheritanceMapping
    };
    
    createTemplateMutation.mutate(dataWithMapping);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
          <DialogDescription>
            Configura una plantilla para generar tareas automáticamente cuando se complete un formulario.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger 
              value="mapping" 
              disabled={!watchSourceFormId || !watchTargetFormId}
            >
              Mapeo de Campos
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <TabsContent value="general" className="space-y-4 mt-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título de la plantilla" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción de la plantilla"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source_form_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formulario de Origen</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {forms?.map(form => (
                              <SelectItem key={form.id} value={form.id}>
                                {form.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Formulario que al ser completado generará la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="target_form_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formulario de Destino</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {forms?.map(form => (
                              <SelectItem key={form.id} value={form.id}>
                                {form.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Formulario que debe ser completado como parte de la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Asignación</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="static">Estática</SelectItem>
                            <SelectItem value="dynamic">Dinámica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {watchAssignmentType === 'static' 
                            ? 'Asignación a un usuario específico' 
                            : 'Asignación basada en un valor del formulario'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchAssignmentType === "static" ? (
                    <FormField
                      control={form.control}
                      name="default_assignee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asignar a</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectUsers?.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Usuario al que se asignará la tarea
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="assignee_form_field"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campo para Asignación</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del campo" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            Nombre del campo que contiene el email del asignado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="due_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días para completar</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                            value={field.value === undefined ? 7 : field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Número de días para completar la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Activo</FormLabel>
                          <FormDescription>
                            Activar la plantilla de tarea
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-2">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Mapeo de Campos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configura cómo los campos del formulario origen poblarán automáticamente el formulario destino.
                  </p>

                  {watchSourceFormId && watchTargetFormId ? (
                    <FieldMapping 
                      sourceFormId={watchSourceFormId} 
                      targetFormId={watchTargetFormId} 
                      initialMapping={inheritanceMapping}
                      onChange={handleMappingChange}
                    />
                  ) : (
                    <div className="text-amber-500 flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      Selecciona los formularios de origen y destino primero.
                    </div>
                  )}
                </div>
              </TabsContent>

              <DialogFooter className="pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createTemplateMutation.isPending || isLoadingForms || isLoadingUsers}
                >
                  {createTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Plantilla
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
