
import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, Trash2, GripVertical } from "lucide-react";
import { ComponentToolbar } from "./ComponentToolbar";
import { FormComponentEditor } from "./FormComponentEditor";
import { EmptyState } from "./EmptyState";
import { FormComponentPreview } from "./FormComponentPreview";

export interface FormComponent {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
}

export interface FormSchema {
  components: FormComponent[];
}

interface FormBuilderProps {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
  onSave: () => void;
  saving: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ 
  schema, 
  onChange, 
  onSave,
  saving
}) => {
  const [editingComponent, setEditingComponent] = useState<FormComponent | null>(null);
  const [showComponentEditor, setShowComponentEditor] = useState(false);

  const handleAddComponent = (componentType: string) => {
    const newComponent: FormComponent = {
      id: `comp-${Date.now()}`,
      type: componentType,
      label: getDefaultLabel(componentType),
      required: false,
    };

    if (componentType === 'select' || componentType === 'radio' || componentType === 'checkbox') {
      newComponent.options = [
        { label: 'Opción 1', value: 'option1' },
        { label: 'Opción 2', value: 'option2' }
      ];
    }

    setEditingComponent(newComponent);
    setShowComponentEditor(true);
  };

  const getDefaultLabel = (type: string): string => {
    switch (type) {
      case 'text': return 'Texto Corto';
      case 'textarea': return 'Texto Largo';
      case 'number': return 'Número';
      case 'email': return 'Correo Electrónico';
      case 'phone': return 'Teléfono';
      case 'date': return 'Fecha';
      case 'time': return 'Hora';
      case 'select': return 'Selección';
      case 'radio': return 'Opción Única';
      case 'checkbox': return 'Opciones Múltiples';
      case 'image': return 'Imagen';
      case 'signature': return 'Firma';
      case 'location': return 'Ubicación';
      default: return 'Nuevo Componente';
    }
  };

  const handleEditComponent = (component: FormComponent) => {
    setEditingComponent({...component});
    setShowComponentEditor(true);
  };

  const handleSaveComponent = (component: FormComponent) => {
    const updatedComponents = [...schema.components];
    const existingIndex = updatedComponents.findIndex(c => c.id === component.id);
    
    if (existingIndex >= 0) {
      updatedComponents[existingIndex] = component;
    } else {
      updatedComponents.push(component);
    }
    
    onChange({
      ...schema,
      components: updatedComponents
    });
    
    setEditingComponent(null);
    setShowComponentEditor(false);
  };

  const handleDeleteComponent = (componentId: string) => {
    onChange({
      ...schema,
      components: schema.components.filter(c => c.id !== componentId)
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(schema.components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange({
      ...schema,
      components: items
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Componentes del Formulario</CardTitle>
          <ComponentToolbar onAddComponent={handleAddComponent} />
        </CardHeader>
        <CardContent>
          {schema.components.length === 0 ? (
            <EmptyState onAddComponent={() => handleAddComponent('text')} />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="form-components">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {schema.components.map((component, index) => (
                      <Draggable 
                        key={component.id} 
                        draggableId={component.id} 
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-white border rounded-md overflow-hidden"
                          >
                            <div className="flex items-center p-3 border-b bg-gray-50">
                              <div 
                                {...provided.dragHandleProps} 
                                className="mr-2 cursor-move"
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium">
                                  {component.label}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  ({component.type})
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditComponent(component)}
                                >
                                  Editar
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteComponent(component.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="p-4">
                              <FormComponentPreview component={component} />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onSave} 
            disabled={saving}
            className="bg-dynamo-600 hover:bg-dynamo-700"
          >
            {saving ? 'Guardando...' : 'Guardar Formulario'}
            {!saving && <Save className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>

      {showComponentEditor && editingComponent && (
        <FormComponentEditor
          component={editingComponent}
          onSave={handleSaveComponent}
          onCancel={() => {
            setEditingComponent(null);
            setShowComponentEditor(false);
          }}
        />
      )}
    </div>
  );
};
