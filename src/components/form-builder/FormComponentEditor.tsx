
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PlusCircle, X, Save, Trash2, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FormComponent {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
  maxImages?: number;
  includeText?: boolean;
  selectionType?: 'single' | 'multiple';
}

interface FormComponentEditorProps {
  component: FormComponent;
  onSave: (component: FormComponent) => void;
  onCancel: () => void;
}

export const FormComponentEditor: React.FC<FormComponentEditorProps> = ({
  component,
  onSave,
  onCancel,
}) => {
  const [editedComponent, setEditedComponent] = useState<FormComponent>({
    ...component,
    maxLength: component.maxLength || (component.type === 'text' ? 300 : component.type === 'textarea' ? 1000 : undefined),
    maxImages: component.maxImages || 1,
    includeText: component.includeText || false,
    selectionType: component.selectionType || 'single'
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedComponent(prev => ({...prev, [name]: value}));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setEditedComponent(prev => ({...prev, [field]: value}));
    }
  };
  
  const handleRequiredChange = (checked: boolean) => {
    setEditedComponent(prev => ({...prev, required: checked}));
  };
  
  const handleOptionChange = (index: number, field: 'label' | 'value', value: string) => {
    if (!editedComponent.options) return;
    
    const updatedOptions = [...editedComponent.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };
    
    setEditedComponent(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };
  
  const handleAddOption = () => {
    const newOption = {
      label: `Opción ${(editedComponent.options?.length || 0) + 1}`,
      value: `option${(editedComponent.options?.length || 0) + 1}`
    };
    
    setEditedComponent(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));
  };
  
  const handleRemoveOption = (index: number) => {
    if (!editedComponent.options) return;
    
    const updatedOptions = [...editedComponent.options];
    updatedOptions.splice(index, 1);
    
    setEditedComponent(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };
  
  const handleSwitchChange = (checked: boolean, field: string) => {
    setEditedComponent(prev => ({...prev, [field]: checked}));
  };

  const handleComponentTypeChange = (type: string) => {
    // Reset component-specific settings when type changes
    const updatedComponent: FormComponent = {
      ...editedComponent,
      type: type,
      options: ['select', 'radio', 'checkbox'].includes(type) 
        ? (editedComponent.options?.length ? editedComponent.options : [
            { label: 'Opción 1', value: 'option1' },
            { label: 'Opción 2', value: 'option2' }
          ]) 
        : undefined,
      maxLength: ['text', 'textarea'].includes(type) 
        ? (type === 'text' ? 300 : 1000) 
        : undefined,
      maxImages: ['image_single', 'image_multiple'].includes(type) 
        ? (type === 'image_single' ? 1 : 5) 
        : undefined,
      includeText: ['image_single', 'image_multiple'].includes(type) 
        ? editedComponent.includeText 
        : undefined,
      placeholder: ['text', 'textarea', 'email', 'number', 'phone'].includes(type) 
        ? editedComponent.placeholder 
        : undefined,
      selectionType: type === 'checkbox' ? 'multiple' : undefined
    };
    
    setEditedComponent(updatedComponent);
  };
  
  const needsOptions = ['select', 'radio', 'checkbox'].includes(editedComponent.type);
  const isTextField = ['text', 'textarea'].includes(editedComponent.type);
  const isImageField = ['image_single', 'image_multiple'].includes(editedComponent.type);
  
  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Editar Componente: {editedComponent.label}</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <Tabs defaultValue="general">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="general" className="flex-1">Configuración General</TabsTrigger>
              <TabsTrigger value="specific" className="flex-1">Configuración Específica</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="componentType">Tipo de Componente</Label>
                <Select
                  value={editedComponent.type}
                  onValueChange={handleComponentTypeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo de componente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto Normal (300 caracteres)</SelectItem>
                    <SelectItem value="textarea">Texto Grande (1000 caracteres)</SelectItem>
                    <SelectItem value="select">Lista Desplegable</SelectItem>
                    <SelectItem value="radio">Opción Única</SelectItem>
                    <SelectItem value="checkbox">Opciones Múltiples</SelectItem>
                    <SelectItem value="image_single">Imagen Única</SelectItem>
                    <SelectItem value="image_multiple">Múltiples Imágenes</SelectItem>
                    <SelectItem value="signature">Firma</SelectItem>
                    <SelectItem value="location">Geolocalización</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="time">Hora</SelectItem>
                    <SelectItem value="email">Correo Electrónico</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Etiqueta</Label>
                <Input 
                  id="label"
                  name="label"
                  value={editedComponent.label}
                  onChange={handleChange}
                  placeholder="Etiqueta del componente"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="helpText">Texto de ayuda para el usuario</Label>
                <Textarea 
                  id="helpText"
                  name="helpText"
                  value={editedComponent.helpText || ''}
                  onChange={handleChange}
                  placeholder="Información adicional para ayudar al usuario a completar este campo"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="required"
                  checked={editedComponent.required}
                  onCheckedChange={handleRequiredChange}
                />
                <Label htmlFor="required">Campo obligatorio</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="specific" className="space-y-4">
              {isTextField && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="placeholder">Texto de ejemplo (placeholder)</Label>
                    <Input 
                      id="placeholder"
                      name="placeholder"
                      value={editedComponent.placeholder || ''}
                      onChange={handleChange}
                      placeholder="Texto de ejemplo que se muestra al usuario"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxLength">Longitud máxima de caracteres</Label>
                    <Input 
                      id="maxLength"
                      type="number"
                      value={editedComponent.maxLength || ''}
                      onChange={(e) => handleNumberChange(e, 'maxLength')}
                      min={1}
                      max={10000}
                    />
                    <p className="text-xs text-gray-500">
                      {editedComponent.type === 'text' ? 'Recomendado: 300 caracteres' : 'Recomendado: 1000 caracteres'}
                    </p>
                  </div>
                </div>
              )}
              
              {isImageField && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxImages">Cantidad máxima de imágenes</Label>
                    <Input 
                      id="maxImages"
                      type="number"
                      value={editedComponent.maxImages || 1}
                      onChange={(e) => handleNumberChange(e, 'maxImages')}
                      min={1}
                      max={10}
                      disabled={editedComponent.type === 'image_single'}
                    />
                    {editedComponent.type === 'image_single' && (
                      <p className="text-xs text-gray-500">
                        Este tipo de componente solo permite una imagen.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch 
                      id="includeText"
                      checked={editedComponent.includeText}
                      onCheckedChange={(checked) => handleSwitchChange(checked, 'includeText')}
                    />
                    <Label htmlFor="includeText">Incluir campo de texto con la imagen</Label>
                  </div>
                </div>
              )}
              
              {needsOptions && (
                <div className="space-y-4">
                  {editedComponent.type === 'checkbox' && (
                    <div className="space-y-2">
                      <Label>Tipo de selección</Label>
                      <RadioGroup 
                        value={editedComponent.selectionType || 'multiple'} 
                        onValueChange={(val) => setEditedComponent(prev => ({...prev, selectionType: val as 'single' | 'multiple'}))}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single" id="selection-single" />
                          <Label htmlFor="selection-single">Selección única (radio)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multiple" id="selection-multiple" />
                          <Label htmlFor="selection-multiple">Selección múltiple (checkbox)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Opciones</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddOption}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Añadir Opción
                    </Button>
                  </div>
                  
                  {editedComponent.options?.map((option, index) => (
                    <div key={index} className="flex space-x-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`option-label-${index}`}>Etiqueta</Label>
                        <Input 
                          id={`option-label-${index}`}
                          value={option.label}
                          onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`option-value-${index}`}>Valor</Label>
                        <Input 
                          id={`option-value-${index}`}
                          value={option.value}
                          onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="mt-7"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {editedComponent.type === 'signature' && (
                <div className="p-4 border rounded-md bg-gray-50">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Componente de Firma</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Este componente permite a los usuarios dibujar su firma directamente en la aplicación. Los datos se almacenarán como una imagen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {editedComponent.type === 'location' && (
                <div className="p-4 border rounded-md bg-gray-50">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Componente de Geolocalización</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Este componente capturará automáticamente la ubicación GPS del usuario cuando complete el formulario.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(editedComponent)}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </CardFooter>
    </Card>
  );
};
