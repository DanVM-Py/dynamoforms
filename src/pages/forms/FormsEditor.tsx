import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { FormProvider } from '@/contexts/FormContext';
import { useFormContext } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormManagement } from '@/types/forms';
import { Pencil, Plus, FileText, Globe, Lock, Search, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/config/environment';
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
} from "@/components/ui/alert-dialog"

const FormsEditorContent: React.FC = () => {
  const { forms, loading, error, refreshForms } = useFormContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title');
  const navigate = useNavigate();
  const { currentProjectId } = useAuth();
  const [formToDelete, setFormToDelete] = useState<FormManagement | null>(null);
  const { toast } = useToast();

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      if (!formId) throw new Error("Form ID no está disponible para eliminar.");

      const { error } = await supabase
        .from(Tables.forms)
        .delete()
        .eq('id', formId);
      
      if (error) {
        logger.error('Error al eliminar formulario:', error);
        throw new Error(error.message || "Error desconocido al eliminar");
      }
    },
    onSuccess: () => {
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado exitosamente."
      });
      
      refreshForms?.();
      setFormToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el formulario.",
        variant: "destructive"
      });
      setFormToDelete(null);
    }
  });

  useEffect(() => {
    logger.debug('[FormsEditorContent] forms from context:', forms);
    logger.debug('[FormsEditorContent] currentProjectId:', currentProjectId);
  }, [forms, currentProjectId]);

  const filteredForms = React.useMemo(() => {
    let result = [...forms] as FormManagement[];
    
    if (currentProjectId) {
      result = result.filter(form => form.project_id === currentProjectId);
    } else {
      result = []; 
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(form => 
        form.title.toLowerCase().includes(searchLower) || 
        (form.description && form.description.toLowerCase().includes(searchLower)) ||
        (form.project?.name && form.project.name.toLowerCase().includes(searchLower))
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(form => form.status === statusFilter);
    }
    
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else if (sortBy === 'project') {
        return (a.project?.name || '').localeCompare(b.project?.name || '');
      } else if (sortBy === 'date') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'responses') {
        return (b.responses_count || 0) - (a.responses_count || 0);
      }
      return 0;
    });
    
    logger.debug('[FormsEditorContent] Running filter. Result length:', result.length);
    return result;
  }, [forms, searchTerm, statusFilter, sortBy, currentProjectId]);

  const handleEditForm = (formId: string) => {
    navigate(`/forms-management/${formId}`);
  };

  const handleCreateForm = () => {
    navigate('/forms-management/new');
  };

  const handleConfirmDelete = () => {
    if (formToDelete) {
      logger.info(`Confirmando eliminación del formulario: ${formToDelete.title} (ID: ${formToDelete.id})`);
      deleteFormMutation.mutate(formToDelete.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-pulse text-gray-500">Cargando formularios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-800">
        <p className="font-semibold">Error al cargar formularios</p>
        <p>{error.message}</p>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'secondary' | 'destructive' | 'default' => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'secondary';
      case 'closed': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'draft': return 'Borrador';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar formularios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-[180px]">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="min-w-[180px]">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Título</SelectItem>
                <SelectItem value="status">Estado</SelectItem>
                <SelectItem value="project">Proyecto</SelectItem>
                <SelectItem value="date">Fecha de actualización</SelectItem>
                <SelectItem value="responses">Respuestas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleCreateForm} className="ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Formulario
          </Button>
        </div>
      </div>
      
      {filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No se encontraron formularios</h3>
          <p className="text-gray-500 mt-1">
            {currentProjectId 
             ? (searchTerm || statusFilter !== 'all' ? 'Prueba con otros filtros o revisa si hay formularios en este proyecto.' : 'No hay formularios en este proyecto. ¡Crea el primero!')
             : 'Selecciona un proyecto para ver sus formularios.'}
          </p>
          {currentProjectId && !searchTerm && statusFilter === 'all' && (
            <Button onClick={handleCreateForm} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Crear formulario
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <AlertDialog key={form.id}>
              <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold line-clamp-1">{form.title}</h3>
                    <Badge variant={getStatusBadgeVariant(form.status)}>
                      {getStatusLabel(form.status)}
                    </Badge>
                  </div>
                  
                  {form.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {form.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Respuestas:</span>
                      <span className="ml-2">{form.responses_count || 0}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium">Acceso:</span>
                      <span className="ml-2 flex items-center">
                        {form.is_public ? (
                          <>
                            <Globe className="h-3.5 w-3.5 text-green-500 mr-1" />
                            Público
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 text-gray-500 mr-1" />
                            Privado
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    className="flex-1 mr-2"
                    onClick={() => handleEditForm(form.id)}
                    disabled={!form.canEdit}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar formulario
                  </Button>
                  
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      onClick={() => setFormToDelete(form)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar formulario</span>
                    </Button>
                  </AlertDialogTrigger>
                </CardFooter>
              </Card>
              
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el formulario "{formToDelete?.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setFormToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                     className="bg-red-500 hover:bg-red-600"
                     onClick={handleConfirmDelete}
                     disabled={deleteFormMutation.isPending}
                   >
                    {deleteFormMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
        </div>
      )}
    </div>
  );
};

const FormsEditor: React.FC = () => {
  const { isGlobalAdmin, isProjectAdmin } = useAuth();
  const navigate = useNavigate();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isGlobalAdmin && !isProjectAdmin) {
      setShouldRedirect(true);
    }
  }, [isGlobalAdmin, isProjectAdmin]);

  useEffect(() => {
    if (shouldRedirect) {
      navigate('/forms', { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return null;
  }

  return (
    <FormProvider mode="management">
      <FormsEditorContent />
    </FormProvider>
  );
};

export default FormsEditor;
