
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
  groups?: Array<{
    key: string;
    label: string;
    components: string[];
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
    console.log("[FormSchemaUtils] Schema is a string, trying to parse as JSON:", schema.substring(0, 50) + "...");
    try {
      const parsedSchema = JSON.parse(schema);
      return isValidFormSchema(parsedSchema);
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
  } else {
    console.log("[FormSchemaUtils] Valid schema with", schema.components.length, "components");
  }
  return isValid;
};

/**
 * Helper to safely access form schema with proper type checking
 * Returns a FormSchema or null if invalid
 */
export const getValidFormSchema = (formSchema: any): FormSchema | null => {
  if (!formSchema) {
    console.warn("[FormSchemaUtils] Schema is empty or null");
    return null;
  }
  
  // Try to parse if it's a string
  let schema = formSchema;
  if (typeof formSchema === 'string') {
    try {
      console.log("[FormSchemaUtils] Parsing string schema");
      schema = JSON.parse(formSchema);
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string:", e);
      return null;
    }
  }
  
  if (isValidFormSchema(schema)) {
    return schema;
  }
  
  console.warn("[FormSchemaUtils] Schema validation failed");
  return null;
};

/**
 * Extract fields from a form schema by type
 */
export const getFieldsByType = (formSchema: any, fieldType: string): Array<{key: string, label: string}> => {
  console.log(`[FormSchemaUtils] Getting fields of type "${fieldType}"`);
  const schema = getValidFormSchema(formSchema);
  if (!schema) {
    console.warn(`[FormSchemaUtils] No valid schema for getFieldsByType`);
    return [];
  }
  
  const fields = schema.components
    .filter(component => component.type === fieldType && component.key)
    .map(component => ({
      key: component.key,
      label: component.label || component.key
    }));
  
  console.log(`[FormSchemaUtils] Found ${fields.length} fields of type "${fieldType}"`);
  return fields;
};

/**
 * Get all form fields excluding buttons
 */
export const getAllFormFields = (formSchema: any): Array<{key: string, label: string, type: string}> => {
  console.log(`[FormSchemaUtils] Getting all fields`);
  const schema = getValidFormSchema(formSchema);
  if (!schema) {
    console.warn(`[FormSchemaUtils] No valid schema for getAllFormFields`);
    return [];
  }
  
  const fields = schema.components
    .filter(component => component.key && component.type !== 'button')
    .map(component => ({
      key: component.key,
      label: component.label || component.key,
      type: component.type
    }));
  
  console.log(`[FormSchemaUtils] Found ${fields.length} fields (excluding buttons)`);
  return fields;
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

/**
 * Debug utility to log schema information
 */
export const debugFormSchema = (formSchema: any, label: string = "Form Schema Debug"): void => {
  console.group(label);
  
  if (!formSchema) {
    console.warn("Schema is null or undefined");
    console.groupEnd();
    return;
  }
  
  if (typeof formSchema === 'string') {
    console.log("Schema is a string (length: " + formSchema.length + ")");
    try {
      const parsed = JSON.parse(formSchema);
      console.log("Parsed successfully to:", typeof parsed);
      if (typeof parsed === 'object') {
        console.log("Keys:", Object.keys(parsed));
        if (Array.isArray(parsed.components)) {
          console.log("Components:", parsed.components.length);
        } else {
          console.warn("No valid components array");
        }
      }
    } catch (e) {
      console.error("Failed to parse as JSON:", e);
    }
  } else if (typeof formSchema === 'object') {
    console.log("Schema is an object");
    console.log("Keys:", Object.keys(formSchema));
    if (Array.isArray(formSchema.components)) {
      console.log("Components:", formSchema.components.length);
      console.log("Component types:", formSchema.components.map(c => c.type));
    } else {
      console.warn("No valid components array");
    }
  } else {
    console.warn("Schema is of type:", typeof formSchema);
  }
  
  console.groupEnd();
};
