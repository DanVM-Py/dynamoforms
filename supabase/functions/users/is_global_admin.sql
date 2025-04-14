CREATE OR REPLACE FUNCTION public.is_global_admin(
  user_uuid uuid,
  is_production boolean
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  tbl_name text;
  query_text text;
  user_role text;
BEGIN
  -- Parametrizamos el nombre de la tabla según is_production
  IF is_production THEN
    tbl_name := 'profiles';
  ELSE
    tbl_name := 'dev_profiles';
  END IF;

  -- Construimos la consulta dinámica usando el nombre de tabla definido
  query_text := 'SELECT role FROM ' || tbl_name || ' WHERE id = $1';

  EXECUTE query_text INTO user_role USING user_uuid;
  
  RETURN user_role = 'global_admin';
END;
$$;