
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TaskFormInitializerProps {
  formId: string;
  taskId: string | null;
  onInitialData: (data: Record<string, any>) => void;
}

export const TaskFormInitializer = ({ formId, taskId, onInitialData }: TaskFormInitializerProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    const initializeFormData = async () => {
      if (!taskId || !formId || initialized) return;
      
      setLoading(true);
      try {
        console.log(`Initializing form ${formId} with data from task ${taskId}`);
        
        // Get the task
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select(`
            *,
            source_form_id,
            form_response_id
          `)
          .eq('id', taskId)
          .single();
          
        if (taskError) {
          console.error("Error fetching task:", taskError);
          return;
        }
        
        if (!task.source_form_id || !task.form_response_id) {
          console.log("No source form or response found for this task");
          return;
        }
        
        // Get the source form response
        const { data: formResponse, error: responseError } = await supabase
          .from('form_responses')
          .select('response_data')
          .eq('id', task.form_response_id)
          .single();
          
        if (responseError) {
          console.error("Error fetching form response:", responseError);
          return;
        }
        
        // Get the task template to check field mappings
        const { data: template, error: templateError } = await supabase
          .from('task_templates')
          .select('inheritance_mapping')
          .eq('source_form_id', task.source_form_id)
          .eq('target_form_id', formId)
          .single();
          
        if (templateError && templateError.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is fine if no template exists
          console.error("Error fetching task template:", templateError);
          return;
        }
        
        // If we have a template with inheritance_mapping, use it to map fields
        if (template && template.inheritance_mapping) {
          const initialData: Record<string, any> = {};
          const sourceData = formResponse.response_data;
          const mapping = template.inheritance_mapping;
          
          // For each mapping, copy the source field value to the target field
          for (const [targetField, sourceField] of Object.entries(mapping)) {
            if (sourceData[sourceField] !== undefined) {
              initialData[targetField] = sourceData[sourceField];
              console.log(`Mapped ${sourceField} to ${targetField}: ${sourceData[sourceField]}`);
            }
          }
          
          // Send the initial data to the parent component
          if (Object.keys(initialData).length > 0) {
            onInitialData(initialData);
            console.log("Initial data set:", initialData);
          }
        } else {
          console.log("No field mapping found for this task");
        }
      } catch (error) {
        console.error("Error initializing form:", error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeFormData();
  }, [formId, taskId, initialized, onInitialData]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span>Cargando datos del formulario...</span>
      </div>
    );
  }
  
  return null;
};
