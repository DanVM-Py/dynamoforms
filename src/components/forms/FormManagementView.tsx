import React from 'react';
import { useFormContext } from '../../contexts/FormContext';
import { FormManagement } from '../../types/forms';
import { Button } from '../ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/use-toast';
import { FormService } from '../../services/formService';

export const FormManagementView: React.FC = () => {
  const { forms, loading, error, permissions, refreshForms } = useFormContext();
  const navigate = useNavigate();

  const handleDelete = async (formId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este formulario?')) {
      return;
    }

    try {
      await FormService.deleteForm(formId);
      await refreshForms();
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado exitosamente.",
      });
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el formulario.",
        variant: "destructive",
      });
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
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(form.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 