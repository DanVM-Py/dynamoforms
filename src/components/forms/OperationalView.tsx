import React from 'react';
import { useFormContext } from '../../contexts/FormContext';
import { FormOperational } from '../../types/forms';
import { Button } from '../ui/button';
import { FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OperationalView: React.FC = () => {
  const { forms, loading, error } = useFormContext();
  const navigate = useNavigate();

  if (loading) {
    return <div>Cargando formularios...</div>;
  }

  if (error) {
    return <div>Error al cargar los formularios: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Formularios Disponibles</h1>
      </div>

      <div className="grid gap-4">
        {(forms as FormOperational[]).map((form) => (
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
                  {form.lastResponseDate && (
                    <>
                      <span className="mx-2">•</span>
                      <span>
                        Última respuesta: {new Date(form.lastResponseDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/forms/${form.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {form.hasResponded ? 'Ver Respuesta' : 'Responder'}
                </Button>
                {form.hasResponded && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Respondido</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 