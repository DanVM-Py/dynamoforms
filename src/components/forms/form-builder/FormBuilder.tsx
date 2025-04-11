import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Trash2, GripVertical, Plus, ChevronDown, ChevronRight, X, Copy } from "lucide-react";
import { ComponentToolbar } from "./ComponentToolbar";
import { FormComponentEditor } from "./FormComponentEditor";
import { EmptyState } from "./EmptyState";
import { FormComponentPreview } from "./FormComponentPreview";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

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
  conditionalDisplay?: {
    controlledBy: string; // ID del componente que controla la visualización
    showWhen: 'equals' | 'not-equals'; // Tipo de condición
    value: string; // Valor esperado para mostrar este componente
  };
  maxFiles?: number; // Límite de archivos para componentes tipo archivo
  acceptedFileTypes?: string[]; // Tipos de archivos aceptados (pdf, docx, etc)
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
  const { toast } = useToast();

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

    if (componentType === 'file_single') {
      newComponent.maxFiles = 1;
      newComponent.acceptedFileTypes = ['.pdf', '.docx', '.jpg', '.png'];
    }
    
    if (componentType === 'file_multiple') {
      newComponent.maxFiles = 5;
      newComponent.acceptedFileTypes = ['.pdf', '.docx', '.jpg', '.png'];
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
      case 'file_single': return 'Archivo Único';
      case 'file_multiple': return 'Múltiples Archivos';
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

  const handleCopyComponent = (component: FormComponent) => {
    // Crear una copia profunda del componente
    const componentCopy: FormComponent = JSON.parse(JSON.stringify(component));
    
    // Generar un nuevo ID único
    componentCopy.id = `comp-${Date.now()}`;
    
    // Añadir " (copia)" al final de la etiqueta
    componentCopy.label = `${componentCopy.label} (copia)`;
    
    // Añadir el componente copiado al schema
    const updatedComponents = [...formSchema.components, componentCopy];
    
    onChange({
      ...formSchema,
      components: updatedComponents
    });
    
    toast({
      title: "Componente copiado",
      description: `Se creó una copia de "${component.label}"`,
    });
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
    // Primero, necesitamos eliminar cualquier dependencia condicional que otros componentes tengan en este
    const updatedComponents = formSchema.components.map(component => {
      if (component.conditionalDisplay?.controlledBy === componentId) {
        // Si este componente está siendo controlado por el que se elimina, quitamos la condición
        const { conditionalDisplay, ...rest } = component;
        return rest;
      }
      return component;
    });
    
    // Luego eliminamos el componente
    onChange({
      ...formSchema,
      components: updatedComponents.filter(c => c.id !== componentId)
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
    const { source, destination, draggableId, type } = result;
    
    // Drop was cancelled or dropped outside valid droppable
    if (!destination) return;

    // Handle group reordering
    if (type === 'group') {
      const updatedGroups = Array.from(formSchema.groups);
      const [movedGroup] = updatedGroups.splice(source.index, 1);
      updatedGroups.splice(destination.index, 0, movedGroup);

      onChange({
        ...formSchema,
        groups: updatedGroups
      });
      return;
    }
    
    // Handle component reordering within or between groups
    const sourceDroppableId = source.droppableId;
    const destinationDroppableId = destination.droppableId;
    
    // Create a copy of all components 
    const allComponents = [...formSchema.components];
    
    // Find the component being dragged
    const componentIndex = allComponents.findIndex(comp => comp.id === draggableId);
    if (componentIndex === -1) return;
    
    // Get the component being moved
    const movedComponent = {...allComponents[componentIndex]};
    
    // Remove it from its current position
    allComponents.splice(componentIndex, 1);
    
    // Set the new groupId based on destination
    if (destinationDroppableId === 'form-components') {
      movedComponent.groupId = undefined;
    } else {
      movedComponent.groupId = destinationDroppableId;
    }
    
    // Get components for the destination group (or ungrouped)
    const destinationComponents = destinationDroppableId === 'form-components'
      ? allComponents.filter(comp => !comp.groupId)
      : allComponents.filter(comp => comp.groupId === destinationDroppableId);
    
    // Insert component at the correct position in its new group
    destinationComponents.splice(destination.index, 0, movedComponent);
    
    // Other components (not in the destination group)
    const otherComponents = allComponents.filter(comp => {
      if (destinationDroppableId === 'form-components') {
        return comp.groupId !== undefined;
      } else {
        return comp.groupId !== destinationDroppableId;
      }
    });
    
    // Create the final component array preserving order as much as possible
    const finalComponents = [...destinationComponents, ...otherComponents];
    
    onChange({
      ...formSchema,
      components: finalComponents
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
                {component.conditionalDisplay && (
                  <span className="ml-2 text-xs text-blue-500">
                    (Condicional)
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopyComponent(component)}
                  title="Duplicar componente"
                >
                  <Copy className="h-4 w-4" />
                </Button>
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

  // Fixed the EmptyState callback to accept the event parameter
  const handleEmptyStateAddComponent = () => {
    handleAddComponent('text');
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
            <Button
              onClick={(e) => handleAddNewComponent(e)}
              className="bg-dynamo-600 hover:bg-dynamo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Componente
            </Button>
            <ComponentToolbar onAddComponent={handleAddComponent} />
          </div>
        </CardHeader>
        <CardContent>
          {formSchema.components.length === 0 && formSchema.groups.length === 0 ? (
            <EmptyState onAddComponent={handleEmptyStateAddComponent} />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-6">
                {/* Permitir reorganizar grupos */}
                <Droppable droppableId="form-groups" type="group">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-4"
                    >
                      {/* Renderizar grupos */}
                      {formSchema.groups.map((group, index) => (
                        <Draggable 
                          key={group.id} 
                          draggableId={group.id} 
                          index={index}
                        >
                          {(providedDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                            >
                              <Collapsible 
                                className="border rounded-md overflow-hidden"
                                open={group.expanded}
                              >
                                <div className="bg-gray-100 border-b p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <div 
                                        {...providedDraggable.dragHandleProps}
                                        className="mr-2 cursor-move"
                                      >
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                      </div>
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
                                    <Droppable droppableId={group.id}>
                                      {(providedDroppable) => (
                                        <div
                                          ref={providedDroppable.innerRef}
                                          {...providedDroppable.droppableProps}
                                          className="min-h-[80px]"
                                        >
                                          {renderGroupComponents(group.id)}
                                          {providedDroppable.placeholder}
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
                                      )}
                                    </Droppable>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Renderizar componentes sin grupo */}
                <Droppable droppableId="form-components">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
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
                                  {component.conditionalDisplay && (
                                    <span className="ml-2 text-xs text-blue-500">
                                      (Condicional)
                                    </span>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleCopyComponent(component)}
                                    title="Duplicar componente"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
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
              </div>
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
          allComponents={formSchema.components}
        />
      )}
    </div>
  );
};
