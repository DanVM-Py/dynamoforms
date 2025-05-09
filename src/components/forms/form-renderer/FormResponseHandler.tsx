import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { logger } from '@/lib/logger';

interface FormResponseHandlerProps {
  formId: string;
  responseId: string; // Este es el ID de la respuesta del formulario que se acaba de guardar
  isPublic?: boolean;
}

export const FormResponseHandler = ({ formId, responseId, isPublic = false }: FormResponseHandlerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    logger.info(
      `[FormResponseHandler] Respuesta de formulario con ID: ${responseId} para form: ${formId} ha sido procesada en el frontend.` +
      ` La creación de tareas encadenadas (si aplica) será gestionada por el backend.`
    );

    // Navegación y notificación al usuario de que su envío fue exitoso.
    if (isPublic) {
      // Para formularios públicos, usualmente se redirige a una página de éxito genérica.
      navigate(`/public/forms/success`);
    } else {
      // Para formularios internos/privados:
      toast({
        title: "Formulario Enviado",
        description: "Tu respuesta ha sido guardada correctamente. Las tareas asociadas se procesarán automáticamente si corresponde."
      });
      // Navegar a una página relevante, por ejemplo, de vuelta a la lista de respuestas del formulario,
      // o a la lista de tareas del proyecto, o a un dashboard.
      // Esto dependerá de la experiencia de usuario deseada.
      // Ejemplo: navegar a la lista de respuestas del formulario actual.
      navigate(`/forms/${formId}/responses`);
      // O si tienes un `projectId` disponible y quieres ir a las tareas del proyecto:
      // navigate(`/projects/${projectId}/tasks`);
    }

    // Las dependencias del useEffect se simplifican ya que no hay llamadas asíncronas
    // complejas que gestionar aquí para la creación de tareas.
  }, [formId, responseId, isPublic, navigate, toast]);

  // Este componente es principalmente para efectos secundarios (navegación, toasts)
  // después de que una respuesta de formulario es manejada/guardada, por lo que no renderiza UI.
  return null;
};
