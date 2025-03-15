
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Image as ImageIcon, PenTool, Calendar, Clock, Hash, Mail, Phone } from "lucide-react";
import { FormComponent } from "./FormBuilder";

interface FormComponentPreviewProps {
  component: FormComponent;
}

export const FormComponentPreview: React.FC<FormComponentPreviewProps> = ({ component }) => {
  const { type, label, required, options, placeholder, helpText } = component;
  
  const renderLabel = () => (
    <Label className="mb-2 block">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </Label>
  );
  
  const renderHelpText = () => (
    helpText && (
      <p className="text-xs text-gray-500 mt-1">{helpText}</p>
    )
  );
  
  switch (type) {
    case 'text':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <Input type="text" placeholder={placeholder} readOnly />
          {renderHelpText()}
        </div>
      );
      
    case 'email':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
              <Mail className="h-4 w-4 text-gray-500" />
            </div>
            <Input className="rounded-l-none" type="email" placeholder={placeholder || "ejemplo@correo.com"} readOnly />
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'phone':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
              <Phone className="h-4 w-4 text-gray-500" />
            </div>
            <Input className="rounded-l-none" type="tel" placeholder={placeholder || "+52 555 123 4567"} readOnly />
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'number':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
              <Hash className="h-4 w-4 text-gray-500" />
            </div>
            <Input className="rounded-l-none" type="number" placeholder={placeholder || "0"} readOnly />
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'date':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <Input className="rounded-l-none" type="date" readOnly />
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'time':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <Input className="rounded-l-none" type="time" readOnly />
          </div>
          {renderHelpText()}
        </div>
      );
    
    case 'textarea':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <Textarea placeholder={placeholder} readOnly />
          {renderHelpText()}
        </div>
      );
      
    case 'select':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <Select disabled>
            <SelectTrigger>
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
          {renderHelpText()}
        </div>
      );
      
    case 'radio':
      return (
        <div className="space-y-2">
          {renderLabel()}
          <RadioGroup disabled defaultValue={options?.[0].value}>
            {options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${component.id}-${option.value}`} />
                <Label htmlFor={`${component.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {renderHelpText()}
        </div>
      );
      
    case 'checkbox':
      return (
        <div className="space-y-3">
          {renderLabel()}
          {options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox id={`${component.id}-${option.value}`} disabled />
              <Label htmlFor={`${component.id}-${option.value}`}>{option.label}</Label>
            </div>
          ))}
          {renderHelpText()}
        </div>
      );
      
    case 'image':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center bg-gray-50 h-40">
            <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Subir imagen</p>
            <p className="text-xs text-gray-400 mt-1">Se guardará en almacenamiento seguro</p>
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'signature':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center bg-gray-50 h-40">
            <PenTool className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Firma aquí</p>
            <p className="text-xs text-gray-400 mt-1">Guardaremos tu firma como imagen</p>
          </div>
          {renderHelpText()}
        </div>
      );
      
    case 'location':
      return (
        <div className="space-y-1">
          {renderLabel()}
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center bg-gray-50 h-40">
            <MapPin className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Seleccionar ubicación</p>
            <p className="text-xs text-gray-400 mt-1">Haz click para elegir en el mapa</p>
          </div>
          {renderHelpText()}
        </div>
      );
      
    default:
      return (
        <div className="p-4 border border-gray-200 rounded-md text-center text-gray-500">
          Componente desconocido: {type}
        </div>
      );
  }
};
