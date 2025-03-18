
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Trash2, Eye, Edit, Plus, Check, X, ArrowRight, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CreateTaskTemplateModal } from '@/components/project/CreateTaskTemplateModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { TaskTemplate } from '@/types/supabase';

interface Form {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

// Fixed interface to match what we get from Supabase
interface ExtendedTaskTemplate {
  id: string;
  title: string;
  description: string | null;
  source_form_id: string;
  target_form_id: string;
  assignment_type: 'static' | 'dynamic';
  assignee_form_field: string | null;
  default_assignee: string | null;
  due_days: number | null;
  is_active: boolean;
  inheritance_mapping: Record<string, string> | null;
  project_id: string;
  created_at: string;
  source_form?: { id: string; title: string } | null;
  target_form?: { id: string; title: string } | null;
  default_assignee_profile?: { id: string; name: string; email: string } | null;
  default_assignee_name?: string;
}

const TaskTemplatesPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExtendedTaskTemplate | null>(null);
  const [detailTab, setDetailTab] = useState('general');
  const [inheritanceMapping, setInheritanceMapping] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!projectId) {
      console.warn("Project ID is missing.");
    }
  }, [projectId]);

  // Fetch task templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['taskTemplates', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("Project ID is missing.");
        return [];
      }

      // Fixed the query to handle foreign tables correctly
      const { data, error } = await supabase
        .from('task_templates')
        .select(`
          *,
          source_form:source_form_id (id, title),
          target_form:target_form_id (id, title),
          default_assignee_profile:default_assignee (id, name, email)
        `)
        .eq('project_id', projectId);
      
      if (error) {
        console.error("Error fetching task templates:", error);
        throw error;
      }
      
      // Map the data to our expected format with proper null checks
      return data.map(template => {
        let sourceForm = null;
        if (template.source_form && 
            typeof template.source_form === 'object' && 
            template.source_form !== null) {
          if ('id' in template.source_form && 
              'title' in template.source_form && 
              template.source_form.id !== null && 
              template.source_form.title !== null) {
            sourceForm = { 
              id: String(template.source_form.id), 
              title: String(template.source_form.title) 
            };
          }
        }
        
        let targetForm = null;
        if (template.target_form && 
            typeof template.target_form === 'object' && 
            template.target_form !== null) {
          if ('id' in template.target_form && 
              'title' in template.target_form && 
              template.target_form.id !== null && 
              template.target_form.title !== null) {
            targetForm = { 
              id: String(template.target_form.id), 
              title: String(template.target_form.title) 
            };
          }
        }
        
        let assigneeName = 'N/A';
        if (template.default_assignee_profile && 
            typeof template.default_assignee_profile === 'object' && 
            template.default_assignee_profile !== null) {
          if ('name' in template.default_assignee_profile && template.default_assignee_profile.name) {
            assigneeName = String(template.default_assignee_profile.name);
          } else if ('email' in template.default_assignee_profile && template.default_assignee_profile.email) {
            assigneeName = String(template.default_assignee_profile.email);
          }
        }
        
        return {
          ...template,
          source_form: sourceForm,
          target_form: targetForm,
          default_assignee_name: assigneeName
        } as ExtendedTaskTemplate;
      });
    },
    enabled: !!projectId,
  });

  // Fetch project forms for selection
  const { data: forms } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("Project ID is missing.");
        return [];
      }

      const { data, error } = await supabase
        .from('forms')
        .select('id, title, description, project_id')
        .eq('project_id', projectId)
        .order('title', { ascending: true });
        
      if (error) {
        console.error("Error fetching forms:", error);
        throw error;
      }
      
      return data as Form[];
    },
    enabled: !!projectId,
  });

  // Fetch project users for assignee selection
  const { data: projectUsers } = useQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("Project ID is missing.");
        return [];
      }

      // Fixed query to avoid foreign table issues by using explicit column references
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          user_id,
          profiles:user_id (id, name, email)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active');
        
      if (error) {
        console.error("Error fetching project users:", error);
        throw error;
      }
      
      // Extract and transform user data with proper null checks
      const users: User[] = [];
      for (const projectUser of data) {
        if (projectUser.profiles && 
            typeof projectUser.profiles === 'object' && 
            projectUser.profiles !== null) {
          if ('id' in projectUser.profiles && 
              'name' in projectUser.profiles && 
              'email' in projectUser.profiles && 
              projectUser.profiles.id !== null && 
              projectUser.profiles.name !== null && 
              projectUser.profiles.email !== null) {
            users.push({
              id: String(projectUser.profiles.id),
              name: String(projectUser.profiles.name),
              email: String(projectUser.profiles.email)
            });
          }
        }
      }
      
      return users;
    },
    enabled: !!projectId,
  });

  // Handle template deletion
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);
        
      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se ha eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al eliminar la plantilla.",
        variant: "destructive"
      });
    },
  });

  // Toggle template active status
  const toggleTemplateMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active })
        .eq('id', id);
        
      if (error) throw error;
      return { id, is_active };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
      toast({
        title: data.is_active ? "Plantilla activada" : "Plantilla desactivada",
        description: `La plantilla se ha ${data.is_active ? 'activado' : 'desactivado'} correctamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Hubo un error al actualizar la plantilla.",
        variant: "destructive"
      });
    },
  });

  const handleCreateTemplate = () => {
    setCreateModalOpen(true);
  };

  const handleViewTemplate = (template: ExtendedTaskTemplate) => {
    setSelectedTemplate(template);
    setInheritanceMapping(template.inheritance_mapping || {});
    setDetailTab('general');
    setViewModalOpen(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleToggleActive = (template: ExtendedTaskTemplate) => {
    toggleTemplateMutation.mutate({
      id: template.id,
      is_active: !template.is_active
    });
  };

  // Function to display forms name
  const getFormName = (formId: string | null) => {
    if (!formId || !forms) return 'N/A';
    const form = forms.find(f => f.id === formId);
    return form ? form.title : 'N/A';
  };

  // Function to display assignee name
  const getAssigneeName = (template: ExtendedTaskTemplate) => {
    if (template.assignment_type === 'dynamic') {
      return `Dinámico (${template.assignee_form_field || 'no especificado'})`;
    } 
    
    if (template.default_assignee && projectUsers) {
      const user = projectUsers.find(u => u.id === template.default_assignee);
      return user ? (user.name || user.email) : 'N/A';
    }
    
    return 'No asignado';
  };

  // Handle mapping change for viewing template details
  const handleMappingChange = (mapping: Record<string, string>) => {
    setInheritanceMapping(mapping);
  };

  return (
    <PageContainer>
      <div className="md:flex md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Tareas</h1>
          <p className="text-gray-500 mt-1">Configura plantillas para generar tareas automáticamente</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Plantilla
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plantillas</CardTitle>
          <CardDescription>
            Lista de plantillas de tareas configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Formulario Origen</TableHead>
                <TableHead>Formulario Destino</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Cargando plantillas...</p>
                  </TableCell>
                </TableRow>
              ) : templates && templates.length > 0 ? (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell>{template.source_form?.title || 'N/A'}</TableCell>
                    <TableCell>{template.target_form?.title || 'N/A'}</TableCell>
                    <TableCell>{getAssigneeName(template)}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "success" : "secondary"}>
                        {template.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleViewTemplate(template)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant={template.is_active ? "outline" : "default"}
                          size="icon"
                          onClick={() => handleToggleActive(template)}
                          title={template.is_active ? "Desactivar" : "Activar"}
                        >
                          {template.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="icon"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente la plantilla de tareas. 
                                Esta acción no puede deshacerse.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteTemplate(template.id)} 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <p className="text-muted-foreground">No hay plantillas configuradas</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={handleCreateTemplate}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear tu primera plantilla
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Template Modal */}
      <CreateTaskTemplateModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        projectId={projectId || ''} 
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['taskTemplates', projectId] });
        }}
      />

      {/* View Template Modal */}
      {selectedTemplate && (
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de la Plantilla</DialogTitle>
              <DialogDescription>
                Información detallada de la plantilla de tareas
              </DialogDescription>
            </DialogHeader>

            <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="mapping">Mapeo de Campos</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Título</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.title}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Estado</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted flex items-center">
                      <Badge variant={selectedTemplate.is_active ? "success" : "secondary"}>
                        {selectedTemplate.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedTemplate.description && (
                  <div>
                    <Label className="text-sm font-medium">Descripción</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm font-medium">Formulario Origen</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.source_form?.title || getFormName(selectedTemplate.source_form_id)}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Formulario Destino</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.target_form?.title || getFormName(selectedTemplate.target_form_id)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm font-medium">Tipo de Asignación</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.assignment_type === 'static' ? 'Estática' : 'Dinámica'}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Asignado a</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {getAssigneeName(selectedTemplate)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-sm font-medium">Días para completar</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {selectedTemplate.due_days || 'No especificado'}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Fecha de creación</Label>
                    <div className="mt-1 p-2 border rounded-md bg-muted">
                      {new Date(selectedTemplate.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mapping" className="space-y-4 mt-2">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Mapeo de Campos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configuración de cómo los campos del formulario origen poblarán automáticamente el formulario destino.
                  </p>

                  {selectedTemplate.inheritance_mapping && Object.keys(selectedTemplate.inheritance_mapping).length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 bg-background p-2 rounded-lg">
                        <div className="font-medium">Campo Destino</div>
                        <div className="text-center font-medium">
                          <ArrowRight className="inline-block h-4 w-4 mx-2" />
                        </div>
                        <div className="font-medium">Campo Origen</div>
                      </div>
                      {Object.entries(selectedTemplate.inheritance_mapping).map(([targetField, sourceField]) => (
                        <div key={targetField} className="grid grid-cols-3 gap-2 items-center border-b border-border pb-2">
                          <div className="text-sm">{targetField}</div>
                          <div className="flex justify-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-medium">{sourceField}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-amber-500 flex items-center p-4 bg-amber-50 rounded-lg">
                      <Info className="h-5 w-5 mr-2" />
                      No hay mapeo de campos configurado para esta plantilla.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
};

// Function to display assignee name
const getAssigneeName = (template: ExtendedTaskTemplate) => {
  if (template.assignment_type === 'dynamic') {
    return `Dinámico (${template.assignee_form_field || 'no especificado'})`;
  } 
  
  if (template.default_assignee && template.default_assignee_name) {
    return template.default_assignee_name;
  }
  
  return 'No asignado';
};

export default TaskTemplatesPage;
