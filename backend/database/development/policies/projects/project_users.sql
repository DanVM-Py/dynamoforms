CREATE POLICY "DEV Global admins can manage project users" 
  ON public.dev_project_users
  FOR ALL
  USING (
    public.is_global_admin(
      auth.uid(), 'false'
    )
  );
  
CREATE POLICY "DEV Project admins can manage project users" 
  ON public.dev_project_users 
  FOR ALL
  USING (
    public.is_project_admin(
      auth.uid(), project_id, 'false'
    )
  );
   
CREATE POLICY "DEV Project users can view their projects" 
  ON public.dev_project_users 
  FOR SELECT 
  USING (
    user_id = auth.uid()
  )
;