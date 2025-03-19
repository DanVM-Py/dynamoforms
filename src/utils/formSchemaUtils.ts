
/**
 * Form Schema Utilities
 * 
 * This module provides helpers for validating and working with form schemas.
 */
import { Json } from '@/types/supabase';

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
    try {
      console.log("[FormSchemaUtils] Schema is a string, trying to parse as JSON:", 
        schema.substring(0, 100) + (schema.length > 100 ? "..." : ""));
      const parsedSchema = JSON.parse(schema);
      return isValidFormSchema(parsedSchema);
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string:", e);
      return false;
    }
  }
  
  // Check for Json array type from Supabase (this is crucial for type safety)
  if (Array.isArray(schema)) {
    console.warn("[FormSchemaUtils] Schema is an array, not an object with components");
    return false;
  }
  
  // Proper object type check
  const isValid = schema && 
                typeof schema === 'object' && 
                !Array.isArray(schema) && 
                Array.isArray(schema.components);
                
  if (!isValid) {
    console.warn("[FormSchemaUtils] Schema is not valid:", JSON.stringify(schema).substring(0, 200) + "...");
    if (typeof schema === 'object') {
      console.warn("[FormSchemaUtils] Schema keys:", Object.keys(schema));
    }
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
      console.log("[FormSchemaUtils] Parsing string schema of length:", formSchema.length);
      schema = JSON.parse(formSchema);
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string:", e);
      return null;
    }
  }
  
  // Handle Json type from Supabase
  if (Array.isArray(schema)) {
    console.warn("[FormSchemaUtils] Schema is an array, not an object with components");
    return null;
  }
  
  if (isValidFormSchema(schema)) {
    return schema as FormSchema;
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
          console.log("Component types:", parsed.components.map(c => c.type).slice(0, 10));
        } else {
          console.warn("No valid components array");
        }
      }
    } catch (e) {
      console.error("Failed to parse as JSON:", e);
      console.log("First 200 chars:", formSchema.substring(0, 200));
    }
  } else if (Array.isArray(formSchema)) {
    console.warn("Schema is an array, not an object with components");
    console.log("Array length:", formSchema.length);
    console.log("First item type:", typeof formSchema[0]);
  } else if (typeof formSchema === 'object') {
    console.log("Schema is an object");
    console.log("Keys:", Object.keys(formSchema));
    if (Array.isArray(formSchema.components)) {
      console.log("Components:", formSchema.components.length);
      console.log("Component types:", formSchema.components.map(c => c.type).slice(0, 10));
    } else {
      console.warn("No valid components array");
    }
  } else {
    console.warn("Schema is of type:", typeof formSchema);
  }
  
  console.groupEnd();
};

/**
 * Utility to fix common issues in form schemas
 */
export const sanitizeFormSchema = (schema: any): FormSchema | null => {
  if (!schema) return null;
  
  // Handle string input
  if (typeof schema === 'string') {
    try {
      schema = JSON.parse(schema);
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema in sanitizeFormSchema:", e);
      return null;
    }
  }
  
  // Handle Json type from Supabase
  if (Array.isArray(schema)) {
    console.warn("[FormSchemaUtils] Schema is an array, not an object with components");
    return null;
  }
  
  // Ensure we have an object
  if (typeof schema !== 'object' || schema === null) {
    console.warn("[FormSchemaUtils] Schema is not an object in sanitizeFormSchema");
    return null;
  }
  
  // Ensure components is an array
  if (!Array.isArray(schema.components)) {
    console.warn("[FormSchemaUtils] Schema has no components array in sanitizeFormSchema");
    schema.components = [];
  }
  
  // Fix common issues with components
  schema.components = schema.components.map((component: any) => {
    if (!component.key && component.id) {
      component.key = component.id;
    }
    
    if (!component.label && component.title) {
      component.label = component.title;
    }
    
    return component;
  });
  
  return schema as FormSchema;
};

/**
 * Safely access a form schema that might be a Json type from Supabase
 * This is the key function that helps with TypeScript type safety
 */
export const safelyAccessFormSchema = (schema: Json | null): FormSchema | null => {
  if (!schema) return null;
  
  // Handle string input (common when retrieving from DB)
  if (typeof schema === 'string') {
    try {
      return sanitizeFormSchema(JSON.parse(schema));
    } catch (e) {
      console.error("[FormSchemaUtils] Failed to parse schema string in safelyAccessFormSchema:", e);
      return null;
    }
  }
  
  // Handle Json array type from Supabase
  if (Array.isArray(schema)) {
    console.warn("[FormSchemaUtils] Schema is an array in safelyAccessFormSchema, not an object with components");
    return null;
  }
  
  // If it's already an object, sanitize it
  return sanitizeFormSchema(schema);
};
