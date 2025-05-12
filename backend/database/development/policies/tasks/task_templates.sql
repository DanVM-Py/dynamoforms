CREATE POLICY "DEV Project admins can manage task templates"
  ON public.dev_task_templates
  FOR ALL
  USING (
    (
      public.is_project_admin(auth.uid(), project_id, 'false')
    )
  );
  
CREATE POLICY "DEV Project admins can manage task templates"
  ON public.dev_task_templates
  FOR ALL
  USING (
    (
      public.is_project_admin(auth.uid(), project_id, 'false')
    )
  );