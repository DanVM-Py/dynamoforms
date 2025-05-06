import { Json } from "@/types/database-entities";
import { supabase } from "@/integrations/supabase/client";
import { getValidFormSchema, safelyAccessFormSchema } from "@/utils/formSchemaUtils";
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

export type TaskTemplate = {
  id: string;
  title: string;
  description: string;
  sourceFormId: string;
  targetFormId: string;
  isActive: boolean;
  projectId: string;
  projectName?: string;
  inheritanceMapping: Record<string, string>;
  assignmentType: AssignmentType;
  defaultAssignee: string;
  minDays: number;
  dueDays: number;
  assigneeFormField: string;
  sourceFormTitle?: string;
  targetFormTitle?: string;
};

export type Form = {
  id: string;
  title: string;
  schema: Json;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AssignmentType = "static" | "dynamic";

export type FormField = {
  key: string;
  label: string;
  type: string;
};

export const transformTaskTemplates = (taskTemplatesData: any[], formsMap: Map<string, Form>): TaskTemplate[] => {
  return taskTemplatesData.map(template => {
    const sourceForm = formsMap.get(template.source_form_id);
    const targetForm = formsMap.get(template.target_form_id);

    return {
      id: template.id,
      title: template.title,
      description: template.description,
      sourceFormId: template.source_form_id,
      targetFormId: template.target_form_id,
      isActive: template.is_active,
      projectId: template.project_id,
      projectName: template.project?.name,
      inheritanceMapping: template.inheritance_mapping || {},
      assignmentType: template.assignment_type,
      defaultAssignee: template.default_assignee,
      minDays: template.min_days,
      dueDays: template.due_days,
      assigneeFormField: template.assignee_form_field,
      sourceFormTitle: sourceForm?.title,
      targetFormTitle: targetForm?.title,
    };
  });
};

export const getProjectUsers = async (projectId: string): Promise<User[]> => {
  const { data: projectUsers, error: projectUsersError } = await supabase
    .from(Tables.project_users)
    .select('user_id')
    .eq('project_id', projectId);

  if (projectUsersError) {
    logger.error("Error fetching project users:", projectUsersError);
    return [];
  }

  const userIds = projectUsers.map(pu => pu.user_id);

  const { data: users, error: usersError } = await supabase
    .from(Tables.profiles)
    .select('id, name, email')
    .in('id', userIds);

  if (usersError) {
    logger.error("Error fetching users:", usersError);
    return [];
  }

  return users || [];
};

// Función para obtener los campos del formulario de origen
export const getSourceFormFields = (formSchema: Json | null): FormField[] => {
  if (!formSchema) {
    logger.error("[taskTemplateUtils] No form schema provided for getSourceFormFields");
    return [];
  }
  
  // Usar las funciones de formSchemaUtils para un procesamiento más robusto
  const schema = safelyAccessFormSchema(formSchema);
  if (!schema) {
    logger.error("[taskTemplateUtils] Invalid schema structure in getSourceFormFields");
    return [];
  }
  
  // Extract and transform fields from the valid schema
  try {
    logger.info("[taskTemplateUtils] Processing source form components:", schema.components.length);
    
    return schema.components
      .filter(component => 
        component.key && 
        (component.input === true || component.input === undefined) &&
        component.type !== 'button' && 
        component.type !== 'content' && 
        component.type !== 'htmlelement'
      )
      .map(component => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'textfield'
      }));
      
  } catch (error) {
    logger.error("[taskTemplateUtils] Error processing source form schema:", error);
    return [];
  }
};

// Función para obtener los campos del formulario de destino
export const getTargetFormFields = (formSchema: Json | null): FormField[] => {
  if (!formSchema) {
    logger.error("[taskTemplateUtils] No form schema provided for getTargetFormFields");
    return [];
  }
  
  // Usar las funciones de formSchemaUtils para un procesamiento más robusto
  const schema = safelyAccessFormSchema(formSchema);
  if (!schema) {
    logger.error("[taskTemplateUtils] Invalid schema structure in getTargetFormFields");
    return [];
  }
  
  // Extract and transform fields from the valid schema
  try {
    logger.info("[taskTemplateUtils] Processing target form components:", schema.components.length);
    
    return schema.components
      .filter(component => 
        component.key && 
        (component.input === true || component.input === undefined) &&
        component.type !== 'button' && 
        component.type !== 'content' && 
        component.type !== 'htmlelement'
      )
      .map(component => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'textfield'
      }));
      
  } catch (error) {
    logger.error("[taskTemplateUtils] Error processing target form schema:", error);
    return [];
  }
};

export const areFieldTypesCompatible = (sourceType: string, targetType: string): boolean => {
  // Group compatible field types together
  const textTypes = ['textfield', 'textarea', 'text'];
  const numberTypes = ['number', 'currency'];
  const dateTypes = ['datetime', 'date'];
  const selectionTypes = ['select', 'radio', 'checkbox'];
  
  // Check if both types belong to the same group
  if (textTypes.includes(sourceType) && textTypes.includes(targetType)) return true;
  if (numberTypes.includes(sourceType) && numberTypes.includes(targetType)) return true;
  if (dateTypes.includes(sourceType) && dateTypes.includes(targetType)) return true;
  if (selectionTypes.includes(sourceType) && selectionTypes.includes(targetType)) return true;
  
  // Fall back to exact type match
  return sourceType === targetType;
};

export const getEmailFieldsFromForm = (formSchema: Json | null): FormField[] => {
  if (!formSchema) return [];

  const schema = safelyAccessFormSchema(formSchema);
  if (!schema) {
    logger.error("[taskTemplateUtils] Invalid schema structure in getEmailFieldsFromForm");
    return [];
  }

  try {
    return schema.components
      .filter(component =>
        component.key &&
        (component.input === true || component.input === undefined) &&
        component.type === 'email'
      )
      .map(component => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'email'
      }));

  } catch (error) {
    logger.error("[taskTemplateUtils] Error processing form schema in getEmailFieldsFromForm:", error);
    return [];
  }
};
