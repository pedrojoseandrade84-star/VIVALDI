// Función de Supabase "enviar-whatsapp": envía los mensajes automáticos de la cola por la API oficial de WhatsApp (WhatsApp Cloud API de Meta).
// Diseño y desarrollo: Pedrojose Andrade Paredes
//
// La llama la base de datos cada 5 minutos (ver activar-envios.sql). En cada llamada:
//   1) ejecuta la automatización periódica (cuotas, alertas, resumen del asesor),
//   2) toma hasta 40 mensajes pendientes cuya hora ya llegó,
//   3) los envía como plantillas aprobadas por Meta y marca cada uno como enviado o, si falla, lo reintenta (máximo 3 veces).
//
// Variables (Supabase → Edge Functions → Secrets):
//   WHATSAPP_TOKEN      token permanente del usuario de sistema de Meta Business
//   WHATSAPP_PHONE_ID   identificador del número de WhatsApp Business
//   ENVIOS_CLAVE        clave larga inventada por la empresa; la misma va en activar-envios.sql
//   WHATSAPP_VERSION    versión de la API de Meta (opcional; por defecto v21.0)
//   MODO_PRUEBA         "si" para no enviar nada real (los mensajes quedan marcados como enviados en prueba)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo.

const env = (k, d = "") => (globalThis.Deno ? Deno.env.get(k) : globalThis.process?.env[k]) ?? d;

// idioma de cada plantilla registrada en Meta (todas en español de Perú)
const IDIOMA = "es";

async function db(path, body) {
  const url = env("SUPABASE_URL"), key = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${path}`, {method: "POST", headers: {apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
  if (!r.ok) throw new Error(`base de datos ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function enviarUno(m) {
  if (env("MODO_PRUEBA") === "si") return {ok: true, id: "prueba-" + m.id};
  const ver = env("WHATSAPP_VERSION", "v21.0"), phone = env("WHATSAPP_PHONE_ID"), token = env("WHATSAPP_TOKEN");
  const vars = Array.isArray(m.variables) ? m.variables : [];
  const cuerpo = {
    messaging_product: "whatsapp", to: m.para.startsWith("+") ? m.para.slice(1) : "51" + m.para, type: "template",
    template: {name: m.plantilla, language: {code: IDIOMA}, components: vars.length ? [{type: "body", parameters: vars.map(v => ({type: "text", text: String(v ?? "").slice(0, 300) || "-"}))}] : []}
  };
  const r = await fetch(`${env("WHATSAPP_API", "https://graph.facebook.com")}/${ver}/${phone}/messages`, {method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"}, body: JSON.stringify(cuerpo)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return {ok: false, error: (j.error && (j.error.message + " (" + j.error.code + ")")) || ("HTTP " + r.status)};
  return {ok: true, id: j.messages && j.messages[0] && j.messages[0].id};
}

async function atender(req) {
  if (req.headers.get("x-envios-clave") !== env("ENVIOS_CLAVE") || !env("ENVIOS_CLAVE")) return new Response(JSON.stringify({error: "no autorizado"}), {status: 401});
  if (env("MODO_PRUEBA") !== "si" && (!env("WHATSAPP_TOKEN") || !env("WHATSAPP_PHONE_ID"))) return new Response(JSON.stringify({error: "faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID"}), {status: 500});
  const nuevos = await db("automatizacion_periodica").catch(e => ({error: String(e)}));
  const lote = await db("tomar_mensajes", {n: 40});
  let enviados = 0, fallidos = 0;
  for (const m of lote) {
    let res; try { res = await enviarUno(m); } catch (e) { res = {ok: false, error: String(e)}; }
    await db("marcar_mensaje", {p_id: m.id, p_ok: res.ok, p_wa_id: res.id || null, p_error: res.error || null});
    res.ok ? enviados++ : fallidos++;
    await new Promise(r => setTimeout(r, 120));   // ritmo suave para respetar los límites de Meta
  }
  return new Response(JSON.stringify({programados: nuevos, tomados: lote.length, enviados, fallidos}), {headers: {"Content-Type": "application/json"}});
}

if (globalThis.Deno) Deno.serve(atender);
export {atender};
