CREATE POLICY "Project & Global admins can manage form_roles"
  ON public.form_roles
  FOR ALL
  USING (
    (
      public.is_global_admin(auth.uid(), 'true')
    )
    OR
    (
      public.is_project_admin(
        auth.uid(),
        (
          SELECT f.project_id
          FROM public.forms AS f
          WHERE f.id = form_id
        ),
        'true'
      )
    )
  );