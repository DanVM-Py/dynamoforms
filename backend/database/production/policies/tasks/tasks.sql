CREATE POLICY "Allow users to see their assigned tasks"
ON public.tasks 
FOR SELECT
USING (
    auth.uid() = assigned_to
);

CREATE POLICY "Allow users to update their assigned tasks"
ON public.tasks 
FOR UPDATE
USING (
    auth.uid() = assigned_to
);

CREATE POLICY "Allow to all for project admins"
ON public.tasks 
FOR ALL
USING (
  public.is_project_admin(auth.uid(), project_id, 'true')
);