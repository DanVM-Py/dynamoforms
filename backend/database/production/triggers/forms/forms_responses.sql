CREATE TRIGGER create_tasks
AFTER INSERT ON public.form_responses
FOR EACH ROW
EXECUTE FUNCTION public.create_tasks_on_form_response('true');
