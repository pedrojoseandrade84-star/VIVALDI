// Prueba de las fuentes del conector (Salesforce, Dynamics 365, Bitrix24, Odoo, Airtable, Clientify, Google Sheets, CSV, POST/GraphQL, SQL Server)
// y de los envíos de salida (webhooks) con firma, reintentos y sin bucles. Cada API se imita con su formato, paginación y autenticación.
import http from 'node:http'; import {execSync} from 'node:child_process'; import crypto from 'node:crypto';
const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -At -d vv -c "${s.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const M = 'http://127.0.0.1:54321', S = 'http://127.0.0.1:54405';
const RECIBIDO = []; let falla = 0;
const srv = http.createServer((req, res) => { let body = ''; req.on('data', d => body += d); req.on('end', () => { const u = new URL(req.url, S), a = req.headers.authorization || ''; res.setHeader('Content-Type', 'application/json');
  const no = () => { res.statusCode = 401; res.end('{"error":"auth"}'); };
  // Salesforce: SOQL, nextRecordsUrl relativo
  if (u.pathname.startsWith('/services/data/v59.0/query')) { if (a !== 'Bearer sf-tok') return no(); const p2 = u.pathname.endsWith('/01gX-2000');
    return res.end(JSON.stringify(p2 ? {done: true, records: [{attributes: {type: 'Lead'}, Id: '00Q2', FirstName: 'Raúl', LastName: 'Soto', MobilePhone: '944555666', Status: 'Working - Contacted', LeadSource: 'Facebook', CreatedDate: '2026-11-10T10:00:00.000+0000', Owner: {attributes: {}, Name: 'Ana Flores'}}]}
      : {done: false, nextRecordsUrl: '/services/data/v59.0/query/01gX-2000', records: [{attributes: {type: 'Lead'}, Id: '00Q1', FirstName: 'Carla', LastName: 'Núñez', MobilePhone: '+51 933 444 555', Status: 'Open - Not Contacted', LeadSource: 'Web', CreatedDate: '2026-11-09T10:00:00.000+0000', Owner: {Name: 'Beto Ruiz'}}]})); }
  // Dynamics 365: OData, valores con formato
  if (u.pathname === '/api/data/v9.2/leads') { if (a !== 'Bearer dyn-tok' || !/FormattedValue/.test(req.headers.prefer || '')) return no();
    return res.end(JSON.stringify({value: [{leadid: 'd-1', firstname: 'Diego', lastname: 'Vera', mobilephone: '922333444', emailaddress1: 'diego@x.pe', statuscode: 3, 'statuscode@OData.Community.Display.V1.FormattedValue': 'Calificado', createdon: '2026-11-11T00:00:00Z', '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Ana Flores'}]})); }
  // Bitrix24: webhook con la clave en la ruta, paginación con start/next, teléfonos como lista
  if (u.pathname === '/rest/1/abc123/crm.contact.list.json') { const st = +(u.searchParams.get('start') || 0);
    return res.end(JSON.stringify(st === 0 ? {result: [{ID: '7', NAME: 'Elsa', LAST_NAME: 'Mori', PHONE: [{ID: '1', VALUE: '+51 911 222 333', VALUE_TYPE: 'WORK'}], STATUS_ID: 'IN_PROCESS', DATE_CREATE: '2026-11-12T09:00:00+03:00'}], next: 1, total: 2}
      : {result: [{ID: '8', NAME: 'Iván', LAST_NAME: 'Paz', PHONE: [{VALUE: '900111222'}], STATUS_ID: 'JUNK'}], total: 2})); }
  // Odoo: JSON-RPC (login y search_read), many2one como [id, "Nombre"]
  if (u.pathname === '/jsonrpc') { const j = JSON.parse(body); const p = j.params;
    if (p.service === 'common') return res.end(JSON.stringify({jsonrpc: '2.0', id: j.id, result: p.args[2] === 'odoo-clave' ? 2 : false}));
    return res.end(JSON.stringify({jsonrpc: '2.0', id: j.id, result: [{id: 41, name: 'Interés en Lirios', contact_name: 'Fiorella Luna', phone: '988777666', email_from: 'fio@x.pe', stage_id: [2, 'Calificado'], user_id: [5, 'Beto Ruiz'], create_date: '2026-11-13 08:00:00'}]})); }
  // Airtable: registros con fields, paginación con offset
  if (u.pathname === '/v0/appVIV/Lotes') { if (a !== 'Bearer at-tok') return no(); const off = u.searchParams.get('offset');
    return res.end(JSON.stringify(!off ? {records: [{id: 'rec1', fields: {Proyecto: 'Esmeralda', Manzana: 'E', Lote: '1', 'Área': 250, Precio: 38000, Estado: 'Disponible'}}], offset: 'itrA/rec2'}
      : {records: [{id: 'rec2', fields: {Proyecto: 'Esmeralda', Manzana: 'E', Lote: '2', 'Área': 250, Precio: 38000, Estado: 'Vendido'}}]})); }
  // Clientify: Token, listas de teléfonos y correos, next absoluto
  if (u.pathname === '/v1/contacts/') { if (a !== 'Token cl-tok') return no();
    return res.end(JSON.stringify({count: 1, next: null, results: [{id: 501, first_name: 'Sofía', last_name: 'Chávez', phones: [{phone: '955444333', type: 1}], emails: [{email: 'sofia@x.pe'}], status: 'cold-lead', owner_name: 'Ana Flores'}]})); }
  // Google Sheets publicado y un CSV cualquiera
  if (u.pathname === '/hoja.csv') { res.setHeader('Content-Type', 'text/csv'); return res.end('Nombre completo;Celular;Proyecto\r\nKaren Ruiz;977000111;Terrazas\r\n'); }
  // API con POST (por ejemplo GraphQL)
  if (u.pathname === '/graphql' && req.method === 'POST') { const j = JSON.parse(body); if (!/items_page/.test(j.query || '')) return no();
    return res.end(JSON.stringify({data: {boards: [{items_page: {items: [{name: 'Tomás Rey', celular: '966000222', etapa: 'Nuevo'}]}}]}})); }
  // receptor de webhooks (el CRM de Vivaldi o Zapier)
  if (u.pathname === '/recibe') { if (falla > 0) { falla--; res.statusCode = 503; return res.end('{}'); } RECIBIDO.push({h: req.headers, body}); return res.end('{"ok":true}'); }
  res.statusCode = 404; res.end('{}'); }); }).listen(54405);
Object.assign(process.env, {SUPABASE_URL: M, SUPABASE_ANON_KEY: 'anon-test-key', SUPABASE_SERVICE_ROLE_KEY: 'service-test-key', CONECTOR_CLAVE: 'clave-conector',
  SALESFORCE_TOKEN: 'sf-tok', DYNAMICS_TOKEN: 'dyn-tok', BITRIX_WEBHOOK: S + '/rest/1/abc123/', ODOO_CLAVE: 'odoo-clave', AIRTABLE_TOKEN: 'at-tok', CLIENTIFY_TOKEN: 'cl-tok', BD_SQLSERVER: 'Server=x;Database=y', FIRMA_CRM: 'firma-secreta'});
globalThis.__conectorSQL = async (tipo, cad, sql) => tipo === 'sqlserver' && /from Clientes/i.test(sql) ? [{Nombres: 'Luis Ortega', Telefono: '933111000', Estado: 'Separado'}] : [];
const {atender} = await import('./conector.mts');
const llamar = async (body, h) => { const r = await atender(new Request('http://x', {method: 'POST', headers: {'Content-Type': 'application/json', ...h}, body: JSON.stringify(body)})); return [r.status, await r.json()]; };
const login = async (mail, pass) => (await (await fetch(M + '/auth/v1/token?grant_type=password', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({email: mail, password: pass})})).json()).access_token;
const jefa = await login('jefa@vivaldi.pe', 'clave-jefa'), J = {authorization: 'Bearer ' + jefa};
const probar = (tipo, config, coleccion = 'clientes') => llamar({accion: 'probar', tipo, coleccion, config}, J);

let [s, r] = await probar('salesforce', {instancia: 'https://vivaldi.my.salesforce.com', base: S});
ok(s === 200 && r.leidos === 2 && r.filas[0].name === 'Carla Núñez' && r.filas[0].phone === '933444555' && r.filas[0].adv === 'Beto Ruiz' && r.filas[0].src === 'Web' && r.filas[0].created === '2026-11-09',
  'Salesforce: recorre las páginas (nextRecordsUrl relativo) y entiende nombre, celular, asesor (Owner.Name), origen y fecha: ' + JSON.stringify(r.filas && r.filas[0] || r));
ok(r.filas && r.filas[1].stage === 'Contactado' && r.filas[0].stage === 'Nuevo', 'Salesforce: «Working - Contacted» → Contactado, «Open - Not Contacted» → Nuevo');
[s, r] = await probar('dynamics', {organizacion: 'https://vivaldi.crm2.dynamics.com', base: S});
ok(s === 200 && r.filas[0].name === 'Diego Vera' && r.filas[0].email === 'diego@x.pe' && r.filas[0].stage === 'Contactado' && r.filas[0].adv === 'Ana Flores', 'Dynamics 365: usa el texto «Calificado» y el nombre del propietario: ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('bitrix24', {base: S + '/rest/1/abc123/'});
ok(s === 200 && r.leidos === 2 && r.filas[0].name === 'Elsa Mori' && r.filas[0].phone === '911222333' && r.filas[0].stage === 'Contactado' && r.filas[1].stage === 'Descartado', 'Bitrix24: paginación start/next, teléfono desde PHONE[VALUE], IN_PROCESS y JUNK: ' + JSON.stringify(r.filas || r));
[s, r] = await probar('odoo', {url: S, bd: 'vivaldi', usuario: 'jefa@vivaldi.pe'});
ok(s === 200 && r.filas[0].name === 'Fiorella Luna' && r.filas[0].adv === 'Beto Ruiz' && r.filas[0].stage === 'Contactado' && r.filas[0].email === 'fio@x.pe', 'Odoo: inicia sesión por JSON-RPC y entiende [id, "Nombre"]: ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('odoo', {url: S, bd: 'vivaldi', usuario: 'x', secreto: 'AIRTABLE_TOKEN'}); ok(s === 400 && /no aceptó/.test(r.error), 'Odoo: avisa si la clave no es válida');
[s, r] = await probar('airtable', {base_id: 'appVIV', tabla: 'Lotes', base: S}, 'lotes');
ok(s === 200 && r.leidos === 2 && r.filas[0].proj === 'La Esmeralda de Cerro Azul' && r.filas[0].area === 250 && r.filas[1].st === 'Vendido', 'Airtable: paginación con offset y campos con tilde (Área): ' + JSON.stringify(r.filas || r));
[s, r] = await probar('clientify', {base: S});
ok(s === 200 && r.filas[0].name === 'Sofía Chávez' && r.filas[0].phone === '955444333' && r.filas[0].email === 'sofia@x.pe' && r.filas[0].adv === 'Ana Flores', 'Clientify: listas de teléfonos y correos: ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('sheets', {base: S + '/hoja.csv'});
ok(s === 200 && r.filas[0].name === 'Karen Ruiz' && r.filas[0].proj === 'Las Terrazas de Cerro Azul', 'Google Sheets publicado (CSV con punto y coma): ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('api', {url: S + '/graphql', metodo: 'POST', cuerpo: JSON.stringify({query: '{ boards(ids: 1) { items_page { items { name } } } }'}), lista: 'data.boards.0.items_page.items'});
ok(s === 200 && r.filas[0].name === 'Tomás Rey' && r.filas[0].phone === '966000222', 'API por POST (GraphQL, como monday.com): ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('sqlserver', {secreto: 'BD_SQLSERVER', consulta: 'SELECT TOP 500 Nombres, Telefono, Estado FROM Clientes'});
ok(s === 200 && r.filas[0].name === 'Luis Ortega' && r.filas[0].stage === 'Separado', 'SQL Server con consulta de solo lectura: ' + JSON.stringify(r.filas && r.filas[0] || r));
[s, r] = await probar('sqlserver', {secreto: 'BD_SQLSERVER', consulta: 'SELECT * INTO copia FROM Clientes'}); ok(s === 400, 'SQL Server: rechaza SELECT INTO');
[s, r] = await probar('salesforce', {}); ok(s === 400 && /Falta la dirección de Salesforce/.test(r.error), 'mensaje claro si falta un dato');

// ---------- salida: envíos al CRM de Vivaldi ----------
const rpcJ = async (fn, body) => { const x = await fetch(M + '/rest/v1/rpc/' + fn, {method: 'POST', headers: {apikey: 'anon-test-key', Authorization: 'Bearer ' + jefa, 'Content-Type': 'application/json'}, body: JSON.stringify(body)}); return [x.status, await x.json().catch(() => null)]; };
let [sw] = await rpcJ('guardar_webhook', {p: {nombre: 'Malo', url: 'http://servidor-inseguro.pe/x', eventos: ['solicitud']}}); ok(sw >= 400, 'rechaza direcciones sin https');
[sw] = await rpcJ('guardar_webhook', {p: {nombre: 'CRM Vivaldi', url: S + '/recibe', eventos: ['solicitud', 'cliente_nuevo', 'cliente_etapa', 'lote_estado', 'venta'], secreto: 'FIRMA_CRM'}}); ok(sw < 300, 'la jefatura crea el envío al CRM');
await fetch(M + '/rest/v1/solicitudes', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({nombre: 'Nadia Torres', celular: '987000111', proyecto: 'La Planicie de Asia', origen: 'Facebook', campana: 'Preventa'})});
q("insert into registros (id, coleccion, asesor, contenido) values ('clientes:00000000-0000-0000-0000-00000000000a:w1','clientes','00000000-0000-0000-0000-00000000000a','{\"id\":\"w1\",\"name\":\"Omar Díaz\",\"phone\":\"955000222\",\"stage\":\"Nuevo\",\"proj\":\"La Portada del Sol\"}')");
q("update registros set contenido = contenido || '{\"stage\":\"Visita agendada\"}' where id = 'clientes:00000000-0000-0000-0000-00000000000a:w1'");
q("insert into registros (id, coleccion, asesor, contenido) values ('lotes:w2','lotes','00000000-0000-0000-0000-00000000000c','{\"id\":\"w2\",\"proj\":\"La Planicie de Asia\",\"mz\":\"Z\",\"lt\":\"1\",\"st\":\"Disponible\",\"price\":29000}')");
q("update registros set contenido = contenido || '{\"st\":\"Separado\"}' where id = 'lotes:w2'");
q("insert into registros (id, coleccion, asesor, contenido) values ('clientes:00000000-0000-0000-0000-00000000000a:w3','clientes','00000000-0000-0000-0000-00000000000a','{\"id\":\"w3\",\"name\":\"Del CRM\",\"phone\":\"955000333\",\"ext_conector\":\"9:x\"}')");
ok(q("select string_agg(evento, ',' order by id) from webhooks_cola") === 'solicitud,cliente_nuevo,cliente_etapa,lote_estado', 'en cola: solicitud, cliente nuevo, cambio de etapa y lote separado (no reenvía lo que vino del CRM): ' + q("select string_agg(evento, ',' order by id) from webhooks_cola"));
falla = 1; const [, e1] = await llamar({}, {'x-conector-clave': 'clave-conector'});
ok(e1.salida && e1.salida.enviados === 3 && e1.salida.fallidos === 1, 'entrega: 3 enviados y 1 con error del receptor (se reintentará): ' + JSON.stringify(e1.salida));
q("update webhooks_cola set enviar_desde = now() where estado = 'pendiente'"); const [, e2] = await llamar({accion: 'entregar'}, J);
ok(e2.enviados === 1 && q("select count(*) from webhooks_cola where estado = 'enviado'") === '4', 'el reintento lo entrega; los 4 quedan enviados');
const sol = RECIBIDO.map(x => JSON.parse(x.body)).find(x => x.evento === 'solicitud');
ok(sol && sol.datos.nombre === 'Nadia Torres' && sol.datos.campana === 'Preventa' && sol.datos.origen === 'Facebook', 'el CRM recibe la solicitud con nombre, origen y campaña');
const r0 = RECIBIDO[0], esperado = 'sha256=' + crypto.createHmac('sha256', 'firma-secreta').update(r0.body).digest('hex');
ok(r0.h['x-vivaldi-firma'] === esperado && r0.h['x-vivaldi-evento'], 'cada envío va firmado (HMAC-SHA256) para que el CRM verifique que viene de Vivaldi');
const [, wl] = await rpcJ('webhooks_lista', {}); ok(Array.isArray(wl) && wl[0].pendientes === 0 && /correcto/.test(wl[0].resultado || ''), 'la herramienta ve el estado del envío: ' + JSON.stringify(wl && wl[0]).slice(0, 160));
const anon = await fetch(M + '/rest/v1/rpc/webhooks_tomar', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: '{}'}); ok(anon.status >= 400, 'nadie sin la clave de servicio toma la cola de envíos');
srv.close();
