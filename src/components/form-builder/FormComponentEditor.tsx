
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
import { PlusCircle, X, Save, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormComponent {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
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
  const [editedComponent, setEditedComponent] = useState<FormComponent>({...component});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedComponent(prev => ({...prev, [name]: value}));
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
  
  const needsOptions = ['select', 'radio', 'checkbox'].includes(editedComponent.type);
  
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
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              {needsOptions && <TabsTrigger value="options">Opciones</TabsTrigger>}
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
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
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="required"
                  checked={editedComponent.required}
                  onCheckedChange={handleRequiredChange}
                />
                <Label htmlFor="required">Obligatorio</Label>
              </div>
              
              {['text', 'textarea', 'email', 'phone', 'number', 'select'].includes(editedComponent.type) && (
                <div className="space-y-2">
                  <Label htmlFor="placeholder">Texto de ayuda (placeholder)</Label>
                  <Input 
                    id="placeholder"
                    name="placeholder"
                    value={editedComponent.placeholder || ''}
                    onChange={handleChange}
                    placeholder="Texto de ayuda para el usuario"
                  />
                </div>
              )}
            </TabsContent>
            
            {needsOptions && (
              <TabsContent value="options" className="space-y-4">
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
              </TabsContent>
            )}
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="helpText">Texto de ayuda</Label>
                <Textarea 
                  id="helpText"
                  name="helpText"
                  value={editedComponent.helpText || ''}
                  onChange={handleChange}
                  placeholder="Texto de ayuda adicional para el usuario"
                  rows={3}
                />
              </div>
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
