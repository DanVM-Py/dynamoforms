CREATE POLICY "DEV Global and project admins can manage forms"
  ON public.dev_forms
  FOR ALL
  USING (
    (
      public.is_project_admin(
        auth.uid(), project_id, 'false'
      )
    )
    OR 
      public.is_global_admin(
        auth.uid(), 'false'
      )
  );

CREATE POLICY "DEV Users can see forms from their projects" 
  ON public.dev_forms 
  FOR SELECT
  USING (
    true
  );
