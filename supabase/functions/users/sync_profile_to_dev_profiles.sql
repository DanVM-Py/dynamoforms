CREATE OR REPLACE FUNCTION public.sync_profile_to_dev_profiles()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.dev_profiles (
    id, email, name, role, created_at
  )
  VALUES (
    NEW.id, NEW.email, NEW.name, NEW.role, NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;