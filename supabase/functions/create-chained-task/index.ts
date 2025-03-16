
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTaskRequest {
  formResponseId: string;
  sourceFormId: string;
  taskTemplateId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Initialize Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { formResponseId, sourceFormId, taskTemplateId } = await req.json() as CreateTaskRequest;
    
    console.log("Creating chained task for form response:", formResponseId, "from form:", sourceFormId);
    
    if (!formResponseId || !sourceFormId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the form response data
    const { data: formResponse, error: formResponseError } = await supabase
      .from('form_responses')
      .select('*, forms:form_id(*)')
      .eq('id', formResponseId)
      .single();
      
    if (formResponseError || !formResponse) {
      console.error("Error fetching form response:", formResponseError);
      return new Response(
        JSON.stringify({ error: "Form response not found", details: formResponseError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If taskTemplateId is provided, use that to create the task
    if (taskTemplateId) {
      const { data: taskTemplate, error: templateError } = await supabase
        .from('task_templates')
        .select('*, target_form:target_form_id(id, title)')
        .eq('id', taskTemplateId)
        .single();
        
      if (templateError || !taskTemplate) {
        console.error("Error fetching task template:", templateError);
        return new Response(
          JSON.stringify({ error: "Task template not found", details: templateError }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Determine assignee from template settings
      let assignedTo = taskTemplate.default_assignee;
      
      // If template uses dynamic assignment, extract email from form response
      if (taskTemplate.assignment_type === 'dynamic' && taskTemplate.assignee_form_field) {
        const responseData = formResponse.response_data as Record<string, any>;
        const assigneeEmail = responseData[taskTemplate.assignee_form_field];
        
        if (assigneeEmail) {
          // Look up the user id by email
          const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', assigneeEmail)
            .single();
            
          if (!userError && user) {
            assignedTo = user.id;
          } else {
            console.warn("Could not find user with email:", assigneeEmail);
          }
        }
      }
      
      if (!assignedTo) {
        return new Response(
          JSON.stringify({ error: "Could not determine task assignee" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: taskTemplate.title || `Complete form: ${taskTemplate.target_form?.title || "Untitled Form"}`,
          description: taskTemplate.description,
          form_id: taskTemplate.target_form_id,
          form_response_id: formResponseId,
          source_form_id: sourceFormId,
          project_id: formResponse.forms?.project_id,
          assigned_to: assignedTo,
          status: 'pending',
          due_date: taskTemplate.due_days 
            ? new Date(Date.now() + taskTemplate.due_days * 24 * 60 * 60 * 1000).toISOString() 
            : null,
          metadata: {
            source_template_id: taskTemplate.id,
            inheritance_mapping: taskTemplate.inheritance_mapping,
            source_response_data: formResponse.response_data
          }
        })
        .select()
        .single();
        
      if (taskError) {
        console.error("Error creating task:", taskError);
        return new Response(
          JSON.stringify({ error: "Failed to create task", details: taskError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Task created successfully", 
          task 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Auto-discover and create all linked tasks based on form triggers
      const { data: taskTemplates, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('source_form_id', sourceFormId)
        .eq('is_active', true);
        
      if (templatesError) {
        console.error("Error fetching task templates:", templatesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch task templates", details: templatesError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!taskTemplates || taskTemplates.length === 0) {
        console.log("No task templates found for form:", sourceFormId);
        return new Response(
          JSON.stringify({ success: true, message: "No task templates configured for this form" }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const results = [];
      
      // Create tasks for each template
      for (const template of taskTemplates) {
        // Make an internal call to create tasks for each template
        const internalRequest = new Request(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({
            formResponseId,
            sourceFormId,
            taskTemplateId: template.id
          })
        });
        
        const response = await fetch(internalRequest);
        const result = await response.json();
        results.push(result);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Created ${results.length} tasks`, 
          results 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Unexpected error in create-chained-task:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
