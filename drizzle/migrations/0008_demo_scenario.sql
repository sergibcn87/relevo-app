ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.load_demo_scenario()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _d date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  _house uuid := gen_random_uuid();
  _plan uuid := gen_random_uuid();
  _monstera uuid := gen_random_uuid();
  _milo uuid := gen_random_uuid();
  _toldo uuid := gen_random_uuid();
  _paquetes uuid := gen_random_uuid();
  _v_done uuid := gen_random_uuid();
  _v_today uuid := gen_random_uuid();
  _v_future uuid := gen_random_uuid();
  _t_photo uuid := gen_random_uuid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  -- Solo reinicia la demostración propia del usuario
  DELETE FROM public.notifications n USING public.plans p, public.houses h
    WHERE n.plan_id = p.id AND p.house_id = h.id AND h.owner_id = _uid AND h.is_demo;
  DELETE FROM public.houses WHERE owner_id = _uid AND is_demo;

  INSERT INTO public.houses (id, owner_id, name, rooms, city, is_demo)
  VALUES (_house, _uid, 'Casa Olmo', ARRAY['Salón','Cocina','Terraza','Entrada'], 'Madrid', true);

  INSERT INTO public.care_cards (id, house_id, name, category, room, instructions, important_note) VALUES
  (_monstera, _house, 'Monstera', 'planta', 'Salón',
   'Regar con 500 ml cuando los 3 primeros centímetros de tierra estén secos. Nunca dejar agua en el plato.',
   'No moverla de sitio: se quema con el sol directo.'),
  (_milo, _house, 'Milo', 'mascota', 'Cocina',
   'Poner 60 g de pienso por la mañana y 60 g por la tarde. Cambiar el agua cada visita. Limpiar el arenero.',
   'Milo intenta salir a la escalera: cerrar la puerta antes de entrar.'),
  (_toldo, _house, 'Toldo', 'casa', 'Terraza',
   'Recoger el toldo si hay viento fuerte. La manivela está detrás de la puerta de la terraza.', NULL),
  (_paquetes, _house, 'Paquetes', 'casa', 'Entrada',
   'Recoger los paquetes del buzón y dejarlos en el mueble de la entrada.', NULL);

  INSERT INTO public.plans (id, house_id, title, start_date, end_date, caregiver_id, general_note, status)
  VALUES (_plan, _house, 'Escapada a Lisboa', _d - 1, _d + 4, NULL,
   'Datos de demostración. Cuidadora ficticia: Nora. Las llaves están en el buzón.', 'abierto');

  INSERT INTO public.visits (id, plan_id, scheduled_at, status, started_at, closed_at) VALUES
  (_v_done, _plan, ((_d - 1) + time '19:00') AT TIME ZONE 'Europe/Madrid', 'completada_con_omisiones',
     ((_d - 1) + time '19:05') AT TIME ZONE 'Europe/Madrid', ((_d - 1) + time '19:24') AT TIME ZONE 'Europe/Madrid'),
  (_v_today, _plan, (_d + time '19:00') AT TIME ZONE 'Europe/Madrid', 'pendiente', NULL, NULL),
  (_v_future, _plan, ((_d + 3) + time '19:00') AT TIME ZONE 'Europe/Madrid', 'pendiente', NULL, NULL);

  INSERT INTO public.tasks (id, visit_id, care_card_id, title, instructions, status, skip_reason, completed_at, sort_order) VALUES
  (_t_photo, _v_done, _monstera, 'Regar la Monstera', '500 ml si la tierra está seca.', 'realizada', NULL, ((_d - 1) + time '19:10') AT TIME ZONE 'Europe/Madrid', 0),
  (gen_random_uuid(), _v_done, _milo, 'Dar de comer a Milo', '60 g de pienso y agua limpia.', 'realizada', NULL, ((_d - 1) + time '19:15') AT TIME ZONE 'Europe/Madrid', 1),
  (gen_random_uuid(), _v_done, _paquetes, 'Recoger paquetes', 'Dejarlos en la entrada.', 'omitida', 'El buzón estaba vacío.', ((_d - 1) + time '19:20') AT TIME ZONE 'Europe/Madrid', 2),
  (gen_random_uuid(), _v_today, _milo, 'Dar de comer a Milo', '60 g de pienso y agua limpia.', 'pendiente', NULL, NULL, 0),
  (gen_random_uuid(), _v_today, _milo, 'Limpiar el arenero', '', 'pendiente', NULL, NULL, 1),
  (gen_random_uuid(), _v_today, _paquetes, 'Recoger paquetes', 'Dejarlos en la entrada.', 'pendiente', NULL, NULL, 2),
  (gen_random_uuid(), _v_future, _monstera, 'Comprobar la tierra de la Monstera', 'Regar solo si está seca.', 'pendiente', NULL, NULL, 0),
  (gen_random_uuid(), _v_future, _milo, 'Dar de comer a Milo', '60 g de pienso y agua limpia.', 'pendiente', NULL, NULL, 1);

  INSERT INTO public.task_notes (id, task_id, author_id, note, photo_path, created_at)
  VALUES (gen_random_uuid(), _t_photo, _uid, 'Tierra seca, regada. Hoja nueva saliendo.',
          _house::text || '/demo-monstera.jpg', ((_d - 1) + time '19:11') AT TIME ZONE 'Europe/Madrid');

  INSERT INTO public.incidents (plan_id, visit_id, care_card_id, author_id, title, description, status)
  VALUES (_plan, _v_done, _milo, _uid, 'Milo apenas ha comido',
   'Datos de demostración: Nora indica que Milo ha dejado la mitad del pienso.', 'abierta');

  INSERT INTO public.weather_rules (house_id, care_card_id, variable, threshold, instruction)
  VALUES (_house, _toldo, 'racha_viento', 40, 'Recoger el toldo de la terraza antes de irte.');

  INSERT INTO public.notifications (user_id, plan_id, visit_id, type, message, created_at) VALUES
  (_uid, _plan, _v_done, 'visita_con_omisiones',
   '[Demostración] Nora ha cerrado la visita: 2 tareas realizadas y 1 omitida. Consulta el motivo.',
   ((_d - 1) + time '19:24') AT TIME ZONE 'Europe/Madrid'),
  (_uid, _plan, _v_done, 'incidencia_abierta',
   '[Demostración] Nora ha abierto una incidencia: «Milo apenas ha comido».',
   ((_d - 1) + time '19:22') AT TIME ZONE 'Europe/Madrid');

  INSERT INTO public.activity_events (plan_id, actor_id, type, message)
  VALUES (_plan, _uid, 'demo_cargada', 'Escenario de demostración cargado.');

  RETURN _house;
END;
$$;

REVOKE ALL ON FUNCTION public.load_demo_scenario() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.load_demo_scenario() TO authenticated;