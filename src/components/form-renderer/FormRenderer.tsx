
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureField } from "../form-builder/SignatureField";
import { ImageUploadField } from "../form-builder/ImageUploadField";
import { LocationField } from "../form-builder/LocationField";
import { FormComponent, FormSchema } from "../form-builder/FormBuilder";
import { uploadBase64Image } from "@/utils/fileUploadUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface FormRendererProps {
  formId: string;
  schema: FormSchema;
  readOnly?: boolean;
  onSubmitSuccess?: (responseId: string) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ 
  formId, 
  schema, 
  readOnly = false,
  onSubmitSuccess
}) => {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (componentId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [componentId]: value
    }));
    
    // Clear error when user changes the value
    if (errors[componentId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[componentId];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Check required fields
    schema.components.forEach((component) => {
      if (component.required) {
        const value = formValues[component.id];
        
        if (value === undefined || value === null || value === '') {
          newErrors[component.id] = 'Este campo es obligatorio';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (readOnly) return;
    
    // Validate form
    if (!validateForm()) {
      toast({
        title: "Error en el formulario",
        description: "Por favor, completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process any special field types (signatures, images)
      const processedValues = { ...formValues };
      
      // Process signatures (convert to images in storage)
      for (const component of schema.components) {
        if (component.type === 'signature') {
          const signatureDataUrl = formValues[component.id];
          if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
            // Upload signature as image
            const signatureUrl = await uploadBase64Image(signatureDataUrl, 'signatures');
            processedValues[component.id] = signatureUrl;
          }
        }
      }
      
      // Submit the form data to Supabase
      const { data, error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          response_data: processedValues,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Formulario enviado",
        description: "Tu respuesta ha sido enviada correctamente.",
      });
      
      // Clear form values
      setFormValues({});
      
      // Call success callback if provided
      if (onSubmitSuccess && data?.id) {
        onSubmitSuccess(data.id);
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      toast({
        title: "Error al enviar",
        description: "Hubo un problema al enviar tu respuesta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderFormComponent = (component: FormComponent) => {
    const { id, type, label, required, options, placeholder, helpText } = component;
    const value = formValues[id];
    const error = errors[id];
    
    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div className="space-y-2" key={id}>
            <Label htmlFor={id}>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <Input
              id={id}
              type={type === 'number' ? 'number' : 'text'}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => handleInputChange(id, e.target.value)}
              readOnly={readOnly}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'date':
      case 'time':
        return (
          <div className="space-y-2" key={id}>
            <Label htmlFor={id}>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <Input
              id={id}
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(id, e.target.value)}
              readOnly={readOnly}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="space-y-2" key={id}>
            <Label htmlFor={id}>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <Textarea
              id={id}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => handleInputChange(id, e.target.value)}
              readOnly={readOnly}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2" key={id}>
            <Label htmlFor={id}>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <Select
              disabled={readOnly}
              value={value || ''}
              onValueChange={(val) => handleInputChange(id, val)}
            >
              <SelectTrigger 
                id={id}
                className={error ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={placeholder || "Seleccione una opción"} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2" key={id}>
            <div>
              <Label>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            <RadioGroup
              disabled={readOnly}
              value={value || ''}
              onValueChange={(val) => handleInputChange(id, val)}
              className={error ? 'border border-red-500 p-2 rounded-md' : ''}
            >
              {options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                  <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2" key={id}>
            <div>
              <Label>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </Label>
            </div>
            <div className={`space-y-2 ${error ? 'border border-red-500 p-2 rounded-md' : ''}`}>
              {options?.map((option) => {
                const isChecked = Array.isArray(value) 
                  ? value.includes(option.value)
                  : false;
                  
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${id}-${option.value}`}
                      checked={isChecked}
                      disabled={readOnly}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(value) ? [...value] : [];
                        const newValues = checked
                          ? [...currentValues, option.value]
                          : currentValues.filter(v => v !== option.value);
                        handleInputChange(id, newValues);
                      }}
                    />
                    <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </div>
        );
        
      case 'image':
        return (
          <div key={id}>
            <ImageUploadField
              label={label}
              required={required}
              helpText={helpText}
              value={value}
              onChange={(val) => handleInputChange(id, val)}
              readOnly={readOnly}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      case 'signature':
        return (
          <div key={id}>
            <SignatureField
              label={label}
              required={required}
              helpText={helpText}
              value={value}
              onChange={(val) => handleInputChange(id, val)}
              readOnly={readOnly}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      case 'location':
        return (
          <div key={id}>
            <LocationField
              label={label}
              required={required}
              helpText={helpText}
              value={value}
              onChange={(val) => handleInputChange(id, val)}
              readOnly={readOnly}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      default:
        return (
          <div key={id} className="p-4 border border-gray-200 rounded-md text-center text-gray-500">
            Componente no soportado: {type}
          </div>
        );
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {schema.components.map(renderFormComponent)}
      
      {!readOnly && (
        <Button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-dynamo-600 hover:bg-dynamo-700"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
        </Button>
      )}
    </form>
  );
};
