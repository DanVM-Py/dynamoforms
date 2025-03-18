
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

// Define the type for the assignment type
type AssignmentType = "static" | "dynamic";

// Define the type for inheritance mapping
type InheritanceMapping = Record<string, string>;

// Define the schema for the form
const formSchema = z.object({
  title: z.string().min(2, {
    message: "El título debe tener al menos 2 caracteres.",
  }),
  description: z.string().optional(),
  source_form_id: z.string().min(1, {
    message: "Seleccione un formulario de origen.",
  }),
  target_form_id: z.string().min(1, {
    message: "Seleccione un formulario de destino.",
  }),
  assignment_type: z.enum(["static", "dynamic"]),
  default_assignee: z.string().optional(),
  assignee_form_field: z.string().optional(),
  min_days: z.coerce.number().int().min(0, {
    message: "El mínimo de días debe ser un número mayor o igual a 0.",
  }),
  due_days: z.coerce.number().int().min(1, {
    message: "El máximo de días debe ser un número entero positivo.",
  }),
  is_active: z.boolean().default(true),
  inheritance_mapping: z.record(z.string(), z.string()).optional(),
}).refine(data => data.min_days <= data.due_days, {
  message: "El mínimo de días debe ser menor o igual al máximo de días",
  path: ["min_days"]
});

interface CreateTaskTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function CreateTaskTemplateModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateTaskTemplateModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState("general");
  const [inheritanceMapping, setInheritanceMapping] = useState<InheritanceMapping>({});
  const [sourceFormSchema, setSourceFormSchema] = useState<any>(null);
  const [targetFormSchema, setTargetFormSchema] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      source_form_id: "",
      target_form_id: "",
      assignment_type: "static",
      default_assignee: "",
      assignee_form_field: "",
      min_days: 0,
      due_days: 7,
      is_active: true,
      inheritance_mapping: {},
    },
  });

  // Log project ID for debugging
  useEffect(() => {
    console.log("CreateTaskTemplateModal - projectId:", projectId);
  }, [projectId]);

  // Fetch forms from the selected project
  const {
    data: forms,
    isLoading: isLoadingForms,
    error: errorForms,
    refetch: refetchForms
  } = useQuery({
    queryKey: ["forms", projectId],
    queryFn: async () => {
      console.log("Fetching forms for project:", projectId);
      if (!projectId) {
        console.warn("No project ID provided, cannot fetch forms");
        return [];
      }

      const { data, error } = await supabase
        .from("forms")
        .select("id, title, schema")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching forms:", error);
        toast({
          title: "Error",
          description: "Error al cargar los formularios",
          variant: "destructive",
        });
        throw error;
      }

      console.log(`Found ${data?.length || 0} forms for project ${projectId}`);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch users from the selected project
  const {
    data: projectUsers,
    isLoading: isLoadingUsers,
    error: errorUsers,
  } = useQuery({
    queryKey: ["projectUsers", projectId],
    queryFn: async () => {
      console.log("Fetching users for project:", projectId);
      if (!projectId) {
        console.warn("No project ID provided, cannot fetch users");
        return [];
      }

      const { data, error } = await supabase
        .from("project_users")
        .select(`
          user_id,
          profiles:profiles!inner(id, name, email)
        `)
        .eq("project_id", projectId);

      if (error) {
        console.error("Error fetching project users:", error);
        toast({
          title: "Error",
          description: "Error al cargar los usuarios",
          variant: "destructive",
        });
        throw error;
      }

      const users = [];
      
      if (data) {
        for (const projectUser of data) {
          if (projectUser.profiles && typeof projectUser.profiles === 'object') {
            users.push({
              id: projectUser.profiles.id,
              name: projectUser.profiles.name,
              email: projectUser.profiles.email,
            });
          }
        }
      }

      console.log(`Found ${users.length} users for project ${projectId}`);
      return users;
    },
    enabled: !!projectId,
  });

  // Create task template mutation
  const createTaskTemplateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      setIsSaving(true);
      console.log("Creating task template for project:", projectId);

      // Ensure we have a project ID
      if (!projectId) {
        throw new Error("No project ID provided");
      }

      // Create the task template
      const { data, error } = await supabase
        .from("task_templates")
        .insert({
          title: values.title,
          description: values.description,
          source_form_id: values.source_form_id,
          target_form_id: values.target_form_id,
          is_active: values.is_active,
          project_id: projectId, // Use the projectId prop directly
          inheritance_mapping: values.inheritance_mapping || {},
          assignment_type: values.assignment_type,
          default_assignee: values.assignment_type === "static" ? values.default_assignee : null,
          min_days: values.min_days,
          due_days: values.due_days,
          assignee_form_field: values.assignment_type === "dynamic" ? values.assignee_form_field : null,
        })
        .select();

      if (error) {
        console.error("Error creating task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["taskTemplates"] });
      
      toast({
        title: "Plantilla creada",
        description: "La plantilla de tarea se ha creado correctamente.",
      });
      
      // Close the modal and reset the form
      onOpenChange(false);
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error("Error creating task template:", error);
      toast({
        title: "Error",
        description: "Hubo un error al crear la plantilla de tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Watch for changes in form values
  const sourceFormId = form.watch("source_form_id");
  const targetFormId = form.watch("target_form_id");
  const assignmentType = form.watch("assignment_type");

  // Load form schemas when form IDs change
  useEffect(() => {
    const loadFormSchema = async (formId: string, setSchema: (schema: any) => void) => {
      if (!formId) return;
      
      try {
        const { data, error } = await supabase
          .from("forms")
          .select("schema")
          .eq("id", formId)
          .maybeSingle();

        if (error) {
          console.error("Error loading form schema:", error);
          return;
        }

        if (data && data.schema) {
          setSchema(data.schema);
        }
      } catch (error) {
        console.error("Error loading form schema:", error);
      }
    };

    if (sourceFormId) {
      loadFormSchema(sourceFormId, setSourceFormSchema);
    } else {
      setSourceFormSchema(null);
    }

    if (targetFormId) {
      loadFormSchema(targetFormId, setTargetFormSchema);
    } else {
      setTargetFormSchema(null);
    }
  }, [sourceFormId, targetFormId]);

  // Reset form when modal is opened
  useEffect(() => {
    if (open) {
      // Reset form values
      form.reset({
        title: "",
        description: "",
        source_form_id: "",
        target_form_id: "",
        assignment_type: "static",
        assignee_form_field: "",
        default_assignee: "",
        min_days: 0,
        due_days: 7,
        is_active: true,
        inheritance_mapping: {}
      });
      
      setInheritanceMapping({});
      setCurrentTab('general');
      setSourceFormSchema(null);
      setTargetFormSchema(null);
      
      // If we have a project ID, refetch the forms
      if (projectId) {
        refetchForms();
      }
    }
  }, [open, form, projectId, refetchForms]);

  // Helper functions for inheritance mapping
  const getSourceFormFields = () => {
    if (!sourceFormSchema || !sourceFormSchema.components) return [];
    
    return sourceFormSchema.components
      .filter((component: any) => component.key && component.type !== 'button')
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type
      }));
  };

  const getTargetFormFields = () => {
    if (!targetFormSchema || !targetFormSchema.components) return [];
    
    return targetFormSchema.components
      .filter((component: any) => component.key && component.type !== 'button')
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type
      }));
  };

  // Define field type compatibility
  const areFieldTypesCompatible = (sourceType: string, targetType: string) => {
    // Define groups of compatible field types
    const textTypes = ['textfield', 'textarea', 'text'];
    const numberTypes = ['number', 'currency'];
    const dateTypes = ['datetime', 'date'];
    const selectionTypes = ['select', 'radio', 'checkbox'];
    
    // Check if both types are in the same compatibility group
    if (textTypes.includes(sourceType) && textTypes.includes(targetType)) return true;
    if (numberTypes.includes(sourceType) && numberTypes.includes(targetType)) return true;
    if (dateTypes.includes(sourceType) && dateTypes.includes(targetType)) return true;
    if (selectionTypes.includes(sourceType) && selectionTypes.includes(targetType)) return true;
    
    // Exact match for other types
    return sourceType === targetType;
  };

  // Find compatible target fields for a given source field
  const getCompatibleTargetFields = (sourceField: { key: string, type: string, label: string }) => {
    return getTargetFormFields()
      .filter(targetField => areFieldTypesCompatible(sourceField.type, targetField.type));
  };

  // Handle field selection for inheritance mapping
  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    const newMapping = { ...inheritanceMapping, [sourceKey]: targetKey };
    setInheritanceMapping(newMapping);
    form.setValue("inheritance_mapping", newMapping);
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Include the inheritance mapping in the form values
    values.inheritance_mapping = inheritanceMapping;
    
    // Submit the form
    await createTaskTemplateMutation.mutateAsync(values);
  };

  // Get email fields from the source form for dynamic assignment
  const getEmailFields = () => {
    if (!sourceFormSchema || !sourceFormSchema.components) return [];
    
    return sourceFormSchema.components
      .filter((component: any) => component.type === 'email' && component.key)
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key
      }));
  };

  // Enable advanced tabs only when both source and target forms are selected
  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
          <DialogDescription>
            Crea una plantilla para automatizar la creación de tareas cuando se completen formularios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger 
                  value="assignment" 
                  disabled={!canAccessAdvancedTabs}
                >
                  Asignación
                </TabsTrigger>
                <TabsTrigger 
                  value="inheritance" 
                  disabled={!canAccessAdvancedTabs}
                >
                  Herencia
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 pt-4">
                {/* Title field */}
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
                
                {/* Description field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción de la plantilla" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Source Form field */}
                <FormField
                  control={form.control}
                  name="source_form_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formulario de Origen</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingForms ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Cargando...</span>
                              </div>
                            ) : forms && forms.length > 0 ? (
                              forms.map((form) => (
                                <SelectItem key={form.id} value={form.id}>
                                  {form.title}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No hay formularios disponibles
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Target Form field */}
                <FormField
                  control={form.control}
                  name="target_form_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formulario de Destino</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingForms ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Cargando...</span>
                              </div>
                            ) : forms && forms.length > 0 ? (
                              forms.map((form) => (
                                <SelectItem key={form.id} value={form.id}>
                                  {form.title}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No hay formularios disponibles
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Min Days and Due Days fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="min_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días mínimos</FormLabel>
                        <FormControl>
                          <Input type="number" minValue={0} {...field} />
                        </FormControl>
                        <FormDescription>
                          Tiempo mínimo antes de que la tarea pueda ser completada
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="due_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días máximos</FormLabel>
                        <FormControl>
                          <Input type="number" minValue={1} {...field} />
                        </FormControl>
                        <FormDescription>
                          Tiempo máximo antes de que la tarea venza
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Active field */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Activa</FormLabel>
                        <FormDescription>
                          Si está activa, se crearán tareas automáticamente.
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
              </TabsContent>
              
              <TabsContent value="assignment" className="space-y-4 pt-4">
                {/* Assignment Type field */}
                <FormField
                  control={form.control}
                  name="assignment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Asignación</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Usuario Fijo</SelectItem>
                            <SelectItem value="dynamic">Campo de Email</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Elige si la tarea se asignará a un usuario específico o al usuario cuyo email está en un campo del formulario.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Default Assignee field (for static assignment) */}
                {assignmentType === "static" && (
                  <FormField
                    control={form.control}
                    name="default_assignee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario Asignado</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un usuario" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingUsers ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Cargando...</span>
                                </div>
                              ) : projectUsers && projectUsers.length > 0 ? (
                                projectUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center text-sm text-gray-500">
                                  No hay usuarios disponibles
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Assignee Form Field (for dynamic assignment) */}
                {assignmentType === "dynamic" && (
                  <FormField
                    control={form.control}
                    name="assignee_form_field"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campo de Email</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {getEmailFields().length > 0 ? (
                                getEmailFields().map((emailField) => (
                                  <SelectItem key={emailField.key} value={emailField.key}>
                                    {emailField.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center text-sm text-gray-500">
                                  No hay campos de email disponibles
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          El campo del formulario de origen que contiene el email del usuario al que se asignará la tarea.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="inheritance" className="space-y-4 pt-4">
                <div className="text-sm mb-4">
                  <div className="font-medium">Mapeo de Campos</div>
                  <p className="text-gray-500">
                    Selecciona qué campos del formulario de origen se copiarán a cada campo del formulario de destino.
                  </p>
                </div>
                
                {canAccessAdvancedTabs && getTargetFormFields().length > 0 ? (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {getTargetFormFields().map((targetField) => (
                      <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                        <div>
                          <Label className="font-medium">{targetField.label}</Label>
                          <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                        </div>
                        <div>
                          <Select
                            value={Object.entries(inheritanceMapping).find(([_, value]) => value === targetField.key)?.[0] || ""}
                            onValueChange={(sourceKey) => handleFieldMapping(sourceKey, targetField.key)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un campo origen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No heredar</SelectItem>
                              {getSourceFormFields()
                                .filter(sourceField => areFieldTypesCompatible(sourceField.type, targetField.type))
                                .map((sourceField) => (
                                  <SelectItem key={sourceField.key} value={sourceField.key}>
                                    {sourceField.label} ({sourceField.type})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border rounded-md">
                    {!canAccessAdvancedTabs ? (
                      <div>
                        <p className="text-gray-500">Selecciona formularios de origen y destino primero</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <span>Cargando esquemas de formularios...</span>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
