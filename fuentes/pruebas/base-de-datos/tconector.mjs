// Prueba del conector con el CRM o la base de datos de Vivaldi (función funciones/conector).
// CRM simulado tipo HubSpot (con páginas), API genérica de inventario y base PostgreSQL de origen.
import http from 'node:http'; import {execSync} from 'node:child_process';
const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -At -d vv -c "${s.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const M = 'http://127.0.0.1:54321';
// ---------- CRM simulado ----------
let contactos = [
  {id: '101', properties: {hs_object_id: '101', firstname: 'María', lastname: 'Pérez', mobilephone: '+51 987 654 321', email: 'MARIA@correo.pe', lifecyclestage: 'lead', createdate: '2026-11-03T15:20:00Z', proyecto: 'Planicie', asesor: 'Ana Flores'}},
  {id: '102', properties: {hs_object_id: '102', firstname: 'Juan', lastname: 'Ríos', mobilephone: '912345678', email: '', lifecyclestage: 'opportunity', createdate: '2026-11-05T10:00:00Z', proyecto: 'Terrazas de Cerro Azul', asesor: 'Beto Ruiz'}},
  {id: '103', properties: {hs_object_id: '103', firstname: 'Lucía', lastname: 'Gómez', mobilephone: '955111222', lifecyclestage: 'customer', createdate: '2026-11-06T10:00:00Z', proyecto: 'Lirios', asesor: 'Persona Que No Existe'}},
  {id: '104', properties: {hs_object_id: '104', firstname: '', lastname: '', mobilephone: '', lifecyclestage: 'lead'}}
];
let stock = [{proyecto: 'La Planicie de Asia', manzana: 'C', lote: '1', area_m2: 200, precio: 'S/ 31,500', estado: 'Libre'}, {proyecto: 'Planicie', manzana: 'C', lote: '2', area_m2: 200, precio: 29000, estado: 'Reservado'}];
const AUTH = [];
const srv = http.createServer((req, res) => { const u = new URL(req.url, 'http://x'); AUTH.push(req.headers.authorization || '');
  res.setHeader('Content-Type', 'application/json');
  if (u.pathname === '/crm/v3/objects/contacts') { if (req.headers.authorization !== 'Bearer token-hubspot') { res.statusCode = 401; return res.end('{"message":"bad token"}'); }
    const after = +(u.searchParams.get('after') || 0), page = contactos.slice(after, after + 2);
    return res.end(JSON.stringify({results: page, paging: after + 2 < contactos.length ? {next: {link: `http://127.0.0.1:54402/crm/v3/objects/contacts?after=${after + 2}`}} : undefined})); }
  if (u.pathname === '/inventario') return res.end(JSON.stringify({data: {items: stock}}));
  res.statusCode = 404; res.end('{}'); }).listen(54402);
Object.assign(process.env, {SUPABASE_URL: M, SUPABASE_ANON_KEY: 'anon-test-key', SUPABASE_SERVICE_ROLE_KEY: 'service-test-key', CONECTOR_CLAVE: 'clave-conector', HUBSPOT_TOKEN: 'token-hubspot', BD_VIVALDI: 'postgres://solo-lectura@bd/vivaldi'});
// base de origen: un esquema aparte en el PostgreSQL de prueba, leída con psql (en Supabase se usa el controlador de Deno)
q("drop schema if exists crm_vivaldi cascade; create schema crm_vivaldi; create table crm_vivaldi.lotes (proyecto text, mz text, numero text, metraje numeric, precio_lista numeric, situacion text); insert into crm_vivaldi.lotes values ('La Portada del Sol','D','7',90,37900,'Disponible'),('La Portada del Sol','D','8',90,37900,'Vendido')");
globalThis.__conectorSQL = async (tipo, cad, sql) => JSON.parse(q(`select coalesce(json_agg(t), '[]') from (${sql}) t`));
const {atender} = await import('./conector.mts');
const llamar = async (body, h) => { const r = await atender(new Request('http://x', {method: 'POST', headers: {'Content-Type': 'application/json', ...h}, body: JSON.stringify(body)})); return [r.status, await r.json()]; };
const login = async (mail, pass) => (await (await fetch(M + '/auth/v1/token?grant_type=password', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({email: mail, password: pass})})).json()).access_token;
const rpcU = async (tok, fn, body) => { const r = await fetch(M + '/rest/v1/rpc/' + fn, {method: 'POST', headers: {apikey: 'anon-test-key', Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json'}, body: JSON.stringify(body || {})}); return [r.status, await r.json().catch(() => null)]; };
const jefa = await login('jefa@vivaldi.pe', 'clave-jefa'), ana = await login('ana@vivaldi.pe', 'clave-ana');

// seguridad
ok((await llamar({}, {'x-conector-clave': 'mala'}))[0] === 401, 'sin la clave correcta no sincroniza');
ok((await llamar({accion: 'probar', tipo: 'hubspot', config: {}}, {authorization: 'Bearer ' + ana}))[0] === 403, 'una asesora no puede usar el conector');
const [sa] = await rpcU(ana, 'guardar_conector', {p: {nombre: 'X', tipo: 'api', coleccion: 'clientes'}}); ok(sa >= 400, 'una asesora no puede crear conectores');
const [sb] = await rpcU(jefa, 'guardar_conector', {p: {nombre: 'Malo', tipo: 'api', coleccion: 'clientes', config: {token: 'secreto-en-claro'}}}); ok(sb >= 400, 'la base rechaza guardar una clave dentro de la configuración');
const anonS = await fetch(M + '/rest/v1/rpc/conector_guardar', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: '{"p_id":1,"p_filas":[]}'}); ok(anonS.status >= 400, 'nadie sin la clave de servicio puede escribir por el conector');

// probar (desde la herramienta) con el CRM tipo HubSpot apuntando al simulador
const cfgH = {url: 'http://127.0.0.1:54402/crm/v3/objects/contacts?limit=2', encabezado: 'Authorization', prefijo: 'Bearer ', secreto: 'HUBSPOT_TOKEN', lista: 'results', siguiente: 'paging.next.link', item: 'properties'};
const [sp, pr] = await llamar({accion: 'probar', tipo: 'api', coleccion: 'clientes', config: cfgH}, {authorization: 'Bearer ' + jefa});
ok(sp === 200 && pr.leidos === 4, 'probar: lee las 4 personas recorriendo las páginas del CRM: ' + JSON.stringify(pr).slice(0, 160));
ok(pr.mapa && pr.mapa.name === 'firstname' && pr.mapa.last === 'lastname' && pr.mapa.phone === 'mobilephone' && pr.mapa.stage === 'lifecyclestage' && pr.mapa.adv === 'asesor', 'reconoce las columnas del CRM: ' + JSON.stringify(pr.mapa));
ok(pr.filas && pr.filas[0].name === 'María Pérez' && pr.filas[0].phone === '987654321' && pr.filas[0].proj === 'La Planicie de Asia' && pr.filas[0].stage === 'Nuevo' && pr.filas[0].created === '2026-11-03', 'vista previa normalizada: ' + JSON.stringify(pr.filas && pr.filas[0]));
ok(!AUTH.some(a => a && a !== 'Bearer token-hubspot'), 'el token del CRM sale de los secretos de la función');

// guardar y sincronizar
const [, idC] = await rpcU(jefa, 'guardar_conector', {p: {nombre: 'CRM Vivaldi', tipo: 'api', coleccion: 'clientes', config: cfgH}});
const val = j => { if (Array.isArray(j) && j.length === 1) j = j[0]; return j && typeof j === 'object' ? Object.values(j)[0] : j; }; const cid = val(idC); ok(+cid > 0, 'la jefatura guarda el conector');
q("insert into registros (id, coleccion, asesor, contenido) values ('clientes:00000000-0000-0000-0000-00000000000a:x1', 'clientes', '00000000-0000-0000-0000-00000000000a', '{\"id\":\"x1\",\"name\":\"Juan Ríos\",\"phone\":\"912 345 678\",\"stage\":\"Nuevo\",\"proj\":\"\"}')");
const [s1, r1] = await llamar({}, {'x-conector-clave': 'clave-conector'});
const res1 = r1.resultados && r1.resultados[0]; ok(s1 === 200 && res1 && res1.ok && res1.nuevos === 2 && res1.actualizados === 1 && res1.omitidos === 1, 'sincroniza: 2 nuevos, 1 ya existía (se completa) y 1 vacío: ' + JSON.stringify(res1));
const maria = JSON.parse(q("select json_build_object('asesor', asesor, 'c', contenido) from registros where contenido->>'name' = 'María Pérez'"));
ok(maria.asesor === '00000000-0000-0000-0000-00000000000a' && maria.c.email === 'maria@correo.pe' && maria.c.stage === 'Nuevo' && /^crm\d+-101$/.test(maria.c.id), 'María queda asignada a Ana (su asesora en el CRM): ' + JSON.stringify(maria));
const juan = JSON.parse(q("select contenido from registros where id = 'clientes:00000000-0000-0000-0000-00000000000a:x1'"));
ok(juan.stage === 'Contactado' && juan.proj === 'Las Terrazas de Cerro Azul' && juan.name === 'Juan Ríos', 'Juan (que ya estaba) avanza de etapa y se completa su proyecto, sin duplicarse: ' + JSON.stringify(juan));
ok(q("select count(*) from registros where contenido->>'name' = 'Juan Ríos'") === '1', 'Juan no se duplica');
const lucia = q("select asesor || ' ' || (contenido->>'stage') from registros where contenido->>'name' = 'Lucía Gómez'");
ok(lucia === '00000000-0000-0000-0000-00000000000c Vendido', 'si el asesor no existe va a la jefatura; «customer» se entiende como Vendido: ' + lucia);
ok(q("select count(*) from mensajes") === '0', 'no envía WhatsApp a los contactos importados');
ok(/4 leídos · 2 nuevos · 1 actualizados · 1 omitidos/.test(q(`select resultado from conectores where id = ${cid}`)), 'queda el resultado de la sincronización: ' + q(`select resultado from conectores where id = ${cid}`));
// segunda pasada: nada nuevo, y un cambio en el CRM se refleja
const [, r2] = await llamar({}, {'x-conector-clave': 'clave-conector'}); ok(r2.conectores === 0, 'respeta la frecuencia: no vuelve a leer antes de tiempo');
contactos[0].properties.lifecyclestage = 'salesqualifiedlead'; contactos.push({id: '105', properties: {hs_object_id: '105', firstname: 'Rosa', lastname: 'Vela', mobilephone: '933222111', lifecyclestage: 'lead', proyecto: 'Esmeralda'}});
const [, r3] = await llamar({accion: 'sincronizar', id: cid}, {authorization: 'Bearer ' + jefa});
ok(r3.ok && r3.nuevos === 1 && r3.actualizados === 1, '«Sincronizar ahora»: trae el contacto nuevo y el cambio de etapa: ' + JSON.stringify(r3));
ok(q("select contenido->>'proj' from registros where contenido->>'name' = 'Rosa Vela'") === 'La Esmeralda de Cerro Azul', 'reconoce el proyecto abreviado');
ok(q("select count(*) from registros where coleccion = 'clientes'") === '4', 'en total 4 clientes (Juan, María, Lucía y Rosa), sin duplicados');
// Ana ve a sus clientes en la herramienta (lo que trae el CRM entra por la misma sincronización)
const vis = await (await fetch(M + '/rest/v1/registros?select=id&coleccion=eq.clientes', {headers: {apikey: 'anon-test-key', Authorization: 'Bearer ' + ana}})).json();
ok(vis.some(x => /crm\d+-101/.test(x.id)), 'Ana ve a María en su herramienta');

// inventario por API genérica y por base PostgreSQL
const [, idL] = await rpcU(jefa, 'guardar_conector', {p: {nombre: 'Stock API', tipo: 'api', coleccion: 'lotes', config: {url: 'http://127.0.0.1:54402/inventario', lista: 'data.items'}}});
const [, idP] = await rpcU(jefa, 'guardar_conector', {p: {nombre: 'BD Vivaldi', tipo: 'postgres', coleccion: 'lotes', config: {secreto: 'BD_VIVALDI', consulta: 'select proyecto, mz, numero as lote, metraje, precio_lista, situacion as estado from crm_vivaldi.lotes', mapa: {proj: 'proyecto', mz: 'mz', lt: 'lote', area: 'metraje', price: 'precio lista', st: 'estado'}}}});
const [, r4] = await llamar({}, {'x-conector-clave': 'clave-conector'});
ok(r4.resultados && r4.resultados.length === 2 && r4.resultados.every(x => x.ok), 'sincroniza los dos conectores de lotes: ' + JSON.stringify(r4.resultados));
const pub = await (await fetch(M + '/rest/v1/rpc/lotes_publicos', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: '{}'})).json();
const c1 = pub.find(l => l.mz === 'C' && l.lt === '1'), c2 = pub.find(l => l.mz === 'C' && l.lt === '2'), d7 = pub.find(l => l.mz === 'D' && l.lt === '7'), d8 = pub.find(l => l.mz === 'D' && l.lt === '8');
ok(c1 && +c1.precio === 31500 && c1.disponible && c2 && !c2.disponible && d7 && d7.disponible && d8 && !d8.disponible, 'el portal y el explorador ya muestran la disponibilidad real (API y base de datos)');
stock[0].estado = 'Vendido'; q(`update conectores set ultimo = null where id = ${val(idL)}`);
await llamar({}, {'x-conector-clave': 'clave-conector'});
ok(q("select contenido->>'st' from registros where coleccion = 'lotes' and contenido->>'mz' = 'C' and contenido->>'lt' = '1'") === 'Vendido' && q("select count(*) from registros where coleccion = 'lotes'") === '4', 'un lote vendido en el sistema de Vivaldi se actualiza sin duplicarse');
const [sx, rx] = await llamar({accion: 'probar', tipo: 'postgres', config: {secreto: 'BD_VIVALDI', consulta: 'delete from crm_vivaldi.lotes'}}, {authorization: 'Bearer ' + jefa});
ok(sx === 400 && /solo lectura/.test(rx.error) && q('select count(*) from crm_vivaldi.lotes') === '2', 'rechaza consultas que no son de solo lectura');
const [sy, ry] = await llamar({accion: 'probar', tipo: 'hubspot', config: {secreto: 'NO_EXISTE'}}, {authorization: 'Bearer ' + jefa});
ok(sy === 400 && /Falta el secreto NO_EXISTE/.test(ry.error), 'avisa claro si falta un secreto');
const [, lst] = await rpcU(jefa, 'conectores_lista', {}); ok(Array.isArray(lst) && lst.length === 3 && !JSON.stringify(lst).includes('token-hubspot'), 'la lista de conectores no expone ninguna clave');
q('drop schema crm_vivaldi cascade'); srv.close();
