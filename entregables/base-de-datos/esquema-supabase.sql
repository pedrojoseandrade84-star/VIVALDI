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

-- =====================================================================
-- 6. Automatización: solicitudes de la web y Libro de Reclamaciones
-- =====================================================================

-- quién recibe clientes nuevos y a quién le tocó el último
alter table public.perfiles add column if not exists recibe_clientes boolean not null default true;
alter table public.perfiles add column if not exists ultimo_asignado timestamptz;

-- solicitudes que llegan solas desde la web o los anuncios
create table if not exists public.solicitudes (
  id            bigserial primary key,
  fecha         timestamptz not null default now(),
  nombre        text not null check (char_length(nombre) between 3 and 120),
  celular       text not null check (celular ~ '^9[0-9]{8}$'),
  proyecto      text check (char_length(proyecto) <= 120),
  plazo         text check (char_length(plazo) <= 60),
  pago          text check (char_length(pago) <= 60),
  visita        text check (char_length(visita) <= 80),
  mensaje       text check (char_length(mensaje) <= 1000),
  acepta_promos boolean not null default false,
  origen        text not null default 'Web' check (char_length(origen) <= 60),
  campana       text check (char_length(campana) <= 120),
  asesor        uuid references auth.users (id),
  estado        text not null default 'nueva' check (estado in ('nueva', 'en herramienta', 'descartada')),
  cliente_id    text,
  tomada        timestamptz
);
create index if not exists solicitudes_asesor_idx on public.solicitudes (asesor, estado);
-- defensa adicional: los campos cortos que llegan desde la web pública no aceptan etiquetas HTML
do $$ begin
  alter table public.solicitudes add constraint solicitudes_sin_html check (
    nombre !~ '[<>]' and coalesce(proyecto, '') !~ '[<>]' and coalesce(plazo, '') !~ '[<>]' and coalesce(pago, '') !~ '[<>]'
    and coalesce(visita, '') !~ '[<>]' and origen !~ '[<>]' and coalesce(campana, '') !~ '[<>]');
exception when duplicate_object then null; end $$;

-- reparto por turno entre asesores activos; se ignora el mismo celular repetido en 24 horas
create or replace function public.solicitudes_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare elegido uuid;
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.solicitudes where celular = new.celular and fecha > now() - interval '24 hours') then
      return null;   -- repetida: no se duplica
    end if;
    if (select count(*) from public.solicitudes where fecha > now() - interval '1 hour') >= 300 then
      return null;   -- protección ante envíos masivos
    end if;
    new.fecha := now(); new.estado := 'nueva'; new.cliente_id := null; new.tomada := null;
    select id into elegido from public.perfiles
      where activo and recibe_clientes and rol = 'asesor'
      order by ultimo_asignado nulls first, creado limit 1 for update skip locked;
    new.asesor := elegido;
    if elegido is not null then update public.perfiles set ultimo_asignado = now() where id = elegido; end if;
  else
    -- el asesor solo cambia el estado; la jefatura además puede reasignar
    new.id := old.id; new.fecha := old.fecha; new.nombre := old.nombre; new.celular := old.celular;
    new.proyecto := old.proyecto; new.plazo := old.plazo; new.pago := old.pago; new.visita := old.visita;
    new.mensaje := old.mensaje; new.acepta_promos := old.acepta_promos; new.origen := old.origen; new.campana := old.campana;
    if not public.es_jefatura() then new.asesor := old.asesor; end if;
    if new.estado <> old.estado and new.estado = 'en herramienta' then new.tomada := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists solicitudes_antes on public.solicitudes;
create trigger solicitudes_antes before insert or update on public.solicitudes
  for each row execute function public.solicitudes_antes();

alter table public.solicitudes enable row level security;
drop policy if exists "web registra solicitudes" on public.solicitudes;
create policy "web registra solicitudes" on public.solicitudes for insert to anon, authenticated with check (true);
drop policy if exists "ver solicitudes" on public.solicitudes;
create policy "ver solicitudes" on public.solicitudes for select to authenticated
  using (public.es_activo() and (asesor = auth.uid() or public.es_jefatura()));
drop policy if exists "atender solicitudes" on public.solicitudes;
create policy "atender solicitudes" on public.solicitudes for update to authenticated
  using (public.es_activo() and (asesor = auth.uid() or public.es_jefatura())) with check (public.es_activo());

-- Libro de Reclamaciones: queda registrado con su plazo de respuesta
create or replace function public.sumar_dias_habiles(desde date, n int) returns date
language plpgsql immutable as $$
declare d date := desde; k int := 0;
begin
  while k < n loop d := d + 1; if extract(isodow from d) < 6 then k := k + 1; end if; end loop;
  return d;   -- no descuenta feriados: revisar el plazo cuando haya feriados de por medio
end $$;

create table if not exists public.reclamos (
  id         bigserial primary key,
  codigo     text unique,
  fecha      timestamptz not null default now(),
  vence      date,
  tipo       text not null check (tipo in ('Reclamo', 'Queja')),
  nombre     text not null check (char_length(nombre) between 3 and 120),
  documento  text check (char_length(documento) <= 20),
  celular    text check (char_length(celular) <= 20),
  correo     text check (char_length(correo) <= 120),
  proyecto   text check (char_length(proyecto) <= 120),
  detalle    text not null check (char_length(detalle) between 10 and 3000),
  pedido     text check (char_length(pedido) <= 1500),
  estado     text not null default 'abierto' check (estado in ('abierto', 'respondido')),
  respuesta  text,
  respondido timestamptz
);
create or replace function public.reclamos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.reclamos where fecha > now() - interval '1 hour') >= 50 then return null; end if;
    new.fecha := now(); new.estado := 'abierto'; new.respuesta := null; new.respondido := null;
    new.vence := public.sumar_dias_habiles((now() at time zone 'America/Lima')::date, 15);
    -- se respeta el número que la web ya le mostró al cliente; si no viene, se genera
    if new.codigo is not null and new.codigo ~ '^LR-[0-9]{4}-[0-9]{4}-[0-9]{6}$'
       and not exists (select 1 from public.reclamos where codigo = new.codigo) then return new; end if;
    new.codigo := 'LR-' || to_char(now() at time zone 'America/Lima', 'YYYY') || '-' || lpad(new.id::text, 5, '0');
  else
    new.id := old.id; new.codigo := old.codigo; new.fecha := old.fecha; new.vence := old.vence; new.tipo := old.tipo;
    new.nombre := old.nombre; new.documento := old.documento; new.celular := old.celular; new.correo := old.correo;
    new.proyecto := old.proyecto; new.detalle := old.detalle; new.pedido := old.pedido;
    if new.estado = 'respondido' and old.estado <> 'respondido' then new.respondido := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists reclamos_antes on public.reclamos;
create trigger reclamos_antes before insert or update on public.reclamos
  for each row execute function public.reclamos_antes();

alter table public.reclamos enable row level security;
drop policy if exists "web registra reclamos" on public.reclamos;
create policy "web registra reclamos" on public.reclamos for insert to anon, authenticated with check (true);
drop policy if exists "jefatura ve reclamos" on public.reclamos;
create policy "jefatura ve reclamos" on public.reclamos for select to authenticated using (public.es_jefatura());
drop policy if exists "jefatura responde reclamos" on public.reclamos;
create policy "jefatura responde reclamos" on public.reclamos for update to authenticated using (public.es_jefatura()) with check (public.es_jefatura());
