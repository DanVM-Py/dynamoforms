import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Table } from "lucide-react";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';

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
        logger.info(`Initializing form ${formId} with data from task ${taskId}`);
        
        // Get the task
        const { data: task, error: taskError } = await supabase
          .from(Tables.tasks)
          .select(`
            *,
            source_form_id,
            form_response_id
          `)
          .eq('id', taskId)
          .single();
          
        if (taskError) {
          logger.error("Error fetching task:", taskError);
          return;
        }
        
        if (!task.source_form_id || !task.form_response_id) {
          logger.warn("No source form or response found for this task");
          return;
        }
        
        // Get the source form response
        const { data: formResponse, error: responseError } = await supabase
          .from(Tables.form_responses)
          .select('response_data')
          .eq('id', task.form_response_id)
          .single();
          
        if (responseError) {
          logger.error("Error fetching form response:", responseError);
          return;
        }
        
        // Get the task template to check field mappings
        const { data: template, error: templateError } = await supabase
          .from(Tables.task_templates)
          .select('inheritance_mapping')
          .eq('source_form_id', task.source_form_id)
          .eq('target_form_id', formId)
          .single();
          
        if (templateError && templateError.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is fine if no template exists
          logger.error("Error fetching task template:", templateError);
          return;
        }
        
        // If we have a template with inheritance_mapping, use it to map fields
        if (template && template.inheritance_mapping) {
          const initialData: Record<string, any> = {};
          const sourceData = formResponse.response_data;
          const mapping = template.inheritance_mapping;
          
          // For each mapping, copy the source field value to the target field
          if (typeof mapping === 'object' && mapping !== null) {
            Object.entries(mapping).forEach(([targetField, sourceField]) => {
              if (typeof sourceField === 'string' && 
                  sourceData && 
                  sourceData[sourceField] !== undefined) {
                initialData[targetField] = sourceData[sourceField];
                logger.debug(`Mapped ${sourceField} to ${targetField}: ${sourceData[sourceField]}`);
              }
            });
          }
          
          // Send the initial data to the parent component
          if (Object.keys(initialData).length > 0) {
            onInitialData(initialData);
            logger.debug("Initial data set:", initialData);
          }
        } else {
          logger.info("No field mapping found for this task");
        }
      } catch (error) {
        logger.error("Error initializing form:", error);
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
