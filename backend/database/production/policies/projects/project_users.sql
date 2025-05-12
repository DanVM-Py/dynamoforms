CREATE POLICY "Global admins can manage project users" 
  ON public.project_users
  FOR ALL
  USING (
    public.is_global_admin(
      auth.uid(), 'true'
    )
  );
  
CREATE POLICY "Project admins can manage project users" 
  ON public.project_users 
  FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'true'
    )
  );
   
CREATE POLICY "Project users can view their projects" 
  ON public.project_users 
  FOR SELECT 
  USING (
    user_id = auth.uid()
  )
;