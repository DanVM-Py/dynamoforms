CREATE POLICY "Global admins can view all projects" 
  ON public.projects
  FOR ALL
  USING (
    public.is_global_admin(
      auth.uid(), 'true'
    )
);