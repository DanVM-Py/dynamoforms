
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch source form response data for inheritance
 */
export async function fetchSourceResponseData(sourceResponseId: string) {
  try {
    if (!sourceResponseId) return null;
    
    const { data, error } = await supabase
      .from('form_responses')
      .select('response_data')
      .eq('id', sourceResponseId)
      .single();
    
    if (error) {
      console.error("Error fetching source response data:", error);
      return null;
    }
    
    return data?.response_data || null;
  } catch (err) {
    console.error("Failed to fetch source response data:", err);
    return null;
  }
}

/**
 * Get the inheritance mapping between a source and target form
 */
export async function getInheritanceMapping(sourceFormId: string, targetFormId: string) {
  try {
    if (!sourceFormId || !targetFormId) return null;
    
    const { data, error } = await supabase
      .from('task_templates')
      .select('inheritance_mapping')
      .eq('source_form_id', sourceFormId)
      .eq('target_form_id', targetFormId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error("Error fetching inheritance mapping:", error);
      return null;
    }
    
    return data?.inheritance_mapping || null;
  } catch (err) {
    console.error("Failed to fetch inheritance mapping:", err);
    return null;
  }
}

/**
 * Apply inheritance mapping to pre-populate form data
 */
export function applyInheritanceMapping(
  formSchema: any, 
  sourceData: Record<string, any> | null, 
  inheritanceMapping: Record<string, string> | null
) {
  if (!sourceData || !inheritanceMapping || !formSchema?.components) {
    return formSchema;
  }
  
  // Create a deep copy of the form schema
  const updatedSchema = JSON.parse(JSON.stringify(formSchema));
  
  // For each component in the target form, check if there's a mapping
  updatedSchema.components = updatedSchema.components.map((component: any) => {
    // Check if this component has a mapping to a source field
    const sourceFieldId = inheritanceMapping[component.id];
    
    if (sourceFieldId && sourceData[sourceFieldId] !== undefined) {
      // Pre-populate the value from the source form
      return {
        ...component,
        defaultValue: sourceData[sourceFieldId]
      };
    }
    
    return component;
  });
  
  return updatedSchema;
}
