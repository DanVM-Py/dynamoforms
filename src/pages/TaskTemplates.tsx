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
  const [inheritanceMapping, setInheritanceMapping] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("static");
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [dueDays, setDueDays] = useState(7);
  const [assigneeFormField, setAssigneeFormField] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTemplateActive, setIsTemplateActive] = useState(true);
  const [isTemplateInactive, setIsTemplateInactive] = useState(false);
  const [isTemplateAll, setIsTemplateAll] = useState(true);
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("all");
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
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
    queryKey: ['taskTemplates', filter],
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
          due_days,
          assignee_form_field
        `)
        .order('created_at', { ascending: false });

      if (filter === "active") {
        query = query.eq('is_active', true);
      } else if (filter === "inactive") {
        query = query.eq('is_active', false);
      }

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
        inheritanceMapping: template.inheritance_mapping,
        assignmentType,
        defaultAssignee: template.default_assignee || "",
        dueDays: template.due_days || 7,
        assigneeFormField: template.assignee_form_field || ""
      };
    });
  };

  const taskTemplates = React.useMemo(() => {
    if (!taskTemplatesData) return [];
    return transformTaskTemplates(taskTemplatesData);
  }, [taskTemplatesData, formsMap]);

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
          default_assignee: defaultAssignee,
          due_days: dueDays,
          assignee_form_field: assigneeFormField
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
        description: "Hubo un error al actualizar la plantilla de tarea. Inténtalo de nuevo.",
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
    setInheritanceMapping(template.inheritanceMapping);
    setAssignmentType(template.assignmentType);
    setDefaultAssignee(template.defaultAssignee);
    setDueDays(template.dueDays);
    setAssigneeFormField(template.assigneeFormField);
    setEditOpen(true);
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setSourceFormId("");
    setTargetFormId("");
    setIsActive(true);
    setProjectId(userProfile?.project_id || "");
    setInheritanceMapping("");
    setAssignmentType("static");
    setDefaultAssignee("");
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
      console.log(`Fetching users for project: ${projectId}`);
      
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          user_id,
          profiles:profiles!user_id(id, name, email)
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error("Error fetching project users:", error);
        return [];
      }
      
      const users: User[] = [];
      
      if (!data) return users;
      
      for (const projectUser of data) {
        if (projectUser.profiles && typeof projectUser.profiles === 'object') {
          const profile = projectUser.profiles as { id: string; name: string; email: string };
          
          users.push({
            id: profile.id,
            name: profile.name,
            email: profile.email
          });
        }
      }
      
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
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              Edita la plantilla de tarea para automatizar tus procesos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDays" className="text-right">
                Días para Vencer
              </Label>
              <Input
                type="number"
                id="dueDays"
                value={dueDays}
                onChange={(e) => setDueDays(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Activa
              </Label>
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
                className="col-span-3"
              />
            </div>
          </div>
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
      


