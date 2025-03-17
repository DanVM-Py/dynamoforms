
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function handleCreateChainedTask(
  formResponseId: string,
  sourceFormId: string,
  isAnonymous: boolean,
  supabase: SupabaseClient
) {
  console.log(`Creating chained task for form response: ${formResponseId}, from form: ${sourceFormId}, isAnonymous: ${isAnonymous}`);

  try {
    // Fetch the form response data
    const { data: formResponse, error: responseError } = await supabase
      .from("form_responses")
      .select("*")
      .eq("id", formResponseId)
      .single();

    if (responseError) {
      throw new Error(`Error fetching form response: ${responseError.message}`);
    }

    if (!formResponse) {
      throw new Error(`Form response with ID ${formResponseId} not found`);
    }
    
    // Get the active task templates for this source form
    const { data: taskTemplates, error: templatesError } = await supabase
      .from("task_templates")
      .select(`
        id, 
        title, 
        description, 
        source_form_id, 
        target_form_id, 
        assignment_type,
        default_assignee,
        assignee_form_field,
        due_days,
        inheritance_mapping,
        project_id
      `)
      .eq("source_form_id", sourceFormId)
      .eq("is_active", true);

    if (templatesError) {
      throw new Error(`Error fetching task templates: ${templatesError.message}`);
    }

    if (!taskTemplates || taskTemplates.length === 0) {
      console.log(`No active task templates found for form ${sourceFormId}`);
      return { message: "No task templates to process" };
    }

    // For each template, create a task
    const createdTasks = [];
    for (const template of taskTemplates) {
      let assignedUserId = template.default_assignee;

      // Skip task creation if this is an anonymous submission and we need specific assignee data
      if (isAnonymous && template.assignment_type === "dynamic" && !assignedUserId) {
        console.log(`Skipping task creation for anonymous submission because dynamic assignment is required`);
        continue;
      }
      
      // For dynamic assignment, extract assignee from form response data if possible
      if (template.assignment_type === "dynamic" && template.assignee_form_field && !isAnonymous) {
        const responseData = formResponse.response_data;
        const fieldValue = responseData[template.assignee_form_field];
        
        if (fieldValue) {
          // If field contains a user ID
          assignedUserId = fieldValue;
        }
      }
      
      // If we don't have an assignee at this point, use default
      if (!assignedUserId) {
        // For anonymous submissions, we'll need a fallback assignee
        // This could be a system admin or project owner
        console.log(`No assignee determined, using default or skipping`);
        if (!template.default_assignee) {
          console.log(`No default assignee for template ${template.id}, skipping task creation`);
          continue;
        }
        assignedUserId = template.default_assignee;
      }

      // Calculate due date if applicable
      let dueDate = null;
      if (template.due_days) {
        const date = new Date();
        date.setDate(date.getDate() + template.due_days);
        dueDate = date.toISOString();
      }

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: template.title,
          description: template.description,
          status: "pending",
          assigned_to: assignedUserId,
          form_id: template.target_form_id,
          form_response_id: formResponseId,
          project_id: template.project_id,
          source_form_id: sourceFormId,
          due_date: dueDate,
        })
        .select()
        .single();

      if (taskError) {
        console.error(`Error creating task: ${taskError.message}`);
        continue;
      }

      console.log(`Created task: ${task.id}`);
      createdTasks.push(task);
    }

    return { message: `Created ${createdTasks.length} tasks`, tasks: createdTasks };
  } catch (err) {
    console.error("Error in handleCreateChainedTask:", err);
    throw err;
  }
}

serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData = await req.json();
    const { formResponseId, sourceFormId, isAnonymous = false } = requestData;
    
    if (!formResponseId || !sourceFormId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: formResponseId, sourceFormId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await handleCreateChainedTask(
      formResponseId,
      sourceFormId,
      isAnonymous,
      supabaseClient
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
