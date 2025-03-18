
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
  const [defaultAssignee, setDefaultAssignee] = useState("");
  const [minDays, setMinDays] = useState(0);
  const [dueDays, setDueDays] = useState(7);
  const [assigneeFormField, setAssigneeFormField] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sourceFormSchema, setSourceFormSchema] = useState<any>(null);
  const [targetFormSchema, setTargetFormSchema] = useState<any>(null);
  const [currentEditTab, setCurrentEditTab] = useState("general");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

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

  const getProjectUsers = async (projectId: string): Promise<User[]> => {
    try {
      console.log(`[CreateTaskTemplateModal] Fetching users for project: ${projectId}`);
      
      // Use a different approach - first get all project_users
      const { data: projectUsersData, error: projectUsersError } = await supabase
        .from('project_users')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (projectUsersError) {
        console.error("[CreateTaskTemplateModal] Error fetching project users:", projectUsersError);
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
        console.error("[CreateTaskTemplateModal] Error fetching user profiles:", profilesError);
        return [];
      }
      
      const users: User[] = profilesData?.map(profile => ({
        id: profile.id,
        name: profile.name || 'Usuario sin nombre',
        email: profile.email || 'correo@desconocido.com'
      })) || [];
      
      console.log(`[CreateTaskTemplateModal] Found ${users.length} users for project ${projectId}`);
      return users;
    } catch (error) {
      console.error("[CreateTaskTemplateModal] Error fetching project users:", error);
      return [];
    }
  };

  const formsMap = React.useMemo(() => {
    const map = new Map<string, Form>();
    if (forms) {
      forms.forEach(form => {
        map.set(form.id, form);
      });
    }
    return map;
  }, [forms]);

  // Load form schemas when form IDs change during editing
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
      onOpenChange(false);
      clearForm();
      onSuccess();
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

  const handleCreateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setDefaultAssignee("");
    setMinDays(0);
    setDueDays(7);
    setAssigneeFormField("");
    setSourceFormSchema(null);
    setTargetFormSchema(null);
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

  // Handle field selection for inheritance mapping
  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    const newMapping = { ...inheritanceMapping };
    if (sourceKey) {
      newMapping[sourceKey] = targetKey;
    } else {
      // Find the source key for this target and remove it
      const sourceKeyToRemove = Object.entries(inheritanceMapping)
        .find(([_, value]) => value === targetKey)?.[0];

      if (sourceKeyToRemove) {
        delete newMapping[sourceKeyToRemove];
      }
    }

    setInheritanceMapping(newMapping);
  };

  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
          <DialogDescription>
            Crea una nueva plantilla de tarea para automatizar tus procesos.
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
            <form onSubmit={handleCreateTaskTemplate} className="space-y-4">
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
            </form>
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
                  // Find if this target field has a source field mapped to it
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
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving} onClick={handleCreateTaskTemplate}>
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
