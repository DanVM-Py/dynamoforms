import React, { useState, useEffect } from "react";
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
import { isDevelopment, Tables } from "@/config/environment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from '@/lib/logger';
import {
  FormSchema,
  Form,
  User,
  AssignmentType,
  isValidFormSchema,
  getEmailFieldsFromForm,
  areFieldTypesCompatible,
  getSourceFormFields,
  getTargetFormFields,
  getProjectUsers as fetchProjectUsersUtility
} from '@/utils/taskTemplateUtils';

interface CreateTaskTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export const CreateTaskTemplateModal: React.FC<CreateTaskTemplateModalProps> = ({ open, onOpenChange, projectId, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceFormId, setSourceFormId] = useState("");
  const [targetFormId, setTargetFormId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("static");
  const [staticAssignee, setStaticAssignee] = useState("");
  const [minDays, setMinDays] = useState(0);
  const [dueDays, setDueDays] = useState(7);
  const [assigneeDynamic, setAssigneeDynamic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentEditTab, setCurrentEditTab] = useState("general");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  const {
    data: forms,
  } = useQuery<Form[], Error>({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      logger.debug(`[CreateTaskTemplateModal] Fetching forms for project: ${projectId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('id, title, schema')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) {
        logger.error("[CreateTaskTemplateModal] Error fetching forms:", error);
        throw error;
      }
      return (data as Form[]) || [];
    },
    enabled: !!projectId && open,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: projectUsers,
    isLoading: isLoadingProjectUsers,
  } = useQuery<User[], Error>({
    queryKey: ['projectUsers', projectId],
    queryFn: () => fetchProjectUsersUtility(projectId),
    enabled: !!projectId && open,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: sourceFormSchema,
    isLoading: isLoadingSourceSchema,
    error: errorSourceSchema
  } = useQuery<FormSchema | null, Error>({
    queryKey: ['formSchema', sourceFormId],
    queryFn: async () => {
      if (!sourceFormId) return null;
      
      logger.debug(`[CreateTaskTemplateModal] Fetching schema for source form: ${sourceFormId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('schema')
        .eq('id', sourceFormId)
        .maybeSingle();

      if (error) {
        logger.error("[CreateTaskTemplateModal] Error loading source form schema:", error);
        throw error;
      }

      const schema = data?.schema;
      if (typeof schema === 'string') {
         try {
            return JSON.parse(schema) as FormSchema;
         } catch(e) {
            logger.error(`Failed to parse source schema string for form ${sourceFormId}:`, e);
            return null;
         }
      }
      return (schema as FormSchema) || null;
    },
    enabled: !!sourceFormId && open,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const {
    data: targetFormSchema,
    isLoading: isLoadingTargetSchema,
    error: errorTargetSchema
  } = useQuery<FormSchema | null, Error>({
    queryKey: ['formSchema', targetFormId],
    queryFn: async () => {
      if (!targetFormId) return null;
      
      logger.debug(`[CreateTaskTemplateModal] Fetching schema for target form: ${targetFormId}`);
      const { data, error } = await supabase
        .from(Tables.forms)
        .select('schema')
        .eq('id', targetFormId)
        .maybeSingle();

      if (error) {
        logger.error("[CreateTaskTemplateModal] Error loading target form schema:", error);
        throw error;
      }

      const schema = data?.schema;
      if (typeof schema === 'string') {
         try {
            return JSON.parse(schema) as FormSchema;
         } catch(e) {
            logger.error(`Failed to parse target schema string for form ${targetFormId}:`, e);
            return null;
         }
      }
      return (schema as FormSchema) || null;
    },
    enabled: !!targetFormId && open,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const createTaskTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);

      if (minDays > dueDays) {
        toast({
          title: "Error de validación",
          description: "El mínimo de días no puede ser mayor al máximo de días.",
          variant: "destructive",
        });
        throw new Error("El mínimo de días no puede ser mayor al máximo de días");
      }

      const templateData = {
        title,
        description,
        source_form_id: sourceFormId,
        target_form_id: targetFormId,
        is_active: isActive,
        project_id: projectId,
        inheritance_mapping: inheritanceMapping,
        assignment_type: assignmentType,
        assignee_static: assignmentType === "static" ? staticAssignee : null,
        min_days: minDays,
        due_days: dueDays,
        assignee_dynamic: assignmentType === "dynamic" ? assigneeDynamic : null,
      };

      const { data, error } = await supabase
        .from(Tables.task_templates)
        .insert(templateData)
        .select();

      if (error) {
        logger.error("[CreateTaskTemplateModal] Error creating task template:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast({
        title: "Plantilla creada",
        description: "La plantilla de tarea se ha creado correctamente.",
      });
      onOpenChange(false);
      clearForm();
      onSuccess();
    },
    onError: (error: unknown) => {
      logger.error("[CreateTaskTemplateModal] Error creating task template:", error);
      let errorMessage = "Hubo un error al crear la plantilla de tarea. Inténtalo de nuevo.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleCreateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !sourceFormId || !targetFormId || !projectId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, completa todos los campos obligatorios en la pestaña General.",
        variant: "destructive"
      });
      setCurrentEditTab("general");
      return;
    }
    if (assignmentType === "static" && !staticAssignee) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, selecciona un usuario asignado en la pestaña Asignación.",
        variant: "destructive"
      });
      setCurrentEditTab("assignment");
      return;
    }
    if (assignmentType === "dynamic" && !assigneeDynamic) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, selecciona un campo de email en la pestaña Asignación.",
        variant: "destructive"
      });
      setCurrentEditTab("assignment");
      return;
    }
    await createTaskTemplateMutation.mutateAsync();
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setSourceFormId("");
    setTargetFormId("");
    setIsActive(true);
    setInheritanceMapping({});
    setAssignmentType("static");
    setStaticAssignee("");
    setMinDays(0);
    setDueDays(7);
    setAssigneeDynamic("");
    setCurrentEditTab("general");
  };

  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    const newMapping = { ...inheritanceMapping };
    if (sourceKey === "") {
      const currentSourceKey = Object.keys(newMapping).find(key => newMapping[key] === targetKey);
      if (currentSourceKey) {
        delete newMapping[currentSourceKey];
      }
    } else {
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === targetKey) {
          delete newMapping[key];
        }
      });
      newMapping[sourceKey] = targetKey;
    }
    setInheritanceMapping(newMapping);
  };

  const isLoadingSchemas = isLoadingSourceSchema || isLoadingTargetSchema;
  const hasSchemaError = !!errorSourceSchema || !!errorTargetSchema;
  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  useEffect(() => {
    logger.trace("[CreateTaskTemplateModal] Modal state changed:", {
      open,
      projectId,
      sourceFormId,
      targetFormId,
      hasSourceSchema: !!sourceFormSchema,
      hasTargetSchema: !!targetFormSchema,
      isLoadingSchemas
    });
  }, [open, projectId, sourceFormId, targetFormId, sourceFormSchema, targetFormSchema, isLoadingSchemas]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) clearForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[650px] dialog-content">
        <DialogHeader>
          <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
          <DialogDescription>
            Crea una nueva plantilla de tarea para automatizar tus procesos.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentEditTab} onValueChange={setCurrentEditTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="assignment" disabled={!canAccessAdvancedTabs || hasSchemaError}>
              Asignación
            </TabsTrigger>
            <TabsTrigger value="inheritance" disabled={!canAccessAdvancedTabs || hasSchemaError}>
              Herencia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title-create" className="text-right">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="title-create"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description-create" className="text-right">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description-create"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sourceFormId-create" className="text-right">
                Formulario de Origen <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={setSourceFormId} value={sourceFormId} required>
                <SelectTrigger id="sourceFormId-create" className="col-span-3">
                  <SelectValue placeholder="Selecciona un formulario" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSchemas ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                      Cargando...
                    </div>
                  ) : forms?.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No hay formularios disponibles
                    </div>
                  ) : (
                    forms?.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetFormId-create" className="text-right">
                Formulario de Destino <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={setTargetFormId} value={targetFormId} required>
                <SelectTrigger id="targetFormId-create" className="col-span-3">
                  <SelectValue placeholder="Selecciona un formulario" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSchemas ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                      Cargando...
                    </div>
                  ) : forms?.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No hay formularios disponibles
                    </div>
                  ) : (
                    forms?.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Periodo de Ejecución <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minDays-create">Mínimo (días)</Label>
                  <Input
                    type="number"
                    id="minDays-create"
                    value={minDays}
                    onChange={(e) => setMinDays(Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDays-create">Máximo (días)</Label>
                  <Input
                    type="number"
                    id="dueDays-create"
                    value={dueDays}
                    onChange={(e) => setDueDays(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive-create" className="text-right">
                Activa
              </Label>
              <div className="col-span-3">
                <Switch
                  id="isActive-create"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-4 pt-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignmentType-create" className="text-right">
                Tipo de Asignación <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={(value: AssignmentType) => setAssignmentType(value)} value={assignmentType} required>
                <SelectTrigger id="assignmentType-create" className="col-span-3">
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
                <Label htmlFor="defaultAssignee-create" className="text-right">
                  Usuario Asignado <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={setStaticAssignee} value={staticAssignee} required>
                  <SelectTrigger id="defaultAssignee-create" className="col-span-3">
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
                        No hay usuarios disponibles para este proyecto
                      </div>
                    ) : (
                      projectUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {assignmentType === "dynamic" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigneeFormField-create" className="text-right">
                  Campo de Email <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={setAssigneeDynamic}
                  value={assigneeDynamic}
                  disabled={!sourceFormId || isLoadingSourceSchema}
                  required
                >
                  <SelectTrigger id="assigneeDynamic-create" className="col-span-3">
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
                        No hay campos de email en el formulario origen
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
                  Hubo un problema al cargar los esquemas de formularios. Verifica los formularios seleccionados o intenta nuevamente.
                </AlertDescription>
              </Alert>
            )}

            {canAccessAdvancedTabs && !hasSchemaError ? (
              isLoadingSchemas ? (
                <div className="text-center p-6 border rounded-md">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span>Cargando esquemas de formularios...</span>
                  </div>
                </div>
              ) : getTargetFormFields(targetFormSchema).length > 0 ? (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {getTargetFormFields(targetFormSchema).map((targetField) => {
                    const mappedSourceKey = Object.keys(inheritanceMapping)
                      .find(key => inheritanceMapping[key] === targetField.key) || "";
                    const compatibleSourceFields = getSourceFormFields(sourceFormSchema)
                      .filter(sourceField => areFieldTypesCompatible(sourceField.type, targetField.type));
                    return (
                      <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                        <div>
                          <Label className="font-medium">{targetField.label}</Label>
                          <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                        </div>
                        <div>
                          <Select
                            value={mappedSourceKey}
                            onValueChange={(sourceValue) => handleFieldMapping(sourceValue, targetField.key)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="No heredar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No heredar</SelectItem>
                              {compatibleSourceFields.map((sourceField) => (
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
                  <p className="text-gray-500">No se encontraron campos en los formularios seleccionados o los esquemas no son válidos.</p>
                </div>
              )
            ) : (
              !hasSchemaError && (
                <div className="text-center p-6 border rounded-md">
                  <div>
                    <p className="text-gray-500">Selecciona formularios de origen y destino primero en la pestaña "General".</p>
                  </div>
                </div>
              )
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => {
            clearForm();
            onOpenChange(false);
          }}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSaving || !canAccessAdvancedTabs} onClick={handleCreateTaskTemplate}>
            {isSaving ? (
              <>
                Creando...
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              "Crear Plantilla"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
