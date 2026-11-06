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
-- enlace personal del asesor: la web lo envía y la solicitud le llega directo a él
alter table public.perfiles add column if not exists codigo text;
alter table public.perfiles add column if not exists celular text;
do $$ begin alter table public.perfiles add constraint perfiles_codigo_ok check (codigo ~ '^[a-z0-9-]{2,40}$'); exception when duplicate_object then null; end $$;
do $$ begin alter table public.perfiles add constraint perfiles_celular_ok check (celular ~ '^9[0-9]{8}$'); exception when duplicate_object then null; end $$;
create unique index if not exists perfiles_codigo_uq on public.perfiles (codigo);
alter table public.solicitudes add column if not exists asesor_codigo text;
do $$ begin alter table public.solicitudes add constraint solicitudes_codigo_ok check (asesor_codigo ~ '^[a-z0-9-]{1,40}$'); exception when duplicate_object then null; end $$;
-- clientes del extranjero: celular internacional con su código de país (+1..., +34..., etc.) y el país que indicaron
alter table public.solicitudes add column if not exists pais text;
do $$ begin alter table public.solicitudes add constraint solicitudes_pais_ok check (char_length(pais) <= 60 and pais !~ '[<>]'); exception when duplicate_object then null; end $$;
alter table public.solicitudes drop constraint if exists solicitudes_celular_check;
do $$ begin alter table public.solicitudes add constraint solicitudes_celular_ok check (celular ~ '^(9[0-9]{8}|\+[1-9][0-9]{7,14})$'); exception when duplicate_object then null; end $$;
alter table public.solicitudes add column if not exists tipo text not null default 'consulta';
do $$ begin alter table public.solicitudes add constraint solicitudes_tipo_ok check (tipo in ('consulta', 'separacion')); exception when duplicate_object then null; end $$;
alter table public.solicitudes add column if not exists lote text;
do $$ begin alter table public.solicitudes add constraint solicitudes_lote_ok check (lote ~ '^[A-Za-z0-9:_-]{1,80}$'); exception when duplicate_object then null; end $$;
alter table public.solicitudes add column if not exists dni text;
do $$ begin alter table public.solicitudes add constraint solicitudes_dni_ok check (dni ~ '^([0-9]{8}|[A-Z0-9]{9,12})$'); exception when duplicate_object then null; end $$;
alter table public.solicitudes add column if not exists correo text;
do $$ begin alter table public.solicitudes add constraint solicitudes_correo_ok check (char_length(correo) <= 120 and correo ~* '^[^@\s<>]+@[^@\s<>]+\.[a-z]{2,}$'); exception when duplicate_object then null; end $$;
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
    -- una consulta por celular cada 24 horas; un pedido de separación por lote, aparte de las consultas
    if exists (select 1 from public.solicitudes where celular = new.celular and fecha > now() - interval '24 hours'
               and tipo = coalesce(new.tipo, 'consulta') and coalesce(lote, '') = coalesce(new.lote, '')) then
      return null;   -- repetida: no se duplica
    end if;
    if (select count(*) from public.solicitudes where fecha > now() - interval '1 hour') >= 300 then
      return null;   -- protección ante envíos masivos
    end if;
    new.fecha := now(); new.estado := 'nueva'; new.cliente_id := null; new.tomada := null;
    -- si el cliente llegó por el enlace de un asesor activo, es suyo; si no, va por turno
    if new.asesor_codigo is not null then
      select id into elegido from public.perfiles where codigo = new.asesor_codigo and activo and rol = 'asesor';
    end if;
    if elegido is null then
      new.asesor_codigo := null;
      select id into elegido from public.perfiles
        where activo and recibe_clientes and rol = 'asesor'
        order by ultimo_asignado nulls first, creado limit 1 for update skip locked;
      if elegido is not null then update public.perfiles set ultimo_asignado = now() where id = elegido; end if;
    end if;
    new.asesor := elegido;
  else
    -- el asesor solo cambia el estado; la jefatura además puede reasignar
    new.id := old.id; new.fecha := old.fecha; new.nombre := old.nombre; new.celular := old.celular;
    new.proyecto := old.proyecto; new.plazo := old.plazo; new.pago := old.pago; new.visita := old.visita;
    new.mensaje := old.mensaje; new.acepta_promos := old.acepta_promos; new.origen := old.origen; new.campana := old.campana; new.asesor_codigo := old.asesor_codigo; new.pais := old.pais;
    new.tipo := old.tipo; new.lote := old.lote; new.dni := old.dni; new.correo := old.correo;
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

-- =====================================================================
-- 7. Proyectos, datos públicos del asesor y mensajes automáticos (WhatsApp y agenda)
-- =====================================================================

-- datos públicos del asesor para su enlace personal (solo nombre y celular de asesores activos)
create or replace function public.asesor_publico(c text) returns table (nombre text, celular text)
language sql stable security definer set search_path = public as $$
  select nombre, celular from public.perfiles where codigo = lower(c) and activo and rol = 'asesor' limit 1;
$$;
grant execute on function public.asesor_publico(text) to anon, authenticated;

-- proyectos: nombre, etapas, precios, estado y documentos; la web y las landings los leen, la jefatura los edita
create table if not exists public.proyectos (
  id              text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  contenido       jsonb not null default '{}'::jsonb,
  publicado       boolean not null default true,
  actualizado     timestamptz not null default now(),
  actualizado_por uuid
);
create or replace function public.proyectos_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actualizado := clock_timestamp(); new.actualizado_por := auth.uid();
  if tg_op = 'UPDATE' then new.id := old.id; end if;
  insert into public.historial (registro, coleccion, usuario, accion, contenido)
  values ('proyecto:' || new.id, 'proyectos', auth.uid(), lower(tg_op), new.contenido);
  return new;
end $$;
drop trigger if exists proyectos_antes on public.proyectos;
create trigger proyectos_antes before insert or update on public.proyectos for each row execute function public.proyectos_antes();
alter table public.proyectos enable row level security;
drop policy if exists "todos leen proyectos publicados" on public.proyectos;
create policy "todos leen proyectos publicados" on public.proyectos for select to anon, authenticated using (publicado or public.es_jefatura());
drop policy if exists "jefatura crea proyectos" on public.proyectos;
create policy "jefatura crea proyectos" on public.proyectos for insert to authenticated with check (public.es_jefatura());
drop policy if exists "jefatura edita proyectos" on public.proyectos;
create policy "jefatura edita proyectos" on public.proyectos for update to authenticated using (public.es_jefatura()) with check (public.es_jefatura());

-- cola de mensajes: cada aviso automático queda aquí; la función enviar-whatsapp los envía en horario de oficina
create table if not exists public.mensajes (
  id           bigserial primary key,
  creado       timestamptz not null default now(),
  enviar_desde timestamptz not null default now(),
  para         text not null check (para ~ '^(9[0-9]{8}|\+[1-9][0-9]{7,14})$'),
  plantilla    text not null check (plantilla ~ '^[a-z_]{3,40}$'),
  variables    jsonb not null default '[]'::jsonb,
  motivo       text not null,
  ref          text not null unique,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviado', 'error', 'cancelado')),
  intentos     int not null default 0,
  error        text,
  enviado      timestamptz,
  wa_id        text
);
create index if not exists mensajes_pendientes_idx on public.mensajes (estado, enviar_desde);
-- celulares que pidieron no recibir mensajes (Ley 29733): no se les encola nada
create table if not exists public.no_contactar (celular text primary key check (celular ~ '^9[0-9]{8}$'), fecha timestamptz not null default now(), motivo text);
alter table public.mensajes enable row level security;
alter table public.no_contactar enable row level security;
drop policy if exists "jefatura ve mensajes" on public.mensajes;
create policy "jefatura ve mensajes" on public.mensajes for select to authenticated using (public.es_jefatura());
drop policy if exists "jefatura cancela mensajes" on public.mensajes;
create policy "jefatura cancela mensajes" on public.mensajes for update to authenticated using (public.es_jefatura()) with check (public.es_jefatura() and estado in ('pendiente', 'cancelado'));
drop policy if exists "jefatura gestiona no contactar" on public.no_contactar;
create policy "jefatura gestiona no contactar" on public.no_contactar for all to authenticated using (public.es_jefatura()) with check (public.es_jefatura());

-- celular peruano de 9 dígitos (o internacional con +código de país) a partir de lo que escribió el asesor
create or replace function public.cel9(t text) returns text language sql immutable as $$
  select case when d ~ '^519[0-9]{8}$' then substr(d, 3) when d ~ '^9[0-9]{8}$' then d
              when coalesce(t, '') ~ '^\s*\+' and d ~ '^[1-9][0-9]{7,14}$' then '+' || d end
  from (select regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g') as d) x;
$$;
-- llevar una hora al horario de envío (8:00 a 20:00 de Lima); fuera de horario pasa a las 8:30 siguientes
create or replace function public.en_horario(t timestamptz) returns timestamptz language sql stable as $$
  select case
    when (t at time zone 'America/Lima')::time < '08:00' then (((t at time zone 'America/Lima')::date + time '08:30') at time zone 'America/Lima')
    when (t at time zone 'America/Lima')::time >= '20:00' then ((((t at time zone 'America/Lima')::date + 1) + time '08:30') at time zone 'America/Lima')
    else t end;
$$;
create or replace function public.lima(d date, h time) returns timestamptz language sql immutable as $$ select (d + h) at time zone 'America/Lima' $$;
create or replace function public.fecha_larga(d date) returns text language sql immutable as $$
  select (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' de ' ||
         (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from d)::int];
$$;
create or replace function public.encolar(p_para text, p_plantilla text, p_vars jsonb, p_motivo text, p_ref text, p_cuando timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
declare c text := public.cel9(p_para);
begin
  if c is null or exists (select 1 from public.no_contactar where celular = c) then return; end if;
  insert into public.mensajes (para, plantilla, variables, motivo, ref, enviar_desde)
  values (c, p_plantilla, p_vars, p_motivo, p_ref, public.en_horario(greatest(p_cuando, now())))
  on conflict (ref) do nothing;
end $$;
revoke execute on function public.encolar(text, text, jsonb, text, text, timestamptz) from public, anon, authenticated;

-- a) cliente nuevo de la web: bienvenida al cliente y aviso al asesor que le tocó
create or replace function public.solicitudes_mensajes() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select nombre, celular into a from public.perfiles where id = new.asesor;
  perform public.encolar(new.celular, 'bienvenida_cliente',
    jsonb_build_array(split_part(new.nombre, ' ', 1), coalesce(nullif(new.proyecto, ''), 'nuestros proyectos'), coalesce(a.nombre, 'un asesor de Vivaldi')),
    'Cliente nuevo de la web', 'sol:' || new.id || ':bienvenida');
  if a.celular is not null then
    perform public.encolar(a.celular, 'aviso_asesor', jsonb_build_array(a.nombre, new.nombre, new.celular, coalesce(nullif(new.proyecto, ''), 'sin proyecto'), coalesce(nullif(new.visita, ''), 'sin visita')),
      'Cliente nuevo asignado', 'sol:' || new.id || ':asesor');
  end if;
  return null;
end $$;
drop trigger if exists solicitudes_mensajes on public.solicitudes;
create trigger solicitudes_mensajes after insert on public.solicitudes for each row execute function public.solicitudes_mensajes();

-- avisos de cobranza de una venta: cancela los de cuotas pagadas y programa las dos próximas
create or replace function public.cobranza_avisos(p_id text, c jsonb, p_eliminado boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare k text := 'cob:' || p_id || ':'; q jsonb; hoy date := (now() at time zone 'America/Lima')::date;
begin
  if p_eliminado then update public.mensajes set estado = 'cancelado' where ref like k || '%' and estado = 'pendiente'; return; end if;
  update public.mensajes m set estado = 'cancelado' where m.ref like k || '%' and m.estado = 'pendiente'
    and coalesce(c->'paid', '{}'::jsonb) ? split_part(substr(m.ref, length(k) + 1), ':', 1);
  for q in select x from jsonb_array_elements(coalesce(c->'sched', '[]'::jsonb)) x
           where not (coalesce(c->'paid', '{}'::jsonb) ? (x->>'i')) and (x->>'d') ~ '^\d{4}-\d{2}-\d{2}$' and (x->>'d')::date >= hoy
           order by (x->>'d')::date limit 2 loop
    perform public.encolar(c->>'phone', 'recordatorio_cuota', jsonb_build_array(split_part(c->>'name', ' ', 1), q->>'i', 'S/ ' || to_char((q->>'amt')::numeric, 'FM999,999,990'), public.fecha_larga((q->>'d')::date), coalesce(c->>'projName', 'su lote')),
      'Cuota por vencer', k || (q->>'i') || ':recordatorio', public.lima((q->>'d')::date - 3, '10:00'));
  end loop;
end $$;
revoke execute on function public.cobranza_avisos(text, jsonb, boolean) from public, anon, authenticated;

-- b) agenda y cobranza: al guardar una visita o una venta en la herramienta se programan sus avisos
create or replace function public.registros_mensajes() returns trigger
language plpgsql security definer set search_path = public as $$
declare c jsonb := new.contenido; d date; k text; q jsonb; hoy date := (now() at time zone 'America/Lima')::date; n int := 0;
begin
  if new.coleccion = 'visitas' then
    k := 'vis:' || new.id || ':';
    if new.eliminado or c->>'st' <> 'prog' or coalesce(c->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
      update public.mensajes set estado = 'cancelado' where ref like k || '%' and estado = 'pendiente'; return null;
    end if;
    d := (c->>'date')::date; if d < hoy then return null; end if;
    -- si la visita cambió de fecha u hora, se cancelan los avisos anteriores
    update public.mensajes set estado = 'cancelado' where ref like k || '%' and ref not like k || (c->>'date') || (c->>'time') || '%' and estado = 'pendiente';
    if public.en_horario(now()) < public.lima(d, case when coalesce(c->>'time', '') ~ '^\d{1,2}:\d{2}$' then (c->>'time')::time else time '08:00' end) then
    perform public.encolar(c->>'phone', 'confirmacion_visita', jsonb_build_array(split_part(c->>'name', ' ', 1), c->>'proj', public.fecha_larga(d), c->>'time', coalesce(c->>'meet', 'En el proyecto')),
      'Visita agendada', k || (c->>'date') || (c->>'time') || ':confirmacion');
    end if;
    -- recordatorio el día anterior a las 10:00; si ya no llega con una hora de anticipación, basta la confirmación
    if d > hoy and public.en_horario(greatest(public.lima(d - 1, '10:00'), now())) >= public.en_horario(now()) + interval '6 hours'
       and public.en_horario(greatest(public.lima(d - 1, '10:00'), now()))
         < public.lima(d, case when coalesce(c->>'time', '') ~ '^\d{1,2}:\d{2}$' then (c->>'time')::time else time '08:00' end) - interval '1 hour' then
      perform public.encolar(c->>'phone', 'recordatorio_visita', jsonb_build_array(split_part(c->>'name', ' ', 1), c->>'proj', c->>'time', coalesce(c->>'meet', 'En el proyecto')),
        'Recordatorio un día antes', k || (c->>'date') || (c->>'time') || ':recordatorio', public.lima(d - 1, '10:00'));
    end if;
  elsif new.coleccion = 'cobranza' then
    perform public.cobranza_avisos(new.id, c, new.eliminado);
  end if;
  return null;
end $$;
drop trigger if exists registros_mensajes on public.registros;
create trigger registros_mensajes after insert or update on public.registros for each row execute function public.registros_mensajes();

-- c) tareas de cada hora: siguientes cuotas, cuotas vencidas, alerta a la jefatura y resumen diario del asesor
create or replace function public.automatizacion_periodica() returns int
language plpgsql security definer set search_path = public as $$
declare r record; q jsonb; hoy date := (now() at time zone 'America/Lima')::date; antes int; despues int;
begin
  select count(*) into antes from public.mensajes;
  -- reprograma avisos de cobranza (las cuotas futuras van entrando de dos en dos)
  perform public.cobranza_avisos(g.id, g.contenido) from public.registros g where g.coleccion = 'cobranza' and not g.eliminado;
  -- cuota vencida: un aviso amable al día siguiente del vencimiento
  for r in select id, contenido c from public.registros where coleccion = 'cobranza' and not eliminado loop
    for q in select x from jsonb_array_elements(coalesce(r.c->'sched', '[]'::jsonb)) x
             where not (coalesce(r.c->'paid', '{}'::jsonb) ? (x->>'i')) and (x->>'d')::date between hoy - 5 and hoy - 1 loop
      perform public.encolar(r.c->>'phone', 'cuota_vencida', jsonb_build_array(split_part(r.c->>'name', ' ', 1), q->>'i', 'S/ ' || to_char((q->>'amt')::numeric, 'FM999,999,990'), public.fecha_larga((q->>'d')::date)),
        'Cuota vencida', 'cob:' || r.id || ':' || (q->>'i') || ':vencida', public.lima(hoy, '10:00'));
    end loop;
  end loop;
  -- cliente de la web sin atender por más de una hora: aviso a la jefatura
  for r in select s.id, s.nombre, s.celular, s.proyecto, coalesce(p.nombre, 'sin asesor') asesor from public.solicitudes s left join public.perfiles p on p.id = s.asesor
           where s.estado = 'nueva' and s.fecha < now() - interval '1 hour' and s.fecha > now() - interval '3 days' loop
    perform public.encolar(j.celular, 'alerta_jefatura', jsonb_build_array(r.nombre, r.celular, coalesce(r.proyecto, 'sin proyecto'), r.asesor), 'Cliente sin atender', 'sol:' || r.id || ':alerta:' || j.id)
      from public.perfiles j where j.rol = 'jefatura' and j.activo and j.celular is not null;
  end loop;
  -- resumen de la mañana para cada asesor: clientes con contacto vencido y visitas de hoy
  for r in select p.id, p.nombre, p.celular,
             (select count(*) from public.registros g where g.asesor = p.id and g.coleccion = 'clientes' and not g.eliminado and g.contenido->>'stage' in ('Nuevo', 'Contactado', 'Visita agendada')
                and (g.contenido->>'next') ~ '^\d{4}-\d{2}-\d{2}$' and (g.contenido->>'next')::date <= hoy) pend,
             (select count(*) from public.registros g where g.asesor = p.id and g.coleccion = 'visitas' and not g.eliminado and g.contenido->>'st' = 'prog' and g.contenido->>'date' = hoy::text) vis
           from public.perfiles p where p.activo and p.rol = 'asesor' and p.celular is not null loop
    if r.pend + r.vis > 0 then
      perform public.encolar(r.celular, 'resumen_asesor', jsonb_build_array(r.nombre, r.pend, r.vis), 'Resumen del día', 'dia:' || r.id || ':' || hoy, public.lima(hoy, '08:30'));
    end if;
  end loop;
  select count(*) into despues from public.mensajes;
  return despues - antes;
end $$;
revoke execute on function public.automatizacion_periodica() from public, anon, authenticated;

-- para activar el envío automático, ejecutar activar-envios.sql (ver LEEME, sección WhatsApp)

-- d) para la función enviar-whatsapp (solo con la clave de servicio): tomar pendientes y marcar el resultado
create or replace function public.tomar_mensajes(n int default 40) returns setof public.mensajes
language sql security definer set search_path = public as $$
  update public.mensajes set estado = 'enviando', intentos = intentos + 1
  where id in (select id from public.mensajes where estado = 'pendiente' and enviar_desde <= now() order by enviar_desde limit least(n, 200) for update skip locked)
  returning *;
$$;
create or replace function public.marcar_mensaje(p_id bigint, p_ok boolean, p_wa_id text default null, p_error text default null) returns void
language sql security definer set search_path = public as $$
  update public.mensajes set
    estado = case when p_ok then 'enviado' when intentos >= 3 then 'error' else 'pendiente' end,
    enviado = case when p_ok then now() end, wa_id = p_wa_id, error = left(p_error, 500),
    enviar_desde = case when p_ok then enviar_desde else public.en_horario(now() + interval '15 minutes') end
  where id = p_id and estado = 'enviando';
$$;
revoke execute on function public.tomar_mensajes(int) from public, anon, authenticated;
revoke execute on function public.marcar_mensaje(bigint, boolean, text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.tomar_mensajes(int) to service_role;
    grant execute on function public.marcar_mensaje(bigint, boolean, text, text) to service_role;
    grant execute on function public.automatizacion_periodica() to service_role;
  end if;
end $$;

-- 8. Portal Mi Vivaldi: lotes en línea, compradores y venta desde la web
-- correo de la sesión (Supabase lo pone en el token del usuario)
create or replace function public.correo_sesion() returns text
language sql stable as $$ select lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'email', '')) $$;

-- a) lotes disponibles para cualquier visitante, sin nombres de clientes
create or replace function public.lotes_publicos() returns table (id text, proyecto text, mz text, lt text, area numeric, precio numeric, ubicacion text, disponible boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.contenido->>'proj', r.contenido->>'mz', r.contenido->>'lt',
         case when r.contenido->>'area' ~ '^[0-9]+(\.[0-9]+)?$' then (r.contenido->>'area')::numeric end,
         case when r.contenido->>'price' ~ '^[0-9]+(\.[0-9]+)?$' then (r.contenido->>'price')::numeric end,
         r.contenido->>'loc', coalesce(r.contenido->>'st', '') = 'Disponible'
  from public.registros r
  where r.coleccion = 'lotes' and not r.eliminado and coalesce(r.contenido->>'demo', 'false') <> 'true' and coalesce(r.contenido->>'st', '') <> 'Bloqueado'
  order by 2, 3, case when r.contenido->>'lt' ~ '^[0-9]+$' then (r.contenido->>'lt')::int end, 4
$$;
revoke execute on function public.lotes_publicos() from public;
grant execute on function public.lotes_publicos() to anon, authenticated;

-- b) separar un lote desde el portal del asesor: solo si sigue disponible (dos asesores no pueden separar el mismo)
create or replace function public.separar_lote(p_lote text, p_cliente text, p_celular text, p_solicitud bigint default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.es_activo() then raise exception 'Sin permiso'; end if;
  if char_length(coalesce(p_cliente, '')) not between 3 and 120 or p_cliente ~ '[<>]' then raise exception 'Nombre del cliente no válido'; end if;
  if coalesce(p_celular, '') !~ '^(9[0-9]{8}|\+[1-9][0-9]{7,14})$' then raise exception 'Celular no válido'; end if;
  update public.registros set contenido = contenido || jsonb_build_object('st', 'Separado', 'client', p_cliente, 'phone', p_celular,
           'sepAt', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD'), 'sepBy', auth.uid()), actualizado = now()
    where id = p_lote and coleccion = 'lotes' and not eliminado and contenido->>'st' = 'Disponible';
  get diagnostics n = row_count;
  if n = 1 and p_solicitud is not null then
    update public.solicitudes set estado = 'en herramienta' where id = p_solicitud and (asesor = auth.uid() or public.es_jefatura());
  end if;
  return n = 1;
end $$;
revoke execute on function public.separar_lote(text, text, text, bigint) from public, anon;
grant execute on function public.separar_lote(text, text, text, bigint) to authenticated;

-- c) acceso del comprador: el asesor registra el correo del comprador en su venta
create table if not exists public.accesos_comprador (
  correo       text not null check (correo = lower(correo) and char_length(correo) <= 120 and correo ~ '^[^@\s<>]+@[^@\s<>]+\.[a-z]{2,}$'),
  registro     text not null references public.registros (id),
  otorgado_por uuid not null default auth.uid() references auth.users (id),
  creado       timestamptz not null default now(),
  primary key (correo, registro)
);
alter table public.accesos_comprador enable row level security;
drop policy if exists "asesor ve sus accesos" on public.accesos_comprador;
create policy "asesor ve sus accesos" on public.accesos_comprador for select to authenticated using (public.es_activo() and (otorgado_por = auth.uid() or public.es_jefatura()));
drop policy if exists "asesor da acceso" on public.accesos_comprador;
create policy "asesor da acceso" on public.accesos_comprador for insert to authenticated with check (
  public.es_activo() and otorgado_por = auth.uid()
  and exists (select 1 from public.registros r where r.id = registro and r.coleccion = 'cobranza' and not r.eliminado and (r.asesor = auth.uid() or public.es_jefatura())));
drop policy if exists "asesor quita acceso" on public.accesos_comprador;
create policy "asesor quita acceso" on public.accesos_comprador for delete to authenticated using (public.es_activo() and (otorgado_por = auth.uid() or public.es_jefatura()));

-- d) lo que ve el comprador: solo sus compras, con los datos de su asesor
create or replace function public.mis_compras() returns table (id text, proyecto text, lote text, cronograma jsonb, pagos jsonb, asesor text, asesor_celular text, desde text)
language sql stable security definer set search_path = public as $$
  select r.id, r.contenido->>'projName', r.contenido->>'lot', coalesce(r.contenido->'sched', '[]'::jsonb), coalesce(r.contenido->'paid', '{}'::jsonb),
         p.nombre, p.celular, r.contenido->>'at'
  from public.accesos_comprador a
  join public.registros r on r.id = a.registro and r.coleccion = 'cobranza' and not r.eliminado
  join public.perfiles p on p.id = r.asesor
  where a.correo = public.correo_sesion() and public.correo_sesion() <> ''
$$;
revoke execute on function public.mis_compras() from public, anon;
grant execute on function public.mis_compras() to authenticated;
