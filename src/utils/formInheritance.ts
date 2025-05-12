import { supabase } from "@/integrations/supabase/client";
import { Tables } from '@/config/environment';
import { logger } from '@/lib/logger';

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
    logger.info(`Procesando herencia de formulario para: ${formId}, respuesta: ${formResponseId}, proyecto: ${projectId || 'no especificado'}`);
    
    // Find templates where this form is the source
    let query = supabase
      .from(Tables.task_templates)
      .select('*')
      .eq('source_form_id', formId)
      .eq('is_active', true);
    
    // Add project filter if available
    if (projectId) {
      logger.debug(`Filtrando por proyecto: ${projectId}`);
      query = query.eq('project_id', projectId);
    }
    
    const { data: templates, error } = await query;
    
    if (error) {
      logger.error("Error al buscar plantillas de tareas:", error);
      return false;
    }
    
    if (!templates || templates.length === 0) {
      logger.info("No se encontraron plantillas de tareas aplicables.");
      return false;
    }
    
    logger.info(`Se encontraron ${templates.length} plantillas de tareas aplicables.`);
    
    // Process each template
    for (const template of templates) {
      await createTaskFromTemplate(template, formId, formResponseId, responseData, projectId, submitterId);
    }
    
    return true;
  } catch (error) {
    logger.error("Error processing form inheritance:", error);
    throw error;
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
    logger.debug(`Creando tarea desde plantilla: ${template.title} (ID: ${template.id})`);
    logger.debug(`Proyecto de la plantilla: ${template.project_id}, Proyecto del contexto: ${projectId}`);
    
    // Determine the assignee
    let assigneeId = template.assignee_static;
    
    if (template.assignment_type === 'dynamic' && template.assignee_dynamic) {
      const emailField = template.assignee_dynamic;
      const userEmail = responseData[emailField];
      
      if (userEmail) {
        // Look up user by email
        const { data: userProfile, error } = await supabase
          .from(Tables.profiles)
          .select('id')
          .eq('email', userEmail)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors
        
        if (error) {
          logger.error("Error buscando usuario por email:", error);
        }
        
        if (userProfile) {
          assigneeId = userProfile.id;
          logger.info(`Usuario asignado por email: ${userEmail}, ID: ${assigneeId}`);
        } else {
          logger.warn(`No se encontró usuario con email: ${userEmail}`);
        }
      }
    }
    
    // If no assignee could be determined, use the submitter as fallback
    if (!assigneeId && submitterId) {
      assigneeId = submitterId;
      logger.info(`Usando remitente como asignado: ${assigneeId}`);
    }
    
    // If still no assignee, log an error
    if (!assigneeId) {
      logger.error("No se pudo determinar el asignado para la tarea. La tarea no será creada.");
      return;
    }
    
    // Calculate due date based on due_days
    let dueDate = null;
    if (template.due_days) {
      const date = new Date();
      date.setDate(date.getDate() + template.due_days);
      dueDate = date.toISOString();
      logger.info(`Fecha de vencimiento calculada: ${dueDate}`);
    }
    
    // Calculate min date based on min_days
    let minDate = null;
    if (template.min_days) {
      const date = new Date();
      date.setDate(date.getDate() + template.min_days);
      minDate = date.toISOString();
      logger.info(`Fecha mínima calculada: ${minDate}`);
    }
    
    // Resolve project ID (use passed projectId first, fallback to template's project_id)
    const finalProjectId = projectId || template.project_id;
    
    if (!finalProjectId) {
      logger.error("No se pudo determinar el proyecto para la tarea. La tarea no será creada.");
      return;
    }
    
    logger.info(`Proyecto final para la tarea: ${finalProjectId}`);
    
    // Create metadata for min completion date
    const metadata = {
      inheritance_mapping: template.inheritance_mapping || {},
      min_completion_date: minDate
    };
    
    // Create task
    const { data: task, error } = await supabase
      .from(Tables.tasks)
      .insert({
        title: template.title,
        description: template.description,
        status: 'pending',
        assigned_to: assigneeId,
        due_date: dueDate,
        form_id: template.target_form_id,
        form_response_id: formResponseId,
        project_id: finalProjectId,
        source_form_id: sourceFormId,
        priority: 'medium',
        metadata: metadata
      })
      .select()
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors
    
    if (error) {
      logger.error("Error al crear la tarea:", error);
      return;
    }
    
    logger.info(`Tarea creada con éxito: ${task?.id} en proyecto ${finalProjectId}`);
    
    // Create notification for the assignee
    const { error: notificationError } = await supabase
      .from(Tables.notifications)
      .insert({
        user_id: assigneeId,
        title: 'Nueva tarea asignada',
        message: `Se te ha asignado una nueva tarea: ${template.title}`,
        type: 'task_assigned',
        read: false,
        project_id: finalProjectId,
        metadata: {
          task_id: task?.id,
          form_id: template.target_form_id,
          min_days: template.min_days || 0,
          due_days: template.due_days || 7,
          inheritance_mapping: template.inheritance_mapping || {}
        }
      });
      
    if (notificationError) {
      logger.error("Error al crear notificación:", notificationError);
    } else {
      logger.info("Notificación creada con éxito para el usuario", assigneeId);
    }
    
    return task;
  } catch (error) {
    logger.error("Error creating task from template:", error);
    return null;
  }
};
