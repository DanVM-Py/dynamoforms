import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Plus, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { debugFormSchema } from "@/utils/formSchemaUtils";
import { Json } from "@/types/database-entities";
import { CreateTaskTemplateModal } from "@/components/task-templates/CreateTaskTemplateModal";
import TaskTemplateList from "@/components/task-templates/TaskTemplateList";
import TaskTemplateFilter from "@/components/task-templates/TaskTemplateFilter";
import EditTaskTemplateModal from "@/components/task-templates/EditTaskTemplateModal";
import { 
  TaskTemplate, 
  Form, 
  FormSchema,
  User,
  transformTaskTemplates, 
  getProjectUsers, 
  AssignmentType
} from "@/utils/taskTemplateUtils";
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

const TaskTemplates = () => {
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceFormId, setSourceFormId] = useState("");
  const [targetFormId, setTargetFormId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [projectIdState, setProjectIdState] = useState("");
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("static");
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [minDays, setMinDays] = useState(0);
  const [dueDays, setDueDays] = useState(7);
  const [assigneeFormField, setAssigneeFormField] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("all");
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
  const [currentEditTab, setCurrentEditTab] = useState("general");
  const queryClient = useQueryClient();
  const { userProfile, currentProjectId } = useAuth();

  useEffect(() => {
    if (currentProjectId) {
      logger.info("[TaskTemplates] Using project ID from AuthContext:", currentProjectId);
      setProjectIdState(currentProjectId);
    } else {
      const storedProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
      if (storedProjectId) {
        logger.info("[TaskTemplates] Using project ID from session storage:", storedProjectId);
        setProjectIdState(storedProjectId);
      } else if (userProfile?.project_id) {
        logger.info("[TaskTemplates] Falling back to project ID from user profile:", userProfile.project_id);
        setProjectIdState(userProfile.project_id);
      } else {
        logger.warn("[TaskTemplates] No project ID found. Some features might be limited.");
        setProjectIdState("");
      }
    }
  }, [userProfile, currentProjectId]);

  const {
    data: taskTemplatesData,
    isLoading: isLoadingTaskTemplates,
    error: errorTaskTemplates,
    refetch: refetchTaskTemplates
  } = useQuery<TaskTemplate[], Error>({
    queryKey: ['taskTemplates', filter, projectIdState],
    queryFn: async () => {
      if (!projectIdState) {
        logger.warn("[TaskTemplates] No project ID set, cannot fetch task templates.");
        return [];
      }
      let query = supabase
        .from(Tables.task_templates)
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
        
      query = query.eq('project_id', projectIdState);
      
      if (filter === "active") {
        query = query.eq('is_active', true);
      } else if (filter === "inactive") {
        query = query.eq('is_active', false);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error("[TaskTemplates] Error fetching task templates:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!projectIdState,
  });

  const {
    data: forms,
    isLoading: isLoadingForms,
    error: errorForms,
  } = useQuery<Form[], Error>({
    queryKey: ['forms', projectIdState],
    queryFn: async () => {
      if (!projectIdState) return [];
      
      logger.info(`[TaskTemplates] Fetching forms for project: ${projectIdState}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('id, title, schema')
        .eq('project_id', projectIdState)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error("[TaskTemplates] Error fetching forms:", error);
        throw error;
      }

      return (data?.map(f => ({...f, schema: f.schema as FormSchema | null})) as Form[]) || [];
    },
    enabled: !!projectIdState,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: errorProjects,
  } = useQuery<Array<{id: string, name: string}>, Error>({
    queryKey: ['projects'],
    queryFn: async () => {
      logger.info("[TaskTemplates] Fetching all projects");
      const { data, error } = await supabase
        .from(Tables.projects)
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error("[TaskTemplates] Error fetching projects:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const {
    data: projectUsers,
    isLoading: isLoadingProjectUsers,
    error: errorProjectUsers,
  } = useQuery<User[], Error>({
    queryKey: ['projectUsers', projectIdState],
    queryFn: () => getProjectUsers(projectIdState),
    enabled: !!projectIdState,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: sourceFormSchema,
    isLoading: isLoadingSourceSchema,
    error: errorSourceSchema
  } = useQuery<FormSchema | null, Error>({
    queryKey: ['formSchema', sourceFormId, 'source'],
    queryFn: async () => {
      if (!sourceFormId) return null;
      
      logger.info(`[TaskTemplates] Fetching schema for source form: ${sourceFormId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('schema')
        .eq('id', sourceFormId)
        .maybeSingle();

      if (error) {
        logger.error("[TaskTemplates] Error loading source form schema:", error);
        throw error;
      }

      if (!data || !data.schema) {
        logger.warn(`[TaskTemplates] No schema found for source form: ${sourceFormId}`);
        return null;
      }
      
      if (typeof data.schema === 'string') {
        try {
          const parsedSchema = JSON.parse(data.schema) as FormSchema;
          logger.info("[TaskTemplates] Successfully parsed source schema from string");
          debugFormSchema(parsedSchema, "[TaskTemplates] Source Form Schema (Parsed)");
          return parsedSchema;
        } catch (e: unknown) {
          logger.error("[TaskTemplates] Error parsing source schema string:", e instanceof Error ? e.message : String(e));
          return null;
        }
      }
      
      debugFormSchema(data.schema as FormSchema, "[TaskTemplates] Source Form Schema");
      return data.schema as FormSchema;
    },
    enabled: !!sourceFormId && (editOpen || createTemplateModalOpen),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
  });

  const {
    data: targetFormSchema,
    isLoading: isLoadingTargetSchema,
    error: errorTargetSchema
  } = useQuery<FormSchema | null, Error>({
    queryKey: ['formSchema', targetFormId, 'target'],
    queryFn: async () => {
      if (!targetFormId) return null;
      
      logger.info(`[TaskTemplates] Fetching schema for target form: ${targetFormId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('schema')
        .eq('id', targetFormId)
        .maybeSingle();

      if (error) {
        logger.error("[TaskTemplates] Error loading target form schema:", error);
        throw error;
      }

      if (!data || !data.schema) {
        logger.warn(`[TaskTemplates] No schema found for target form: ${targetFormId}`);
        return null;
      }
      
      if (typeof data.schema === 'string') {
        try {
          const parsedSchema = JSON.parse(data.schema) as FormSchema;
          logger.info("[TaskTemplates] Successfully parsed target schema from string");
          debugFormSchema(parsedSchema, "[TaskTemplates] Target Form Schema (Parsed)");
          return parsedSchema;
        } catch (e: unknown) {
          logger.error("[TaskTemplates] Error parsing target schema string:", e instanceof Error ? e.message : String(e));
          return null;
        }
      }
      
      debugFormSchema(data.schema as FormSchema, "[TaskTemplates] Target Form Schema");
      return data.schema as FormSchema;
    },
    enabled: !!targetFormId && (editOpen || createTemplateModalOpen),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
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

  const taskTemplates = React.useMemo(() => {
    if (!taskTemplatesData) return [];
    return transformTaskTemplates(taskTemplatesData as unknown as Partial<TaskTemplate>[], formsMap);
  }, [taskTemplatesData, formsMap]);

  const updateTaskTemplateMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      setIsSaving(true);

      if (!selectedTemplate?.id) {
        throw new Error("No template selected for update.");
      }

      if (minDays > dueDays) {
        throw new Error("El mínimo de días debe ser menor o igual al máximo de días");
      }

      const updatePayload = {
        title,
        description,
        source_form_id: sourceFormId,
        target_form_id: targetFormId,
        is_active: isActive,
        project_id: projectIdState,
        inheritance_mapping: inheritanceMapping,
        assignment_type: assignmentType,
        default_assignee: assignmentType === "static" ? defaultAssignee : null,
        min_days: minDays,
        due_days: dueDays,
        assignee_form_field: assignmentType === "dynamic" ? assigneeFormField : null
      };

      const { data, error } = await supabase
        .from(Tables.task_templates)
        .update(updatePayload)
        .eq('id', selectedTemplate.id)
        .select();

      if (error) {
        logger.error("[TaskTemplates] Error updating task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla de tarea se ha actualizado correctamente.",
      });
      setEditOpen(false);
      clearForm();
    },
    onError: (error: Error) => {
      logger.error("[TaskTemplates] Error updating task template:", error);
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar la plantilla de tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const deleteTaskTemplateMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      setIsDeleting(true);
      if (!selectedTemplate?.id) {
        throw new Error("No template selected for deletion.");
      }

      const { data, error } = await supabase
        .from(Tables.task_templates)
        .delete()
        .eq('id', selectedTemplate.id);

      if (error) {
        logger.error("[TaskTemplates] Error deleting task template:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla de tarea se ha eliminado correctamente.",
      });
      setEditOpen(false);
      clearForm();
    },
    onError: (error: Error) => {
      logger.error("[TaskTemplates] Error deleting task template:", error);
      toast({
        title: "Error",
        description: error.message || "Hubo un error al eliminar la plantilla de tarea. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const handleUpdateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !sourceFormId || !targetFormId || !projectIdState) {
        toast({title: "Campos incompletos", description: "Asegúrate de que todos los campos generales estén llenos.", variant: "destructive"});
        setCurrentEditTab("general");
        return;
    }
    if (assignmentType === "static" && !defaultAssignee) {
        toast({title: "Asignación incompleta", description: "Por favor, selecciona un usuario para asignación estática.", variant: "destructive"});
        setCurrentEditTab("assignment");
        return;
    }
    if (assignmentType === "dynamic" && !assigneeFormField) {
        toast({title: "Asignación incompleta", description: "Por favor, selecciona un campo de formulario para asignación dinámica.", variant: "destructive"});
        setCurrentEditTab("assignment");
        return;
    }
    await updateTaskTemplateMutation.mutateAsync();
  };

  const handleDeleteTaskTemplate = async () => {
    await deleteTaskTemplateMutation.mutateAsync();
  };

  const handleEdit = (template: TaskTemplate) => {
    logger.info("[TaskTemplates] Editing template:", template.id);
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description);
    setSourceFormId(template.sourceFormId);
    setTargetFormId(template.targetFormId);
    setIsActive(template.isActive);
    setProjectIdState(template.projectId);
    setInheritanceMapping(template.inheritanceMapping || {});
    setAssignmentType(template.assignmentType);
    setDefaultAssignee(template.defaultAssignee || "");
    setMinDays(template.minDays || 0);
    setDueDays(template.dueDays || 7);
    setAssigneeFormField(template.assigneeFormField || "");
    setCurrentEditTab("general");
    setEditOpen(true);
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setSourceFormId("");
    setTargetFormId("");
    setIsActive(true);
    setInheritanceMapping({});
    setAssignmentType("static");
    setDefaultAssignee("");
    setMinDays(0);
    setDueDays(7);
    setAssigneeFormField("");
    setSelectedTemplate(null);
    setCurrentEditTab("general");
  };

  const handleFilterChange = (newFilter: "active" | "inactive" | "all") => {
    setFilter(newFilter);
  };

  useEffect(() => {
    if (editOpen && sourceFormId && targetFormId) {
      logger.info("[TaskTemplates] Edit modal opened with form schemas:", {
        templateId: selectedTemplate?.id,
        sourceFormId,
        targetFormId,
        hasSourceSchema: !!sourceFormSchema,
        hasTargetSchema: !!targetFormSchema,
        sourceSchemaType: sourceFormSchema ? typeof sourceFormSchema : 'undefined',
        targetSchemaType: targetFormSchema ? typeof targetFormSchema : 'undefined',
        isLoadingSchemas: isLoadingSourceSchema || isLoadingTargetSchema
      });

      if (sourceFormSchema) {
        logger.debug("[TaskTemplates] Source Form Schema Debug (from state)");
        debugFormSchema(sourceFormSchema, "Source Form Schema");
      }     
      if (targetFormSchema) {
        logger.debug("[TaskTemplates] Target Form Schema Debug (from state)");
        debugFormSchema(targetFormSchema, "Target Form Schema");
      }
    }
  }, [editOpen, selectedTemplate?.id, sourceFormId, targetFormId, sourceFormSchema, targetFormSchema, isLoadingSourceSchema, isLoadingTargetSchema]);

  if (isLoadingTaskTemplates && !projectIdState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Selecciona un proyecto para ver las plantillas...
      </div>
    );
  }
  if (isLoadingTaskTemplates && projectIdState) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando plantillas de tareas...
      </div>
    );
  }
  
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
              if (projectIdState) {
                queryClient.invalidateQueries({ queryKey: ['forms', projectIdState] });
              }
            }}
            disabled={!projectIdState}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          <Button onClick={() => setCreateTemplateModalOpen(true)} disabled={!projectIdState}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Plantilla
          </Button>
        </div>
      </div>

      {!projectIdState && (
        <Alert variant="default" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Selecciona un Proyecto</AlertTitle>
            <AlertDescription>
                Por favor, selecciona un proyecto desde el selector de proyectos en la barra lateral para ver o crear plantillas de tareas.
            </AlertDescription>
        </Alert>
      )}

      <TaskTemplateFilter 
        filter={filter}
        onFilterChange={handleFilterChange}
      />

      {projectIdState && taskTemplates.length === 0 && !isLoadingTaskTemplates && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No hay plantillas</AlertTitle>
          <AlertDescription>
            No se encontraron plantillas de tareas para el proyecto actual o filtro seleccionado. 
            Puedes crear una nueva plantilla usando el botón "Crear Plantilla".
          </AlertDescription>
        </Alert>
      )}

      {projectIdState && (taskTemplates.length > 0 || isLoadingTaskTemplates) && (
        <TaskTemplateList 
          taskTemplates={taskTemplates} 
          onEdit={handleEdit} 
        />
      )}

      {errorForms && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error al cargar formularios</AlertTitle>
          <AlertDescription>
            {(errorForms as Error).message}
          </AlertDescription>
        </Alert>
      )}

      <EditTaskTemplateModal
        open={editOpen}
        onOpenChange={setEditOpen}
        selectedTemplate={selectedTemplate}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        sourceFormId={sourceFormId}
        setSourceFormId={setSourceFormId}
        targetFormId={targetFormId}
        setTargetFormId={setTargetFormId}
        isActive={isActive}
        setIsActive={setIsActive}
        projectId={projectIdState}
        setProjectId={setProjectIdState}
        inheritanceMapping={inheritanceMapping}
        setInheritanceMapping={setInheritanceMapping}
        assignmentType={assignmentType}
        setAssignmentType={setAssignmentType}
        defaultAssignee={defaultAssignee}
        setDefaultAssignee={setDefaultAssignee}
        minDays={minDays}
        setMinDays={setMinDays}
        dueDays={dueDays}
        setDueDays={setDueDays}
        assigneeFormField={assigneeFormField}
        setAssigneeFormField={setAssigneeFormField}
        currentEditTab={currentEditTab}
        setCurrentEditTab={setCurrentEditTab}
        projects={projects}
        forms={forms}
        projectUsers={projectUsers}
        sourceFormSchema={sourceFormSchema}
        targetFormSchema={targetFormSchema}
        isLoadingProjects={isLoadingProjects}
        isLoadingForms={isLoadingForms}
        isLoadingProjectUsers={isLoadingProjectUsers}
        isLoadingSourceSchema={isLoadingSourceSchema}
        isLoadingTargetSchema={isLoadingTargetSchema}
        errorSourceSchema={errorSourceSchema as Error | null}
        errorTargetSchema={errorTargetSchema as Error | null}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onUpdateTemplate={handleUpdateTaskTemplate}
        onDeleteTemplate={handleDeleteTaskTemplate}
      />
      
      <CreateTaskTemplateModal
        open={createTemplateModalOpen}
        onOpenChange={setCreateTemplateModalOpen}
        projectId={projectIdState}
        onSuccess={() => {
          refetchTaskTemplates();
        }}
      />
    </div>
  );
};

export default TaskTemplates;
