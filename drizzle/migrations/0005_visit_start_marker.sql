ALTER TABLE public.visits ADD COLUMN started_at timestamptz;
COMMENT ON COLUMN public.visits.started_at IS 'Momento en que el cuidador registró la primera tarea como realizada; base del margen de retraso de 90 minutos.';

CREATE OR REPLACE FUNCTION public.mark_visit_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if NEW.status = 'realizada' and OLD.status is distinct from 'realizada' then
    update public.visits
    set started_at = coalesce(started_at, now()),
        status = case when status = 'pendiente' then 'en_curso' else status end
    where id = NEW.visit_id;
  end if;
  return NEW;
end;
$$;

CREATE TRIGGER tasks_mark_visit_started
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.mark_visit_started();