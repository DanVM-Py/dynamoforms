CREATE POLICY "Project admins can manage task templates"
  ON public.task_templates
  FOR ALL
  USING (
    (
      public.is_project_admin(auth.uid(), project_id, 'true')
    )
  );
  
CREATE POLICY "Project admins can manage task templates"
  ON public.task_templates
  FOR ALL
  USING (
    (
      public.is_project_admin(auth.uid(), project_id, 'true')
    )
  );