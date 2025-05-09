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
  taskTemplatesData: any[],
  formsMap: Map<string, Form>
): TaskTemplate[] => {
  if (!Array.isArray(taskTemplatesData)) {
    return [];
  }
  return taskTemplatesData.map(tt => {
    const transformed = {
      id: tt.id!,
      title: tt.title || "Untitled Template",
      description: tt.description || "",
      sourceFormId: tt.source_form_id!,
      targetFormId: tt.target_form_id!,
      isActive: tt.is_active !== undefined ? tt.is_active : true,
      projectId: tt.project_id!,
      inheritanceMapping: tt.inheritance_mapping || {},
      assignmentType: tt.assignment_type || "static",
      defaultAssignee: tt.default_assignee || "",
      minDays: tt.min_days !== undefined ? tt.min_days : 0,
      dueDays: tt.due_days !== undefined ? tt.due_days : 7,
      assigneeFormField: tt.assignee_form_field || "",
      sourceFormTitle: tt.source_form_id ? formsMap.get(tt.source_form_id)?.title : undefined,
      targetFormTitle: tt.target_form_id ? formsMap.get(tt.target_form_id)?.title : undefined,
    };
    return transformed as TaskTemplate;
  });
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
  if (!isValidFormSchema(formSchema)) {
    logger.debug("[getSourceFormFields] isValidFormSchema devolvió false. Retornando array vacío.");
    return [];
  }

  logger.debug("[getSourceFormFields] Entrando con formSchema.components. Cantidad inicial:", formSchema.components.length);

  const filteredComponents = formSchema.components
    .filter((component: FormSchemaComponent, index: number) => { // La interfaz FormSchemaComponent aún usa 'key'
                                                                 // pero el objeto 'component' real tendrá 'id'
      const componentActual = component as any; // Usamos 'as any' para acceder a 'id' sin error de TS
                                                // o modificamos FormSchemaComponent
      const idValue = componentActual.id;
      const keyIsNonEmptyString = typeof idValue === 'string' && idValue.trim() !== '';
      const isNotButton = componentActual.type !== 'button';
      const shouldKeep = keyIsNonEmptyString && isNotButton;

      logger.debug(`[getSourceFormFields] Filtrando componente #${index}: id='${idValue}' (tipo: ${typeof idValue}), type='${componentActual.type}'. KeyIsNonEmptyString (basado en id): ${keyIsNonEmptyString}, IsNotButton: ${isNotButton}. Se mantiene: ${shouldKeep}`);
      
      return shouldKeep;
    });
  
  logger.debug("[getSourceFormFields] Cantidad de componentes después del filtro:", filteredComponents.length);

  if (filteredComponents.length === 0 && formSchema.components.length > 0) {
    logger.warn("[getSourceFormFields] ¡ADVERTENCIA! Todos los componentes fueron filtrados. Revisa las condiciones del filtro y los datos de 'id' de los componentes.");
  }

  return filteredComponents.map((component: FormSchemaComponent) => {
    const componentActual = component as any; // Nuevamente, para acceder a 'id'
    return {
      key: componentActual.id, // Usamos 'id' como 'key' para la lógica de herencia
      label: componentActual.label || componentActual.id, // Si label no existe, usa id
      type: componentActual.type
    };
  });
};

// Función para obtener los campos del formulario de destino
export const getTargetFormFields = (formSchema: FormSchema | null | undefined): { key: string, label: string, type: string }[] => {
  if (!isValidFormSchema(formSchema)) return [];
  logger.debug("[getTargetFormFields] Entrando con formSchema.components. Cantidad inicial:", formSchema.components.length);
  
  const filtered = formSchema.components
    .filter((component: FormSchemaComponent) => {
        const componentActual = component as any;
        const idIsValid = typeof componentActual.id === 'string' && componentActual.id.trim() !== '';
        const typeIsNotButton = componentActual.type !== 'button';
        // logger.debug(`[getTargetFormFields] Filtrando: id='${componentActual.id}', type='${componentActual.type}', Mantiene: ${idIsValid && typeIsNotButton}`);
        return idIsValid && typeIsNotButton;
    });
  logger.debug("[getTargetFormFields] Cantidad de componentes después del filtro:", filtered.length);
  return filtered.map((component: FormSchemaComponent) => {
    const componentActual = component as any;
    return {
      key: componentActual.id, // Usamos 'id' como 'key'
      label: componentActual.label || componentActual.id,
      type: componentActual.type
    };
  });
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
  if (schema === null) {
    // logger.debug("[isValidFormSchema] Schema is null.");
    return false;
  }
  if (typeof schema !== 'object') {
    // logger.debug("[isValidFormSchema] Schema is not an object. Type:", typeof schema);
    return false;
  }
  if (Array.isArray(schema)) {
    // logger.debug("[isValidFormSchema] Schema itself is an array.");
    return false;
  }
  const componentsProperty = (schema as { components?: unknown }).components;
  // logger.debug("[isValidFormSchema] Value of 'components' property:", componentsProperty);
  if (componentsProperty === undefined) {
    // logger.debug("[isValidFormSchema] 'components' property is undefined on the schema.");
    return false;
  }
  const isComponentsAnArray = Array.isArray(componentsProperty);
  // logger.debug("[isValidFormSchema] Is 'components' property an array?", isComponentsAnArray);
  return isComponentsAnArray;
};
