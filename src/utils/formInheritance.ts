
import { supabase } from "@/integrations/supabase/client";
import { TaskTemplate } from "@/types/supabase";

/**
 * Process form inheritance to create tasks based on templates
 * @param formId The ID of the form that was submitted
 * @param formResponseId The ID of the form response
 * @param responseData The form response data
 * @param projectId Optional project ID
 * @param submitterId User ID of the person who submitted the form
 */
export const processFormInheritance = async (
  formId: string,
  formResponseId: string,
  responseData: any,
  projectId?: string | null,
  submitterId?: string
) => {
  try {
    console.log(`Procesando herencia de formulario para: ${formId}, respuesta: ${formResponseId}`);
    
    // Find templates where this form is the source
    let query = supabase
      .from('task_templates')
      .select('*')
      .eq('source_form_id', formId)
      .eq('is_active', true);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data: templates, error } = await query;
    
    if (error) {
      console.error("Error al buscar plantillas de tareas:", error);
      return false;
    }
    
    if (!templates || templates.length === 0) {
      console.log("No se encontraron plantillas de tareas aplicables.");
      return false;
    }
    
    console.log(`Se encontraron ${templates.length} plantillas de tareas aplicables.`);
    
    // Process each template
    for (const template of templates) {
      await createTaskFromTemplate(template, formId, formResponseId, responseData, projectId, submitterId);
    }
    
    return true;
  } catch (error) {
    console.error("Error processing form inheritance:", error);
    return false;
  }
};

/**
 * Create a task based on a template
 */
const createTaskFromTemplate = async (
  template: any,
  sourceFormId: string,
  formResponseId: string,
  responseData: any,
  projectId?: string | null,
  submitterId?: string
) => {
  try {
    console.log(`Creando tarea desde plantilla: ${template.title}`);
    
    // Determine the assignee
    let assigneeId = template.default_assignee;
    
    if (template.assignment_type === 'dynamic' && template.assignee_form_field) {
      const emailField = template.assignee_form_field;
      const userEmail = responseData[emailField];
      
      if (userEmail) {
        // Look up user by email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single();
        
        if (userProfile) {
          assigneeId = userProfile.id;
        }
      }
    }
    
    // If no assignee could be determined, use the submitter as fallback
    if (!assigneeId && submitterId) {
      assigneeId = submitterId;
    }
    
    // If still no assignee, log an error
    if (!assigneeId) {
      console.error("No se pudo determinar el asignado para la tarea. La tarea no será creada.");
      return;
    }
    
    // Calculate due date
    let dueDate = null;
    if (template.due_days) {
      const date = new Date();
      date.setDate(date.getDate() + template.due_days);
      dueDate = date.toISOString();
    }
    
    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: template.title,
        description: template.description,
        status: 'pending',
        assigned_to: assigneeId,
        due_date: dueDate,
        form_id: template.target_form_id,
        form_response_id: formResponseId,
        project_id: projectId || template.project_id,
        source_form_id: sourceFormId,
        priority: 'medium'
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error al crear la tarea:", error);
      return;
    }
    
    console.log(`Tarea creada con éxito: ${task.id}`);
    
    // Create notification for the assignee
    await supabase
      .from('notifications')
      .insert({
        user_id: assigneeId,
        title: 'Nueva tarea asignada',
        message: `Se te ha asignado una nueva tarea: ${template.title}`,
        type: 'task_assigned',
        read: false,
        project_id: projectId || template.project_id,
        metadata: {
          task_id: task.id,
          form_id: template.target_form_id
        }
      });
    
    return task;
  } catch (error) {
    console.error("Error creating task from template:", error);
    return null;
  }
};
