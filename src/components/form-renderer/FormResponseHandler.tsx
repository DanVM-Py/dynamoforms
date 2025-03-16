
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
        const client = isPublic ? customSupabase : supabase;
        
        // Trigger the edge function to create chained tasks
        const { data, error } = await client.functions.invoke('create-chained-task', {
          body: {
            formResponseId: responseId,
            sourceFormId: formId
          }
        });

        if (error) {
          console.error("Error triggering task creation:", error);
        } else {
          console.log("Task creation triggered successfully:", data);
        }
      } catch (err) {
        console.error("Failed to trigger task creation:", err);
      }
    };

    // Attempt to trigger task creation
    triggerTaskCreation();

    // Redirect based on form type
    if (isPublic) {
      navigate(`/public/forms/${formId}/success`);
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
