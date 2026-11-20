// Función de Supabase "asistente": asesor virtual de Vivaldi que atiende 24/7 por WhatsApp y en la web.
// Diseño y desarrollo: Pedrojose Andrade Paredes
//
// Qué hace: responde con los datos reales de los proyectos, consulta la disponibilidad de lotes en vivo, calcula cuotas sin
// intereses, registra al cliente (con su permiso) para que le llegue a su asesor, agenda la visita y pasa la conversación
// a una persona cuando hace falta. Nunca inventa precios, disponibilidad ni descuentos.
//
// Modelo: Claude Opus 5.5 (claude-opus-5-5) con el SDK oficial de Anthropic. Con «fallbacks» del servidor, si el modelo declina
// un pedido, la misma llamada lo reintenta con otro modelo; si igual no hay respuesta, la conversación pasa a un asesor.
//
// Canales:
//   · Web: POST {conversacion: "web:<id>", mensaje} desde las páginas (botón «Asesor virtual»).
//   · WhatsApp: Meta llama a esta función (webhook). GET verifica el webhook; POST trae los mensajes (firma X-Hub-Signature-256).
//   · Herramienta: un asesor escribe a un cliente de WhatsApp desde la bandeja (POST {accion: "escribir_asesor"} con su sesión).
//
// Secretos (Edge Functions → Secrets): ANTHROPIC_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_APP_SECRET,
// WHATSAPP_VERIFY_TOKEN. Opcionales: WHATSAPP_VERSION (v21.0), ASISTENTE_LIMITE_DIA (40 mensajes por cliente al día), MODO_PRUEBA.
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo.

const env = (k: string, d = "") => ((globalThis as any).Deno ? (globalThis as any).Deno.env.get(k) : (globalThis as any).process?.env[k]) ?? d;
const CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS"};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), {status, headers: {...CORS, "Content-Type": "application/json"}});
const uno = (j: any) => { if (Array.isArray(j) && j.length === 1) j = j[0]; if (j && typeof j === "object" && !Array.isArray(j) && Object.keys(j).length === 1) j = Object.values(j)[0]; return j; };
const MODELO = "claude-opus-5-5";

// ---------- base de conocimiento (la genera fuentes/asistente/build.py desde los datos de cada proyecto) ----------
const CONOCIMIENTO = /*CONOCIMIENTO*/{"empresa": {"nombre": "Inmobiliaria & Constructora Vivaldi S.A.C.", "whatsapp": "51922549723", "telefono": "+51 922 549 723", "correo": "info@vivaldiinmobiliaria.com", "oficina": "Av. El Derby 121, Santiago de Surco, Lima", "horario": "Lun–Vie 8:30–18:00 · Sáb 8:30–13:00"}, "proyectos": [{"nombre": "La Planicie de Asia", "zona": "Asia", "km": 111.5, "m2": 200, "precio": 29000, "estado": "Preventa", "resumen": "Lotes de 200 m² frente al parque, con título independizado y obras iniciadas. A 5 minutos del Boulevard de Asia.", "beneficios": ["Lotes frente al parque", "Título independizado", "Obras iniciadas", "Zonas comerciales cerca"], "etapas": [{"nombre": "Trazado de lotes", "estado": "hecho"}, {"nombre": "Preparación del terreno", "estado": "hecho"}, {"nombre": "Movimiento de tierras", "estado": "en curso"}, {"nombre": "Vías, cerco y pórtico", "estado": "próxima"}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/planicie.html", "explorador": "https://vivaldiinmobiliaria.com/proyectos/explorar-planicie.html"}, {"nombre": "Las Terrazas de Cerro Azul", "zona": "Cerro Azul", "km": 117.5, "m2": 200, "precio": 25000, "estado": "Preventa", "resumen": "Lotes de 200 m² con vista al mar, club privado y minimarket, en preventa desde S/ 25,000.", "beneficios": ["Vista al mar", "Club privado", "Minimarket", "Lotes frente al parque", "Título independizado"], "etapas": [{"nombre": "Preventa", "estado": "en curso"}, {"nombre": "Obras de habilitación", "estado": "próxima", "confirmar": true}, {"nombre": "Entrega de lotes", "estado": "próxima", "confirmar": true}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/terrazas.html", "explorador": "https://vivaldiinmobiliaria.com/proyectos/explorar-terrazas.html"}, {"nombre": "La Portada del Sol", "zona": "Asia", "km": 115.2, "m2": 90, "precio": 37900, "estado": "En construcción", "resumen": "Lotes de 90 m² con piscina, gimnasio, losa multiusos y cancha de fútbol, en plena construcción.", "beneficios": ["Piscina", "Gimnasio", "Cancha de fútbol", "Losa multiusos", "Juegos para niños", "Parrillas"], "etapas": [{"nombre": "Venta de lotes", "estado": "en curso"}, {"nombre": "Construcción de áreas comunes", "estado": "en curso"}, {"nombre": "Entrega", "estado": "próxima", "confirmar": true}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/portada.html", "explorador": "https://vivaldiinmobiliaria.com/proyectos/explorar-portada.html"}, {"nombre": "Lirios del Mar de Asia", "zona": "Asia", "km": 100.05, "m2": 90, "precio": 60000, "estado": "Entrega inmediata", "resumen": "Últimos lotes de 90 m² con piscina, losa, parrillas y zona de camping, con entrega inmediata.", "beneficios": ["Entrega inmediata", "Piscina", "Losa deportiva", "Juegos para niños", "Parrillas", "Zona de camping"], "etapas": [{"nombre": "Habilitación", "estado": "hecho"}, {"nombre": "Áreas comunes", "estado": "hecho"}, {"nombre": "Últimos lotes en venta", "estado": "en curso"}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/lirios.html", "explorador": "https://vivaldiinmobiliaria.com/proyectos/explorar-lirios.html"}, {"nombre": "La Esmeralda de Cerro Azul", "zona": "Cerro Azul", "km": null, "m2": 250, "precio": 38000, "estado": "Entrega inmediata", "resumen": "Lotes de 250 m² con entrega inmediata y club privado: piscina, cancha de tenis, bicicross y juegos para niños.", "beneficios": ["Entrega inmediata", "Piscina", "Cancha de tenis", "Bicicross", "Juegos para niños"], "etapas": [{"nombre": "Habilitación", "estado": "hecho"}, {"nombre": "Club privado", "estado": "hecho"}, {"nombre": "Lotes en venta", "estado": "en curso"}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/esmeralda.html", "explorador": "https://vivaldiinmobiliaria.com/proyectos/explorar-esmeralda.html"}, {"nombre": "Diamante de Asia", "zona": "Asia", "km": null, "m2": null, "precio": null, "estado": "Consultar", "resumen": "Condominio con piscina, losa deportiva, parrillas y juegos para niños. Consulta disponibilidad con un asesor.", "beneficios": ["Piscina", "Losa deportiva", "Juegos para niños", "Parrillas"], "etapas": [{"nombre": "Disponibilidad", "estado": "en curso", "confirmar": true}], "pagina": "https://vivaldiinmobiliaria.com/proyectos/diamante.html", "explorador": ""}]}/*FIN-CONOCIMIENTO*/;

async function rpc(fn: string, body: unknown, token = "") {
  const url = env("SUPABASE_URL"), key = token ? env("SUPABASE_ANON_KEY") : env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {method: "POST", headers: {apikey: key, Authorization: `Bearer ${token || key}`, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
  if (!r.ok) throw new Error(`base de datos ${fn}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

// ---------- cliente de Anthropic (SDK oficial) ----------
let _cliente: any = null;
async function cliente() {
  if (_cliente) return _cliente;
  const g = globalThis as any; if (g.__AnthropicPrueba) return (_cliente = g.__AnthropicPrueba);   // pruebas automáticas
  const {default: Anthropic} = await import("npm:@anthropic-ai/sdk@1.11.0");
  _cliente = new Anthropic();   // toma ANTHROPIC_API_KEY de los secretos de la función
  return _cliente;
}

// ---------- instrucciones (estables: se guardan en caché) ----------
const soles = (n: number) => "S/ " + Math.round(n).toLocaleString("en-US");
function instrucciones() {
  const e: any = CONOCIMIENTO.empresa || {}, P: any[] = CONOCIMIENTO.proyectos || [];
  const fichas = P.map(p => [`## ${p.nombre}`, `Estado: ${p.estado}. Zona: ${p.zona}${p.km ? `, km ${p.km} de la Panamericana Sur` : " (kilómetro por confirmar)"}.`,
    p.precio ? `Precio desde ${soles(p.precio)} (referencial)${p.m2 ? ` por lotes de ${p.m2} m²` : ""}.` : "Precio: consultar con el asesor.",
    p.resumen, p.beneficios && p.beneficios.length ? `Incluye: ${p.beneficios.join("; ")}.` : "",
    p.etapas && p.etapas.length ? `Etapas: ${p.etapas.map((x: any) => `${x.nombre} (${x.estado})`).join("; ")}.` : "",
    p.pagina ? `Página del proyecto: ${p.pagina}` : "", p.explorador ? `Explorador 3D (elegir lote y entrar a la casa): ${p.explorador}` : ""].filter(Boolean).join("\n")).join("\n\n");
  return `Eres el asesor virtual de ${e.nombre || "Vivaldi Inmobiliaria"}, una inmobiliaria peruana que vende lotes en Asia y Cerro Azul (Cañete). Atiendes por WhatsApp y en la web a cualquier hora.

Tu objetivo: resolver las dudas del cliente con datos reales, entusiasmarlo con su futuro lote y llevarlo a una visita guiada o a hablar con un asesor. Escribes en español de Perú, de «tú», cálido y directo, como un buen asesor inmobiliario.

Cómo responder:
- Breve: 2 a 4 frases o una lista corta. En WhatsApp no uses tablas ni títulos; puedes usar *negritas* de WhatsApp con moderación.
- Usa solo la información de este mensaje y lo que devuelvan tus herramientas. Si algo no está, dilo con naturalidad y ofrece que un asesor lo confirme. Nunca inventes precios, disponibilidad, fechas de entrega, descuentos, promociones ni condiciones legales.
- Los precios son referenciales: el precio final y la disponibilidad se confirman al separar.
- Para saber qué lotes quedan, usa consultar_lotes. Para cuotas, usa calcular_cuota (no hagas cuentas de memoria).
- Financiamiento directo con Vivaldi: sin bancos y sin intereses, en soles. Inicial desde 10 % y plazos de 12, 24 o 36 meses; el plan final lo confirma el asesor.
- Las visitas son guiadas y sin compromiso, los fines de semana; el asesor confirma la hora por WhatsApp.
- Si preguntan si eres una persona: di con honestidad que eres el asistente virtual de Vivaldi y que un asesor puede continuar cuando quieran.
- No hables mal de otras empresas ni compares con datos que no tengas.

Registrar al cliente:
- Cuando el cliente quiera visitar, separar, recibir más información o hablar con un asesor, pide su nombre completo (y su celular si escribe desde la web) y su permiso: «¿Me autorizas a registrar tus datos para que un asesor de Vivaldi te contacte?» (Ley 29733). Solo con un sí claro llama a registrar_cliente con consentimiento verdadero.
- Llama a derivar_a_asesor cuando: lo pida el cliente; haya un reclamo; pregunte por su contrato, pagos o cuotas de una compra ya hecha; pida un descuento o condiciones especiales; o no puedas ayudarle. Antes, explica que un asesor continuará la conversación.

Empresa: ${e.nombre || ""}. Oficina: ${e.oficina || ""}. Horario de asesores: ${e.horario || ""}. WhatsApp: ${e.whatsapp ? "+" + e.whatsapp : ""}. Correo: ${e.correo || ""}.

Proyectos:

${fichas}`;
}

// ---------- herramientas ----------
const NOMBRES = () => (CONOCIMIENTO.proyectos || []).map((p: any) => p.nombre);
function herramientas() {
  const proy = [...NOMBRES(), "todos"];
  return [
    {name: "consultar_lotes", strict: true, description: "Consulta en vivo los lotes disponibles de un proyecto (o de todos) en el inventario de Vivaldi: cuántos quedan, rango de precios, áreas y ejemplos de lotes libres.",
      input_schema: {type: "object", properties: {proyecto: {type: "string", enum: proy, description: "Nombre exacto del proyecto, o «todos»"}}, required: ["proyecto"], additionalProperties: false}},
    {name: "calcular_cuota", strict: true, description: "Calcula la inicial y la cuota mensual fija sin intereses de un lote. Úsala siempre que el cliente pregunte cuánto pagaría al mes.",
      input_schema: {type: "object", properties: {precio: {type: "number", description: "Precio del lote en soles"}, inicial_porcentaje: {type: "integer", description: "Porcentaje de inicial, de 10 a 60"}, meses: {type: "integer", enum: [12, 24, 36]}},
        required: ["precio", "inicial_porcentaje", "meses"], additionalProperties: false}},
    {name: "registrar_cliente", strict: true, description: "Registra al cliente para que lo atienda un asesor de Vivaldi (le llega asignado). Solo con su permiso explícito.",
      input_schema: {type: "object", properties: {nombre: {type: "string", description: "Nombre y apellido"}, celular: {type: ["string", "null"], description: "Celular de 9 dígitos (en WhatsApp puede ir null: se usa el número del chat)"},
        proyecto: {type: ["string", "null"]}, interes: {type: "string", enum: ["informacion", "visita", "separacion"]}, dia_visita: {type: ["string", "null"], description: "Día de visita elegido, por ejemplo «sábado 29 de noviembre»"},
        resumen: {type: "string", description: "Resumen breve de lo que busca el cliente"}, consentimiento: {type: "boolean", description: "true solo si el cliente autorizó registrar sus datos"}},
        required: ["nombre", "celular", "proyecto", "interes", "dia_visita", "resumen", "consentimiento"], additionalProperties: false}},
    {name: "derivar_a_asesor", strict: true, description: "Pasa la conversación a un asesor humano de Vivaldi (el asistente deja de responder en este chat).",
      input_schema: {type: "object", properties: {motivo: {type: "string"}, resumen: {type: "string", description: "Lo que el asesor necesita saber"}, nombre: {type: ["string", "null"]}, celular: {type: ["string", "null"]}, proyecto: {type: ["string", "null"]}},
        required: ["motivo", "resumen", "nombre", "celular", "proyecto"], additionalProperties: false}}
  ];
}
async function ejecutar(nombre: string, inp: any, ctx: any) {
  if (nombre === "consultar_lotes") {
    const filas: any[] = await rpc("lotes_publicos", {}); const quiero = inp.proyecto === "todos" ? null : inp.proyecto;
    const P = (CONOCIMIENTO.proyectos || []).filter((p: any) => !quiero || p.nombre === quiero);
    return P.map((p: any) => { const mios = (filas || []).filter(l => l.proyecto === p.nombre), libres = mios.filter(l => l.disponible);
      if (!mios.length) return {proyecto: p.nombre, inventario_en_linea: false, nota: "Sin inventario en línea: la disponibilidad la confirma el asesor.", precio_desde: p.precio || null};
      const pr = libres.map(l => +l.precio).filter(Boolean);
      return {proyecto: p.nombre, disponibles: libres.length, total: mios.length, precio_desde: pr.length ? Math.min(...pr) : null, precio_hasta: pr.length ? Math.max(...pr) : null,
        ejemplos: libres.slice(0, 8).map(l => `Mz ${l.mz} lote ${l.lt}${l.area ? ` · ${+l.area} m²` : ""}${l.precio ? ` · ${soles(+l.precio)}` : ""}${l.ubicacion ? ` · ${l.ubicacion}` : ""}`)}; }); }
  if (nombre === "calcular_cuota") {
    const precio = +inp.precio, pct = Math.min(60, Math.max(10, Math.round(+inp.inicial_porcentaje))), n = [12, 24, 36].includes(+inp.meses) ? +inp.meses : 36;
    if (!(precio > 0)) return {error: "Precio no válido"};
    const ini = precio * pct / 100; return {precio, inicial_porcentaje: pct, inicial: Math.round(ini), meses: n, cuota_mensual: Math.round((precio - ini) / n), intereses: 0, nota: "Referencial; el plan final lo confirma el asesor."}; }
  if (nombre === "registrar_cliente" || nombre === "derivar_a_asesor") {
    const derivar = nombre === "derivar_a_asesor";
    if (!derivar && inp.consentimiento !== true) return {ok: false, motivo: "Primero pide permiso al cliente para registrar sus datos (Ley 29733)."};
    const cel = ctx.canal === "whatsapp" ? ctx.celular : (inp.celular || ""), nom = inp.nombre || ctx.nombre || (ctx.canal === "whatsapp" ? ctx.perfil || "" : "");
    const visita = inp.dia_visita ? String(inp.dia_visita) : (inp.interes === "visita" ? "Por coordinar" : "");
    const r: any = uno(await rpc("asistente_registrar", {p_conv: ctx.conv, p_nombre: nom, p_celular: cel, p_proyecto: inp.proyecto || "", p_tipo: inp.interes || "informacion",
      p_visita: visita, p_resumen: [derivar ? "Pasa al asesor: " + (inp.motivo || "") : "", inp.resumen || ""].filter(Boolean).join(" · "), p_derivar: derivar, p_origen: ctx.canal === "whatsapp" ? "WhatsApp" : "web"}));
    if (r && r.ok && derivar) ctx.derivada = true;
    return r; }
  return {error: "herramienta desconocida"};
}

// ---------- el turno del asistente: bucle de herramientas ----------
async function responder(ctx: any, historial: any[]) {
  const msgs: any[] = [];
  for (const m of historial) { const role = m.rol === "cliente" ? "user" : "assistant", text = m.rol === "asesor" ? "[Mensaje del asesor de Vivaldi] " + m.texto : m.texto;
    if (!msgs.length && role !== "user") continue; msgs.push({role, content: text}); }
  const ahora = new Date().toLocaleString("es-PE", {timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"});
  msgs.push({role: "system", content: `Contexto: canal ${ctx.canal === "whatsapp" ? "WhatsApp (el celular del cliente ya se conoce)" : "web"}; hoy es ${ahora} en Lima.${ctx.nombre ? ` El cliente se llama ${ctx.nombre}.` : ctx.perfil ? ` Su nombre en WhatsApp es ${ctx.perfil}.` : ""}${ctx.solicitud ? " Ya está registrado y tiene un asesor asignado." : ""}`});
  const c = await cliente(), herr = herramientas(), sistema = instrucciones();
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const r = await c.beta.messages.create({model: MODELO, max_tokens: 4000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: {effort: "low"},
      cache_control: {type: "ephemeral"}, system: sistema, tools: herr, messages: msgs});
    const texto = (r.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    if (r.stop_reason === "refusal") { await ejecutar("derivar_a_asesor", {motivo: "El asistente no pudo responder", resumen: "Revisar la conversación", nombre: null, celular: null, proyecto: null}, ctx).catch(() => {});
      return "Te paso con un asesor de Vivaldi para ayudarte mejor; te escribirá por aquí muy pronto."; }
    if (r.stop_reason === "pause_turn") { msgs.push({role: "assistant", content: r.content}); continue; }
    const usos = (r.content || []).filter((b: any) => b.type === "tool_use");
    if (r.stop_reason !== "tool_use" || !usos.length) return texto || "¿Me cuentas un poco más de lo que buscas?";
    msgs.push({role: "assistant", content: r.content});
    const resultados = [];
    for (const u of usos) { try { resultados.push({type: "tool_result", tool_use_id: u.id, content: JSON.stringify(await ejecutar(u.name, u.input || {}, ctx))}); }
      catch (e) { resultados.push({type: "tool_result", tool_use_id: u.id, is_error: true, content: String((e as Error).message || e).slice(0, 300)}); } }
    msgs.push({role: "user", content: resultados});
  }
  return "Déjame pasarte con un asesor para darte el detalle exacto.";
}

async function turno(ctx: any, texto: string, ref: string | null = null) {
  const t: any = uno(await rpc("asistente_turno", {p_conv: ctx.conv, p_canal: ctx.canal, p_celular: ctx.celular || "", p_texto: texto, p_limite: +env("ASISTENTE_LIMITE_DIA", "40") || 40, p_ref: ref}));
  if (t.duplicado) return {respuesta: null, estado: t.estado, duplicado: true};
  if (t.limite) return {respuesta: "Por hoy ya conversamos bastante 🙂 Un asesor de Vivaldi puede seguir contigo: escríbenos mañana o pide que te llamen.", estado: t.estado, limite: true};
  if (t.estado !== "asistente") return {respuesta: null, estado: t.estado};   // lo atiende una persona
  Object.assign(ctx, {nombre: t.nombre || null, solicitud: t.solicitud || null});
  let respuesta: string;
  try { respuesta = await responder(ctx, t.historial || []); }
  catch (e) { console.error("asistente:", e); respuesta = "Tuve un problema para responderte. Un asesor de Vivaldi te escribirá en breve."; await ejecutar("derivar_a_asesor", {motivo: "Error técnico del asistente", resumen: texto.slice(0, 300), nombre: null, celular: null, proyecto: null}, ctx).catch(() => {}); }
  await rpc("asistente_responder", {p_conv: ctx.conv, p_texto: respuesta});
  return {respuesta, estado: ctx.derivada ? "asesor" : "asistente"};
}

// ---------- WhatsApp (API oficial de Meta) ----------
async function enviarWA(para: string, texto: string) {
  if (env("MODO_PRUEBA") === "si" && !env("WHATSAPP_API")) return true;
  const ver = env("WHATSAPP_VERSION", "v21.0"), url = `${env("WHATSAPP_API", "https://graph.facebook.com")}/${ver}/${env("WHATSAPP_PHONE_ID")}/messages`;
  const r = await fetch(url, {method: "POST", headers: {Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json"},
    body: JSON.stringify({messaging_product: "whatsapp", to: para.replace(/^\+/, ""), type: "text", text: {preview_url: true, body: texto.slice(0, 4000)}})});
  if (!r.ok) console.error("WhatsApp:", r.status, (await r.text()).slice(0, 200)); return r.ok; }
async function firmaOk(raw: string, firma: string | null) {
  const sec = env("WHATSAPP_APP_SECRET"); if (!sec || !firma || !firma.startsWith("sha256=")) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(sec), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const hex = [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, "0")).join("");
  const esp = firma.slice(7); if (hex.length !== esp.length) return false; let d = 0; for (let i = 0; i < hex.length; i++) d |= hex.charCodeAt(i) ^ esp.charCodeAt(i); return d === 0; }
async function procesarWA(p: any) {
  for (const en of p.entry || []) for (const ch of en.changes || []) { const v = ch.value || {}, perfiles: any = {};
    (v.contacts || []).forEach((c: any) => { perfiles[c.wa_id] = c.profile && c.profile.name; });
    for (const m of v.messages || []) { const de = String(m.from || "").replace(/\D/g, ""); if (!de) continue;
      const cel = /^519\d{8}$/.test(de) ? de.slice(2) : "+" + de, ctx: any = {conv: "wa:" + de, canal: "whatsapp", celular: cel, perfil: perfiles[m.from] || ""};
      const texto = m.type === "text" ? String(m.text && m.text.body || "") : m.type === "button" ? String(m.button && m.button.text || "") : m.type === "interactive" ? String((m.interactive && (m.interactive.button_reply || m.interactive.list_reply) || {}).title || "") : "";
      if (!texto.trim()) { await enviarWA(de, "¡Hola! Por ahora leo solo mensajes de texto. ¿Me lo escribes? Así te ayudo al toque."); continue; }
      const r = await turno(ctx, texto.slice(0, 1500), m.id || null);
      if (r.respuesta) await enviarWA(de, r.respuesta); } } }

// ---------- entrada ----------
async function atender(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
  const u = new URL(req.url);
  if (req.method === "GET") {   // verificación del webhook de WhatsApp
    if (u.searchParams.get("hub.mode") === "subscribe" && env("WHATSAPP_VERIFY_TOKEN") && u.searchParams.get("hub.verify_token") === env("WHATSAPP_VERIFY_TOKEN")) return new Response(u.searchParams.get("hub.challenge") || "", {status: 200});
    return new Response("no autorizado", {status: 403}); }
  const raw = await req.text(); let b: any = {}; try { b = JSON.parse(raw || "{}"); } catch (_) { return json({error: "cuerpo no válido"}, 400); }
  if (b.object === "whatsapp_business_account") {
    if (!(await firmaOk(raw, req.headers.get("x-hub-signature-256")))) return new Response("firma no válida", {status: 401});
    const trabajo = procesarWA(b).catch(e => console.error("whatsapp:", e)), g = globalThis as any;
    if (g.EdgeRuntime && g.EdgeRuntime.waitUntil) { g.EdgeRuntime.waitUntil(trabajo); return new Response("ok", {status: 200}); }   // Meta espera un 200 rápido
    await trabajo; return new Response("ok", {status: 200}); }
  if (b.accion === "escribir_asesor") {   // un asesor responde desde la bandeja de la herramienta
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""); if (!token) return json({error: "no autorizado"}, 401);
    const texto = String(b.texto || "").trim().slice(0, 3000); if (!texto || !/^(web|wa):[A-Za-z0-9_-]{6,64}$/.test(String(b.conversacion || ""))) return json({error: "datos no válidos"}, 400);
    let c: any; try { c = uno(await rpc("conversacion_escribir", {p_conv: b.conversacion, p_texto: texto}, token)); } catch (e) { return json({error: "No autorizado o conversación inexistente"}, 403); }
    const enviado = c && c.canal === "whatsapp" && c.celular ? await enviarWA(String(c.celular).replace(/^9/, "519").replace(/^\+/, ""), texto) : false;
    return json({ok: true, enviado}); }
  // web
  const conv = String(b.conversacion || ""), msg = String(b.mensaje || "").trim();
  if (!/^web:[A-Za-z0-9_-]{8,64}$/.test(conv) || !msg || msg.length > 1000) return json({error: "datos no válidos"}, 400);
  try { const r = await turno({conv, canal: "web", celular: ""}, msg); return json({respuesta: r.respuesta || "Un asesor de Vivaldi ya está viendo tu caso y te escribirá por WhatsApp.", estado: r.estado}); }
  catch (e) { console.error("web:", e); return json({respuesta: "Ahora no puedo responder. Escríbenos por WhatsApp y un asesor te atiende.", estado: "error"}, 200); }
}

if ((globalThis as any).Deno) (globalThis as any).Deno.serve(atender);
export {atender, instrucciones, herramientas};
