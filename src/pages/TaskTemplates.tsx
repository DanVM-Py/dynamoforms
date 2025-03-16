
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronLeft, AlertCircle, ArrowRight, ArrowRightLeft, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, TaskTemplate } from "@/types/supabase";

interface FormField {
  id: string;
  label: string;
  type: string;
}

// Improved type for nested form objects
interface FormReference {
  id: string;
  title: string;
}

const TaskTemplates = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [formFields, setFormFields] = useState<{
    source: FormField[];
    target: FormField[];
  }>({
    source: [],
    target: []
  });
  
  // Define base template for type safety
  const baseTemplate: Partial<TaskTemplate> = {
    title: '',
    description: '',
    source_form_id: '',
    target_form_id: '',
    assignment_type: 'static' as 'static' | 'dynamic', // Explicitly type as union type
    default_assignee: '',
    assignee_form_field: null,
    due_days: 7,
    is_active: true,
    inheritance_mapping: {},
    project_id: projectId || null
  };
  
  const [formState, setFormState] = useState<Partial<TaskTemplate>>(baseTemplate);
  
  // Improved query with error handling and logging
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['taskTemplates', projectId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('task_templates')
          .select(`
            *,
            source_form:source_form_id(id, title),
            target_form:target_form_id(id, title)
          `);
        
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching task templates:", error);
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn("No task templates data returned or invalid format");
          return [];
        }
        
        return data.map(template => {
          // Process each template with safe type checking and fallbacks
          const processedTemplate: TaskTemplate = {
            id: template.id,
            title: template.title,
            description: template.description || '',
            source_form_id: template.source_form_id,
            target_form_id: template.target_form_id,
            assignment_type: template.assignment_type === 'dynamic' ? 'dynamic' : 'static',
            default_assignee: template.default_assignee,
            assignee_form_field: template.assignee_form_field,
            due_days: typeof template.due_days === 'number' ? template.due_days : 7,
            is_active: Boolean(template.is_active),
            inheritance_mapping: template.inheritance_mapping || {},
            project_id: template.project_id,
            created_at: template.created_at,
            // Safely handle nested form objects with proper null checking
            source_form: template.source_form && typeof template.source_form === 'object' 
              ? { 
                  id: String(template.source_form.id || ''),
                  title: String(template.source_form.title || '')
                }
              : null,
            target_form: template.target_form && typeof template.target_form === 'object' 
              ? {
                  id: String(template.target_form.id || ''),
                  title: String(template.target_form.title || '')
                }
              : null
          };
          
          return processedTemplate;
        });
      } catch (error) {
        console.error("Failed to fetch task templates:", error);
        toast({
          title: "Error al cargar plantillas",
          description: "No se pudieron cargar las plantillas de tareas. Por favor, intente de nuevo.",
          variant: "destructive",
        });
        return [];
      }
    }
  });
  
  // Improved forms query with error handling
  const { data: forms } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      try {
        let query = supabase.from('forms').select('*');
        
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching forms:", error);
          throw error;
        }
        
        return data as Form[] || [];
      } catch (error) {
        console.error("Failed to fetch forms:", error);
        toast({
          title: "Error al cargar formularios",
          description: "No se pudieron cargar los formularios. Por favor, intente de nuevo.",
          variant: "destructive",
        });
        return [];
      }
    }
  });
  
  // Improved users query with error handling
  const { data: users } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) {
          console.error("Error fetching users:", error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast({
          title: "Error al cargar usuarios",
          description: "No se pudieron cargar los usuarios. Por favor, intente de nuevo.",
          variant: "destructive",
        });
        return [];
      }
    }
  });
  
  // Improved mutation with validation and error handling
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Partial<TaskTemplate>) => {
      if (!template.title || !template.source_form_id || !template.target_form_id) {
        throw new Error("Faltan campos requeridos");
      }
      
      // Ensure assignment_type is the correct union type
      const assignmentType: 'static' | 'dynamic' = 
        template.assignment_type === 'dynamic' ? 'dynamic' : 'static';
      
      // Build complete template with validated fields
      const completeTemplate = {
        title: template.title,
        description: template.description || null,
        source_form_id: template.source_form_id,
        target_form_id: template.target_form_id,
        assignment_type: assignmentType,
        default_assignee: template.default_assignee || null,
        assignee_form_field: template.assignee_form_field || null,
        due_days: typeof template.due_days === 'number' ? template.due_days : 7,
        is_active: Boolean(template.is_active),
        inheritance_mapping: template.inheritance_mapping || {},
        project_id: template.project_id
      };
      
      if (template.id) {
        const { data, error } = await supabase
          .from('task_templates')
          .update(completeTemplate)
          .eq('id', template.id)
          .select()
          .single();
        
        if (error) {
          console.error("Error updating template:", error);
          throw error;
        }
        return data;
      } else {
        const { data, error } = await supabase
          .from('task_templates')
          .insert(completeTemplate)
          .select()
          .single();
        
        if (error) {
          console.error("Error creating template:", error);
          throw error;
        }
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['taskTemplates']});
      setIsCreating(false);
      setSelectedTemplate(null);
      setFormState({...baseTemplate, project_id: projectId || null});
      toast({
        title: "Plantilla guardada",
        description: "La plantilla de tarea ha sido guardada correctamente.",
      });
    },
    onError: (error) => {
      console.error("Error al guardar la plantilla:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  });
  
  // Improved delete mutation with error handling
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) {
        console.error("Error deleting template:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['taskTemplates']});
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla de tarea ha sido eliminada correctamente.",
      });
    },
    onError: (error) => {
      console.error("Error al eliminar la plantilla:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  });
  
  // Safe fetching of form schemas
  useEffect(() => {
    const fetchFormSchemas = async () => {
      try {
        if (formState.source_form_id) {
          const { data: sourceForm, error: sourceError } = await supabase
            .from('forms')
            .select('schema')
            .eq('id', formState.source_form_id)
            .maybeSingle();
          
          if (sourceError) {
            console.error("Error fetching source form schema:", sourceError);
            return;
          }
          
          if (sourceForm?.schema) {
            try {
              const schema = sourceForm.schema as { components: any[] };
              const fields = (schema.components || [])
                .filter(comp => comp && comp.type && comp.type !== 'info_text' && !comp.type.startsWith('group'))
                .map(comp => ({
                  id: comp.id,
                  label: comp.label || comp.id,
                  type: comp.type
                }));
              
              setFormFields(prev => ({ ...prev, source: fields }));
            } catch (parseError) {
              console.error("Error parsing source form schema:", parseError);
              setFormFields(prev => ({ ...prev, source: [] }));
            }
          }
        }
        
        if (formState.target_form_id) {
          const { data: targetForm, error: targetError } = await supabase
            .from('forms')
            .select('schema')
            .eq('id', formState.target_form_id)
            .maybeSingle();
          
          if (targetError) {
            console.error("Error fetching target form schema:", targetError);
            return;
          }
          
          if (targetForm?.schema) {
            try {
              const schema = targetForm.schema as { components: any[] };
              const fields = (schema.components || [])
                .filter(comp => comp && comp.type && comp.type !== 'info_text' && !comp.type.startsWith('group'))
                .map(comp => ({
                  id: comp.id,
                  label: comp.label || comp.id,
                  type: comp.type
                }));
              
              setFormFields(prev => ({ ...prev, target: fields }));
              
              // Initialize default mapping values to "_none" for all target fields
              const initialMappings: Record<string, string> = {};
              fields.forEach(field => {
                initialMappings[field.id] = "_none";
              });
              
              // Only set default mappings for new templates or when target form changes
              if (!selectedTemplate || selectedTemplate.target_form_id !== formState.target_form_id) {
                setFormState(prev => ({
                  ...prev,
                  inheritance_mapping: {
                    ...initialMappings,
                    ...(prev.inheritance_mapping || {}) // Keep any existing mappings
                  }
                }));
              }
            } catch (parseError) {
              console.error("Error parsing target form schema:", parseError);
              setFormFields(prev => ({ ...prev, target: [] }));
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchFormSchemas:", error);
        toast({
          title: "Error",
          description: "Hubo un problema al cargar los esquemas de formularios.",
          variant: "destructive",
        });
      }
    };
    
    fetchFormSchemas();
  }, [formState.source_form_id, formState.target_form_id, toast, selectedTemplate]);
  
  // Improved template selection logic
  useEffect(() => {
    if (selectedTemplate) {
      // Create a new object with explicit property assignments instead of using spread
      const templateFields: Partial<TaskTemplate> = {
        id: selectedTemplate.id,
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        source_form_id: selectedTemplate.source_form_id,
        target_form_id: selectedTemplate.target_form_id,
        assignment_type: selectedTemplate.assignment_type as 'static' | 'dynamic',
        default_assignee: selectedTemplate.default_assignee,
        assignee_form_field: selectedTemplate.assignee_form_field,
        due_days: selectedTemplate.due_days,
        is_active: selectedTemplate.is_active,
        inheritance_mapping: selectedTemplate.inheritance_mapping || {},
        project_id: selectedTemplate.project_id,
        created_at: selectedTemplate.created_at,
        // Safely handle the nested objects with explicit null checking
        source_form: selectedTemplate.source_form,
        target_form: selectedTemplate.target_form
      };
      
      setFormState(templateFields);
    }
  }, [selectedTemplate]);
  
  // Improved save handler with validation
  const handleSaveTemplate = () => {
    if (!formState.title || !formState.source_form_id || !formState.target_form_id) {
      toast({
        title: "Faltan campos requeridos",
        description: "Por favor, complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    
    saveTemplateMutation.mutate(formState);
  };
  
  // Safe input handlers with type checking
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    try {
      console.log(`Changing ${name} to ${value}`);
      setFormState(prev => ({ ...prev, [name]: value }));
    } catch (error) {
      console.error(`Error in handleSelectChange for ${name}:`, error);
    }
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleInheritanceMapping = (sourceField: string, targetField: string) => {
    setFormState(prev => {
      // Create a new inheritance_mapping object explicitly
      const updatedMapping = { ...(prev.inheritance_mapping || {}) };
      updatedMapping[sourceField] = targetField;
      
      return {
        ...prev,
        inheritance_mapping: updatedMapping
      };
    });
  };
  
  // Reset form state when canceling
  const handleCancel = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
    setFormState({...baseTemplate, project_id: projectId || null});
  };
  
  return (
    <PageContainer>
      {projectId && (
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}/roles`)}
            className="text-gray-600"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver al Proyecto
          </Button>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plantillas de Tareas</h1>
        <p className="text-gray-500 mt-1">
          Configure automatizaciones para crear tareas cuando se envían formularios
        </p>
      </div>
      
      {isCreating || selectedTemplate ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? 'Editar Plantilla de Tarea' : 'Crear Plantilla de Tarea'}
            </CardTitle>
            <CardDescription>
              Defina cómo se crean automáticamente las tareas cuando se envían formularios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Nombre de la Plantilla *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formState.title || ''}
                    onChange={handleInputChange}
                    placeholder="Ej: Solicitud de Aprobación de Proyecto"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="is_active">Estado</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={!!formState.is_active}
                      onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      {formState.is_active ? 'Activa' : 'Inactiva'}
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formState.description || ''}
                    onChange={handleInputChange}
                    placeholder="Describa el propósito de esta plantilla de tarea"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due_days">Días de Vencimiento</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="due_days"
                      name="due_days"
                      type="number"
                      value={formState.due_days || ''}
                      onChange={handleInputChange}
                      placeholder="7"
                      className="w-24"
                      min={1}
                    />
                    <span className="text-gray-500 text-sm">días después de la creación de la tarea</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Configuración del Disparador de Formulario</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="source_form_id">Formulario de Origen (Disparador) *</Label>
                    <Select
                      value={formState.source_form_id || ''}
                      onValueChange={(value) => handleSelectChange('source_form_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar un formulario" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms?.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Cuando se envía este formulario, se creará una tarea
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_form_id">Formulario Destino *</Label>
                    <Select
                      value={formState.target_form_id || ''}
                      onValueChange={(value) => handleSelectChange('target_form_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar un formulario" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms?.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      El formulario que debe completarse para esta tarea
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Asignación de Tareas</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment_type">Tipo de Asignación *</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="static"
                          name="assignment_type"
                          value="static"
                          checked={formState.assignment_type === 'static'}
                          onChange={() => handleSelectChange('assignment_type', 'static')}
                          className="h-4 w-4 text-primary"
                        />
                        <Label htmlFor="static" className="cursor-pointer">
                          Asignación Estática (Usuario Específico)
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="dynamic"
                          name="assignment_type"
                          value="dynamic"
                          checked={formState.assignment_type === 'dynamic'}
                          onChange={() => handleSelectChange('assignment_type', 'dynamic')}
                          className="h-4 w-4 text-primary"
                        />
                        <Label htmlFor="dynamic" className="cursor-pointer">
                          Asignación Dinámica (Desde Campo del Formulario)
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  {formState.assignment_type === 'static' && (
                    <div className="space-y-2">
                      <Label htmlFor="default_assignee">Asignado por Defecto *</Label>
                      <Select
                        value={formState.default_assignee || ''}
                        onValueChange={(value) => handleSelectChange('default_assignee', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar un usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formState.assignment_type === 'dynamic' && (
                    <div className="space-y-2">
                      <Label htmlFor="assignee_form_field">
                        Campo de Email del Formulario de Origen *
                      </Label>
                      <Select
                        value={formState.assignee_form_field || ''}
                        onValueChange={(value) => handleSelectChange('assignee_form_field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar un campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {formFields.source
                            .filter(field => field.type === 'email')
                            .map(field => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Este campo de email se usará para asignar la tarea
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {formState.source_form_id && formState.target_form_id && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Mapeo de Campos</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Mapee campos del formulario de origen al formulario destino para poblar datos automáticamente
                  </p>
                  
                  {formFields.target.length > 0 ? (
                    <div className="space-y-4">
                      {formFields.target.map(targetField => (
                        <div key={targetField.id} className="flex items-center space-x-2">
                          <Select
                            value={(formState.inheritance_mapping && formState.inheritance_mapping[targetField.id]) || "_none"}
                            onValueChange={(value) => handleInheritanceMapping(targetField.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sin mapeo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">Sin mapeo</SelectItem>
                              {formFields.source
                                .filter(sourceField => sourceField.type === targetField.type)
                                .map(sourceField => (
                                  <SelectItem key={sourceField.id} value={sourceField.id}>
                                    {sourceField.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <ArrowRight className="h-4 w-4 flex-shrink-0" />
                          <div className="bg-gray-100 px-3 py-2 rounded text-sm flex-grow">
                            {targetField.label} ({targetField.type})
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-amber-700 bg-amber-50 p-4 rounded flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <p className="text-sm">
                        No hay campos disponibles para mapear. Asegúrese de que ambos formularios tengan campos compatibles.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={saveTemplateMutation.isPending}
              className="bg-dynamo-600 hover:bg-dynamo-700"
            >
              {saveTemplateMutation.isPending ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="mb-6 flex justify-end">
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-dynamo-600 hover:bg-dynamo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla de Tarea
          </Button>
        </div>
      )}
      
      {!isCreating && !selectedTemplate && (
        <>
          {isLoadingTemplates ? (
            <div className="text-center py-10">
              <div className="animate-pulse text-gray-500">Cargando plantillas...</div>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">Disparador de Formulario</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700 flex-grow truncate">
                            {template.source_form ? template.source_form.title : "Formulario Desconocido"}
                          </span>
                          <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="text-gray-700 flex-grow truncate">
                            {template.target_form ? template.target_form.title : "Formulario Desconocido"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <CalendarClock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Vence en {template.due_days || 7} días</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <Badge variant="outline" className="mr-2">
                          {template.assignment_type === 'static' ? 'Asignación Estática' : 'Asignación Dinámica'}
                        </Badge>
                        {template.inheritance_mapping && Object.keys(template.inheritance_mapping).length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help">
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  {Object.keys(template.inheritance_mapping).length} Campos Mapeados
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Esta plantilla copiará datos entre formularios</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-4 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Eliminar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Eliminar Plantilla de Tarea</DialogTitle>
                          <DialogDescription>
                            ¿Está seguro de que desea eliminar esta plantilla de tarea? Esta acción no se puede deshacer.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button 
                            variant="destructive" 
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            {deleteTemplateMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-dynamo-600 hover:bg-dynamo-700"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-gray-100 p-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No se encontraron plantillas de tareas</h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Cree plantillas de tareas para automatizar el flujo de trabajo entre formularios y asignar tareas cuando se envíen formularios.
                </p>
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="bg-dynamo-600 hover:bg-dynamo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear su primera plantilla
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default TaskTemplates;
