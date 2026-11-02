set role anon;
insert into solicitudes (nombre,celular,proyecto,plazo) values ('Lucía Torres','987111222','La Planicie de Asia','Este mes');
insert into solicitudes (nombre,celular) values ('Jorge Ramos','987333444');
insert into solicitudes (nombre,celular) values ('Lucía Torres','987111222');  -- repetida
insert into solicitudes (nombre,celular) values ('Ana Díaz','987555666');
insert into solicitudes (nombre,celular,asesor,estado) values ('Trampa','987000111','00000000-0000-0000-0000-00000000000a','en herramienta');
insert into solicitudes (nombre,celular) values ('X','123');  -- inválida
select 'anon ve', count(*) from solicitudes;
insert into reclamos (tipo,nombre,detalle) values ('Reclamo','María Pérez','No me entregaron la constancia de pago');
select 'anon ve reclamos', count(*) from reclamos;
reset role; select 'T reparto', nombre, (select nombre from perfiles p where p.id=s.asesor), estado from solicitudes s order by id;
select 'T reclamo', codigo, vence, (vence - fecha::date) dias from reclamos;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select 'Ana ve', count(*) from solicitudes;
update solicitudes set estado='en herramienta', nombre='cambiado', asesor='00000000-0000-0000-0000-00000000000b';
select 'Ana tras update', nombre, estado, tomada is not null, (select nombre from perfiles p where p.id=s.asesor) from solicitudes s;
select 'Ana reclamos', count(*) from reclamos;
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select 'Jefa ve', count(*) from solicitudes; select 'Jefa reclamos', count(*) from reclamos;
update reclamos set estado='respondido', respuesta='Se envió la constancia', vence='2030-01-01';
select 'Jefa respondió', estado, vence < '2030-01-01', respondido is not null from reclamos;
