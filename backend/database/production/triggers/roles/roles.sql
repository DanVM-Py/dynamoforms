CREATE TRIGGER insert_user_roles_for_proyect_admin 
AFTER INSERT 
  ON public.roles
  FOR EACH ROW
EXECUTE FUNCTION 
  public.insert_user_roles_for_proyect_admin('true');