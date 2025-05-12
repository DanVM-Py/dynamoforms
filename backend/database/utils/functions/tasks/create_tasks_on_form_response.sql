CREATE OR REPLACE FUNCTION public.create_tasks_on_form_response()
RETURNS trigger
SET search_path TO public
LANGUAGE plpgsql
AS $$
DECLARE
  tpl_tbl text;
  task_tbl text;
  tpl RECORD;
  assignee uuid;
  days_offset integer;
  due_interval interval;
  query_text text;
BEGIN
  -- Definimos el prefijo según el parámetro pasado al trigger
  IF TG_ARGV[0]::boolean THEN
    tpl_tbl  := 'task_templates';
    task_tbl := 'tasks';
  ELSE
    tpl_tbl  := 'dev_task_templates';
    task_tbl := 'dev_tasks';
  END IF;

  -- Recorremos las plantillas activas para este formulario
  FOR tpl IN EXECUTE format(
      'SELECT * FROM %I WHERE source_form_id = $1 AND is_active', tpl_tbl
    ) USING NEW.form_id
  LOOP
    -- Determinar usuario asignado
    IF tpl.assignment_type = 'static' THEN
      assignee := tpl.assignee_static;
    ELSE
      assignee := (NEW.response_data ->> tpl.assignee_dynamic)::uuid;
    END IF;

    -- Calcular days_offset respetando due_days y min_days
    days_offset := GREATEST(
      COALESCE(tpl.due_days, tpl.min_days),
      tpl.min_days
    );
    due_interval := (days_offset || ' days')::interval;

    -- Construir e insertar la tarea dinámica
    query_text := format(
      'INSERT INTO %I (
         title,
         description,
         form_id,
         form_response_id,
         assigned_to,
         template_id,
         status,
         created_at,
         updated_at,
         due_date,
         project_id,
         source_form_id,
         priority
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         now(), now(), $8,
         $9, $3, $10
       )',
      task_tbl
    );

    EXECUTE query_text
    USING
      tpl.title,
      tpl.description,
      NEW.form_id,
      NEW.id,
      assignee,
      tpl.id,
      'pending'::public.task_status,
      NEW.submitted_at + due_interval,
      tpl.project_id,
      'medium';
  END LOOP;

  RETURN NEW;
END;
$$;