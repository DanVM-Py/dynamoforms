import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Loader2, ArrowRight, MapPin, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/supabase';
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Define types for forms and task templates
type Form = Database['public']['Tables']['forms']['Row'];
type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];

// Define a schema for the task template form
const formTemplateSchema = z.object({
  title: z.string().min(2, {
    message: "El título debe tener al menos 2 caracteres.",
  }),
  description: z.string().optional(),
  source_form_id: z.string().uuid({ message: "Selecciona un formulario de origen válido." }),
  target_form_id: z.string().uuid({ message: "Selecciona un formulario de destino válido." }),
  assignment_type: z.enum(["static", "dynamic"]),
  assignee_form_field: z.string().optional(),
  default_assignee: z.string().uuid().optional(),
  due_days: z.number().min(0).optional(),
  is_active: z.boolean().default(true),
  inheritance_mapping: z.record(z.string()).optional(),
});

type FormTemplateValues = z.infer<typeof formTemplateSchema>;

// Field mapping component for source to target form
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
        // For now, this is a simple type matching. Could be expanded for more complex compatibility
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
    return <div className="py-4 space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>;
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
        <p>Selecciona cómo mapear campos del formulario origen al formulario destino. Solo se muestran campos compatibles.</p>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campo Destino</TableHead>
            <TableHead></TableHead>
            <TableHead>Campo Origen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(compatibleFields).map(([targetField, sourceFields]) => (
            <TableRow key={targetField}>
              <TableCell className="font-medium">
                {getFieldLabel(targetSchema, targetField)}
                <div className="text-xs text-muted-foreground">{targetField}</div>
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={mapping[targetField] || ""}
                  onValueChange={(value) => handleFieldChange(targetField, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No heredar este campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No heredar este campo</SelectItem>
                    {sourceFields.map((sourceField) => (
                      <SelectItem key={sourceField} value={sourceField}>
                        {getFieldLabel(sourceSchema, sourceField)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const TaskTemplates = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState('general');
  const [formUsers, setFormUsers] = useState<any[]>([]);
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch task templates
  const { data: taskTemplates, isLoading: isLoadingTemplates, isError: isErrorTemplates } = useQuery({
    queryKey: ['taskTemplates', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("Project ID is missing.");
        return [];
      }

      const { data, error } = await supabase
        .from('task_templates')
        .select(`
          *,
          source_form:source_form_id (id, title, description),
          target_form:target_form_id (id, title, description)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching task templates:", error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch forms for dropdown
  const { data: forms, isLoading: isLoadingForms, isError: isErrorForms } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("Project ID is missing.");
        return [];
      }

      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching forms:", error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch project users for assignee selection
  useEffect(() => {
    const fetchProjectUsers = async () => {
      if (!projectId) return;

      try {
        const { data: projectUsers, error: usersError } = await supabase
          .from('project_users')
          .select(`
            user_id,
            profiles:user_id (id, name, email)
          `)
          .eq('project_id', projectId)
          .eq('status', 'active');

        if (usersError) throw usersError;

        const formattedUsers = projectUsers.map(pu => pu.profiles);
        setFormUsers(formattedUsers);
      } catch (error) {
        console.error("Error fetching project users:", error);
      }
    };

    fetchProjectUsers();
  }, [projectId]);

  // React Hook Form setup
  const form = useForm<FormTemplateValues>({
    resolver: zodResolver(formTemplateSchema),
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
    mode: "onChange"
  });

  // Watch form fields for conditional rendering
  const watchSourceFormId = form.watch('source_form_id');
  const watchTargetFormId = form.watch('target_form_id');
  const watchAssignmentType = form.watch('assignment_type');

  // Handle field mapping changes
  const handleMappingChange = (mapping: Record<string, string>) => {
    setInheritanceMapping(mapping);
    form.setValue("inheritance_mapping", mapping);
  };

  // Mutation for creating a task template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: FormTemplateValues) => {
      if (!projectId) {
        throw new Error("Project ID is missing.");
      }

      const templateData = {
        project_id: projectId,
        title: data.title,
        description: data.description || "",
        source_form_id: data.source_form_id,
        target_form_id: data.target_form_id,
        assignment_type: data.assignment_type,
        assignee_form_field: data.assignee_form_field || null,
        default_assignee: data.default_assignee || null,
        due_days: data.due_days || 7,
        is_active: data.is_active,
        inheritance_mapping: data.inheritance_mapping || {}
      };

      const { error } = await supabase
        .from('task_templates')
        .insert(templateData);

      if (error) {
        console.error("Error creating task template:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
      toast({
        title: "Plantilla de tarea creada",
        description: "La plantilla de tarea se ha creado correctamente.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setInheritanceMapping({});
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear plantilla de tarea",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Mutation for updating a task template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: FormTemplateValues }) => {
      const templateData = {
        title: data.title,
        description: data.description || "",
        source_form_id: data.source_form_id,
        target_form_id: data.target_form_id,
        assignment_type: data.assignment_type,
        assignee_form_field: data.assignee_form_field || null,
        default_assignee: data.default_assignee || null,
        due_days: data.due_days || 7,
        is_active: data.is_active,
        inheritance_mapping: data.inheritance_mapping || {}
      };

      const { error } = await supabase
        .from('task_templates')
        .update(templateData)
        .eq('id', id);

      if (error) {
        console.error("Error updating task template:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
      toast({
        title: "Plantilla de tarea actualizada",
        description: "La plantilla de tarea se ha actualizado correctamente.",
      });
      setIsEditDialogOpen(false);
      form.reset();
      setSelectedTemplate(null);
      setInheritanceMapping({});
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar plantilla de tarea",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Handlers
  const handleCreateDialogOpen = () => {
    form.reset();
    setInheritanceMapping({});
    setCurrentTab('general');
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    form.reset();
    setInheritanceMapping({});
  };

  const handleEdit = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    form.setValue("title", template.title);
    form.setValue("description", template.description || "");
    form.setValue("source_form_id", template.source_form_id);
    form.setValue("target_form_id", template.target_form_id);
    form.setValue("assignment_type", template.assignment_type as "static" | "dynamic");
    form.setValue("assignee_form_field", template.assignee_form_field || "");
    form.setValue("default_assignee", template.default_assignee || "");
    form.setValue("due_days", template.due_days || 7);
    form.setValue("is_active", template.is_active);
    
    // Handle the inheritance_mapping which might be null or another type
    const mapping = template.inheritance_mapping || {};
    // Ensure we're working with a Record<string, string>
    const typedMapping: Record<string, string> = {};
    
    if (typeof mapping === 'object' && mapping !== null) {
      Object.entries(mapping).forEach(([key, value]) => {
        if (typeof value === 'string') {
          typedMapping[key] = value;
        }
      });
    }
    
    form.setValue("inheritance_mapping", typedMapping);
    setInheritanceMapping(typedMapping);
    
    setCurrentTab('general');
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    form.reset();
    setInheritanceMapping({});
  };

  const handleSubmit = (values: FormTemplateValues) => {
    // Make sure inheritance mapping is included
    const dataWithMapping = {
      ...values,
      inheritance_mapping: inheritanceMapping
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data: dataWithMapping });
    } else {
      createTemplateMutation.mutate(dataWithMapping);
    }
  };

  if (isLoadingTemplates || isLoadingForms) return <PageContainer><Skeleton className="w-[200px] h-[30px]" /></PageContainer>;
  if (isErrorTemplates || isErrorForms) return <PageContainer>Error fetching data.</PageContainer>;

  return (
    <PageContainer>
      <div className="md:flex md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Tareas</h1>
          <p className="text-gray-500 mt-1">Gestiona las plantillas de tareas para este proyecto</p>
        </div>
        <Button onClick={handleCreateDialogOpen}>Crear Plantilla</Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Lista de Plantillas</CardTitle>
          <CardDescription>Aquí puedes ver y gestionar las plantillas de tareas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Formulario de Origen</TableHead>
                <TableHead>Formulario de Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskTemplates && taskTemplates.length > 0 ? taskTemplates.map((template: any) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{template.source_form && template.source_form.title ? template.source_form.title : 'N/A'}</TableCell>
                  <TableCell>{template.target_form && template.target_form.title ? template.target_form.title : 'N/A'}</TableCell>
                  <TableCell>{template.is_active ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No hay plantillas disponibles</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Template Dialog (used for both Create and Edit) */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCreateDialogClose();
          handleEditDialogClose();
        }
      }}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Editar' : 'Crear'} Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? 'Modifica esta plantilla de tarea.' 
                : 'Crea una nueva plantilla de tarea para automatizar la creación de tareas basadas en formularios.'}
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
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <TabsContent value="general" className="space-y-4 mt-4">
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
                                <SelectValue placeholder="Selecciona un formulario" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {forms && forms.length > 0 && forms.map((form: any) => (
                                <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                <SelectValue placeholder="Selecciona un formulario" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {forms && forms.length > 0 && forms.map((form: any) => (
                                <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="static">Estática</SelectItem>
                              <SelectItem value="dynamic">Dinámica</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {watchAssignmentType === 'static' 
                              ? 'La tarea se asignará a un usuario específico.' 
                              : 'La tarea se asignará basada en un valor del formulario origen.'}
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
                                  <SelectValue placeholder="Selecciona un usuario" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {formUsers.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name || user.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <FormLabel>Campo del Formulario para Asignar</FormLabel>
                            <FormControl>
                              <Input placeholder="Campo del formulario" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Nombre del campo que contiene el correo del usuario asignado.
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
                              placeholder="Días para completar" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                              value={field.value === undefined ? 7 : field.value}
                            />
                          </FormControl>
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
                              Indica si la plantilla está activa y lista para ser utilizada.
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

                <TabsContent value="mapping" className="space-y-4 mt-4">
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

                <div className="flex justify-end space-x-2 pt-4 border-t mt-6">
                  <Button type="button" variant="secondary" onClick={isCreateDialogOpen ? handleCreateDialogClose : handleEditDialogClose}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedTemplate ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default TaskTemplates;
