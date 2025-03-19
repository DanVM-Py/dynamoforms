import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isDevelopment } from "@/config/environment";
import { CreateTaskTemplateModal } from "@/components/project/CreateTaskTemplateModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  isValidFormSchema, 
  getValidFormSchema, 
  safelyAccessFormSchema,
  debugFormSchema,
  FormSchema
} from "@/utils/formSchemaUtils";
import { Json } from "@/types/supabase";

type AssignmentType = "static" | "dynamic";

interface Form {
  id: string;
  title: string;
  schema?: any;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  sourceFormId: string;
  sourceForm?: Form | null;
  targetFormId: string;
  targetForm?: Form | null;
  isActive: boolean;
  projectId: string;
  inheritanceMapping: any;
  assignmentType: AssignmentType;
  defaultAssignee: string;
  minDays: number;
  dueDays: number;
  assigneeFormField: string;
}

const TaskTemplates = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceFormId, setSourceFormId] = useState("");
  const [targetFormId, setTargetFormId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [projectId, setProjectId] = useState("");
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("static");
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [minDays, setMinDays] = useState(0);
  const [dueDays, setDueDays] = useState(7);
  const [assigneeFormField, setAssigneeFormField] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTemplateActive, setIsTemplateActive] = useState(true);
  const [isTemplateInactive, setIsTemplateInactive] = useState(false);
  const [isTemplateAll, setIsTemplateAll] = useState(true);
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("all");
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
  const [currentEditTab, setCurrentEditTab] = useState("general");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const storedProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
    
    if (storedProjectId) {
      console.log("[TaskTemplates] Using project ID from session storage:", storedProjectId);
      setProjectId(storedProjectId);
    } else if (userProfile?.project_id) {
      console.log("[TaskTemplates] Falling back to project ID from user profile:", userProfile.project_id);
      setProjectId(userProfile.project_id);
    } else {
      console.warn("[TaskTemplates] No project ID found in session storage or user profile");
    }
  }, [userProfile]);

  const {
    data: taskTemplatesData,
    isLoading: isLoadingTaskTemplates,
    error: errorTaskTemplates,
    refetch: refetchTaskTemplates
  } = useQuery({
    queryKey: ['taskTemplates', filter, projectId],
    queryFn: async () => {
      let query = supabase
        .from('task_templates')
        .select(`
          id,
          title,
          description,
          source_form_id,
          target_form_id,
          is_active,
          project_id,
          inheritance_mapping,
          assignment_type,
          default_assignee,
          min_days,
          due_days,
          assignee_form_field
        `);
        
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      if (filter === "active") {
        query = query.eq('is_active', true);
      } else if (filter === "inactive") {
        query = query.eq('is_active', false);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("[TaskTemplates] Error fetching task templates:", error);
        throw error;
      }

      return data;
    },
    enabled: true,
  });

  const {
    data: forms,
    isLoading: isLoadingForms,
    error: errorForms,
  } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log(`[TaskTemplates] Fetching forms for project: ${projectId}`);
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, schema')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[TaskTemplates] Error fetching forms:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: errorProjects,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log("[TaskTemplates] Fetching all projects");
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[TaskTemplates] Error fetching projects:", error);
        throw error;
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const {
    data: projectUsers,
    isLoading: isLoadingProjectUsers,
    error: errorProjectUsers,
  } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return getProjectUsers(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: sourceFormSchema,
    isLoading: isLoadingSourceSchema,
    error: errorSourceSchema
  } = useQuery({
    queryKey: ['formSchema', sourceFormId],
    queryFn: async () => {
      if (!sourceFormId) return null;
      
      console.log(`[TaskTemplates] Fetching schema for source form: ${sourceFormId}`);
      const { data, error } = await supabase
        .from('forms')
        .select('schema')
        .eq('id', sourceFormId)
        .maybeSingle();

      if (error) {
        console.error("[TaskTemplates] Error loading source form schema:", error);
        throw error;
      }

      console.log(`[TaskTemplates] Source form schema retrieved:`, data?.schema ? typeof data.schema : "null");
      debugFormSchema(data?.schema, "[TaskTemplates] Source Form Schema");
      
      return data?.schema || null;
    },
    enabled: !!sourceFormId && editOpen,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1, // Reduced retries
  });

  const {
    data: targetFormSchema,
    isLoading: isLoadingTargetSchema,
    error: errorTargetSchema
  } = useQuery({
    queryKey: ['formSchema', targetFormId],
    queryFn: async () => {
      if (!targetFormId) return null;
      
      console.log(`[TaskTemplates] Fetching schema for target form: ${targetFormId}`);
      const { data, error } = await supabase
        .from('forms')
        .select('schema')
        .eq('id', targetFormId)
        .maybeSingle();

      if (error) {
        console.error("[TaskTemplates] Error loading target form schema:", error);
        throw error;
      }

      console.log(`[TaskTemplates] Target form schema retrieved:`, data?.schema ? typeof data.schema : "null");
      debugFormSchema(data?.schema, "[TaskTemplates] Target Form Schema");
      
      return data?.schema || null;
    },
    enabled: !!targetFormId && editOpen,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1, // Reduced retries
  });

  const formsMap = React.useMemo(() => {
    const map = new Map<string, Form>();
    if (forms) {
      forms.forEach(form => {
        map.set(form.id, form);
      });
    }
    return map;
  }, [forms]);

  const transformTaskTemplates = (data: any[]): TaskTemplate[] => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(template => {
      const sourceForm = formsMap.get(template.source_form_id) || null;
      const targetForm = formsMap.get(template.target_form_id) || null;
      
      const assignmentType: AssignmentType = template.assignment_type === "dynamic" 
        ? "dynamic" 
        : "static";
      
      return {
        id: template.id,
        title: template.title,
        description: template.description,
        sourceFormId: template.source_form_id,
        sourceForm,
        targetFormId: template.target_form_id,
        targetForm,
        isActive: template.is_active,
        projectId: template.project_id,
        inheritanceMapping: template.inheritance_mapping || {},
        assignmentType,
        defaultAssignee: template.default_assignee || "",
        minDays: template.min_days || 0,
        dueDays: template.due_days || 7,
        assigneeFormField: template.assignee_form_field || ""
      };
    });
  };

  const taskTemplates = React.useMemo(() => {
    if (!taskTemplatesData) return [];
    return transformTaskTemplates(taskTemplatesData);
  }, [taskTemplatesData, formsMap]);

  const updateTaskTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);

      if (minDays > dueDays) {
        throw new Error("El mínimo de días debe ser menor o igual al máximo de días");
      }

      const { data, error } = await supabase
        .from('task_templates')
        .update({
          title,
          description,
          source_form_id: sourceFormId,
          target_form_id: targetFormId,
          is_active: isActive,
          project_id: projectId,
          inheritance_mapping: inheritanceMapping,
          assignment_type: assignmentType,
          default_assignee: assignmentType === "static" ? defaultAssignee : null,
          min_days: minDays,
          due_days: dueDays,
          assignee_form_field: assignmentType === "dynamic" ? assigneeFormField : null
        })
        .eq('id', selectedTemplate?.id)
        .select();

      if (error) {
        console.error("[TaskTemplates] Error updating task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Tarea actualizada",
        description: "La plantilla de tarea se ha actualizado correctamente.",
      });
      setEditOpen(false);
      clearForm();
    },
    onError: (error: any) => {
      console.error("[TaskTemplates] Error updating task template:", error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error.message ? error.message : "Hubo un error al actualizar la plantilla de tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const deleteTaskTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);

      const { data, error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', selectedTemplate?.id);

      if (error) {
        console.error("[TaskTemplates] Error deleting task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Tarea eliminada",
        description: "La plantilla de tarea se ha eliminado correctamente.",
      });
      setEditOpen(false);
      clearForm();
    },
    onError: (error: any) => {
      console.error("[TaskTemplates] Error deleting task template:", error);
      toast({
        title: "Error",
        description: "Hubo un error al eliminar la plantilla de tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const handleUpdateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTaskTemplateMutation.mutateAsync();
  };

  const handleDeleteTaskTemplate = async () => {
    await deleteTaskTemplateMutation.mutateAsync();
  };

  const handleEdit = (template: TaskTemplate) => {
    console.log("[TaskTemplates] Editing template:", template.id);
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description);
    setSourceFormId(template.sourceFormId);
    setTargetFormId(template.targetFormId);
    setIsActive(template.isActive);
    setProjectId(template.projectId);
    setInheritanceMapping(template.inheritanceMapping || {});
    setAssignmentType(template.assignmentType);
    setDefaultAssignee(template.defaultAssignee);
    setMinDays(template.minDays || 0);
    setDueDays(template.dueDays || 7);
    setAssigneeFormField(template.assigneeFormField);
    setCurrentEditTab("general");
    setEditOpen(true);
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setSourceFormId("");
    setTargetFormId("");
    setIsActive(true);
    setProjectId(userProfile?.project_id || "");
    setInheritanceMapping({});
    setAssignmentType("static");
    setDefaultAssignee("");
    setMinDays(0);
    setDueDays(7);
    setAssigneeFormField("");
    setSelectedTemplate(null);
  };

  const handleFilterChange = (newFilter: "active" | "inactive" | "all") => {
    setFilter(newFilter);
    setIsTemplateActive(newFilter === "active");
    setIsTemplateInactive(newFilter === "inactive");
    setIsTemplateAll(newFilter === "all");
  };

  const getProjectUsers = async (projectId: string): Promise<User[]> => {
    try {
      console.log(`[TaskTemplates] Fetching users for project: ${projectId}`);
      
      const { data: projectUsersData, error: projectUsersError } = await supabase
        .from('project_users')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (projectUsersError) {
        console.error("[TaskTemplates] Error fetching project users:", projectUsersError);
        return [];
      }
      
      if (!projectUsersData || projectUsersData.length === 0) {
        return [];
      }
      
      const userIds = projectUsersData.map(pu => pu.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
        
      if (profilesError) {
        console.error("[TaskTemplates] Error fetching user profiles:", profilesError);
        return [];
      }
      
      const users: User[] = profilesData?.map(profile => ({
        id: profile.id,
        name: profile.name || 'Usuario sin nombre',
        email: profile.email || 'correo@desconocido.com'
      })) || [];
      
      console.log(`[TaskTemplates] Found ${users.length} users for project ${projectId}`);
      return users;
    } catch (error) {
      console.error("[TaskTemplates] Error fetching project users:", error);
      return [];
    }
  };

  const getEmailFieldsFromForm = (formSchema: Json | null): { key: string, label: string }[] => {
    if (!formSchema) {
      console.warn("[TaskTemplates] Form schema is null or undefined in getEmailFieldsFromForm");
      return [];
    }
    
    const schema = safelyAccessFormSchema(formSchema);
    if (!schema) {
      console.warn("[TaskTemplates] Invalid schema format in getEmailFieldsFromForm");
      return [];
    }

    const fields = schema.components
      .filter((component) => 
        component.type === 'email' && component.key)
      .map((component) => ({
        key: component.key,
        label: component.label || component.key
      }));
      
    console.log(`[TaskTemplates] getEmailFieldsFromForm - Found ${fields.length} email fields`);
    return fields;
  };

  const getSourceFormFields = () => {
    if (!sourceFormSchema) {
      console.warn("[TaskTemplates] Source form schema is null or undefined in getSourceFormFields");
      return [];
    }
    
    const schema = safelyAccessFormSchema(sourceFormSchema);
    if (!schema) {
      console.warn("[TaskTemplates] Invalid source schema format in getSourceFormFields");
      return [];
    }
    
    const fields = schema.components
      .filter((component) => component.key && component.type !== 'button')
      .map((component) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type
      }));
      
    console.log(`[TaskTemplates] getSourceFormFields - Found ${fields.length} fields`, 
      fields.length > 0 ? `(first field: ${fields[0].label}, type: ${fields[0].type})` : "");
    return fields;
  };

  const getTargetFormFields = () => {
    if (!targetFormSchema) {
      console.warn("[TaskTemplates] Target form schema is null or undefined in getTargetFormFields");
      return [];
    }
    
    const schema = safelyAccessFormSchema(targetFormSchema);
    if (!schema) {
      console.warn("[TaskTemplates] Invalid target schema format in getTargetFormFields");
      return [];
    }
    
    const fields = schema.components
      .filter((component) => component.key && component.type !== 'button')
      .map((component) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type
      }));
      
    console.log(`[TaskTemplates] getTargetFormFields - Found ${fields.length} fields`, 
      fields.length > 0 ? `(first field: ${fields[0].label}, type: ${fields[0].type})` : "");
    return fields;
  };

  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    const newMapping = { ...inheritanceMapping };
    if (sourceKey) {
      newMapping[sourceKey] = targetKey;
    } else {
      const sourceKeyToRemove = Object.entries(inheritanceMapping)
        .find(([_, value]) => value === targetKey)?.[0];
      
      if (sourceKeyToRemove) {
        delete newMapping[sourceKeyToRemove];
      }
    }
    
    setInheritanceMapping(newMapping);
  };

  const areFieldTypesCompatible = (sourceType: string, targetType: string) => {
    const textTypes = ['textfield', 'textarea', 'text'];
    const numberTypes = ['number', 'currency'];
    const dateTypes = ['datetime', 'date'];
    const selectionTypes = ['select', 'radio', 'checkbox'];
    
    if (textTypes.includes(sourceType) && textTypes.includes(targetType)) return true;
    if (numberTypes.includes(sourceType) && numberTypes.includes(targetType)) return true;
    if (dateTypes.includes(sourceType) && dateTypes.includes(targetType)) return true;
    if (selectionTypes.includes(sourceType) && selectionTypes.includes(targetType)) return true;
    
    return sourceType === targetType;
  };

  const isLoadingSchemas = isLoadingSourceSchema || isLoadingTargetSchema;
  const hasSchemaError = errorSourceSchema || errorTargetSchema;
  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  useEffect(() => {
    if (editOpen && sourceFormId && targetFormId) {
      console.log("[TaskTemplates] Edit modal opened with form schemas:", {
        templateId: selectedTemplate?.id,
        sourceFormId,
        targetFormId,
        hasSourceSchema: !!sourceFormSchema,
        hasTargetSchema: !!targetFormSchema,
        sourceSchemaType: sourceFormSchema ? typeof sourceFormSchema : 'undefined',
        targetSchemaType: targetFormSchema ? typeof targetFormSchema : 'undefined',
        isLoadingSchemas
      });
      
      if (sourceFormSchema) {
        console.group("[TaskTemplates] Source Form Schema Debug");
        if (typeof sourceFormSchema === 'string') {
          console.log("String length:", sourceFormSchema.length);
          console.log("First 100 chars:", sourceFormSchema.substring(0, 100));
          try {
            const parsed = JSON.parse(sourceFormSchema);
            console.log("Has components array:", Array.isArray(parsed.components));
            if (Array.isArray(parsed.components)) {
              console.log("Component count:", parsed.components.length);
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        } else if (typeof sourceFormSchema === 'object') {
          console.log("Object keys:", Object.keys(sourceFormSchema));
          if (Array.isArray(sourceFormSchema.components)) {
            console.log("Component count:", sourceFormSchema.components.length);
          }
        }
        console.groupEnd();
      }
      
      if (targetFormSchema) {
        console.group("[TaskTemplates] Target Form Schema Debug");
        if (typeof targetFormSchema === 'string') {
          console.log("String length:", targetFormSchema.length);
          console.log("First 100 chars:", targetFormSchema.substring(0, 100));
          try {
            const parsed = JSON.parse(targetFormSchema);
            console.log("Has components array:", Array.isArray(parsed.components));
            if (Array.isArray(parsed.components)) {
              console.log("Component count:", parsed.components.length);
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        } else if (typeof targetFormSchema === 'object') {
          console.log("Object keys:", Object.keys(targetFormSchema));
          if (Array.isArray(targetFormSchema.components)) {
            console.log("Component count:", targetFormSchema.components.length);
          }
        }
        console.groupEnd();
      }
    }
  }, [editOpen, selectedTemplate?.id, sourceFormId, targetFormId, sourceFormSchema, targetFormSchema, isLoadingSchemas]);

  if (isLoadingTaskTemplates) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando plantillas de tareas...
    </div>
  );
  
  if (errorTaskTemplates) return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Hubo un error al cargar las plantillas de tareas. {errorTaskTemplates.message}
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Plantillas de Tareas</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetchTaskTemplates();
              if (projectId) {
                queryClient.invalidateQueries({ queryKey: ['forms', projectId] });
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button onClick={() => setCreateTemplateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Plantilla
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Label>Filtrar por estado:</Label>
        <div className="flex space-x-2 mt-2">
          <Button
            variant={isTemplateAll ? "default" : "outline"}
            onClick={() => handleFilterChange("all")}
          >
            Todas
          </Button>
          <Button
            variant={isTemplateActive ? "default" : "outline"}
            onClick={() => handleFilterChange("active")}
          >
            Activas
          </Button>
          <Button
            variant={isTemplateInactive ? "default" : "outline"}
            onClick={() => handleFilterChange("inactive")}
          >
            Inactivas
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Título</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Formulario de Origen</TableHead>
              <TableHead>Formulario de Destino</TableHead>
              <TableHead>Periodo de ejecución</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  No hay plantillas de tareas disponibles
                </TableCell>
              </TableRow>
            ) : (
              taskTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>{template.sourceForm?.title || '—'}</TableCell>
                  <TableCell>{template.targetForm?.title || '—'}</TableCell>
                  <TableCell>
                    {template.minDays === 0 ? 
                      `Hasta ${template.dueDays} día${template.dueDays !== 1 ? 's' : ''}` : 
                      `${template.minDays} - ${template.dueDays} día${template.dueDays !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell>{template.isActive ? <Badge variant="outline" className="bg-green-50">Activa</Badge> : <Badge variant="outline" className="bg-gray-100">Inactiva</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {errorForms && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error al cargar formularios</AlertTitle>
          <AlertDescription>
            {errorForms.message}
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Editar Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              Edita la plantilla de tarea para automatizar tus procesos.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={currentEditTab} onValueChange={setCurrentEditTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="assignment" disabled={!canAccessAdvancedTabs}>
                Asignación
              </TabsTrigger>
              <TabsTrigger value="inheritance" disabled={!canAccessAdvancedTabs}>
                Herencia
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectId" className="text-right">
                  Proyecto
                </Label>
                <Select onValueChange={setProjectId} value={projectId}>
                  <SelectTrigger id="projectId" className="col-span-3">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                        Cargando...
                      </div>
                    ) : projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sourceFormId" className="text-right">
                  Formulario de Origen
                </Label>
                <Select onValueChange={setSourceFormId} value={sourceFormId}>
                  <SelectTrigger id="sourceFormId" className="col-span-3">
                    <SelectValue placeholder="Selecciona un formulario" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingForms ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                        Cargando...
                      </div>
                    ) : forms?.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="targetFormId" className="text-right">
                  Formulario de Destino
                </Label>
                <Select onValueChange={setTargetFormId} value={targetFormId}>
                  <SelectTrigger id="targetFormId" className="col-span-3">
                    <SelectValue placeholder="Selecciona un formulario" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingForms ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                        Cargando...
                      </div>
                    ) : forms?.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Periodo de Ejecución
                </Label>
                <div className="col-span-3 grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDays">Mínimo (días)</Label>
                    <Input
                      type="number"
                      id="minDays"
                      value={minDays}
                      onChange={(e) => setMinDays(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDays">Máximo (días)</Label>
                    <Input
                      type="number"
                      id="dueDays"
                      value={dueDays}
                      onChange={(e) => setDueDays(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Activa
                </Label>
                <div className="col-span-3">
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="assignment" className="space-y-4 pt-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignmentType" className="text-right">
                  Tipo de Asignación
                </Label>
                <Select onValueChange={(value: AssignmentType) => setAssignmentType(value)} value={assignmentType}>
                  <SelectTrigger id="assignmentType" className="col-span-3">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Usuario</SelectItem>
                    <SelectItem value="dynamic">Campo de Formulario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {assignmentType === "static" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="defaultAssignee" className="text-right">
                    Usuario Asignado
                  </Label>
                  <Select onValueChange={setDefaultAssignee} value={defaultAssignee}>
                    <SelectTrigger id="defaultAssignee" className="col-span-3">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingProjectUsers ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                          Cargando usuarios...
                        </div>
                      ) : projectUsers?.length === 0 ? (
                        <div className="p-2 text-center text-sm text-gray-500">
                          No hay usuarios disponibles
                        </div>
                      ) : (
                        projectUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {assignmentType === "dynamic" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assigneeFormField" className="text-right">
                    Campo de Email
                  </Label>
                  <Select 
                    onValueChange={setAssigneeFormField} 
                    value={assigneeFormField}
                    disabled={!sourceFormId || isLoadingSourceSchema}
                  >
                    <SelectTrigger id="assigneeFormField" className="col-span-3">
                      <SelectValue placeholder={
                        !sourceFormId 
                          ? "Selecciona un formulario origen primero" 
                          : isLoadingSourceSchema 
                            ? "Cargando campos..." 
                            : "Selecciona campo email"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSourceSchema ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                          Cargando campos...
                        </div>
                      ) : getEmailFieldsFromForm(sourceFormSchema).length === 0 ? (
                        <div className="p-2 text-center text-sm text-gray-500">
                          No hay campos de email disponibles
                        </div>
                      ) : (
                        getEmailFieldsFromForm(sourceFormSchema).map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="inheritance" className="space-y-4 pt-4">
              <div className="text-sm mb-4">
                <div className="font-medium">Mapeo de Campos</div>
                <p className="text-gray-500">
                  Selecciona qué campos del formulario de origen se copiarán a cada campo del formulario de destino.
                </p>
              </div>
              
              {hasSchemaError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error al cargar esquemas</AlertTitle>
                  <AlertDescription>
                    Hubo un problema al cargar los esquemas de formularios. Intenta nuevamente.
                  </AlertDescription>
                </Alert>
              )}
              
              {canAccessAdvancedTabs ? (
                isLoadingSchemas ? (
                  <div className="text-center p-6 border rounded-md">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span>Cargando esquemas de formularios...</span>
                    </div>
                  </div>
                ) : getTargetFormFields().length > 0 ? (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {getTargetFormFields().map((targetField) => {
                      const mappedSourceKey = Object.entries(inheritanceMapping)
                        .find(([_, value]) => value === targetField.key)?.[0] || "";
                        
                      return (
                        <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                          <div>
                            <Label className="font-medium">{targetField.label}</Label>
                            <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                          </div>
                          <div>
                            <Select
                              value={mappedSourceKey}
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-6 border rounded-md">
                    <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-gray-500">No se encontraron campos en los formularios seleccionados.</p>
                  </div>
                )
              ) : (
                <div className="text-center p-6 border rounded-md">
                  <div>
                    <p className="text-gray-500">Selecciona formularios de origen y destino primero</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteTaskTemplate}>
              {isDeleting ? (
                <>
                  Eliminando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Eliminar
                  <Trash2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <div className="flex-grow"></div>
            <Button type="submit" disabled={isSaving} onClick={handleUpdateTaskTemplate}>
              {isSaving ? (
                <>
                  Actualizando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Actualizar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CreateTaskTemplateModal
        open={createTemplateModalOpen}
        onOpenChange={setCreateTemplateModalOpen}
        projectId={projectId}
        onSuccess={() => {
          refetchTaskTemplates();
        }}
      />
    </div>
  );
};

export default TaskTemplates;
