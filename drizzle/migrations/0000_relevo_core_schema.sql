-- Relevo: esquema base (bloque 1)

-- ============ TABLAS ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email_completion_notifications boolean not null default true,
  email_delay_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.guide_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('propietario','cuidador')),
  version int not null default 1,
  status text not null default 'no_iniciada' check (status in ('no_iniciada','pospuesta','completada')),
  updated_at timestamptz not null default now(),
  primary key (user_id, role, version)
);
grant select, insert, update on public.guide_states to authenticated;
grant all on public.guide_states to service_role;
alter table public.guide_states enable row level security;

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  rooms text[] not null default '{}',
  city text,
  city_lat double precision,
  city_lon double precision,
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.houses to authenticated;
grant all on public.houses to service_role;
alter table public.houses enable row level security;

create table public.care_cards (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  name text not null,
  category text not null check (category in ('planta','mascota','casa')),
  room text,
  photo_path text,
  instructions text not null default '',
  important_note text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.care_cards to authenticated;
grant all on public.care_cards to service_role;
alter table public.care_cards enable row level security;

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Europe/Madrid',
  caregiver_id uuid references public.profiles(id) on delete set null,
  general_note text,
  status text not null default 'borrador' check (status in ('borrador','activo','archivado','cancelado')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pendiente' check (status in ('pendiente','aceptada','revocada','caducada')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;
alter table public.invitations enable row level security;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  caregiver_id uuid references public.profiles(id),
  scheduled_at timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente','en_curso','completada','completada_con_omisiones')),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  delay_notified_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.visits to authenticated;
grant all on public.visits to service_role;
alter table public.visits enable row level security;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  care_card_id uuid references public.care_cards(id) on delete set null,
  title text not null,
  instructions text not null default '',
  status text not null default 'pendiente' check (status in ('pendiente','realizada','omitida')),
  skip_reason text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  source text not null default 'manual' check (source in ('manual','ia','meteo')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  note text,
  photo_path text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.task_notes to authenticated;
grant all on public.task_notes to service_role;
alter table public.task_notes enable row level security;

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  care_card_id uuid references public.care_cards(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  title text not null,
  description text not null default '',
  photo_path text,
  status text not null default 'abierta' check (status in ('abierta','resuelta')),
  resolution_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.incidents to authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_events to authenticated;
grant all on public.activity_events to service_role;
alter table public.activity_events enable row level security;

create table public.weather_rules (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  care_card_id uuid references public.care_cards(id) on delete cascade,
  variable text not null check (variable in ('temperatura_max','racha_viento')),
  threshold numeric not null,
  instruction text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.weather_rules to authenticated;
grant all on public.weather_rules to service_role;
alter table public.weather_rules enable row level security;

create table public.weather_suggestions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  weather_rule_id uuid not null references public.weather_rules(id) on delete cascade,
  condition_text text not null,
  forecast_value numeric not null,
  forecast_date date not null,
  source text not null default 'Open-Meteo',
  fetched_at timestamptz not null default now(),
  status text not null default 'pendiente' check (status in ('pendiente','aceptada','descartada')),
  created_at timestamptz not null default now(),
  unique (visit_id, weather_rule_id)
);
grant select, update on public.weather_suggestions to authenticated;
grant all on public.weather_suggestions to service_role;
alter table public.weather_suggestions enable row level security;

create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  input_text text not null,
  proposal jsonb,
  status text not null default 'borrador' check (status in ('borrador','guardada','descartada')),
  error text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.ai_proposals to authenticated;
grant all on public.ai_proposals to service_role;
alter table public.ai_proposals enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  type text not null check (type in ('visita_completada','visita_con_omisiones','visita_retrasada')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create unique index notifications_visit_type_unique on public.notifications (visit_id, type) where visit_id is not null;

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pendiente' check (status in ('pendiente','enviado','fallido','omitido')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
grant all on public.email_queue to service_role;
alter table public.email_queue enable row level security;

-- ============ FUNCIONES AUXILIARES (security definer, sin recursión RLS) ============

create or replace function public.is_house_owner(_house_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from houses where id = _house_id and owner_id = auth.uid())
$$;

create or replace function public.is_house_caregiver(_house_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from plans where house_id = _house_id and caregiver_id = auth.uid())
$$;

create or replace function public.is_plan_owner(_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plans p join houses h on h.id = p.house_id
    where p.id = _plan_id and h.owner_id = auth.uid()
  )
$$;

create or replace function public.is_plan_caregiver(_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from plans where id = _plan_id and caregiver_id = auth.uid())
$$;

create or replace function public.is_plan_participant(_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_plan_owner(_plan_id) or public.is_plan_caregiver(_plan_id)
$$;

create or replace function public.is_visit_participant(_visit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from visits v where v.id = _visit_id and public.is_plan_participant(v.plan_id))
$$;

create or replace function public.is_task_participant(_task_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tasks t where t.id = _task_id and public.is_visit_participant(t.visit_id))
$$;

create or replace function public.shares_plan_with(_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from plans p join houses h on h.id = p.house_id
    where (p.caregiver_id = auth.uid() or h.owner_id = auth.uid())
      and (p.caregiver_id = _profile_id or h.owner_id = _profile_id)
  )
$$;

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Información mínima de una invitación (pantalla de aceptación, sin datos privados)
create or replace function public.invitation_info(_token text)
returns table(plan_id uuid, plan_title text, house_name text, owner_name text, status text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.title, h.name, pr.display_name, i.status, i.expires_at
  from invitations i
  join plans p on p.id = i.plan_id
  join houses h on h.id = p.house_id
  join profiles pr on pr.id = h.owner_id
  where i.token = _token
$$;
grant execute on function public.invitation_info(text) to authenticated;

-- Aceptación autenticada de invitación (un solo uso, caducidad 7 días)
create or replace function public.accept_invitation(_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
  uid uuid := auth.uid();
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
  update visits set caregiver_id = uid where plan_id = inv.plan_id and caregiver_id is null;
  return inv.plan_id;
end;
$$;
grant execute on function public.accept_invitation(text) to authenticated;

-- ============ POLÍTICAS RLS ============

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_plan_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy guide_states_all on public.guide_states for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy houses_select on public.houses for select to authenticated
  using (owner_id = auth.uid() or public.is_house_caregiver(id));
create policy houses_insert on public.houses for insert to authenticated
  with check (owner_id = auth.uid());
create policy houses_update on public.houses for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy houses_delete on public.houses for delete to authenticated
  using (owner_id = auth.uid());

create policy care_cards_select on public.care_cards for select to authenticated
  using (public.is_house_owner(house_id) or public.is_house_caregiver(house_id));
create policy care_cards_insert on public.care_cards for insert to authenticated
  with check (public.is_house_owner(house_id));
create policy care_cards_update on public.care_cards for update to authenticated
  using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
create policy care_cards_delete on public.care_cards for delete to authenticated
  using (public.is_house_owner(house_id));

create policy plans_select on public.plans for select to authenticated
  using (public.is_plan_owner(id) or caregiver_id = auth.uid());
create policy plans_insert on public.plans for insert to authenticated
  with check (public.is_house_owner(house_id));
create policy plans_update on public.plans for update to authenticated
  using (public.is_plan_owner(id)) with check (public.is_plan_owner(id));
create policy plans_delete on public.plans for delete to authenticated
  using (public.is_plan_owner(id));

create policy invitations_all_owner on public.invitations for all to authenticated
  using (public.is_plan_owner(plan_id)) with check (public.is_plan_owner(plan_id));

create policy visits_select on public.visits for select to authenticated
  using (public.is_plan_participant(plan_id));
create policy visits_insert on public.visits for insert to authenticated
  with check (public.is_plan_owner(plan_id));
create policy visits_update on public.visits for update to authenticated
  using (public.is_plan_participant(plan_id)) with check (public.is_plan_participant(plan_id));
create policy visits_delete on public.visits for delete to authenticated
  using (public.is_plan_owner(plan_id));

create policy tasks_select on public.tasks for select to authenticated
  using (public.is_visit_participant(visit_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (exists (select 1 from visits v where v.id = visit_id and public.is_plan_owner(v.plan_id)));
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_task_participant(id)) with check (public.is_task_participant(id));
create policy tasks_delete on public.tasks for delete to authenticated
  using (exists (select 1 from visits v where v.id = visit_id and public.is_plan_owner(v.plan_id)));

create policy task_notes_select on public.task_notes for select to authenticated
  using (public.is_task_participant(task_id));
create policy task_notes_insert on public.task_notes for insert to authenticated
  with check (author_id = auth.uid() and public.is_task_participant(task_id));
create policy task_notes_delete on public.task_notes for delete to authenticated
  using (author_id = auth.uid());

create policy incidents_select on public.incidents for select to authenticated
  using (public.is_plan_participant(plan_id));
create policy incidents_insert on public.incidents for insert to authenticated
  with check (author_id = auth.uid() and public.is_plan_participant(plan_id));
create policy incidents_update on public.incidents for update to authenticated
  using (public.is_plan_participant(plan_id)) with check (public.is_plan_participant(plan_id));

create policy activity_select on public.activity_events for select to authenticated
  using (public.is_plan_participant(plan_id));
create policy activity_insert on public.activity_events for insert to authenticated
  with check (actor_id = auth.uid() and public.is_plan_participant(plan_id));

create policy weather_rules_select on public.weather_rules for select to authenticated
  using (public.is_house_owner(house_id) or public.is_house_caregiver(house_id));
create policy weather_rules_insert on public.weather_rules for insert to authenticated
  with check (public.is_house_owner(house_id));
create policy weather_rules_update on public.weather_rules for update to authenticated
  using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));
create policy weather_rules_delete on public.weather_rules for delete to authenticated
  using (public.is_house_owner(house_id));

create policy weather_suggestions_select on public.weather_suggestions for select to authenticated
  using (public.is_visit_participant(visit_id));
create policy weather_suggestions_update on public.weather_suggestions for update to authenticated
  using (exists (select 1 from visits v where v.id = visit_id and public.is_plan_owner(v.plan_id)))
  with check (exists (select 1 from visits v where v.id = visit_id and public.is_plan_owner(v.plan_id)));

create policy ai_proposals_all on public.ai_proposals for all to authenticated
  using (public.is_house_owner(house_id)) with check (public.is_house_owner(house_id));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- email_queue: sin acceso de usuario; solo service_role (cola de envío en servidor)
