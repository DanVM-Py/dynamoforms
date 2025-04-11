import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageUploader } from "../../ImageUploader";
import { SignatureField } from "./SignatureField";
import { LocationField } from "./LocationField";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { v4 as uuidv4 } from "uuid";
import { FileUploader } from "../../FileUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isComponentRequired, isAboveMinValue } from "@/utils/formValidationUtils";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';

export interface FormRendererProps {
  formId: string;
  schema: {
    components: any[];
    groups?: any[];
    title?: string;
    description?: string;
  };
  readOnly?: boolean;
  onSuccess?: () => void;
  onSubmit?: (data: any) => void;
  isPublic?: boolean;
  isSubmitting?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  formId,
  schema,
  readOnly = false,
  onSuccess,
  onSubmit,
  isPublic = false,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const validateField = (component: any, value: any) => {
    // Check if component is required based on its conditional display
    const required = isComponentRequired(component, formData);
    
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `El campo "${component.label}" es requerido.`;
    }
    
    if (component.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      return `El campo "${component.label}" debe contener un correo electrónico válido.`;
    }
    
    if (component.type === 'number' && value) {
      if (isNaN(Number(value))) {
        return `El campo "${component.label}" debe contener un número válido.`;
      }
      
      if (component.minValue !== undefined && !isAboveMinValue(value, component.minValue)) {
        return `El campo "${component.label}" debe ser mayor o igual a ${component.minValue}.`;
      }
    }
    
    return null;
  };

  const handleInputChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    
    const component = schema.components.find(c => c.id === id);
    if (component) {
      const error = validateField(component, value);
      setErrors(prevErrors => ({ ...prevErrors, [id]: error }));
      
      if (submissionError) {
        setSubmissionError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let newErrors: any = {};
    let errorFields: string[] = [];
    
    schema.components.forEach(component => {
      // Only validate if the component is currently visible
      const shouldBeDisplayed = !component.conditionalDisplay || (() => {
        const controllingValue = formData[component.conditionalDisplay.controlledBy];
        return component.conditionalDisplay.showWhen === 'equals'
          ? controllingValue === component.conditionalDisplay.value
          : controllingValue !== component.conditionalDisplay.value;
      })();
      
      if (shouldBeDisplayed) {
        const value = formData[component.id];
        const error = validateField(component, value);
        if (error) {
          newErrors[component.id] = error;
          errorFields.push(component.label);
        }
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const errorMessage = errorFields.length === 1
        ? `El campo "${errorFields[0]}" tiene un error. Por favor revísalo.`
        : `Los siguientes campos tienen errores: ${errorFields.join(', ')}. Por favor revísalos.`;
      
      setSubmissionError(errorMessage);
      
      toast({
        title: "Error de validación",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLocalSubmitting(true);
    setSubmissionError(null);

    try {
      if (onSubmit) {
        onSubmit(formData);
        return;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      let submissionData: any = {
        form_id: formId,
        response_data: formData,
        is_anonymous: isPublic && !userId
      };
      
      if (userId) {
        submissionData.user_id = userId;
      }

      const { data, error } = await supabase
        .from(Tables.form_responses)
        .insert([submissionData])
        .select();

      if (error) {
        logger.error("Error al enviar el formulario:", error);
        setSubmissionError("Hubo un error al enviar el formulario. Inténtalo de nuevo o contacta con el administrador.");
        toast({
          title: "Error",
          description: "Hubo un error al enviar el formulario. Inténtalo de nuevo.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Formulario enviado",
        description: "El formulario se ha enviado correctamente.",
      });

      setFormData({});
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      logger.error("Error al enviar el formulario:", error);
      setSubmissionError(`Hubo un error al enviar el formulario: ${error.message || "Error desconocido"}. Por favor, inténtalo de nuevo o contacta con el administrador.`);
      toast({
        title: "Error",
        description: "Hubo un error al enviar el formulario. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const renderComponent = (component: any) => {
    const { id, label, type, required, helpText, conditionalDisplay } = component;
    
    if (conditionalDisplay) {
      const controllingValue = formData[conditionalDisplay.controlledBy];
      const shouldShow = conditionalDisplay.showWhen === 'equals'
        ? controllingValue === conditionalDisplay.value
        : controllingValue !== conditionalDisplay.value;
      
      if (!shouldShow) {
        return null;
      }
    }
    
    const error = errors[id];
    
    switch (type) {
      case "text":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="text"
              id={id}
              placeholder={component.placeholder}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "textarea":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Textarea
              id={id}
              placeholder={component.placeholder}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "number":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="number"
              id={id}
              placeholder={component.placeholder}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "select":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Select
              disabled={readOnly}
              onValueChange={(value) => handleInputChange(id, value)}
            >
              <SelectTrigger id={id}>
                <SelectValue placeholder={component.placeholder || `Selecciona ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {component.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "radio":
        return (
          <div key={id} className="space-y-2">
            <Label className={required ? "required" : ""}>{label}</Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <RadioGroup disabled={readOnly} onValueChange={(value) => handleInputChange(id, value)}>
              {component.options?.map((option: any) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`radio-${option.value}`} />
                  <Label htmlFor={`radio-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "checkbox":
        return (
          <div key={id} className="space-y-2">
            <Label className={required ? "required" : ""}>{label}</Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <div className="space-y-2">
              {component.options?.map((option: any) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`check-${option.value}`}
                    disabled={readOnly}
                    onCheckedChange={(checked) => {
                      let currentValues = formData[id] || [];
                      if (!Array.isArray(currentValues)) {
                        currentValues = [];
                      }
                      
                      let newValues = checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: any) => v !== option.value);
                      
                      handleInputChange(id, newValues);
                    }}
                  />
                  <Label htmlFor={`check-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "image_single":
      case "image_multiple":
        return (
          <div key={id}>
            <ImageUploader
              maxImages={component.maxImages || 1}
              includeText={component.includeText || false}
              previewMode={readOnly}
              label={label}
              helpText={helpText}
              onChange={(files, texts) => {
                handleInputChange(id, { files, texts });
              }}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      case 'file_single':
        return (
          <div key={id}>
            <FileUploader
              maxFiles={1}
              acceptedTypes={component.acceptedFileTypes || ['.pdf', '.docx', '.jpg', '.png']}
              includeText={component.includeText || false}
              previewMode={readOnly}
              label={label}
              helpText={helpText}
              onChange={(files, texts) => {
                handleInputChange(id, { files, texts });
              }}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      case 'file_multiple':
        return (
          <div key={id}>
            <FileUploader
              maxFiles={component.maxFiles || 5}
              acceptedTypes={component.acceptedFileTypes || ['.pdf', '.docx', '.jpg', '.png']}
              includeText={component.includeText || false}
              previewMode={readOnly}
              label={label}
              helpText={helpText}
              onChange={(files, texts) => {
                handleInputChange(id, { files, texts });
              }}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
        
      case "signature":
        return (
          <div key={id}>
            <SignatureField
              formId={formId}
              componentId={id}
              label={label}
              required={required}
              readOnly={readOnly}
              helpText={helpText}
              onChange={(data) => handleInputChange(id, data)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "location":
        return (
          <div key={id}>
            <LocationField
              formId={formId}
              componentId={id}
              label={label}
              required={required}
              readOnly={readOnly}
              helpText={helpText}
              onChange={(data) => handleInputChange(id, data)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "info_text":
        return (
          <div key={id} className="text-sm text-gray-700">
            {component.content}
          </div>
        );
      case "date":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="date"
              id={id}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "time":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="time"
              id={id}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "email":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="email"
              id={id}
              placeholder={component.placeholder || "correo@ejemplo.com"}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      case "phone":
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id} className={required ? "required" : ""}>
              {label}
            </Label>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <Input
              type="tel"
              id={id}
              placeholder={component.placeholder || "(123) 456-7890"}
              disabled={readOnly}
              required={required}
              onChange={(e) => handleInputChange(id, e.target.value)}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>
        );
      default:
        return (
          <div key={id}>
            Tipo de componente no soportado: {type}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {schema.title && (
        <div className="mb-4">
          <h2 className="text-xl font-bold">{schema.title}</h2>
          {schema.description && (
            <p className="text-gray-600 mt-2">{schema.description}</p>
          )}
        </div>
      )}
      
      {submissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error en el formulario</AlertTitle>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}
      
      {schema.groups && schema.groups.length > 0 ? (
        schema.groups.map((group: any) => (
          <Collapsible key={group.id} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between py-2 px-4 w-full text-lg font-semibold text-left rounded-md shadow-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
              {group.title}
              <ChevronDown className="h-4 w-4 shrink-0 ml-2 transition-transform duration-200 peer-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-4">
              {schema.components
                .filter((component: any) => component.groupId === group.id)
                .map((component: any) => renderComponent(component))}
            </CollapsibleContent>
          </Collapsible>
        ))
      ) : (
        schema.components.map((component: any) => renderComponent(component))
      )}

      {!readOnly && (
        <Button disabled={isSubmitting || localSubmitting}>
          {isSubmitting || localSubmitting ? (
            <>
              Enviando...
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            "Enviar"
          )}
        </Button>
      )}
    </form>
  );
};
