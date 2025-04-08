import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { debugFormSchema } from "@/utils/formSchemaUtils";
import { Json } from "@/types/database-entities";
import { CreateTaskTemplateModal } from "@/components/project/CreateTaskTemplateModal";
import TaskTemplateList from "@/components/task-templates/TaskTemplateList";
import TaskTemplateFilter from "@/components/task-templates/TaskTemplateFilter";
import EditTaskTemplateModal from "@/components/task-templates/EditTaskTemplateModal";
import { 
  TaskTemplate, 
  Form, 
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
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  useEffect(() => {
    const storedProjectId = sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
    
    if (storedProjectId) {
      logger.info("[TaskTemplates] Using project ID from session storage:", storedProjectId);
      setProjectId(storedProjectId);
    } else if (userProfile?.project_id) {
      logger.info("[TaskTemplates] Falling back to project ID from user profile:", userProfile.project_id);
      setProjectId(userProfile.project_id);
    } else {
      logger.warn("[TaskTemplates] No project ID found in session storage or user profile");
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
        logger.error("[TaskTemplates] Error fetching task templates:", error);
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
      
      logger.info(`[TaskTemplates] Fetching forms for project: ${projectId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('id, title, schema')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error("[TaskTemplates] Error fetching forms:", error);
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
      logger.info("[TaskTemplates] Fetching all projects");
      const { data, error } = await supabase
        .from(Tables.projects)
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error("[TaskTemplates] Error fetching projects:", error);
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

      logger.info(`[TaskTemplates] Source form schema retrieved:`, 
        data.schema ? `type: ${typeof data.schema}` : "null");
      
      // Si el esquema es un string, intentamos parsearlo
      if (typeof data.schema === 'string') {
        try {
          const parsedSchema = JSON.parse(data.schema);
          logger.info("[TaskTemplates] Successfully parsed source schema from string");
          debugFormSchema(parsedSchema, "[TaskTemplates] Source Form Schema (Parsed)");
          return parsedSchema;
        } catch (e) {
          logger.error("[TaskTemplates] Error parsing source schema string:", e);
          return data.schema;
        }
      }
      
      debugFormSchema(data.schema, "[TaskTemplates] Source Form Schema");
      return data.schema;
    },
    enabled: !!sourceFormId && (editOpen || createTemplateModalOpen),
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

      logger.info(`[TaskTemplates] Target form schema retrieved:`, 
        data.schema ? `type: ${typeof data.schema}` : "null");
      
      // Si el esquema es un string, intentamos parsearlo
      if (typeof data.schema === 'string') {
        try {
          const parsedSchema = JSON.parse(data.schema);
          logger.info("[TaskTemplates] Successfully parsed target schema from string");
          debugFormSchema(parsedSchema, "[TaskTemplates] Target Form Schema (Parsed)");
          return parsedSchema;
        } catch (e) {
          logger.error("[TaskTemplates] Error parsing target schema string:", e);
          return data.schema;
        }
      }
      
      debugFormSchema(data.schema, "[TaskTemplates] Target Form Schema");
      return data.schema;
    },
    enabled: !!targetFormId && (editOpen || createTemplateModalOpen),
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

  const taskTemplates = React.useMemo(() => {
    if (!taskTemplatesData) return [];
    return transformTaskTemplates(taskTemplatesData, formsMap);
  }, [taskTemplatesData, formsMap]);

  const updateTaskTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);

      if (minDays > dueDays) {
        throw new Error("El mínimo de días debe ser menor o igual al máximo de días");
      }

      const { data, error } = await supabase
        .from(Tables.task_templates)
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
        logger.error("[TaskTemplates] Error updating task template:", error);
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
      logger.error("[TaskTemplates] Error updating task template:", error);
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
        .from(Tables.task_templates)
        .delete()
        .eq('id', selectedTemplate?.id);

      if (error) {
        logger.error("[TaskTemplates] Error deleting task template:", error);
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
      logger.error("[TaskTemplates] Error deleting task template:", error);
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
    logger.info("[TaskTemplates] Editing template:", template.id);
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

      // Debug logging for form schemas
      if (sourceFormSchema) {
        logger.debug("[TaskTemplates] Source Form Schema Debug");
        if (typeof sourceFormSchema === 'string') {
          logger.debug("String length:", sourceFormSchema.length);
          logger.debug("First 100 chars:", sourceFormSchema.substring(0, 100));
          try {
            const parsed = JSON.parse(sourceFormSchema);
            logger.debug("Has components array:", Array.isArray(parsed.components));
            if (Array.isArray(parsed.components)) {
              logger.debug("Component count:", parsed.components.length);
            }
          } catch (e) {
            logger.error("Parse error:", e);
          }
        } else if (typeof sourceFormSchema === 'object') {
          logger.debug("Object keys:", Object.keys(sourceFormSchema));
          if (Array.isArray((sourceFormSchema as any).components)) {
            logger.debug("Component count:", (sourceFormSchema as any).components.length);
          }
        }
      }
      
      if (targetFormSchema) {
        logger.debug("[TaskTemplates] Target Form Schema Debug");
        if (typeof targetFormSchema === 'string') {
          logger.debug("String length:", targetFormSchema.length);
          logger.debug("First 100 chars:", targetFormSchema.substring(0, 100));
          try {
            const parsed = JSON.parse(targetFormSchema);
            logger.debug("Has components array:", Array.isArray(parsed.components));
            if (Array.isArray(parsed.components)) {
              logger.debug("Component count:", parsed.components.length);
            }
          } catch (e) {
            logger.error("Parse error:", e);
          }
        } else if (typeof targetFormSchema === 'object') {
          logger.debug("Object keys:", Object.keys(targetFormSchema));
          if (Array.isArray((targetFormSchema as any).components)) {
            logger.debug("Component count:", (targetFormSchema as any).components.length);
          }
        }
      }
    }
  }, [editOpen, selectedTemplate?.id, sourceFormId, targetFormId, sourceFormSchema, targetFormSchema, isLoadingSourceSchema, isLoadingTargetSchema]);

  if (isLoadingTaskTemplates) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando plantillas de tareas...
    </div>
  );
  
  if (errorTaskTemplates) return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Hubo un error al cargar las plantillas de tareas. {(errorTaskTemplates as Error).message}
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

      <TaskTemplateFilter 
        filter={filter}
        onFilterChange={handleFilterChange}
        isTemplateActive={isTemplateActive}
        isTemplateInactive={isTemplateInactive}
        isTemplateAll={isTemplateAll}
      />

      <TaskTemplateList 
        taskTemplates={taskTemplates} 
        onEdit={handleEdit} 
      />

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
        projectId={projectId}
        setProjectId={setProjectId}
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
        sourceFormSchema={sourceFormSchema as Json}
        targetFormSchema={targetFormSchema as Json}
        isLoadingProjects={isLoadingProjects}
        isLoadingForms={isLoadingForms}
        isLoadingProjectUsers={isLoadingProjectUsers}
        isLoadingSourceSchema={isLoadingSourceSchema}
        isLoadingTargetSchema={isLoadingTargetSchema}
        errorSourceSchema={errorSourceSchema}
        errorTargetSchema={errorTargetSchema}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onUpdateTemplate={handleUpdateTaskTemplate}
        onDeleteTemplate={handleDeleteTaskTemplate}
      />
      
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
