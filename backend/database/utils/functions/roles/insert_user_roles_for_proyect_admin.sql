CREATE OR REPLACE FUNCTION public.insert_user_roles_for_proyect_admin()
RETURNS TRIGGER 
SET search_path TO 'public'
AS $$
DECLARE 
  target_table text;
  source_table text;
  query text;
BEGIN
  -- Según el parámetro del trigger, seleccionamos las tablas correspondientes:
  IF TG_ARGV[0]::boolean THEN
    target_table := 'user_roles';
    source_table := 'project_users';
  ELSE
    target_table := 'dev_user_roles';
    source_table := 'dev_project_users';
  END IF;

  -- Armamos la consulta dinámica, calificando el esquema para evitar ambigüedades
  query := format(
    'INSERT INTO public.%I (user_id, role_id, project_id)
     SELECT P.user_id, $1, $2
     FROM public.%I AS P
     WHERE P.project_id = $2
       AND P.is_admin = true',
    target_table,
    source_table
  );

  -- NEW.id es el id del nuevo rol insertado y NEW.project_id es el proyecto del rol
  EXECUTE query USING NEW.id, NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
