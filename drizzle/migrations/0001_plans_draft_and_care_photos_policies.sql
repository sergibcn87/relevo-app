-- Borrador persistente del asistente de planes (estado del wizard en JSON)
ALTER TABLE public.plans ADD COLUMN draft jsonb;
COMMENT ON COLUMN public.plans.draft IS 'Estado del asistente (paso, fichas, definiciones de visita) mientras el plan está en borrador';

-- Fotos privadas de fichas de cuidado: bucket care-photos, ruta {house_id}/{archivo}
CREATE POLICY "care_photos_select_participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'care-photos'
  AND (
    public.is_house_owner(((storage.foldername(name))[1])::uuid)
    OR public.is_house_caregiver(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "care_photos_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'care-photos'
  AND public.is_house_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "care_photos_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'care-photos'
  AND public.is_house_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "care_photos_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'care-photos'
  AND public.is_house_owner(((storage.foldername(name))[1])::uuid)
);