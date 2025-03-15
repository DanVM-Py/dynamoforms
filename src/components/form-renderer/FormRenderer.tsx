
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
import { Loader2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { v4 as uuidv4 } from "uuid";

export interface FormRendererProps {
  formId: string;
  schema: FormSchema;
  readOnly?: boolean;
  onSubmitSuccess?: (responseId: string) => void;
  isPublic?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ 
  formId, 
  schema, 
  readOnly = false,
  onSubmitSuccess,
  isPublic = false
}) => {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    schema.groups?.forEach(group => {
      initialState[group.id] = group.expanded !== false;
    });
    return initialState;
  });
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  const handleInputChange = (componentId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [componentId]: value
    }));
    
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
      const processedValues = { ...formValues };
      
      for (const component of schema.components) {
        if (component.type === 'signature') {
          const signatureDataUrl = formValues[component.id];
          if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
            const signatureUrl = await uploadBase64Image(signatureDataUrl, 'signatures');
            processedValues[component.id] = signatureUrl;
          }
        }
      }
      
      // Handle public form submissions differently
      const userId = isPublic 
        ? uuidv4() // Generate anonymous user ID for public submissions
        : (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          response_data: processedValues,
          user_id: userId,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Formulario enviado",
        description: "Tu respuesta ha sido enviada correctamente.",
      });
      
      setFormValues({});
      
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
    const { id, type, label, required, options, placeholder, helpText, content } = component;
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

      case 'info_text':
        return (
          <div key={id} className="p-4 bg-gray-50 border rounded-md mb-4">
            <div className="flex items-start mb-2">
              <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <h3 className="font-medium">{label}</h3>
            </div>
            <div className="mt-2 pl-7 whitespace-pre-line text-gray-700">
              {content || "Texto informativo para los usuarios del formulario"}
            </div>
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

  const groupedComponents: Record<string, FormComponent[]> = {};
  const ungroupedComponents: FormComponent[] = [];

  schema.groups?.forEach(group => {
    groupedComponents[group.id] = [];
  });

  schema.components.forEach(component => {
    if (component.groupId && groupedComponents[component.groupId]) {
      groupedComponents[component.groupId].push(component);
    } else {
      ungroupedComponents.push(component);
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {schema.groups?.map(group => (
        <Collapsible 
          key={group.id} 
          open={expandedGroups[group.id]} 
          className="border rounded-md overflow-hidden mb-6"
        >
          <CardHeader className="py-3 px-4 bg-gray-50 cursor-pointer border-b" onClick={() => toggleGroup(group.id)}>
            <div className="flex items-center">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 mr-2">
                  {expandedGroups[group.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CardTitle className="text-md font-medium">{group.title}</CardTitle>
            </div>
            {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-4 space-y-4">
              {groupedComponents[group.id].map(renderFormComponent)}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      ))}
      
      <div className="space-y-4">
        {ungroupedComponents.map(renderFormComponent)}
      </div>
      
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

