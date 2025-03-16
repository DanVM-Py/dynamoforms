
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { formId, formResponseId, responseData, projectId, submitterId } = await req.json()

    if (!formId || !formResponseId || !responseData) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Procesando herencia de formulario para: ${formId}, respuesta: ${formResponseId}`)

    // Find templates where this form is the source
    let query = supabaseClient
      .from('task_templates')
      .select('*')
      .eq('source_form_id', formId)
      .eq('is_active', true)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error("Error al buscar plantillas de tareas:", error)
      throw error
    }

    if (!templates || templates.length === 0) {
      console.log("No se encontraron plantillas de tareas aplicables.")
      return new Response(
        JSON.stringify({ success: true, message: 'No se encontraron plantillas aplicables', tasksCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Se encontraron ${templates.length} plantillas de tareas aplicables.`)

    const createdTasks = []

    // Process each template
    for (const template of templates) {
      try {
        // Determine the assignee
        let assigneeId = template.default_assignee

        if (template.assignment_type === 'dynamic' && template.assignee_form_field) {
          const emailField = template.assignee_form_field
          const userEmail = responseData[emailField]

          if (userEmail) {
            // Look up user by email
            const { data: userProfile } = await supabaseClient
              .from('profiles')
              .select('id')
              .eq('email', userEmail)
              .single()

            if (userProfile) {
              assigneeId = userProfile.id
            }
          }
        }

        // If no assignee could be determined, use the submitter as fallback
        if (!assigneeId && submitterId) {
          assigneeId = submitterId
        }

        // If still no assignee, log an error and skip this template
        if (!assigneeId) {
          console.error("No se pudo determinar el asignado para la tarea. La tarea no será creada.")
          continue
        }

        // Calculate due date
        let dueDate = null
        if (template.due_days) {
          const date = new Date()
          date.setDate(date.getDate() + template.due_days)
          dueDate = date.toISOString()
        }

        // Create task
        const { data: task, error: taskError } = await supabaseClient
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
            source_form_id: formId
          })
          .select()
          .single()

        if (taskError) {
          console.error("Error al crear la tarea:", taskError)
          continue
        }

        console.log(`Tarea creada con éxito: ${task.id}`)
        createdTasks.push(task)

        // Create notification for the assignee
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: assigneeId,
            title: 'Nueva tarea asignada',
            message: `Se te ha asignado una nueva tarea: ${template.title}`,
            type: 'task_assigned',
            project_id: projectId || template.project_id,
            metadata: {
              task_id: task.id,
              form_id: template.target_form_id
            }
          })

        // Apply inheritance mapping if available
        if (template.inheritance_mapping && Object.keys(template.inheritance_mapping).length > 0) {
          console.log("Procesando mapeo de campos para prepoblar la tarea")
          // This functionality would be responsible for prepopulating form fields
          // It's handled on the frontend when opening the form
        }
      } catch (templateError) {
        console.error(`Error procesando plantilla ${template.id}:`, templateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se crearon ${createdTasks.length} tareas basadas en plantillas`,
        tasksCreated: createdTasks.length,
        tasks: createdTasks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Error general:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
