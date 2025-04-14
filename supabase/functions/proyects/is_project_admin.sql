CREATE OR REPLACE FUNCTION public.is_project_admin(
  user_uuid UUID, project_uuid UUID, is_production boolean
)
RETURNS BOOLEAN 
LANGUAGE PLPGSQL 
SET search_path TO 'public'
SECURITY DEFINER
AS $$
DECLARE 
  target_table text;
  query text;
  result boolean;
BEGIN
  IF is_production THEN
    target_table := 'project_users';
  ELSE
    target_table := 'dev_project_users';
  END IF;

  query := format(
    'SELECT EXISTS(
       SELECT 1
       FROM %I
       WHERE user_id = $1
         AND project_id = $2
         AND is_admin = true
     )'
     , target_table
  );
  EXECUTE query INTO result USING user_uuid, project_uuid;
  RETURN result;
END;
$$;