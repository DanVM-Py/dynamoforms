
-- This migration modifies the form_responses table to accept anonymous submissions
-- by changing the user_id to accept any UUID, not just authenticated users

-- First, we need to modify the RLS policies

-- Enable row level security
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert form responses (for public forms)
CREATE POLICY "Allow public form submissions" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms 
    WHERE id = form_responses.form_id 
    AND status = 'active'
  )
);

-- Create policy to let admins view all form responses
CREATE POLICY "Admins can view all form responses" 
ON public.form_responses 
FOR SELECT 
USING (
  (
    SELECT is_global_admin(auth.uid()) 
  ) 
  OR 
  (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_responses.form_id
      AND (
        forms.created_by = auth.uid()
        OR 
        EXISTS (
          SELECT 1 FROM public.project_admins
          WHERE project_admins.project_id = forms.project_id
          AND project_admins.user_id = auth.uid()
        )
      )
    )
  )
);

-- Create index on form_id for faster querying
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON public.form_responses(form_id);
