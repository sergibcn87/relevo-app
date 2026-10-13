-- Bloque 6 (meteorología): caché de previsión por casa, dedupe de sugerencias
-- y aceptación atómica como tarea adicional (PRD §11).

-- Caché de previsión Open-Meteo por casa (solo servidor; sin políticas = bloqueada para usuarios)
CREATE TABLE public.weather_cache (
  house_id uuid PRIMARY KEY REFERENCES public.houses(id) ON DELETE CASCADE,
  fetched_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
GRANT ALL ON public.weather_cache TO service_role;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Una sugerencia como máximo por regla y visita (no duplicar al actualizar)
CREATE UNIQUE INDEX weather_suggestions_rule_visit_key
  ON public.weather_suggestions (weather_rule_id, visit_id);

-- Tarea creada al aceptar (trazabilidad y anti-duplicados)
ALTER TABLE public.weather_suggestions
  ADD COLUMN accepted_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Aceptar una sugerencia: crea la tarea una sola vez y marca la sugerencia.
-- Reclama la sugerencia antes de insertar para que dos aceptaciones
-- simultáneas no dupliquen la tarea.
CREATE OR REPLACE FUNCTION public.accept_weather_suggestion(_suggestion_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sugg public.weather_suggestions%ROWTYPE;
  _rule public.weather_rules%ROWTYPE;
  _visit public.visits%ROWTYPE;
  _task_id uuid;
BEGIN
  SELECT * INTO _sugg FROM public.weather_suggestions WHERE id = _suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sugerencia no encontrada';
  END IF;

  SELECT * INTO _visit FROM public.visits WHERE id = _sugg.visit_id;
  IF NOT FOUND OR NOT public.is_plan_owner(_visit.plan_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Idempotente: si ya no está pendiente, devuelve la tarea existente
  IF _sugg.status <> 'pendiente' THEN
    RETURN _sugg.accepted_task_id;
  END IF;

  -- No se modifican visitas cerradas
  IF _visit.status NOT IN ('pendiente', 'en_curso') THEN
    RAISE EXCEPTION 'La visita ya está cerrada';
  END IF;

  UPDATE public.weather_suggestions
    SET status = 'aceptada'
    WHERE id = _suggestion_id AND status = 'pendiente'
    RETURNING * INTO _sugg;
  IF NOT FOUND THEN
    SELECT * INTO _sugg FROM public.weather_suggestions WHERE id = _suggestion_id;
    RETURN _sugg.accepted_task_id;
  END IF;

  SELECT * INTO _rule FROM public.weather_rules WHERE id = _sugg.weather_rule_id;

  INSERT INTO public.tasks (visit_id, care_card_id, title, instructions, source, sort_order)
  VALUES (
    _sugg.visit_id,
    _rule.care_card_id,
    left(_rule.instruction, 120),
    left('Sugerencia meteorológica (' || _sugg.condition_text || '). ' || _rule.instruction, 1000),
    'meteo',
    COALESCE((SELECT max(sort_order) + 1 FROM public.tasks WHERE visit_id = _sugg.visit_id), 0)
  )
  RETURNING id INTO _task_id;

  UPDATE public.weather_suggestions SET accepted_task_id = _task_id WHERE id = _suggestion_id;
  RETURN _task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_weather_suggestion(uuid) TO authenticated;