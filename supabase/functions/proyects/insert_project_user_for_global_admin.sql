CREATE OR REPLACE FUNCTION public.insert_project_user_for_global_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_table text;
  source_table text;
  query text;
BEGIN
  -- Lee el primer argumento del trigger y lo convierte a booleano
  IF TG_ARGV[0]::boolean THEN
    target_table := 'project_users';
    source_table := 'profiles';
  ELSE
    target_table := 'dev_project_users';
    source_table := 'dev_profiles';
  END IF;

  -- Construye la consulta dinámicamente, parametrizando el FROM (la tabla de perfiles)
  query := format(
    'INSERT INTO %I (
      project_id, user_id, created_at, is_admin
    )
    SELECT 
      $1
      , P.id
      , NOW()
      , TRUE 
    FROM %I AS P WHERE role = ''global_admin'''
    , target_table
    , source_table
  );
  EXECUTE query USING NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
