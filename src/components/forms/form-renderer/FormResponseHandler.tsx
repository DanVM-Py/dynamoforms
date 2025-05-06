
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, customSupabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { logger } from '@/lib/logger';

interface FormResponseHandlerProps {
  formId: string;
  responseId: string;
  isPublic?: boolean;
}

export const FormResponseHandler = ({ formId, responseId, isPublic = false }: FormResponseHandlerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const triggerTaskCreation = async () => {
      try {
        // Select the appropriate client based on whether this is a public form
        const client = isPublic ? customSupabase : supabase;
        
        logger.info("[FormResponseHandler] Triggering task creation for form response:", {
          formResponseId: responseId,
          sourceFormId: formId,
          isPublic,
          usingCustomClient: isPublic
        });
        
        // Trigger the edge function to create chained tasks
        const { data, error } = await client.functions.invoke('create-chained-task', {
          body: JSON.stringify({
            formResponseId: responseId,
            sourceFormId: formId,
            isAnonymous: isPublic
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (error) {
          logger.error("[FormResponseHandler] Error triggering task creation:", error);
          toast({
            title: "Error en el procesamiento",
            description: "Hubo un problema al procesar su formulario, pero su respuesta fue guardada.",
            variant: "destructive"
          });
        } else {
          logger.info("[FormResponseHandler] Task creation triggered successfully:", data);
        }
      } catch (err) {
        logger.error("[FormResponseHandler] Failed to trigger task creation:", err);
      }
    };

    // Attempt to trigger task creation
    triggerTaskCreation();

    // Navigate to the appropriate page
    if (isPublic) {
      navigate(`/public/forms/success`);
    } else {
      toast({
        title: "Formulario enviado",
        description: "Tu respuesta ha sido guardada correctamente."
      });
      navigate(`/forms/${formId}/responses`);
    }
  }, [formId, responseId, isPublic, navigate, toast]);

  return null;
};
