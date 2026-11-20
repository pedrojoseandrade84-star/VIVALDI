// Prueba del asesor virtual 24/7 (funciones/asistente): web y WhatsApp, herramientas, registro del cliente, paso a un asesor,
// firma de Meta, mensajes repetidos, límite diario y la respuesta del asesor desde la bandeja.
// El cliente de Anthropic se reemplaza por un sustituto que responde con la forma documentada de la API (no se llama a la API real).
import http from 'node:http'; import {execSync} from 'node:child_process'; import crypto from 'node:crypto';
const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -At -d vv -c "${s.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const M = 'http://127.0.0.1:54321';
const META = []; const meta = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { META.push({url: req.url, auth: req.headers.authorization, j: JSON.parse(b)}); res.setHeader('Content-Type', 'application/json'); res.end('{"messages":[{"id":"wamid.x"}]}'); }); }).listen(54406);
Object.assign(process.env, {SUPABASE_URL: M, SUPABASE_ANON_KEY: 'anon-test-key', SUPABASE_SERVICE_ROLE_KEY: 'service-test-key', WHATSAPP_TOKEN: 'wa-tok', WHATSAPP_PHONE_ID: '555', WHATSAPP_APP_SECRET: 'secreto-app',
  WHATSAPP_VERIFY_TOKEN: 'verifica-vivaldi', WHATSAPP_API: 'http://127.0.0.1:54406', ASISTENTE_LIMITE_DIA: '6'});

// ---- sustituto del SDK: guion de respuestas y registro de cada pedido ----
const PEDIDOS = []; let GUION = [];
const texto = t => ({id: 'msg_' + Math.random().toString(36).slice(2), type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{type: 'text', text: t}]});
const herr = (name, input, previo = '') => ({id: 'msg_h', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'tool_use',
  content: [...(previo ? [{type: 'text', text: previo}] : []), {type: 'tool_use', id: 'toolu_' + Math.random().toString(36).slice(2, 10), name, input}]});
globalThis.__AnthropicPrueba = {beta: {messages: {create: async p => { PEDIDOS.push(JSON.parse(JSON.stringify(p))); const r = GUION.shift(); if (!r) throw new Error('guion vacío'); return typeof r === 'function' ? r(p) : r; }}}};
const {atender, herramientas} = await import('./asistente.mts');
const web = async (conv, mensaje) => { const r = await atender(new Request('http://x', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({conversacion: conv, mensaje})})); return [r.status, await r.json()]; };
const firmar = raw => 'sha256=' + crypto.createHmac('sha256', 'secreto-app').update(raw).digest('hex');
const wa = async (de, body, id, nombre = 'Marta', firma = null) => { const raw = JSON.stringify({object: 'whatsapp_business_account', entry: [{id: '1', changes: [{field: 'messages', value: {messaging_product: 'whatsapp', contacts: [{wa_id: de, profile: {name: nombre}}],
  messages: [typeof body === 'string' ? {from: de, id, timestamp: '1', type: 'text', text: {body}} : {from: de, id, timestamp: '1', ...body}]}}]}]});
  const r = await atender(new Request('http://x', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Hub-Signature-256': firma ?? firmar(raw)}, body: raw})); return r.status; };

// cada corrida empieza limpia
q("delete from conversacion_mensajes where conversacion like 'web:prueba%' or conversacion = 'wa:51912345678'"); q("delete from conversaciones where id like 'web:prueba%' or id = 'wa:51912345678'");
q("delete from mensajes where para in ('987654321','912345678')"); q("delete from solicitudes where nombre in ('Julia Ramos','Marta Salas')");
// datos: lotes reales en el inventario
q("delete from registros where coleccion='lotes' and id like 'lotes:as%'");
q(`insert into registros (id, coleccion, asesor, contenido) values
 ('lotes:as1','lotes','00000000-0000-0000-0000-00000000000c','{"id":"as1","proj":"La Planicie de Asia","mz":"A","lt":"1","area":"200","price":"35000","st":"Disponible"}'),
 ('lotes:as2','lotes','00000000-0000-0000-0000-00000000000c','{"id":"as2","proj":"La Planicie de Asia","mz":"A","lt":"2","area":"200","price":"37000","st":"Disponible"}'),
 ('lotes:as3','lotes','00000000-0000-0000-0000-00000000000c','{"id":"as3","proj":"La Planicie de Asia","mz":"A","lt":"3","area":"200","price":"36000","st":"Vendido"}')`);

// ---------- 1. el pedido a la API tiene la forma correcta ----------
const H = herramientas();
ok(H.length === 4 && H.every(t => t.strict === true && t.input_schema.additionalProperties === false && t.input_schema.required.length === Object.keys(t.input_schema.properties).length),
  'herramientas estrictas: todos los campos obligatorios y sin campos extra');
const C1 = 'web:prueba-cliente-01';
GUION = [herr('consultar_lotes', {proyecto: 'La Planicie de Asia'}), p => { const res = p.messages.at(-1).content[0]; const d = JSON.parse(res.content)[0];
  return texto(`En La Planicie quedan ${d.disponibles} lotes, desde S/ ${d.precio_desde.toLocaleString('en-US')}.`); }];
let [s, r] = await web(C1, '¿Qué lotes quedan en La Planicie?');
const P0 = PEDIDOS[0];
ok(s === 200 && r.respuesta === 'En La Planicie quedan 2 lotes, desde S/ 35,000.', 'web: consulta el inventario en vivo (2 libres, el vendido no cuenta): ' + JSON.stringify(r));
ok(P0.model === 'claude-opus-5-5' && P0.betas.includes('server-side-fallback-2026-07-01') && P0.fallbacks === 'default' && P0.output_config.effort === 'low' && P0.cache_control.type === 'ephemeral' && !('tool_choice' in P0),
  'pedido: modelo Opus 5.5, reintento con otro modelo activado, esfuerzo bajo, caché y sin forzar herramientas');
ok(P0.messages[0].role === 'user' && P0.messages.some(m => m.role === 'system' && /canal web/.test(m.content)) && /Planicie de Asia/.test(P0.system) && !/Vendido 100%/.test(JSON.stringify(P0.tools)), 'contexto: el cliente habla primero, el canal va en un mensaje de sistema y los proyectos en las instrucciones');
ok(/idioma en que te escribe el cliente/.test(P0.system), 'bilingüe: responde en el idioma del cliente (español o inglés)');
const P1 = PEDIDOS[1];
ok(P1.messages.at(-2).role === 'assistant' && P1.messages.at(-2).content[0].type === 'tool_use' && P1.messages.at(-1).content[0].type === 'tool_result' && P1.messages.at(-1).content[0].tool_use_id === P1.messages.at(-2).content[0].id,
  'bucle: devuelve el resultado de la herramienta con el mismo id y la respuesta anterior sin cambios');
ok(q(`select string_agg(rol, ',' order by id) from conversacion_mensajes where conversacion='${C1}'`) === 'cliente,asistente', 'la conversación queda guardada (cliente y asistente)');

// ---------- 2. cuotas y registro con permiso ----------
GUION = [herr('calcular_cuota', {precio: 36000, inicial_porcentaje: 20, meses: 36}), p => texto('Inicial ' + JSON.parse(p.messages.at(-1).content[0].content).inicial + ', cuota ' + JSON.parse(p.messages.at(-1).content[0].content).cuota_mensual)];
[s, r] = await web(C1, '¿Cuánto pagaría al mes por uno de 36 mil con 20 % a 36 meses?');
ok(r.respuesta === 'Inicial 7200, cuota 800', 'calcula la cuota sin intereses: ' + r.respuesta);
ok(PEDIDOS.at(-2).messages.filter(m => m.role !== 'system').map(m => m.role).join(',') === 'user,assistant,user', 'el historial viaja como texto (pregunta, respuesta, pregunta)');
GUION = [herr('registrar_cliente', {nombre: 'Julia Ramos', celular: '987654321', proyecto: 'La Planicie de Asia', interes: 'visita', dia_visita: 'sábado 29 de noviembre', resumen: 'Busca lote de 200 m²', consentimiento: false}),
  p => { const j = JSON.parse(p.messages.at(-1).content[0].content); return texto(j.ok === false ? '¿Me autorizas a registrar tus datos?' : 'mal'); }];
[s, r] = await web(C1, 'Quiero visitar el sábado, soy Julia Ramos 987654321');
ok(r.respuesta === '¿Me autorizas a registrar tus datos?' && q("select count(*) from solicitudes where nombre='Julia Ramos'") === '0', 'sin permiso no registra nada (Ley 29733)');
GUION = [herr('registrar_cliente', {nombre: 'Julia Ramos', celular: '987654321', proyecto: 'La Planicie de Asia', interes: 'visita', dia_visita: 'sábado 29 de noviembre', resumen: 'Busca lote de 200 m²', consentimiento: true}), texto('¡Listo, Julia! Tu asesor te confirma la hora.')];
[s, r] = await web(C1, 'Sí, autorizo');
const sol = q("select origen||'|'||coalesce(visita,'')||'|'||coalesce(proyecto,'') from solicitudes where nombre='Julia Ramos'");
ok(sol === 'Asistente web|sábado 29 de noviembre|La Planicie de Asia', 'con permiso crea la solicitud con origen, proyecto y día de visita: ' + sol);
const cola = q("select coalesce(string_agg(plantilla, ',' order by id), '') from mensajes where para='987654321'");
ok(!/bienvenida_cliente/.test(cola), 'no manda la bienvenida automática: el cliente ya está conversando (' + cola + ')');
ok(q(`select coalesce(solicitud::text,'') <> '' from conversaciones where id='${C1}'`) === 't', 'la conversación queda unida a la solicitud');

// ---------- 3. paso a un asesor: el asistente se calla ----------
GUION = [herr('derivar_a_asesor', {motivo: 'Pide descuento', resumen: 'Quiere 10 % de descuento por pago al contado', nombre: null, celular: null, proyecto: null}), texto('Te paso con tu asesor para verlo.')];
[s, r] = await web(C1, '¿Me hacen descuento si pago al contado?');
ok(r.estado === 'asesor' && q(`select estado from conversaciones where id='${C1}'`) === 'asesor', 'un descuento pasa a un asesor');
const n0 = PEDIDOS.length; GUION = [texto('no debería')];
[s, r] = await web(C1, '¿Hola?'); ok(PEDIDOS.length === n0 && r.estado === 'asesor', 'con un asesor a cargo, el asistente no responde');

// ---------- 4. declinación del modelo ----------
const C2 = 'web:prueba-cliente-02';
GUION = [{id: 'msg_r', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'refusal', content: []}];
[s, r] = await web(C2, 'mensaje cualquiera'); ok(/asesor/.test(r.respuesta) && q(`select estado from conversaciones where id='${C2}'`) === 'asesor', 'si el modelo declina, pasa a una persona con una frase amable');
GUION = [() => { throw new Error('503 overloaded'); }];
const C3 = 'web:prueba-cliente-03'; [s, r] = await web(C3, 'hola'); ok(s === 200 && /asesor/.test(r.respuesta), 'si la API falla, responde con amabilidad y avisa a un asesor');

// ---------- 5. validaciones web y límite diario ----------
[s] = await web('web:x', 'hola'); ok(s === 400, 'rechaza un identificador de conversación inválido');
[s] = await web('web:prueba-cliente-04', 'x'.repeat(1001)); ok(s === 400, 'rechaza mensajes de más de 1000 caracteres');
const C5 = 'web:prueba-limite-05'; let ultimo;
for (let i = 0; i < 7; i++) { GUION = [texto('respuesta ' + i)]; ultimo = (await web(C5, 'pregunta ' + i))[1]; }
ok(ultimo.limite === undefined && /Por hoy ya conversamos/.test(ultimo.respuesta), 'límite diario por conversación (protege el costo): ' + ultimo.respuesta);

// ---------- 6. WhatsApp ----------
const v = await atender(new Request('http://x/?hub.mode=subscribe&hub.verify_token=verifica-vivaldi&hub.challenge=12345'));
ok(v.status === 200 && await v.text() === '12345', 'WhatsApp: verifica el webhook con el token');
ok((await atender(new Request('http://x/?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1'))).status === 403, 'WhatsApp: token de verificación incorrecto → 403');
ok(await wa('51912345678', 'hola', 'wamid.A1', 'Marta', 'sha256=00') === 401 && META.length === 0, 'WhatsApp: rechaza un aviso sin la firma de Meta');
GUION = [p => { ok(p.messages.some(m => m.role === 'system' && /WhatsApp/.test(m.content) && /Marta/.test(m.content)), 'WhatsApp: el asistente conoce el canal y el nombre del perfil'); return texto('¡Hola Marta! ¿Qué proyecto te interesa?'); }];
ok(await wa('51912345678', 'hola', 'wamid.A1') === 200, 'WhatsApp: aviso firmado aceptado');
ok(META.length === 1 && META[0].auth === 'Bearer wa-tok' && META[0].url === '/v21.0/555/messages' && META[0].j.to === '51912345678' && META[0].j.text.body === '¡Hola Marta! ¿Qué proyecto te interesa?', 'WhatsApp: responde por la API oficial: ' + JSON.stringify(META[0] && META[0].j));
const n1 = PEDIDOS.length; GUION = [texto('repetido')];
await wa('51912345678', 'hola', 'wamid.A1'); ok(PEDIDOS.length === n1 && META.length === 1, 'WhatsApp: si Meta reenvía el mismo mensaje no se contesta dos veces');
GUION = [herr('registrar_cliente', {nombre: 'Marta Salas', celular: null, proyecto: 'La Planicie de Asia', interes: 'informacion', dia_visita: null, resumen: 'Pide brochure', consentimiento: true}), texto('Listo, Marta.')];
await wa('51912345678', 'Sí, regístrame. Soy Marta Salas', 'wamid.A2');
ok(q("select celular||'|'||origen from solicitudes where nombre='Marta Salas'") === '912345678|Asistente WhatsApp', 'WhatsApp: registra con el número del chat (sin pedirlo otra vez)');
await wa('51912345678', {type: 'image', image: {id: 'img1'}}, 'wamid.A3'); ok(/solo mensajes de texto/.test(META.at(-1).j.text.body), 'WhatsApp: a una foto o audio responde con amabilidad');

// ---------- 7. el asesor responde desde la bandeja ----------
const login = async (mail, pass) => (await (await fetch(M + '/auth/v1/token?grant_type=password', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({email: mail, password: pass})})).json()).access_token;
const jefa = await login('jefa@vivaldi.pe', 'clave-jefa');
const esc = async (tok, body) => { const r = await atender(new Request('http://x', {method: 'POST', headers: {'Content-Type': 'application/json', ...(tok ? {authorization: 'Bearer ' + tok} : {})}, body: JSON.stringify({accion: 'escribir_asesor', ...body})})); return [r.status, await r.json()]; };
[s] = await esc(null, {conversacion: 'wa:51912345678', texto: 'Hola'}); ok(s === 401, 'bandeja: sin sesión no se puede escribir');
[s, r] = await esc(jefa, {conversacion: 'wa:51912345678', texto: 'Hola Marta, soy Ana de Vivaldi. ¿Te llamo a las 5?'});
ok(s === 200 && r.enviado === true && META.at(-1).j.to === '51912345678' && /soy Ana/.test(META.at(-1).j.text.body), 'bandeja: el mensaje del asesor sale por WhatsApp al cliente');
ok(q("select estado from conversaciones where id='wa:51912345678'") === 'asesor', 'bandeja: al escribir, el asesor toma la conversación');
const n2 = META.length; GUION = [texto('no')]; await wa('51912345678', 'Sí, a las 5', 'wamid.A4'); ok(META.length === n2, 'después, el asistente deja hablar al asesor');
const anonR = await fetch(M + '/rest/v1/rpc/asistente_turno', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({p_conv: 'web:intruso-000', p_canal: 'web', p_celular: '', p_texto: 'x'})});
ok(anonR.status >= 400, 'el público no puede llamar a las funciones internas del asistente');
meta.close();
