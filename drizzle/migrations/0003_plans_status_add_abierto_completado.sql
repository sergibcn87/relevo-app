ALTER TABLE public.plans DROP CONSTRAINT plans_status_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
CHECK (status = ANY (ARRAY['borrador'::text, 'abierto'::text, 'activo'::text, 'completado'::text, 'cancelado'::text, 'archivado'::text]));