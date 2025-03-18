import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
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
import { Calendar } from "@/components/ui/calendar"
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
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"
import { Input as InputUi } from "@/components/ui/input"

// Define Task type to match what we're getting from Supabase
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  due_date: string | null;
  form_id: string | null;
  project_id: string | null;
  priority: string | null;
  form_response_id: string | null;
  created_at: string;
  updated_at: string;
  source_form_id: string | null;
  // These fields come from joins but aren't guaranteed
  source_form?: { id: string; title: string };
  assignee_name?: string;
}

const TasksPage = () => {
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { projectId } = useParams();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskSchema = z.object({
    title: z.string().min(2, {
      message: "El título debe tener al menos 2 caracteres.",
    }),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed"]),
    due_date: z.date().optional(),
  })

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      due_date: undefined,
    },
    mode: "onChange"
  })

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      return ['pending', 'in_progress', 'completed'];
    },
  })

  // Fetch tasks
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks', projectId, currentFilter, searchQuery],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to (name, email)
        `)
        .eq('project_id', projectId);

      // Apply filters
      if (currentFilter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (currentFilter === 'in_progress') {
        query = query.eq('status', 'in_progress');
      } else if (currentFilter === 'completed') {
        query = query.eq('status', 'completed');
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      query = query.order('due_date', { ascending: true, nullsLast: true });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }

      // Get source form information for tasks with source_form_id
      const enhancedTasks = await Promise.all((data || []).map(async (task) => {
        // Add assignee name from profiles join
        const assigneeName = task.profiles?.name || task.profiles?.email || 'Unknown';

        // Get source form info if available
        let sourceForm = undefined;
        if (task.source_form_id) {
          const { data: formData } = await supabase
            .from('forms')
            .select('id, title')
            .eq('id', task.source_form_id)
            .single();
            
          if (formData) {
            sourceForm = formData;
          }
        }

        return {
          ...task,
          assignee_name: assigneeName,
          source_form: sourceForm
        } as Task;
      }));

      return enhancedTasks;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (date?.from && date?.to) {
      form.setValue("due_date", date?.from)
    }
  }, [date?.from, date?.to, form])

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDialogOpen = (task: Task) => {
    setSelectedTask(task);
    form.setValue("title", task.title);
    form.setValue("description", task.description || "");
    form.setValue("status", task.status);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTask(null);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    if (!selectedTask) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: values.title,
          description: values.description,
          status: values.status,
          due_date: values.due_date?.toISOString() || null,
        })
        .eq('id', selectedTask.id);

      if (error) {
        console.error("Error updating task:", error);
        toast({
          title: "Error",
          description: "Failed to update task.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
      handleDialogClose();
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId, currentFilter, searchQuery] });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="md:flex md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-500 mt-1">Gestiona las tareas de este proyecto</p>
        </div>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <Input
            type="text"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Button onClick={() => navigate(`/projects/${projectId}/create-task`)}>Crear Tarea</Button>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Lista de Tareas</CardTitle>
          <CardDescription>Aquí puedes ver y gestionar las tareas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-2 flex items-center space-x-2">
            <Label>Filtrar por:</Label>
            <Select value={currentFilter} onValueChange={handleFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.assignee_name}</TableCell>
                    <TableCell>{task.status}</TableCell>
                    <TableCell>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleDialogOpen(task)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No hay tareas disponibles</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Tarea</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la tarea.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la tarea" {...field} />
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
                      <Input placeholder="Descripción de la tarea" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses?.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-3">
                    <FormLabel>Fecha de vencimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <InputUi
                            placeholder={field.value ? format(field.value, "PPP") : "Pick a date"}
                            className={cn(
                              "pl-3 font-medium",
                              !date && "text-muted-foreground"
                            )}
                          />
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          defaultMonth={field.value}
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogClose asChild>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </DialogClose>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default TasksPage;
