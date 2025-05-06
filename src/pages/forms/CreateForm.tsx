import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';
import { type Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSidebarProjects } from '@/hooks/use-sidebar-projects';
import { logger } from '@/lib/logger';
import { useAuth } from "@/contexts/AuthContext"; 

// Esquema de validación con Zod
const createFormSchema = z.object({
  title: z.string().min(3, { message: "El título debe tener al menos 3 caracteres." }),
  description: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;
type NewForm = Database['public']['Tables']['forms']['Row'];

const CreateForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentProjectId: projectId } = useSidebarProjects();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const createFormMutation = useMutation<NewForm, Error, CreateFormValues>({
    mutationFn: async (data: CreateFormValues) => {
      if (!projectId) {
        throw new Error("Project ID no está disponible.");
      }
      const { data: newForm, error } = await supabase
        .from(Tables.forms)
        .insert([{ 
          title: data.title, 
          description: data.description,
          project_id: projectId,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) {
        logger.error('Supabase insert error:', error);
        throw new Error(`Error en Supabase: ${error.message}`);
      }
      if (!newForm) {
        throw new Error('No se recibió respuesta al crear el formulario.');
      }
      return newForm;
    },
    onSuccess: (newForm) => {
      toast({
        title: "Formulario Creado",
        description: `El formulario "${newForm.title}" ha sido creado exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: [Tables.forms, projectId] }); 
      navigate(`/forms-management/${newForm.id}`);
    },
    onError: (error: Error) => {
      logger.error('Error creando formulario (onError):', error);
      toast({
        title: "Error al Crear Formulario",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CreateFormValues) => {
    createFormMutation.mutate(values);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Crear Nuevo Formulario</CardTitle>
          <CardDescription>Completa los detalles para crear un nuevo formulario.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Formulario</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Encuesta de Satisfacción Cliente" {...field} />
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
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe brevemente el propósito del formulario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={createFormMutation.isPending}>
                {createFormMutation.isPending ? 'Creando...' : 'Crear Formulario'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default CreateForm;
