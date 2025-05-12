CREATE POLICY "DEV Project & Global admins can manage form_roles"
  ON public.dev_form_roles
  FOR ALL
  USING (
    (
      public.is_global_admin(auth.uid(), 'false')
    )
    OR
    (
      public.is_project_admin(
        auth.uid(),
        (
          SELECT f.project_id
          FROM public.dev_forms AS f
          WHERE f.id = form_id
        ),
        'false'
      )
    )
  );