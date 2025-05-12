CREATE TRIGGER trigger_project_users_for_global_admin 
AFTER INSERT
  ON public.projects
  FOR EACH ROW
EXECUTE FUNCTION
  public.insert_project_user_for_global_admin('true');