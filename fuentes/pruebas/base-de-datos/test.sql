\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','ana@x'),('00000000-0000-0000-0000-00000000000b','beto@x'),('00000000-0000-0000-0000-00000000000c','jefe@x'),('00000000-0000-0000-0000-00000000000d','baja@x');
insert into perfiles (id,nombre,rol,activo) values ('00000000-0000-0000-0000-00000000000a','Ana','asesor',true),('00000000-0000-0000-0000-00000000000b','Beto','asesor',true),('00000000-0000-0000-0000-00000000000c','Jefa','jefatura',true),('00000000-0000-0000-0000-00000000000d','Baja','asesor',false);
set role authenticated;
-- Ana crea
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into registros (id,coleccion,contenido) values ('clientes:a:1','clientes','{"name":"Cliente Ana"}'),('lotes:L1','lotes','{"id":"L1","st":"Disponible"}');
select 'T1 ana ve' , count(*) from registros;
-- Ana intenta suplantar a Beto
insert into registros (id,coleccion,asesor,contenido) values ('clientes:x','clientes','00000000-0000-0000-0000-00000000000b','{}');
-- Beto
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 'T2 beto ve (solo lote=1)', count(*) from registros;
update registros set contenido='{"hack":1}' where id='clientes:a:1';
select 'T3 cliente ana intacto', contenido from registros where id='clientes:a:1';
-- upsert de Beto sobre el cliente de Ana (lo que haría la sincronización)
insert into registros (id,coleccion,contenido) values ('clientes:a:1','clientes','{"hack":2}') on conflict (id) do update set contenido=excluded.contenido;
update registros set contenido='{"id":"L1","st":"Separado"}' where id='lotes:L1';
update registros set coleccion='clientes', asesor='00000000-0000-0000-0000-00000000000b' where id='lotes:L1';
delete from registros;
select 'T4 historial beto', count(*) from historial;
select 'T5 perfiles beto', count(*) from perfiles;
-- dado de baja
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select 'T6 baja ve', count(*) from registros;
insert into registros (id,coleccion,contenido) values ('clientes:d:1','clientes','{}');
-- anónimo
reset request.jwt.claim.sub; set role anon;
select 'T7 anon ve', count(*) from registros;
-- jefatura
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'T8 jefa ve', id, coleccion, asesor, contenido from registros order by id;
update registros set contenido='{"name":"Cliente Ana (editado por jefa)"}' where id='clientes:a:1';
select 'T9 dueño se mantiene', asesor from registros where id='clientes:a:1';
select 'T10 historial jefa', registro, accion, usuario from historial order by n;
select 'T11 perfiles jefa', count(*) from perfiles;
