import { Json } from "@/types/supabase";

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
    .from('project_users')
    .select('user_id')
    .eq('project_id', projectId);

  if (projectUsersError) {
    console.error("Error fetching project users:", projectUsersError);
    return [];
  }

  const userIds = projectUsers.map(pu => pu.user_id);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds);

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return [];
  }

  return users || [];
};

// Función para obtener los campos del formulario de origen
export const getSourceFormFields = (formSchema: Json | null): FormField[] => {
  if (!formSchema) return [];
  
  // Intentar interpretar el esquema
  try {
    let schema: any = formSchema;
    
    // Si es string, intentamos parsearlo
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch (e) {
        console.error("[taskTemplateUtils] Error parsing source schema:", e);
        return [];
      }
    }
    
    // Verificar si tenemos componentes
    if (!schema || !schema.components || !Array.isArray(schema.components)) {
      console.warn("[taskTemplateUtils] Invalid source form schema format:", schema);
      return [];
    }
    
    // Extraer y transformar los campos
    return schema.components
      .filter((component: any) => 
        component.key && 
        (component.input === true || component.input === undefined) &&
        component.type !== 'button' && 
        component.type !== 'content' && 
        component.type !== 'htmlelement'
      )
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'textfield'
      }));
      
  } catch (error) {
    console.error("[taskTemplateUtils] Error processing source form schema:", error);
    return [];
  }
};

// Función para obtener los campos del formulario de destino
export const getTargetFormFields = (formSchema: Json | null): FormField[] => {
  if (!formSchema) return [];
  
  // Intentar interpretar el esquema
  try {
    let schema: any = formSchema;
    
    // Si es string, intentamos parsearlo
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch (e) {
        console.error("[taskTemplateUtils] Error parsing target schema:", e);
        return [];
      }
    }
    
    // Verificar si tenemos componentes
    if (!schema || !schema.components || !Array.isArray(schema.components)) {
      console.warn("[taskTemplateUtils] Invalid target form schema format:", schema);
      return [];
    }
    
    // Extraer y transformar los campos
    return schema.components
      .filter((component: any) => 
        component.key && 
        (component.input === true || component.input === undefined) &&
        component.type !== 'button' && 
        component.type !== 'content' && 
        component.type !== 'htmlelement'
      )
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'textfield'
      }));
      
  } catch (error) {
    console.error("[taskTemplateUtils] Error processing target form schema:", error);
    return [];
  }
};

export const areFieldTypesCompatible = (sourceType: string, targetType: string): boolean => {
  // Aquí puedes definir la lógica de compatibilidad de tipos.
  // Por ejemplo, podrías permitir la herencia de 'number' a 'text', pero no al revés.
  // Este es solo un ejemplo básico:
  return sourceType === targetType;
};

export const getEmailFieldsFromForm = (formSchema: Json | null): FormField[] => {
  if (!formSchema) return [];

  try {
    let schema: any = formSchema;

    // Si es string, intentamos parsearlo
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch (e) {
        console.error("[taskTemplateUtils] Error parsing schema:", e);
        return [];
      }
    }

    // Verificar si tenemos componentes
    if (!schema || !schema.components || !Array.isArray(schema.components)) {
      console.warn("[taskTemplateUtils] Invalid form schema format:", schema);
      return [];
    }

    // Extraer y transformar los campos
    return schema.components
      .filter((component: any) =>
        component.key &&
        (component.input === true || component.input === undefined) &&
        component.type === 'email'
      )
      .map((component: any) => ({
        key: component.key,
        label: component.label || component.key,
        type: component.type || 'email'
      }));

  } catch (error) {
    console.error("[taskTemplateUtils] Error processing form schema:", error);
    return [];
  }
};

import { supabase } from "@/integrations/supabase/client";
