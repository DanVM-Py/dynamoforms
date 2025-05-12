CREATE TRIGGER dev_insert_user_roles_for_proyect_admin 
AFTER INSERT 
  ON public.dev_roles
  FOR EACH ROW
EXECUTE FUNCTION 
  public.insert_user_roles_for_proyect_admin('false');