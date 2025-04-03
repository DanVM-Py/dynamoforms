import { Tables } from '@/config/environment' 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { sourceFormId, targetProjectId, newTitle, newDescription, cloneRoles } = await req.json();
    
    // Validate required parameters
    if (!sourceFormId || !targetProjectId || !newTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Check if user is a global admin
    const { data: profileData, error: profileError } = await supabase
      .from(Tables.profiles)
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profileData || profileData.role !== 'global_admin') {
      return new Response(
        JSON.stringify({ error: "Only global administrators can clone forms" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }
    
    // Get source form
    const { data: sourceForm, error: sourceFormError } = await supabase
      .from(Tables.forms)
      .select('*')
      .eq('id', sourceFormId)
      .single();
      
    if (sourceFormError || !sourceForm) {
      return new Response(
        JSON.stringify({ error: "Source form not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Check if target project exists
    const { data: targetProject, error: targetProjectError } = await supabase
      .from(Tables.projects)
      .select('id')
      .eq('id', targetProjectId)
      .single();
      
    if (targetProjectError || !targetProject) {
      return new Response(
        JSON.stringify({ error: "Target project not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Create cloned form
    const { data: newForm, error: newFormError } = await supabase
      .from(Tables.forms)
      .insert({
        title: newTitle,
        description: newDescription || sourceForm.description,
        schema: sourceForm.schema,
        status: 'draft', // Always start as draft
        created_by: user.id,
        project_id: targetProjectId,
        is_public: sourceForm.is_public
      })
      .select()
      .single();
      
    if (newFormError || !newForm) {
      return new Response(
        JSON.stringify({ error: "Failed to create cloned form", details: newFormError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Clone form roles if requested
    if (cloneRoles) {
      const { data: sourceRoles, error: rolesError } = await supabase
        .from(Tables.form_roles)
        .select('role_id')
        .eq('form_id', sourceFormId);
        
      if (!rolesError && sourceRoles && sourceRoles.length > 0) {
        // For each role in the source form
        const roleInserts = sourceRoles.map(role => ({
          form_id: newForm.id,
          role_id: role.role_id,
          created_by: user.id
        }));
        
        const { error: insertRolesError } = await supabase
          .from(Tables.form_roles)
          .insert(roleInserts);
          
        if (insertRolesError) {
          console.error("Error copying form roles:", insertRolesError);
          // We continue even if role cloning fails
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Form cloned successfully", 
        data: { newFormId: newForm.id } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("Error in clone-form function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
