CREATE TRIGGER profiles_sync
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_dev_profiles();