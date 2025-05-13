-- Permite a los usuarios ver las tareas que tienen asignadas
CREATE POLICY "Allow users to see their assigned tasks"
ON public.tasks 
FOR SELECT
USING (
    (
        auth.uid() = assigned_to
    )
    OR (
        is_global_admin(auth.uid())
    )
);

-- 