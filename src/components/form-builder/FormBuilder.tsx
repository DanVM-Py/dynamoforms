
import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Trash2, GripVertical, Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import { ComponentToolbar } from "./ComponentToolbar";
import { FormComponentEditor } from "./FormComponentEditor";
import { EmptyState } from "./EmptyState";
import { FormComponentPreview } from "./FormComponentPreview";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface FormComponent {
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
  content?: string; // Para componente de texto indicativo
  groupId?: string; // Identificador del grupo al que pertenece
}

export interface FormGroup {
  id: string;
  title: string;
  description?: string;
  expanded?: boolean;
}

export interface FormSchema {
  components: FormComponent[];
  groups: FormGroup[];
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
  const [editingGroup, setEditingGroup] = useState<{ id: string; title: string; description?: string } | null>(null);

  // Inicializar el schema con un array de grupos si no existe
  const formSchema = {
    ...schema,
    groups: schema.groups || []
  };

  const handleAddComponent = (componentType: string = 'text', groupId?: string) => {
    const newComponent: FormComponent = {
      id: `comp-${Date.now()}`,
      type: componentType,
      label: getDefaultLabel(componentType),
      required: false,
    };

    // Set default values based on component type
    if (componentType === 'select' || componentType === 'radio' || componentType === 'checkbox') {
      newComponent.options = [
        { label: 'Opción 1', value: 'option1' },
        { label: 'Opción 2', value: 'option2' }
      ];
    }
    
    if (componentType === 'text') {
      newComponent.maxLength = 300;
      newComponent.placeholder = 'Escribe aquí...';
    }
    
    if (componentType === 'textarea') {
      newComponent.maxLength = 1000;
      newComponent.placeholder = 'Escribe aquí...';
    }
    
    if (componentType === 'image_single') {
      newComponent.maxImages = 1;
    }
    
    if (componentType === 'image_multiple') {
      newComponent.maxImages = 5;
    }

    if (componentType === 'info_text') {
      newComponent.content = 'Texto informativo para los usuarios del formulario';
      newComponent.required = false;
    }

    // Asignar al grupo si se proporciona un ID de grupo
    if (groupId) {
      newComponent.groupId = groupId;
    }

    setEditingComponent(newComponent);
    setShowComponentEditor(true);
  };

  // Simple button to add a new component directly
  const handleAddNewComponent = (e: React.MouseEvent<HTMLButtonElement>, groupId?: string) => {
    handleAddComponent('text', groupId);
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
      case 'select': return 'Lista Desplegable';
      case 'radio': return 'Opción Única';
      case 'checkbox': return 'Opciones Múltiples';
      case 'image_single': return 'Imagen Única';
      case 'image_multiple': return 'Múltiples Imágenes';
      case 'signature': return 'Firma';
      case 'location': return 'Ubicación';
      case 'info_text': return 'Texto Informativo';
      default: return 'Nuevo Componente';
    }
  };

  const handleEditComponent = (component: FormComponent) => {
    setEditingComponent({...component});
    setShowComponentEditor(true);
  };

  const handleSaveComponent = (component: FormComponent) => {
    const updatedComponents = [...formSchema.components];
    const existingIndex = updatedComponents.findIndex(c => c.id === component.id);
    
    if (existingIndex >= 0) {
      updatedComponents[existingIndex] = component;
    } else {
      updatedComponents.push(component);
    }
    
    onChange({
      ...formSchema,
      components: updatedComponents
    });
    
    setEditingComponent(null);
    setShowComponentEditor(false);
  };

  const handleDeleteComponent = (componentId: string) => {
    onChange({
      ...formSchema,
      components: formSchema.components.filter(c => c.id !== componentId)
    });
  };

  const handleAddGroup = () => {
    setEditingGroup({
      id: `group-${Date.now()}`,
      title: 'Nuevo Grupo',
      description: ''
    });
  };

  const handleSaveGroup = () => {
    if (!editingGroup) return;

    const newGroups = [...formSchema.groups];
    const existingIndex = newGroups.findIndex(g => g.id === editingGroup.id);

    if (existingIndex >= 0) {
      newGroups[existingIndex] = {
        ...newGroups[existingIndex],
        title: editingGroup.title,
        description: editingGroup.description
      };
    } else {
      newGroups.push({
        id: editingGroup.id,
        title: editingGroup.title,
        description: editingGroup.description,
        expanded: true
      });
    }

    onChange({
      ...formSchema,
      groups: newGroups
    });

    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    // Primero, eliminar el grupo
    const updatedGroups = formSchema.groups.filter(g => g.id !== groupId);
    
    // Luego, actualizar los componentes para eliminar la referencia al grupo eliminado
    const updatedComponents = formSchema.components.map(component => {
      if (component.groupId === groupId) {
        return { ...component, groupId: undefined };
      }
      return component;
    });

    onChange({
      ...formSchema,
      groups: updatedGroups,
      components: updatedComponents
    });
  };

  const toggleGroupExpanded = (groupId: string) => {
    const updatedGroups = formSchema.groups.map(group => {
      if (group.id === groupId) {
        return { ...group, expanded: !group.expanded };
      }
      return group;
    });

    onChange({
      ...formSchema,
      groups: updatedGroups
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(formSchema.components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange({
      ...formSchema,
      components: items
    });
  };

  // Filtrar componentes que no pertenecen a ningún grupo
  const ungroupedComponents = formSchema.components.filter(
    comp => !comp.groupId
  );

  // Renderizar los componentes del grupo
  const renderGroupComponents = (groupId: string) => {
    const groupComponents = formSchema.components.filter(
      comp => comp.groupId === groupId
    );

    if (groupComponents.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500 italic">
          No hay componentes en este grupo. Agrega uno nuevo.
        </div>
      );
    }

    return groupComponents.map((component, index) => (
      <Draggable 
        key={component.id} 
        draggableId={component.id} 
        index={index}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="bg-white border rounded-md overflow-hidden mb-3"
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
                {component.required && (
                  <span className="ml-2 text-xs text-red-500">
                    (Obligatorio)
                  </span>
                )}
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
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Componentes del Formulario</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleAddGroup} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Grupo
            </Button>
            <Button onClick={(e) => handleAddNewComponent(e)} className="bg-dynamo-600 hover:bg-dynamo-700">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Componente
            </Button>
            <ComponentToolbar onAddComponent={handleAddComponent} />
          </div>
        </CardHeader>
        <CardContent>
          {formSchema.components.length === 0 && formSchema.groups.length === 0 ? (
            <EmptyState onAddComponent={(e) => handleAddNewComponent(e)} />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="form-components">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-6"
                  >
                    {/* Renderizar grupos */}
                    {formSchema.groups.map((group) => (
                      <Collapsible 
                        key={group.id} 
                        className="border rounded-md overflow-hidden"
                        open={group.expanded}
                      >
                        <div className="bg-gray-100 border-b p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => toggleGroupExpanded(group.id)}>
                                  {group.expanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <div>
                                <h3 className="font-medium">{group.title}</h3>
                                {group.description && (
                                  <p className="text-xs text-gray-500">{group.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setEditingGroup({ ...group })}
                              >
                                Editar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <CollapsibleContent>
                          <div className="p-4">
                            {renderGroupComponents(group.id)}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => handleAddNewComponent(e, group.id)}
                              className="w-full mt-2"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar componente al grupo
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}

                    {/* Renderizar componentes sin grupo */}
                    {ungroupedComponents.map((component, index) => (
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
                                {component.required && (
                                  <span className="ml-2 text-xs text-red-500">
                                    (Obligatorio)
                                  </span>
                                )}
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

      {/* Editor de grupo */}
      {editingGroup && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Editar Grupo</span>
              <Button variant="ghost" size="sm" onClick={() => setEditingGroup(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-title">Título del grupo</Label>
                <Input 
                  id="group-title"
                  value={editingGroup.title}
                  onChange={(e) => setEditingGroup({...editingGroup, title: e.target.value})}
                  placeholder="Título del grupo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Descripción (opcional)</Label>
                <Textarea 
                  id="group-description"
                  value={editingGroup.description || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                  placeholder="Descripción breve del grupo"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGroup}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Grupo
            </Button>
          </CardFooter>
        </Card>
      )}

      {showComponentEditor && editingComponent && (
        <FormComponentEditor
          component={editingComponent}
          onSave={handleSaveComponent}
          onCancel={() => {
            setEditingComponent(null);
            setShowComponentEditor(false);
          }}
          groups={formSchema.groups}
        />
      )}
    </div>
  );
};
