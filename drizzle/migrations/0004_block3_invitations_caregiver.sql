-- 1. Nuevos tipos de aviso: invitación aceptada e incidencias
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'visita_completada'::text,
    'visita_con_omisiones'::text,
    'visita_retrasada'::text,
    'invitacion_aceptada'::text,
    'incidencia_abierta'::text,
    'incidencia_resuelta'::text
  ]));

-- 2. Aceptar invitación: activa el plan y avisa al propietario
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  inv invitations%rowtype;
  uid uuid := auth.uid();
  owner uuid;
  plan_title text;
  caregiver_name text;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  select * into inv from invitations where token = _token for update;
  if not found then raise exception 'Invitación no válida'; end if;
  if inv.status <> 'pendiente' then raise exception 'La invitación ya se ha utilizado o está revocada'; end if;
  if inv.expires_at < now() then
    update invitations set status = 'caducada' where id = inv.id;
    raise exception 'La invitación ha caducado';
  end if;
  update invitations set status = 'aceptada', accepted_by = uid where id = inv.id;
  update plans set caregiver_id = uid where id = inv.plan_id;
  update plans set status = 'activo' where id = inv.plan_id and status = 'abierto';
  update visits set caregiver_id = uid where plan_id = inv.plan_id and caregiver_id is null;

  select h.owner_id, p.title into owner, plan_title
  from plans p join houses h on h.id = p.house_id where p.id = inv.plan_id;
  select display_name into caregiver_name from profiles where id = uid;

  insert into notifications (user_id, plan_id, type, message)
  values (owner, inv.plan_id, 'invitacion_aceptada',
    coalesce(caregiver_name, 'Tu cuidador') || ' ha aceptado tu invitación al plan «' || plan_title || '».');
  insert into activity_events (plan_id, actor_id, type, message)
  values (inv.plan_id, uid, 'invitacion_aceptada',
    coalesce(caregiver_name, 'El cuidador') || ' se ha unido al plan.');

  return inv.plan_id;
end;
$function$;

-- 3. Cierre de visita con aviso al propietario (anti-duplicados)
CREATE OR REPLACE FUNCTION public.close_visit(_visit_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v visits%rowtype;
  uid uuid := auth.uid();
  pending int;
  omitted int;
  new_status text;
  owner uuid;
  plan_title text;
  tz text;
  when_text text;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  select * into v from visits where id = _visit_id for update;
  if not found then raise exception 'Visita no encontrada'; end if;
  if not public.is_visit_participant(_visit_id) then raise exception 'Sin acceso a esta visita'; end if;
  if v.status in ('completada', 'completada_con_omisiones') then
    return v.status; -- ya cerrada: no duplicar avisos
  end if;

  select
    count(*) filter (where status = 'pendiente'),
    count(*) filter (where status = 'omitida')
  into pending, omitted
  from tasks where visit_id = _visit_id;

  if pending > 0 then raise exception 'Aún quedan tareas pendientes'; end if;

  new_status := case when omitted > 0 then 'completada_con_omisiones' else 'completada' end;
  update visits set status = new_status, closed_at = now(), closed_by = uid where id = _visit_id;

  select h.owner_id, p.title, p.timezone into owner, plan_title, tz
  from plans p join houses h on h.id = p.house_id where p.id = v.plan_id;
  when_text := to_char(v.scheduled_at at time zone coalesce(tz, 'Europe/Madrid'), 'DD/MM "a las" HH24:MI');

  insert into notifications (user_id, plan_id, visit_id, type, message)
  values (
    owner, v.plan_id, v.id,
    case when omitted > 0 then 'visita_con_omisiones' else 'visita_completada' end,
    'Visita del ' || when_text || ' completada' ||
      case when omitted > 0 then ' con ' || omitted || ' omisión(es)' else '' end ||
      ' (' || plan_title || ').'
  );
  insert into activity_events (plan_id, actor_id, type, message)
  values (v.plan_id, uid, 'visita_cerrada',
    'Visita del ' || when_text || ' cerrada como ' ||
      case when omitted > 0 then 'completada con omisiones' else 'completada' end || '.');

  return new_status;
end;
$function$;

-- 4. Avisos automáticos de incidencias (apertura y resolución)
CREATE OR REPLACE FUNCTION public.notify_incident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  owner uuid;
  caregiver uuid;
  plan_title text;
  other uuid;
  author_name text;
begin
  select h.owner_id, p.caregiver_id, p.title into owner, caregiver, plan_title
  from plans p join houses h on h.id = p.house_id
  where p.id = coalesce(NEW.plan_id, OLD.plan_id);

  if TG_OP = 'INSERT' then
    other := case when NEW.author_id = owner then caregiver else owner end;
    if other is not null then
      select display_name into author_name from profiles where id = NEW.author_id;
      insert into notifications (user_id, plan_id, visit_id, type, message)
      values (other, NEW.plan_id, NEW.visit_id, 'incidencia_abierta',
        coalesce(author_name, 'Alguien') || ' ha abierto una incidencia: «' || NEW.title || '» (' || plan_title || ').');
    end if;
  elsif TG_OP = 'UPDATE' and OLD.status <> 'resuelta' and NEW.status = 'resuelta' then
    other := case when coalesce(NEW.resolved_by, owner) = owner then caregiver else owner end;
    if other is not null then
      insert into notifications (user_id, plan_id, visit_id, type, message)
      values (other, NEW.plan_id, NEW.visit_id, 'incidencia_resuelta',
        'Incidencia resuelta: «' || NEW.title || '» (' || plan_title || ').');
    end if;
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS incidents_notify ON public.incidents;
CREATE TRIGGER incidents_notify
AFTER INSERT OR UPDATE OF status ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.notify_incident();

-- 5. Solo el propietario puede marcar una incidencia como resuelta
DROP POLICY IF EXISTS incidents_update ON public.incidents;
CREATE POLICY incidents_update ON public.incidents FOR UPDATE TO authenticated
  USING (is_plan_participant(plan_id))
  WITH CHECK (is_plan_participant(plan_id) AND (status <> 'resuelta' OR is_plan_owner(plan_id)));

-- 6. Los cuidadores también pueden subir fotos (notas de tarea e incidencias)
CREATE POLICY care_photos_insert_participants ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'care-photos'
    AND (
      is_house_owner(((storage.foldername(name))[1])::uuid)
      OR is_house_caregiver(((storage.foldername(name))[1])::uuid)
    )
  );