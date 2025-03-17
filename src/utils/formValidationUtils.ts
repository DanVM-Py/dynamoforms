
/**
 * Utility function to determine if a component should be considered required
 * based on its conditional display status
 * 
 * @param component The form component to check
 * @param formData The current form data to evaluate conditions against
 * @returns boolean indicating if the component should be considered required
 */
export const isComponentRequired = (component: any, formData: any): boolean => {
  // If component is not required, it's never required
  if (!component.required) {
    return false;
  }
  
  // If component doesn't have conditional display, use its required property
  if (!component.conditionalDisplay) {
    return component.required;
  }
  
  // Get the controlling component's value from form data
  const {
    controlledBy,
    showWhen,
    value: expectedValue
  } = component.conditionalDisplay;
  
  // Find the controlling component id in the form data
  const controllingValue = formData[controlledBy];
  
  // If controlling value is undefined, the condition can't be evaluated
  // Default to not requiring the field
  if (controllingValue === undefined) {
    return false;
  }
  
  // Check if the condition is met based on showWhen condition
  const conditionMet = showWhen === 'equals' 
    ? controllingValue === expectedValue 
    : controllingValue !== expectedValue;
  
  // Field is required only if the condition is met and it's marked as required
  return conditionMet && component.required;
};

/**
 * Validates if a number meets the minimum value requirement
 * 
 * @param value The number value to validate
 * @param minValue The minimum allowed value
 * @returns boolean indicating if the value meets the minimum requirement
 */
export const isAboveMinValue = (value: number | string, minValue?: number): boolean => {
  // If no minimum value is specified, the validation passes
  if (minValue === undefined) {
    return true;
  }
  
  // Convert value to number for comparison
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if the value is not a number
  if (isNaN(numValue)) {
    return false;
  }
  
  // Compare the value with the minimum value
  return numValue >= minValue;
};

/**
 * Validates file upload based on the component configuration
 * 
 * @param files Array of files to validate
 * @param component The form component configuration
 * @returns An object with validity and error message
 */
export const validateFileUpload = (
  files: any[],
  component: any
): { isValid: boolean; errorMessage?: string } => {
  // Check if files is undefined or null
  if (!files || !Array.isArray(files)) {
    return { isValid: !component.required, errorMessage: component.required ? 'Este campo es obligatorio' : undefined };
  }
  
  // Check if the number of files exceeds the maximum allowed
  if (component.type === 'file_single' && files.length > 1) {
    return { isValid: false, errorMessage: 'Solo se permite un archivo' };
  }
  
  if (component.type === 'file_multiple' && files.length > (component.maxFiles || 5)) {
    return { 
      isValid: false, 
      errorMessage: `Máximo ${component.maxFiles || 5} archivos permitidos` 
    };
  }
  
  // Check if files have the correct extension
  if (component.acceptedFileTypes && component.acceptedFileTypes.length > 0) {
    for (const file of files) {
      if (typeof file === 'string') {
        // Skip validation for already uploaded files (stored as URLs)
        continue;
      }
      
      // Check file extension for File objects
      if (file.name) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const acceptedTypes = component.acceptedFileTypes.map((type: string) => type.toLowerCase());
        
        if (!acceptedTypes.includes(fileExtension)) {
          return { 
            isValid: false, 
            errorMessage: `Tipo de archivo no permitido. Tipos aceptados: ${component.acceptedFileTypes.join(', ')}` 
          };
        }
      }
    }
  }
  
  return { isValid: true };
};
