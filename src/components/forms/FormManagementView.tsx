import React, { useState, useEffect } from 'react';
import { useFormContext } from '../../contexts/FormContext';
import { FormManagement } from '../../types/forms';
import { Button } from '../ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/use-toast';
import { logger } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormAccess } from '@/hooks/useFormAccess';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';
import { DeleteFormDialog } from './DeleteFormDialog';

export const FormManagementView: React.FC = () => {
  const { forms, loading, error, permissions, refreshForms } = useFormContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formToDelete, setFormToDelete] = useState<FormManagement | null>(null);

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      if (!formId) throw new Error("Form ID no está disponible");

      const { error } = await supabase
        .from(Tables.forms)
        .delete()
        .eq('id', formId);
      
      if (error) {
        logger.error('Error al eliminar formulario:', error);
        throw new Error(error.message || "Error desconocido al eliminar");
      }
    },
    onSuccess: () => {
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado exitosamente."
      });
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setFormToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el formulario.",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (form: FormManagement) => {
    logger.info(`Abriendo diálogo para eliminar formulario: ${form.title} (ID: ${form.id})`);
    setFormToDelete(form);
  };

  const handleConfirmDelete = () => {
    if (formToDelete) {
      logger.info(`Confirmando eliminación del formulario: ${formToDelete.title} (ID: ${formToDelete.id})`);
      deleteFormMutation.mutate(formToDelete.id);
    }
  };

  if (loading) {
    return <div>Cargando formularios...</div>;
  }

  if (error) {
    return <div>Error al cargar los formularios: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Formularios</h1>
        {permissions.canEdit && (
          <Button onClick={() => navigate('/forms-management/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Formulario
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {(forms as FormManagement[]).map((form) => (
          <div
            key={form.id}
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{form.title}</h2>
                <p className="text-sm text-gray-600">{form.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <span>Proyecto: {form.project?.name}</span>
                  <span className="mx-2">•</span>
                  <span>Respuestas: {form.responses_count}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {form.canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/forms-management/${form.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {form.canDelete && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(form)}
                      disabled={deleteFormMutation.isPending && formToDelete?.id === form.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {formToDelete?.id === form.id && (
                      <DeleteFormDialog
                        open={!!formToDelete}
                        onOpenChange={(open) => {
                          if (!open) {
                            setFormToDelete(null);
                          }
                        }}
                        onConfirm={handleConfirmDelete}
                        formTitle={formToDelete.title}
                        isDeleting={deleteFormMutation.isPending}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 