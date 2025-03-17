
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
import { toast } from "@/components/ui/use-toast";
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { Skeleton } from "@/components/ui/skeleton"

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
  due_days: z.number().optional(),
  is_active: z.boolean().default(true),
  inheritance_mapping: z.record(z.string()).optional(),
});

type FormTemplateValues = z.infer<typeof formTemplateSchema>;

const TaskTemplates = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
          source_form:source_form_id (title, description),
          target_form:target_form_id (title, description)
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

  // Mutation for creating a task template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: FormTemplateValues) => {
      if (!projectId) {
        throw new Error("Project ID is missing.");
      }

      const templateData = {
        ...data,
        project_id: projectId
      };

      const { error } = await supabase
        .from('task_templates')
        .insert([templateData]);

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
      const { error } = await supabase
        .from('task_templates')
        .update(data)
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
    setIsCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    form.reset();
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
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    form.reset();
  };

  const handleSubmit = (values: FormTemplateValues) => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data: values });
    } else {
      createTemplateMutation.mutate(values);
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
              {taskTemplates && taskTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>{template.source_form ? template.source_form.title : 'N/A'}</TableCell>
                  <TableCell>{template.target_form ? template.target_form.title : 'N/A'}</TableCell>
                  <TableCell>{template.is_active ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Task Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Crear Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla de tarea para automatizar la creación de tareas basadas en formularios.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {forms && forms.map((form) => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {forms && forms.map((form) => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.getValues("assignment_type") === "dynamic" && (
                  <FormField
                    control={form.control}
                    name="assignee_form_field"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campo del Formulario para Asignar</FormLabel>
                        <FormControl>
                          <Input placeholder="Campo del formulario" {...field} />
                        </FormControl>
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
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={handleCreateDialogClose}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Editar Plantilla de Tarea</DialogTitle>
            <DialogDescription>
              Edita la plantilla de tarea para modificar su configuración.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {forms && forms.map((form) => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un formulario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {forms && forms.map((form) => (
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.getValues("assignment_type") === "dynamic" && (
                  <FormField
                    control={form.control}
                    name="assignee_form_field"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campo del Formulario para Asignar</FormLabel>
                        <FormControl>
                          <Input placeholder="Campo del formulario" {...field} />
                        </FormControl>
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
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={handleEditDialogClose}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default TaskTemplates;
