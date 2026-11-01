-- Base de datos de la herramienta comercial Vivaldi (Supabase / PostgreSQL)
-- Diseño y desarrollo: Pedrojose Andrade Paredes
-- Ejecutar una sola vez en Supabase: SQL Editor → New query → pegar todo → Run.

-- 1. Perfiles: un registro por usuario (asesor o jefatura)
create table if not exists public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null,
  rol     text not null default 'asesor' check (rol in ('asesor', 'jefatura')),
  activo  boolean not null default true,
  creado  timestamptz not null default now()
);

-- 2. Registros: clientes, proformas, separaciones, cobranza, visitas y lotes
create table if not exists public.registros (
  id          text primary key,
  coleccion   text not null check (coleccion in ('clientes', 'proformas', 'separaciones', 'cobranza', 'visitas', 'lotes')),
  asesor      uuid not null default auth.uid() references auth.users (id),
  contenido   jsonb not null default '{}'::jsonb,
  eliminado   boolean not null default false,
  actualizado timestamptz not null default now(),
  creado      timestamptz not null default now()
);
create index if not exists registros_actualizado_idx on public.registros (actualizado);
create index if not exists registros_asesor_idx on public.registros (asesor);

-- 3. Historial de cambios (auditoría): quién cambió qué y cuándo
create table if not exists public.historial (
  n           bigserial primary key,
  registro    text not null,
  coleccion   text not null,
  usuario     uuid default auth.uid(),
  accion      text not null,
  contenido   jsonb,
  fecha       timestamptz not null default now()
);

-- 4. Funciones de apoyo
create or replace function public.es_jefatura() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'jefatura' and activo);
$$;

create or replace function public.es_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo);
$$;

-- la fecha de actualización la pone el servidor; el dueño del registro no cambia
create or replace function public.registros_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actualizado := clock_timestamp();
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.coleccion := old.coleccion;
    new.asesor := old.asesor;
    new.creado := old.creado;
  end if;
  return new;
end $$;

create or replace function public.registros_historial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.historial (registro, coleccion, usuario, accion, contenido)
  values (new.id, new.coleccion, auth.uid(),
          case when tg_op = 'INSERT' then 'crear' when new.eliminado then 'eliminar' else 'modificar' end,
          new.contenido);
  return new;
end $$;

drop trigger if exists registros_antes on public.registros;
create trigger registros_antes before insert or update on public.registros
  for each row execute function public.registros_antes();
drop trigger if exists registros_historial on public.registros;
create trigger registros_historial after insert or update on public.registros
  for each row execute function public.registros_historial();

-- 5. Seguridad por fila
alter table public.perfiles  enable row level security;
alter table public.registros enable row level security;
alter table public.historial enable row level security;

drop policy if exists "perfil propio o jefatura" on public.perfiles;
create policy "perfil propio o jefatura" on public.perfiles
  for select using (id = auth.uid() or public.es_jefatura());

-- cada asesor ve lo suyo; la jefatura ve todo; los lotes los ven todos (inventario compartido)
drop policy if exists "leer registros" on public.registros;
create policy "leer registros" on public.registros
  for select using (public.es_activo() and (asesor = auth.uid() or coleccion = 'lotes' or public.es_jefatura()));

drop policy if exists "crear registros" on public.registros;
create policy "crear registros" on public.registros
  for insert with check (public.es_activo() and asesor = auth.uid());

drop policy if exists "modificar registros" on public.registros;
create policy "modificar registros" on public.registros
  for update using (public.es_activo() and (asesor = auth.uid() or coleccion = 'lotes' or public.es_jefatura()))
  with check (public.es_activo());

-- no se borra nada físicamente: se marca "eliminado" y queda en el historial

drop policy if exists "historial jefatura" on public.historial;
create policy "historial jefatura" on public.historial
  for select using (public.es_jefatura());
