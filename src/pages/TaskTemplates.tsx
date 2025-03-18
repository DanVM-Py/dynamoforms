
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
import { Plus, Edit, Trash2, Loader2, RefreshCw } from "lucide-react";
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
  const [sourceFormSchema, setSourceFormSchema] = useState<any>(null);
  const [targetFormSchema, setTargetFormSchema] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const storedProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
    
    if (storedProjectId) {
      console.log("Using project ID from session storage:", storedProjectId);
      setProjectId(storedProjectId);
    } else if (userProfile?.project_id) {
      console.log("Falling back to project ID from user profile:", userProfile.project_id);
      setProjectId(userProfile.project_id);
    } else {
      console.warn("No project ID found in session storage or user profile");
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
        console.error("Error fetching task templates:", error);
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
      
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, schema')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching forms:", error);
        throw error;
      }

      return data;
    },
    enabled: !!projectId,
  });

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: errorProjects,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        throw error;
      }

      return data;
    },
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

  useEffect(() => {
    const loadFormSchema = async (formId: string, setSchema: (schema: any) => void) => {
      if (!formId) {
        setSchema(null);
        return;
      }
      
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

  const createTaskTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);

      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          title,
          description,
          source_form_id: sourceFormId,
          target_form_id: targetFormId,
          is_active: isActive,
          project_id: projectId,
          inheritance_mapping: inheritanceMapping,
          assignment_type: assignmentType,
          default_assignee: defaultAssignee,
          min_days: minDays,
          due_days: dueDays,
          assignee_form_field: assigneeFormField
        })
        .select();

      if (error) {
        console.error("Error creating task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Tarea creada",
        description: "La plantilla de tarea se ha creado correctamente.",
      });
      setOpen(false);
      clearForm();
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
        console.error("Error updating task template:", error);
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
      console.error("Error updating task template:", error);
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
        console.error("Error deleting task template:", error);
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
      console.error("Error deleting task template:", error);
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

  const handleCreateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTaskTemplateMutation.mutateAsync();
  };

  const handleUpdateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTaskTemplateMutation.mutateAsync();
  };

  const handleDeleteTaskTemplate = async () => {
    await deleteTaskTemplateMutation.mutateAsync();
  };

  const handleEdit = (template: TaskTemplate) => {
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
    setSourceFormSchema(null);
    setTargetFormSchema(null);
  };

  const handleFilterChange = (newFilter: "active" | "inactive" | "all") => {
    setFilter(newFilter);
    setIsTemplateActive(newFilter === "active");
    setIsTemplateInactive(newFilter === "inactive");
    setIsTemplateAll(newFilter === "all");
  };

  const getProjectUsers = async (projectId: string): Promise<User[]> => {
    try {
      console.log(`Fetching users for project: ${projectId}`);
      
      // Use a different approach - first get all project_users
      const { data: projectUsersData, error: projectUsersError } = await supabase
        .from('project_users')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (projectUsersError) {
        console.error("Error fetching project users:", projectUsersError);
        return [];
      }
      
      if (!projectUsersData || projectUsersData.length === 0) {
        return [];
      }
      
      // Then fetch profile information for those users
      const userIds = projectUsersData.map(pu => pu.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
        
      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
        return [];
      }
      
      const users: User[] = profilesData?.map(profile => ({
        id: profile.id,
        name: profile.name || 'Usuario sin nombre',
        email: profile.email || 'correo@desconocido.com'
      })) || [];
      
      console.log(`Found ${users.length} users for project ${projectId}`);
      return users;
    } catch (error) {
      console.error("Error fetching project users:", error);
      return [];
    }
  };

  const getEmailFieldsFromForm = (formId: string): { key: string, label: string }[] => {
    const form = formsMap.get(formId);
    if (!form || !form.schema || !form.schema.components) {
      return [];
    }

    return form.schema.components
      .filter((component: any) => 
        component.type === 'email' && component.key)
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key
      }));
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

  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  if (isLoadingTaskTemplates) return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando plantillas de tareas...</div>;
  if (errorTaskTemplates) return <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Hubo un error al cargar las plantillas de tareas. {errorTaskTemplates.message}
    </AlertDescription>
  </Alert>;

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
                    {projects?.map((project) => (
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
                    {forms?.map((form) => (
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
                    {forms?.map((form) => (
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
                      minValue={0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDays">Máximo (días)</Label>
                    <Input
                      type="number"
                      id="dueDays"
                      value={dueDays}
                      onChange={(e) => setDueDays(Number(e.target.value))}
                      minValue={1}
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
                      {projectUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
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
                    disabled={!sourceFormId}
                  >
                    <SelectTrigger id="assigneeFormField" className="col-span-3">
                      <SelectValue placeholder={!sourceFormId ? "Selecciona un formulario origen primero" : "Selecciona campo email"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getEmailFieldsFromForm(sourceFormId).map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
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
              
              {canAccessAdvancedTabs && getTargetFormFields().length > 0 ? (
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
