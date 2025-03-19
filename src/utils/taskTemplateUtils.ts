
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/types/supabase";
import { FormSchema, safelyAccessFormSchema } from "@/utils/formSchemaUtils";

export type AssignmentType = "static" | "dynamic";

export interface Form {
  id: string;
  title: string;
  schema?: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  sourceFormId: string;
  sourceForm?: Form | null;
  targetFormId: string;
  targetForm?: Form | null;
  isActive: boolean;
  projectId: string;
  inheritanceMapping: any;
  assignmentType: AssignmentType;
  defaultAssignee: string;
  minDays: number;
  dueDays: number;
  assigneeFormField: string;
}

/**
 * Convert task templates from API format to UI format
 */
export const transformTaskTemplates = (data: any[], formsMap: Map<string, Form>): TaskTemplate[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(template => {
    const sourceForm = formsMap.get(template.source_form_id) || null;
    const targetForm = formsMap.get(template.target_form_id) || null;
    
    const assignmentType: AssignmentType = template.assignment_type === "dynamic" 
      ? "dynamic" 
      : "static";
    
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      sourceFormId: template.source_form_id,
      sourceForm,
      targetFormId: template.target_form_id,
      targetForm,
      isActive: template.is_active,
      projectId: template.project_id,
      inheritanceMapping: template.inheritance_mapping || {},
      assignmentType,
      defaultAssignee: template.default_assignee || "",
      minDays: template.min_days || 0,
      dueDays: template.due_days || 7,
      assigneeFormField: template.assignee_form_field || ""
    };
  });
};

/**
 * Get project users for a specific project
 */
export const getProjectUsers = async (projectId: string): Promise<User[]> => {
  try {
    console.log(`[TaskTemplates] Fetching users for project: ${projectId}`);
    
    const { data: projectUsersData, error: projectUsersError } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('status', 'active');

    if (projectUsersError) {
      console.error("[TaskTemplates] Error fetching project users:", projectUsersError);
      return [];
    }
    
    if (!projectUsersData || projectUsersData.length === 0) {
      return [];
    }
    
    const userIds = projectUsersData.map(pu => pu.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);
      
    if (profilesError) {
      console.error("[TaskTemplates] Error fetching user profiles:", profilesError);
      return [];
    }
    
    const users: User[] = profilesData?.map(profile => ({
      id: profile.id,
      name: profile.name || 'Usuario sin nombre',
      email: profile.email || 'correo@desconocido.com'
    })) || [];
    
    console.log(`[TaskTemplates] Found ${users.length} users for project ${projectId}`);
    return users;
  } catch (error) {
    console.error("[TaskTemplates] Error fetching project users:", error);
    return [];
  }
};

/**
 * Extract all email fields from a form schema
 */
export const getEmailFieldsFromForm = (formSchema: Json | null): { key: string, label: string }[] => {
  if (!formSchema) {
    console.warn("[TaskTemplates] Form schema is null or undefined in getEmailFieldsFromForm");
    return [];
  }
  
  // Use safelyAccessFormSchema to ensure proper type conversion
  const schema = safelyAccessFormSchema(formSchema);
  if (!schema) {
    console.warn("[TaskTemplates] Invalid schema format in getEmailFieldsFromForm");
    return [];
  }

  // Now we can safely access the components property because schema is a FormSchema
  return schema.components
    .filter((component) => 
      component.type === 'email' && component.key)
    .map((component) => ({
      key: component.key,
      label: component.label || component.key
    }));
};

/**
 * Get all fields from source form schema
 */
export const getSourceFormFields = (sourceFormSchema: Json | null) => {
  if (!sourceFormSchema) {
    console.warn("[TaskTemplates] Source form schema is null or undefined in getSourceFormFields");
    return [];
  }
  
  // Use safelyAccessFormSchema to ensure proper type conversion
  const schema = safelyAccessFormSchema(sourceFormSchema);
  if (!schema) {
    console.warn("[TaskTemplates] Invalid source schema format in getSourceFormFields");
    return [];
  }
  
  // Now we can safely access the components property because schema is a FormSchema
  const fields = schema.components
    .filter((component) => component.key && component.type !== 'button')
    .map((component) => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
    
  console.log(`[TaskTemplates] getSourceFormFields - Found ${fields.length} fields`, 
    fields.length > 0 ? `(first field: ${fields[0].label}, type: ${fields[0].type})` : "");
  return fields;
};

/**
 * Get all fields from target form schema
 */
export const getTargetFormFields = (targetFormSchema: Json | null) => {
  if (!targetFormSchema) {
    console.warn("[TaskTemplates] Target form schema is null or undefined in getTargetFormFields");
    return [];
  }
  
  // Use safelyAccessFormSchema to ensure proper type conversion
  const schema = safelyAccessFormSchema(targetFormSchema);
  if (!schema) {
    console.warn("[TaskTemplates] Invalid target schema format in getTargetFormFields");
    return [];
  }
  
  // Now we can safely access the components property because schema is a FormSchema
  const fields = schema.components
    .filter((component) => component.key && component.type !== 'button')
    .map((component) => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
    
  console.log(`[TaskTemplates] getTargetFormFields - Found ${fields.length} fields`, 
    fields.length > 0 ? `(first field: ${fields[0].label}, type: ${fields[0].type})` : "");
  return fields;
};

/**
 * Check if field types are compatible
 */
export const areFieldTypesCompatible = (sourceType: string, targetType: string) => {
  const textTypes = ['textfield', 'textarea', 'text'];
  const numberTypes = ['number', 'currency'];
  const dateTypes = ['datetime', 'date'];
  const selectionTypes = ['select', 'radio', 'checkbox'];
  
  if (textTypes.includes(sourceType) && textTypes.includes(targetType)) return true;
  if (numberTypes.includes(sourceType) && numberTypes.includes(targetType)) return true;
  if (dateTypes.includes(sourceType) && dateTypes.includes(targetType)) return true;
  if (selectionTypes.includes(sourceType) && selectionTypes.includes(targetType)) return true;
  
  return sourceType === targetType;
};
