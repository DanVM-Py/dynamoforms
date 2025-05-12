CREATE TRIGGER dev_create_tasks
AFTER INSERT ON public.dev_form_responses
FOR EACH ROW
EXECUTE FUNCTION public.create_tasks_on_form_response('false');
