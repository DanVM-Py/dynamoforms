import { supabase } from "@/integrations/supabase/client";
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

export interface FormSchemaComponent {
  type: string;
  key: string;
  label: string;
  [key: string]: unknown; // Using 'unknown' is safer than 'any'
}

export interface FormSchema {
  components: FormSchemaComponent[];
  [key: string]: unknown; // Using 'unknown' is safer than 'any'
}

export interface Form {
  id: string;
  title: string;
  schema?: FormSchema | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
}

export type AssignmentType = "static" | "dynamic";

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
  inheritanceMapping: Record<string, string>; // Specific type
  assignmentType: AssignmentType;
  defaultAssignee: string; // User ID
  minDays: number;
  dueDays: number;
  assigneeFormField: string; // Form field key
}

export const transformTaskTemplates = (
  taskTemplatesData: Partial<TaskTemplate>[],
  formsMap: Map<string, Form>
): TaskTemplate[] => {
  return taskTemplatesData.map(tt => ({
    ...tt,
    id: tt.id!,
    title: tt.title || "Untitled Template",
    description: tt.description || "",
    sourceFormId: tt.sourceFormId!,
    targetFormId: tt.targetFormId!,
    isActive: tt.isActive !== undefined ? tt.isActive : true,
    projectId: tt.projectId!,
    inheritanceMapping: tt.inheritanceMapping || {},
    assignmentType: tt.assignmentType || "static",
    defaultAssignee: tt.defaultAssignee || "",
    minDays: tt.minDays !== undefined ? tt.minDays : 0,
    dueDays: tt.dueDays !== undefined ? tt.dueDays : 7,
    assigneeFormField: tt.assigneeFormField || "",
    sourceFormTitle: tt.sourceFormId ? formsMap.get(tt.sourceFormId)?.title : undefined,
    targetFormTitle: tt.targetFormId ? formsMap.get(tt.targetFormId)?.title : undefined,
  } as TaskTemplate));
};

export const getProjectUsers = async (projectId: string): Promise<User[]> => {
  if (!projectId) {
    logger.warn("[getProjectUsers] Project ID is undefined or null. Returning empty array.");
    return [];
  }
  try {
    logger.debug(`[getProjectUsers] Fetching project_users for project: ${projectId}`);
    const { data: projectUsersData, error: projectUsersError } = await supabase
      .from(Tables.project_users)
      .select('user_id')
      .eq('project_id', projectId);

    if (projectUsersError) {
      logger.error(`[getProjectUsers] Error fetching project_users for project ${projectId}:`, projectUsersError);
      throw projectUsersError;
    }

    if (!projectUsersData || projectUsersData.length === 0) {
      logger.debug(`[getProjectUsers] No users found in project_users for project ${projectId}.`);
      return [];
    }

    const userIds = projectUsersData.map(pu => pu.user_id);
    logger.debug(`[getProjectUsers] Fetching profiles for user IDs:`, userIds);
    const { data: profilesData, error: profilesError } = await supabase
      .from(Tables.profiles)
      .select('id, name, email')
      .in('id', userIds);

    if (profilesError) {
      logger.error(`[getProjectUsers] Error fetching profiles for user IDs (${userIds}):`, profilesError);
      throw profilesError;
    }

    const users: User[] = profilesData?.map(profile => ({
      id: profile.id,
      name: profile.name || null,
      email: profile.email || null
    })) || [];

    logger.debug(`[getProjectUsers] Found ${users.length} user profiles for project ${projectId}.`);
    return users;
  } catch (error) {
    logger.error(`[getProjectUsers] Unexpected error fetching users for project ${projectId}:`, error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unexpected error occurred while fetching project users.');
  }
};

// Función para obtener los campos del formulario de origen
export const getSourceFormFields = (formSchema: FormSchema | null | undefined): { key: string, label: string, type: string }[] => {
  if (!isValidFormSchema(formSchema)) return [];
  return formSchema.components
    .filter((component: FormSchemaComponent) => component.key && component.type !== 'button')
    .map((component: FormSchemaComponent) => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
};

// Función para obtener los campos del formulario de destino
export const getTargetFormFields = (formSchema: FormSchema | null | undefined): { key: string, label: string, type: string }[] => {
  if (!isValidFormSchema(formSchema)) return [];
  return formSchema.components
    .filter((component: FormSchemaComponent) => component.key && component.type !== 'button')
    .map((component: FormSchemaComponent) => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
};

export const areFieldTypesCompatible = (sourceType: string, targetType: string): boolean => {
  const textTypes = ['textfield', 'textarea', 'text'];
  const numberTypes = ['number', 'currency'];
  const dateTypes = ['datetime', 'date'];
  const selectionTypes = ['select', 'radio', 'checkbox'];

  if (sourceType === targetType) return true;
  if (textTypes.includes(sourceType) && textTypes.includes(targetType)) return true;
  if (numberTypes.includes(sourceType) && numberTypes.includes(targetType)) return true;
  if (dateTypes.includes(sourceType) && dateTypes.includes(targetType)) return true;
  if (selectionTypes.includes(sourceType) && selectionTypes.includes(targetType)) return true;
  
  return false;
};

export const getEmailFieldsFromForm = (formSchema: FormSchema | null | undefined): { key: string, label: string }[] => {
  if (!isValidFormSchema(formSchema)) {
    return [];
  }
  return formSchema.components
    .filter((component: FormSchemaComponent) =>
      component.type === 'email' && component.key
    )
    .map((component: FormSchemaComponent) => ({
      key: component.key,
      label: component.label || component.key
    }));
};

/**
 * Checks if the provided schema is a valid FormSchema object.
 */
export const isValidFormSchema = (schema: unknown): schema is FormSchema => {
  return schema !== null &&
         typeof schema === 'object' &&
         !Array.isArray(schema) &&
         Array.isArray((schema as FormSchema).components);
};
