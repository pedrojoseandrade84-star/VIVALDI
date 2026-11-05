\set ON_ERROR_STOP 0
\pset footer off
-- datos de asesores
update perfiles set codigo='ana', celular='911111111' where nombre='Ana Flores';
update perfiles set codigo='beto', celular='922222222' where nombre='Beto Ruiz';
update perfiles set celular='933333333' where nombre='Jefa Comercial';
-- 1) solicitud con enlace de Beto: va a Beto aunque el turno sea de Ana
set role anon; select set_config('request.jwt.claim.sub','',false);
insert into solicitudes (nombre, celular, proyecto, asesor_codigo) values ('Rosa Vargas', '981234567', 'Las Terrazas de Cerro Azul', 'beto');
insert into solicitudes (nombre, celular, proyecto, asesor_codigo) values ('Luis Paz', '981234568', 'La Planicie de Asia', 'noexiste');
insert into solicitudes (nombre, celular, proyecto) values ('Carla Ruiz', '981234569', null);
select * from asesor_publico('BETO');
select count(*) as anon_ve_mensajes from mensajes;
select count(*) as anon_ve_proyectos from proyectos;
reset role;
select s.nombre, p.nombre asesor, s.asesor_codigo from solicitudes s left join perfiles p on p.id=s.asesor order by s.id;
select para, plantilla, variables, motivo from mensajes order by id;
-- 2) visita agendada para mañana desde la herramienta (como Ana)
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into registros (id, coleccion, contenido) values ('clientes:a:v1','visitas', jsonb_build_object('id','v1','name','María Soto','phone','+51 987 654 321','proj','La Planicie de Asia','date',((now() at time zone 'America/Lima')::date+1)::text,'time','10:00','meet','En el proyecto','st','prog'));
reset role;
select plantilla, para, variables->>2 fecha, to_char(enviar_desde at time zone 'America/Lima','YYYY-MM-DD HH24:MI') sale, estado from mensajes where ref like 'vis:%' order by id;
-- reprogramar a otra hora: se cancelan los avisos anteriores
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
update registros set contenido = contenido || '{"time":"16:00"}' where id='clientes:a:v1';
reset role;
select plantilla, variables->>3 hora, estado from mensajes where ref like 'vis:%' order by id;
-- 3) venta con cronograma: recordatorio 3 días antes de las 2 próximas cuotas
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into registros (id, coleccion, contenido) values ('cob:a:k1','cobranza', jsonb_build_object('id','k1','name','Pedro Salas','phone','984666777','projName','La Planicie de Asia',
  'sched', jsonb_build_array(jsonb_build_object('i',1,'d',((now() at time zone 'America/Lima')::date-2)::text,'amt',967), jsonb_build_object('i',2,'d',((now() at time zone 'America/Lima')::date+10)::text,'amt',967), jsonb_build_object('i',3,'d',((now() at time zone 'America/Lima')::date+40)::text,'amt',967), jsonb_build_object('i',4,'d',((now() at time zone 'America/Lima')::date+70)::text,'amt',959)),
  'paid','{}'::jsonb));
reset role;
select ref, plantilla, variables->>2 monto, to_char(enviar_desde at time zone 'America/Lima','YYYY-MM-DD HH24:MI') sale from mensajes where ref like 'cob:%' order by id;
-- pagar la cuota 2: se cancela su aviso
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
update registros set contenido = jsonb_set(contenido,'{paid}','{"2":"2026-11-05"}') where id='cob:a:k1';
reset role;
select ref, estado from mensajes where ref like 'cob:%' order by id;
-- 4) tarea periódica: cuota vencida, alerta a jefatura (solicitud antigua), resumen del asesor
update solicitudes set fecha = now() - interval '2 hours' where nombre='Rosa Vargas';
insert into registros (id, coleccion, asesor, contenido) values ('cli:a:1','clientes','00000000-0000-0000-0000-00000000000a', jsonb_build_object('id','c1','name','X','stage','Nuevo','next',((now() at time zone 'America/Lima')::date-1)::text));
select automatizacion_periodica() as nuevos;
select ref, plantilla, para from mensajes where ref like '%vencida%' or ref like '%alerta%' or ref like 'dia:%' order by id;
select automatizacion_periodica() as nuevos_segunda_vez;
-- 5) no contactar
insert into no_contactar values ('981234570', now(), 'pidió no recibir mensajes');
set role anon; insert into solicitudes (nombre, celular) values ('Sin Mensajes', '981234570'); reset role;
select count(*) as mensajes_a_bloqueado from mensajes where para='981234570';
-- 6) seguridad: asesor no ve mensajes; jefatura sí; asesor no edita proyectos; jefatura sí
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select count(*) as asesor_ve_mensajes from mensajes;
insert into proyectos (id, contenido) values ('planicie','{"nombre":"x"}');
select public.encolar('999999999','x','[]','x','hack');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select count(*) as jefa_ve_mensajes from mensajes;
insert into proyectos (id, contenido) values ('planicie','{"nombre":"La Planicie de Asia","precio":29000}');
update proyectos set contenido = contenido || '{"precio":30000}' where id='planicie';
reset role;
set role anon; select id, contenido->>'precio' precio from proyectos; reset role;
select registro, accion from historial where coleccion='proyectos' order by n;
-- 7) horario: mensaje creado de noche sale a las 8:30
select to_char(en_horario(((now() at time zone 'America/Lima')::date + time '22:15') at time zone 'America/Lima') at time zone 'America/Lima','HH24:MI') noche, to_char(en_horario(((now() at time zone 'America/Lima')::date + time '06:00') at time zone 'America/Lima') at time zone 'America/Lima','HH24:MI') madrugada;
