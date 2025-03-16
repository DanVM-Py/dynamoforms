
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormComponent } from "./FormBuilder";
import { Button } from "@/components/ui/button";
import { FileUploader } from "../FileUploader";
import { ImageUploader } from "../ImageUploader";

interface FormComponentPreviewProps {
  component: FormComponent;
}

export const FormComponentPreview: React.FC<FormComponentPreviewProps> = ({ component }) => {
  const renderComponent = () => {
    switch (component.type) {
      case "text":
        return (
          <Input
            placeholder={component.placeholder || "Texto corto..."}
            maxLength={component.maxLength}
            disabled
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={component.placeholder || "Texto largo..."}
            maxLength={component.maxLength}
            disabled
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder={component.placeholder || "0"}
            maxLength={component.maxLength}
            onInput={(e) => {
              const input = e.currentTarget;
              if (component.maxLength && input.value.length > component.maxLength) {
                input.value = input.value.slice(0, component.maxLength);
              }
            }}
            disabled
          />
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una opción" />
            </SelectTrigger>
            <SelectContent>
              {component.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup disabled>
            {component.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`radio-${option.value}`} />
                <Label htmlFor={`radio-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div className="space-y-2">
            {component.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox id={`check-${option.value}`} disabled />
                <Label htmlFor={`check-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );
      case "image_single":
      case "image_multiple":
        return (
          <ImageUploader
            maxImages={component.maxImages || 1}
            includeText={component.includeText || false}
            previewMode={true}
            label={component.label}
            helpText={component.helpText}
          />
        );
      case "file_single":
      case "file_multiple":
        return (
          <FileUploader
            maxFiles={component.maxFiles || 1}
            acceptedTypes={component.acceptedFileTypes || ['.pdf', '.docx', '.jpg', '.png']}
            includeText={component.includeText || false}
            previewMode={true}
            label={component.label}
            helpText={component.helpText}
          />
        );
      case "signature":
        return (
          <div className="border border-dashed border-gray-300 p-4 text-center rounded-md">
            <p className="text-sm text-gray-500">Área para firma</p>
          </div>
        );
      case "location":
        return (
          <div className="border border-dashed border-gray-300 p-4 text-center rounded-md">
            <p className="text-sm text-gray-500">Captura de geolocalización</p>
          </div>
        );
      case "info_text":
        return <div className="text-sm text-gray-700">{component.content}</div>;
      case "date":
        return <Input type="date" disabled />;
      case "time":
        return <Input type="time" disabled />;
      case "email":
        return (
          <Input
            type="email"
            placeholder={component.placeholder || "correo@ejemplo.com"}
            disabled
          />
        );
      case "phone":
        return (
          <Input
            type="tel"
            placeholder={component.placeholder || "(123) 456-7890"}
            disabled
          />
        );
      default:
        return <div>Tipo de componente no soportado: {component.type}</div>;
    }
  };

  return (
    <div className="space-y-2">
      {component.type !== "info_text" && (
        <Label className="text-sm">
          {component.label}
          {component.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {component.helpText && component.type !== "info_text" && (
        <p className="text-xs text-gray-500 mb-1">{component.helpText}</p>
      )}
      {renderComponent()}
    </div>
  );
};
