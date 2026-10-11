ALTER TABLE public.guide_states DROP CONSTRAINT guide_states_status_check;
ALTER TABLE public.guide_states ADD CONSTRAINT guide_states_status_check
CHECK (status = ANY (ARRAY['no_iniciada'::text, 'pospuesta'::text, 'omitida'::text, 'completada'::text]));