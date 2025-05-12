CREATE POLICY "Users can view their own form responses"
  ON public.form_responses
  FOR SELECT
  USING (
    (
      user_id = auth.uid()
    )
    OR (
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
  
CREATE POLICY "Allow authenticated users to insert responses for active forms"
ON public.form_responses
FOR INSERT
WITH CHECK (
  (
    auth.role() = 'authenticated'
  )
  AND (
    user_id = auth.uid()
  )
  AND (
    is_anonymous = false
  )
  AND (
    EXISTS (
      SELECT 1
      FROM public.forms f
      WHERE f.id = form_id 
        AND f.status = 'active'
        AND NOT f.is_public
    )
  )
);

CREATE POLICY "Allow anonymous users to insert responses ONLY for active PUBLIC forms"
ON public.form_responses
FOR INSERT
WITH CHECK (
  (
    auth.role() = 'anon'
  )
  AND (
    user_id IS NULL
  )
  AND (
    is_anonymous = true
  )
  AND ( 
    EXISTS (
      SELECT 1
      FROM public.forms f
      WHERE f.id = form_id 
        AND f.status = 'active' 
        AND f.is_public
    )
  )
);