CREATE POLICY "Global and project admins can manage forms"
  ON public.forms
  FOR ALL
  USING (
    (
      public.is_project_admin(
        auth.uid(), project_id, 'true'
      )
    )
    OR 
      public.is_global_admin(
        auth.uid(), 'true'
      )
  );

CREATE POLICY "Users can see forms from their projects" 
  ON public.forms 
  FOR SELECT
  USING (
    true
  );
