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
} from "@/components/ui/table"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReloadIcon } from "@radix-ui/react-icons"
import { isDevelopment } from "@/config/environment";

interface Form {
  id: string;
  title: string;
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
  sourceForm: Form | null;
  targetForm: Form | null;
  isActive: boolean;
  projectId: string;
  inheritanceMapping: any;
  assignmentType: string;
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
  const [assignmentType, setAssignmentType] = useState("user");
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [dueDays, setDueDays] = useState(7);
  const [assigneeFormField, setAssigneeFormField] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTemplateActive, setIsTemplateActive] = useState(true);
  const [isTemplateInactive, setIsTemplateInactive] = useState(false);
  const [isTemplateAll, setIsTemplateAll] = useState(true);
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("all");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

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
          source_form ( id, title ),
          target_form ( id, title ),
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
  });

  const {
    data: forms,
    isLoading: isLoadingForms,
    error: errorForms,
    refetch: refetchForms
  } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title')
        .eq('project_id', userProfile?.project_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching forms:", error);
        throw error;
      }

      return data;
    },
  });

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: errorProjects,
    refetch: refetchProjects
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
    refetch: refetchProjectUsers
  } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      return getProjectUsers(projectId);
    },
    enabled: !!projectId,
  });

  const transformTaskTemplates = (data: any[]): TaskTemplate[] => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(template => {
      let sourceForm = null;
      if (template.source_form) {
        // First ensure source_form is not null
        const sourceFormObj = template.source_form;
        
        // Then separately check the properties
        if (sourceFormObj && 
            typeof sourceFormObj === 'object' && 
            'id' in sourceFormObj && 
            'title' in sourceFormObj) {
          // Final null check on actual properties
          const id = sourceFormObj.id;
          const title = sourceFormObj.title;
          
          if (id !== null && title !== null) {
            sourceForm = { 
              id: String(id), 
              title: String(title) 
            };
          }
        }
      }
      
      let targetForm = null;
      if (template.target_form) {
        // First ensure target_form is not null
        const targetFormObj = template.target_form;
        
        // Then separately check the properties
        if (targetFormObj && 
            typeof targetFormObj === 'object' && 
            'id' in targetFormObj && 
            'title' in targetFormObj) {
          // Final null check on actual properties
          const id = targetFormObj.id;
          const title = targetFormObj.title;
          
          if (id !== null && title !== null) {
            targetForm = { 
              id: String(id), 
              title: String(title) 
            };
          }
        }
      }
      
      return {
        id: template.id,
        title: template.title,
        description: template.description,
        sourceForm,
        targetForm,
        isActive: template.is_active,
        projectId: template.project_id,
        inheritanceMapping: template.inheritance_mapping,
        assignmentType: template.assignment_type,
        defaultAssignee: template.default_assignee,
        dueDays: template.due_days,
        assigneeFormField: template.assignee_form_field
      };
    });
  };

  const taskTemplates = React.useMemo(() => {
    if (!taskTemplatesData) return [];
    return transformTaskTemplates(taskTemplatesData);
  }, [taskTemplatesData]);

  const createTaskTemplateMutation = useMutation(
    async () => {
      setIsSaving(true);

      const { data, error } = await supabase
        .from('task_templates')
        .insert([
          {
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
          },
        ])
        .select();

      if (error) {
        console.error("Error creating task template:", error);
        throw error;
      }

      return data;
    },
    {
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
    }
  );

  const updateTaskTemplateMutation = useMutation(
    async () => {
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
    {
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
    }
  );

  const deleteTaskTemplateMutation = useMutation(
    async () => {
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
    {
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
    }
  );

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
    setSourceFormId(template.sourceForm?.id || "");
    setTargetFormId(template.targetForm?.id || "");
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
    setProjectId("");
    setInheritanceMapping("");
    setAssignmentType("user");
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
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          profiles (
            id,
            name,
            email
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error("Error fetching project users:", error);
        return [];
      }
      
      const users: User[] = [];
      for (const projectUser of data) {
        if (projectUser.profiles) {
          // First verify profiles is not null
          const profilesObj = projectUser.profiles;
          
          // Then check if it has the required properties
          if (profilesObj && 
              typeof profilesObj === 'object' && 
              'id' in profilesObj && 
              'name' in profilesObj && 
              'email' in profilesObj) {
            
            // Final null check on actual properties
            const id = profilesObj.id;
            const name = profilesObj.name;
            const email = profilesObj.email;
            
            if (id !== null && name !== null && email !== null) {
              users.push({
                id: String(id),
                name: String(name),
                email: String(email)
              });
            }
          }
        }
      }
      
      return users;
    } catch (error) {
      console.error("Error fetching project users:", error);
      return [];
    }
  };

  if (isLoadingTaskTemplates) return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando plantillas de tareas...</div>;
  if (errorTaskTemplates) return <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Hubo un error al cargar las plantillas de tareas.
    </AlertDescription>
  </Alert>;

  return (
    <div>
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Plantillas de Tareas</h1>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Plantilla
          </Button>
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
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>{template.isActive ? <Badge variant="outline">Activa</Badge> : <Badge>Inactiva</Badge>}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla de tarea para automatizar tus procesos.
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
              <Label htmlFor="sourceFormId" className="text-right">
                Formulario de Origen
              </Label>
              <Select onValueChange={setSourceFormId}>
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
              <Select onValueChange={setTargetFormId}>
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
              <Label htmlFor="projectId" className="text-right">
                Proyecto
              </Label>
              <Select onValueChange={setProjectId}>
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
              <Label htmlFor="assignmentType" className="text-right">
                Tipo de Asignación
              </Label>
              <Select onValueChange={setAssignmentType}>
                <SelectTrigger id="assignmentType" className="col-span-3">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="form_field">Campo de Formulario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignmentType === "user" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="defaultAssignee" className="text-right">
                  Usuario Asignado
                </Label>
                <Select onValueChange={setDefaultAssignee}>
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
            {assignmentType === "form_field" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigneeFormField" className="text-right">
                  Campo de Formulario
                </Label>
                <Input
                  type="text"
                  id="assigneeFormField"
                  value={assigneeFormField}
                  onChange={(e) => setAssigneeFormField(e.target.value)}
                  className="col-span-3"
                />
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
            <Button type="submit" disabled={isSaving} onClick={handleCreateTaskTemplate}>
              {isSaving ? (
                <>
                  Creando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="sourceFormId" className="text-right">
                Formulario de Origen
              </Label>
              <Select onValueChange={setSourceFormId}>
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
              <Select onValueChange={setTargetFormId}>
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
              <Label htmlFor="projectId" className="text-right">
                Proyecto
              </Label>
              <Select onValueChange={setProjectId}>
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
              <Label htmlFor="assignmentType" className="text-right">
                Tipo de Asignación
              </Label>
              <Select onValueChange={setAssignmentType}>
                <SelectTrigger id="assignmentType" className="col-span-3">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="form_field">Campo de Formulario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignmentType === "user" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="defaultAssignee" className="text-right">
                  Usuario Asignado
                </Label>
                <Select onValueChange={setDefaultAssignee}>
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
            {assignmentType === "form_field" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigneeFormField" className="text-right">
                  Campo de Formulario
                </Label>
                <Input
                  type="text"
                  id="assigneeFormField"
                  value={assigneeFormField}
                  onChange={(e) => setAssigneeFormField(e.target.value)}
                  className="col-span-3"
                />
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
    </div>
  );
};

export default TaskTemplates;
