
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { customSupabase } from "@/integrations/supabase/customClient";
import { useToast } from "@/components/ui/use-toast";

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
        // For public forms, use the completely separate customSupabase client
        const client = isPublic ? customSupabase : supabase;
        
        console.log("[FormResponseHandler] Triggering task creation for form response:", {
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
            isAnonymous: isPublic // Pass the anonymous flag to the edge function
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (error) {
          console.error("[FormResponseHandler] Error triggering task creation:", error);
          toast({
            title: "Error en el procesamiento",
            description: "Hubo un problema al procesar su formulario, pero su respuesta fue guardada.",
            variant: "destructive"
          });
        } else {
          console.log("[FormResponseHandler] Task creation triggered successfully:", data);
        }
      } catch (err) {
        console.error("[FormResponseHandler] Failed to trigger task creation:", err);
        // We don't show this error to the user as it's a background process
      }
    };

    // Attempt to trigger task creation
    triggerTaskCreation();

    // Make sure we use the correct paths consistently
    if (isPublic) {
      // Use the correct public form success path
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
