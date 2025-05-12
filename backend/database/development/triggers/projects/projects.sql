CREATE TRIGGER dev_trigger_project_users_for_global_admin 
AFTER INSERT
  ON public.dev_projects
  FOR EACH ROW
EXECUTE FUNCTION
  public.insert_project_user_for_global_admin('false');