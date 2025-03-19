
/**
 * Form Schema Utilities
 * 
 * This module provides helpers for validating and working with form schemas.
 */

// Define a proper FormSchema interface to ensure type safety
export interface FormSchema {
  components: Array<{
    type: string;
    key: string;
    label: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Type guard to validate if a value is a valid FormSchema
 * Also handles string-serialized JSON schemas by attempting to parse them
 */
export const isValidFormSchema = (schema: any): schema is FormSchema => {
  if (!schema) {
    console.warn("[FormSchemaUtils] Schema is null or undefined");
    return false;
  }
  
  // Handle string serialized JSON
  if (typeof schema === 'string') {
    console.warn("[FormSchemaUtils] Schema is a string, trying to parse as JSON");
    try {
      const parsedSchema = JSON.parse(schema);
      const isValid = parsedSchema && 
                    typeof parsedSchema === 'object' && 
                    !Array.isArray(parsedSchema) && 
                    Array.isArray(parsedSchema.components);
                    
      if (!isValid) {
        console.warn("[FormSchemaUtils] Parsed schema is not valid:", parsedSchema);
      }
      return isValid;
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string:", e);
      return false;
    }
  }
  
  const isValid = schema && 
                typeof schema === 'object' && 
                !Array.isArray(schema) && 
                Array.isArray(schema.components);
                
  if (!isValid) {
    console.warn("[FormSchemaUtils] Schema is not valid:", schema);
  }
  return isValid;
};

/**
 * Helper to safely access form schema with proper type checking
 * Returns a FormSchema or null if invalid
 */
export const getValidFormSchema = (formSchema: any): FormSchema | null => {
  if (!formSchema) {
    return null;
  }
  
  // Try to parse if it's a string
  let schema = formSchema;
  if (typeof formSchema === 'string') {
    try {
      schema = JSON.parse(formSchema);
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string:", e);
      return null;
    }
  }
  
  if (isValidFormSchema(schema)) {
    return schema;
  }
  
  return null;
};

/**
 * Extract fields from a form schema by type
 */
export const getFieldsByType = (formSchema: any, fieldType: string): Array<{key: string, label: string}> => {
  const schema = getValidFormSchema(formSchema);
  if (!schema) {
    return [];
  }
  
  return schema.components
    .filter(component => component.type === fieldType && component.key)
    .map(component => ({
      key: component.key,
      label: component.label || component.key
    }));
};

/**
 * Get all form fields excluding buttons
 */
export const getAllFormFields = (formSchema: any): Array<{key: string, label: string, type: string}> => {
  const schema = getValidFormSchema(formSchema);
  if (!schema) {
    return [];
  }
  
  return schema.components
    .filter(component => component.key && component.type !== 'button')
    .map(component => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
};

/**
 * Check if two field types are compatible for data transfer
 */
export const areFieldTypesCompatible = (sourceType: string, targetType: string): boolean => {
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
