CREATE POLICY "DEV Allow users to see their assigned tasks"
ON public.dev_tasks 
FOR SELECT
USING (
    auth.uid() = assigned_to
);

CREATE POLICY "DEV Allow users to update their assigned tasks"
ON public.dev_tasks 
FOR UPDATE
USING (
    auth.uid() = assigned_to
);

CREATE POLICY "DEV Allow to all for project admins"
ON public.dev_tasks 
FOR ALL
USING (
  public.is_project_admin(auth.uid(), project_id, 'false')
);