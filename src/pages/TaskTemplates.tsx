
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronLeft, AlertCircle, ArrowRight, ArrowRightLeft, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSchema } from "@/components/form-builder/FormBuilder";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define task template interface
interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  source_form_id: string;
  target_form_id: string;
  assignment_type: 'static' | 'dynamic';
  default_assignee: string | null;
  assignee_form_field: string | null;
  due_days: number | null;
  is_active: boolean;
  created_at: string;
  inheritance_mapping: Record<string, string> | null;
  project_id: string | null;
  source_form?: {
    id: string;
    title: string;
  };
  target_form?: {
    id: string;
    title: string;
  };
}

interface FormField {
  id: string;
  label: string;
  type: string;
}

const TaskTemplates = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [formFields, setFormFields] = useState<{
    source: FormField[];
    target: FormField[];
  }>({
    source: [],
    target: []
  });
  
  // Form state for creating or editing templates
  const [formState, setFormState] = useState<Partial<TaskTemplate>>({
    title: '',
    description: '',
    source_form_id: '',
    target_form_id: '',
    assignment_type: 'static',
    default_assignee: '',
    assignee_form_field: null,
    due_days: 7,
    is_active: true,
    inheritance_mapping: {},
    project_id: projectId || null
  });
  
  // Fetch task templates for the current project
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['taskTemplates', projectId],
    queryFn: async () => {
      let query = supabase
        .from('task_templates')
        .select(`
          *,
          source_form:source_form_id(id, title),
          target_form:target_form_id(id, title)
        `);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TaskTemplate[];
    }
  });
  
  // Fetch forms for use in selectors
  const { data: forms } = useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      let query = supabase.from('forms').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch users for assignee selector
  const { data: users } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });
  
  // Create/update task template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: Partial<TaskTemplate>) => {
      if (template.id) {
        // Update existing template
        const { data, error } = await supabase
          .from('task_templates')
          .update(template)
          .eq('id', template.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('task_templates')
          .insert(template)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['taskTemplates']});
      setIsCreating(false);
      setSelectedTemplate(null);
      setFormState({
        title: '',
        description: '',
        source_form_id: '',
        target_form_id: '',
        assignment_type: 'static',
        default_assignee: '',
        assignee_form_field: null,
        due_days: 7,
        is_active: true,
        inheritance_mapping: {},
        project_id: projectId || null
      });
      toast({
        title: "Task template saved",
        description: "The task template has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving task template:", error);
      toast({
        title: "Error",
        description: "Failed to save task template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete task template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['taskTemplates']});
      toast({
        title: "Task template deleted",
        description: "The task template has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting task template:", error);
      toast({
        title: "Error",
        description: "Failed to delete task template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch form schema when source or target form changes
  useEffect(() => {
    const fetchFormSchemas = async () => {
      if (formState.source_form_id) {
        // Fetch source form schema
        const { data: sourceForm, error: sourceError } = await supabase
          .from('forms')
          .select('schema')
          .eq('id', formState.source_form_id)
          .single();
        
        if (!sourceError && sourceForm?.schema) {
          // Extract field information for mapping
          const schema = sourceForm.schema as { components: any[] };
          const fields = (schema.components || [])
            .filter(comp => comp.type !== 'info_text' && !comp.type.startsWith('group'))
            .map(comp => ({
              id: comp.id,
              label: comp.label,
              type: comp.type
            }));
          
          setFormFields(prev => ({ ...prev, source: fields }));
        }
      }
      
      if (formState.target_form_id) {
        // Fetch target form schema
        const { data: targetForm, error: targetError } = await supabase
          .from('forms')
          .select('schema')
          .eq('id', formState.target_form_id)
          .single();
        
        if (!targetError && targetForm?.schema) {
          // Extract field information for mapping
          const schema = targetForm.schema as { components: any[] };
          const fields = (schema.components || [])
            .filter(comp => comp.type !== 'info_text' && !comp.type.startsWith('group'))
            .map(comp => ({
              id: comp.id,
              label: comp.label,
              type: comp.type
            }));
          
          setFormFields(prev => ({ ...prev, target: fields }));
        }
      }
    };
    
    fetchFormSchemas();
  }, [formState.source_form_id, formState.target_form_id]);
  
  // Populate form state when editing an existing template
  useEffect(() => {
    if (selectedTemplate) {
      setFormState(selectedTemplate);
    }
  }, [selectedTemplate]);
  
  const handleSaveTemplate = () => {
    if (!formState.title || !formState.source_form_id || !formState.target_form_id) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    saveTemplateMutation.mutate(formState);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleInheritanceMapping = (sourceField: string, targetField: string) => {
    setFormState(prev => ({
      ...prev,
      inheritance_mapping: {
        ...(prev.inheritance_mapping || {}),
        [sourceField]: targetField
      }
    }));
  };
  
  return (
    <PageContainer>
      {projectId && (
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}/roles`)}
            className="text-gray-600"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Project
          </Button>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Task Templates</h1>
        <p className="text-gray-500 mt-1">
          Configure automations to create tasks when forms are submitted
        </p>
      </div>
      
      {isCreating || selectedTemplate ? (
        // Template Form
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? 'Edit Task Template' : 'Create Task Template'}
            </CardTitle>
            <CardDescription>
              Define how tasks are automatically created when forms are submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Template Name *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formState.title || ''}
                    onChange={handleInputChange}
                    placeholder="E.g., Project Approval Request"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={!!formState.is_active}
                      onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      {formState.is_active ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formState.description || ''}
                    onChange={handleInputChange}
                    placeholder="Describe the purpose of this task template"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due_days">Due Days</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="due_days"
                      name="due_days"
                      type="number"
                      value={formState.due_days || ''}
                      onChange={handleInputChange}
                      placeholder="7"
                      className="w-24"
                      min={1}
                    />
                    <span className="text-gray-500 text-sm">days after task creation</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Form Trigger Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="source_form_id">Source Form (Trigger) *</Label>
                    <Select
                      value={formState.source_form_id || ''}
                      onValueChange={(value) => handleSelectChange('source_form_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a form" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms?.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      When this form is submitted, a task will be created
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_form_id">Target Form *</Label>
                    <Select
                      value={formState.target_form_id || ''}
                      onValueChange={(value) => handleSelectChange('target_form_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a form" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms?.map(form => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      The form that needs to be completed for this task
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Task Assignment</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment_type">Assignment Type *</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="static"
                          name="assignment_type"
                          value="static"
                          checked={formState.assignment_type === 'static'}
                          onChange={() => handleSelectChange('assignment_type', 'static')}
                          className="h-4 w-4 text-primary"
                        />
                        <Label htmlFor="static" className="cursor-pointer">
                          Static Assignment (Specific User)
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="dynamic"
                          name="assignment_type"
                          value="dynamic"
                          checked={formState.assignment_type === 'dynamic'}
                          onChange={() => handleSelectChange('assignment_type', 'dynamic')}
                          className="h-4 w-4 text-primary"
                        />
                        <Label htmlFor="dynamic" className="cursor-pointer">
                          Dynamic Assignment (From Form Field)
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  {formState.assignment_type === 'static' && (
                    <div className="space-y-2">
                      <Label htmlFor="default_assignee">Default Assignee *</Label>
                      <Select
                        value={formState.default_assignee || ''}
                        onValueChange={(value) => handleSelectChange('default_assignee', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formState.assignment_type === 'dynamic' && (
                    <div className="space-y-2">
                      <Label htmlFor="assignee_form_field">
                        Email Field from Source Form *
                      </Label>
                      <Select
                        value={formState.assignee_form_field || ''}
                        onValueChange={(value) => handleSelectChange('assignee_form_field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a field" />
                        </SelectTrigger>
                        <SelectContent>
                          {formFields.source
                            .filter(field => field.type === 'email')
                            .map(field => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        This email field will be used to assign the task
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {formState.source_form_id && formState.target_form_id && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Field Mapping</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Map fields from the source form to the target form to automatically populate data
                  </p>
                  
                  {formFields.target.length > 0 ? (
                    <div className="space-y-4">
                      {formFields.target.map(targetField => (
                        <div key={targetField.id} className="flex items-center space-x-2">
                          <Select
                            value={(formState.inheritance_mapping && formState.inheritance_mapping[targetField.id]) || ''}
                            onValueChange={(value) => handleInheritanceMapping(targetField.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={`Select source field for ${targetField.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No mapping</SelectItem>
                              {formFields.source
                                .filter(sourceField => sourceField.type === targetField.type)
                                .map(sourceField => (
                                  <SelectItem key={sourceField.id} value={sourceField.id}>
                                    {sourceField.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <ArrowRight className="h-4 w-4 flex-shrink-0" />
                          <div className="bg-gray-100 px-3 py-2 rounded text-sm flex-grow">
                            {targetField.label} ({targetField.type})
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-amber-700 bg-amber-50 p-4 rounded flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <p className="text-sm">
                        No fields available for mapping. Make sure both forms have compatible fields.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreating(false);
                setSelectedTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={saveTemplateMutation.isPending}
              className="bg-dynamo-600 hover:bg-dynamo-700"
            >
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        // Template List
        <div className="mb-6 flex justify-end">
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-dynamo-600 hover:bg-dynamo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task Template
          </Button>
        </div>
      )}
      
      {!isCreating && !selectedTemplate && (
        <>
          {isLoadingTemplates ? (
            <div className="text-center py-10">
              <div className="animate-pulse text-gray-500">Loading templates...</div>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">Form Trigger</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700 flex-grow truncate">
                            {template.source_form?.title || "Unknown Form"}
                          </span>
                          <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="text-gray-700 flex-grow truncate">
                            {template.target_form?.title || "Unknown Form"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <CalendarClock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Due in {template.due_days || 7} days</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <Badge variant="outline" className="mr-2">
                          {template.assignment_type === 'static' ? 'Static Assignment' : 'Dynamic Assignment'}
                        </Badge>
                        {template.inheritance_mapping && Object.keys(template.inheritance_mapping).length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help">
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  {Object.keys(template.inheritance_mapping).length} Field Mappings
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This template will copy data between forms</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-4 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Task Template</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this task template? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button 
                            variant="destructive" 
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-dynamo-600 hover:bg-dynamo-700"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-gray-100 p-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Task Templates Found</h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Create task templates to automate workflow between forms and assign tasks when forms are submitted.
                </p>
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="bg-dynamo-600 hover:bg-dynamo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default TaskTemplates;
