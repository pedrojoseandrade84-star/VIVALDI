// Función de Supabase "conector": conecta el CRM o la base de datos de Vivaldi con la herramienta de ventas, el portal y el explorador.
// Diseño y desarrollo: Pedrojose Andrade Paredes
//
// Dos sentidos, cada 5 minutos (ver activar-conector.sql):
// ENTRADA: lee cada conector activo (según su frecuencia) y guarda clientes o lotes en la base del sistema:
//   · clientes: completa a los que ya existen (mismo contacto o mismo celular), crea los nuevos y los asigna al asesor por su nombre.
//   · lotes: actualiza precio y estado por proyecto, manzana y lote; el portal y el explorador 3D muestran la disponibilidad real.
// No envía mensajes de WhatsApp a los contactos importados.
//
// SALIDA: entrega al CRM de Vivaldi (o a Zapier, Make, n8n) cada solicitud de la web, cliente nuevo, cambio de etapa, cambio de estado de un lote y venta,
//   con reintentos y firma opcional (encabezado x-vivaldi-firma: HMAC-SHA256 del cuerpo con el secreto elegido).
//
// Fuentes: HubSpot, Salesforce, Microsoft Dynamics 365, Zoho CRM, Pipedrive, Kommo, Bitrix24, Odoo, Clientify, Airtable, Google Sheets, cualquier CSV en línea,
// cualquier API (JSON, GET o POST, también GraphQL) y las bases PostgreSQL, MySQL/MariaDB y SQL Server (con una consulta de solo lectura).
// Las claves NUNCA van en la base: se guardan como secretos de la función (Edge Functions → Secrets) y el conector solo dice su nombre.
// Secretos: CONECTOR_CLAVE (la misma de activar-conector.sql) y los de cada fuente (por ejemplo HUBSPOT_TOKEN o BD_VIVALDI).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY las pone Supabase solo.

const env = (k: string, d = "") => ((globalThis as any).Deno ? (globalThis as any).Deno.env.get(k) : (globalThis as any).process?.env[k]) ?? d;
const CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-conector-clave", "Access-Control-Allow-Methods": "POST, OPTIONS"};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), {status, headers: {...CORS, "Content-Type": "application/json"}});
// resultado de una función de la base (Supabase devuelve el valor; algunos proxies lo envuelven en una lista o en {nombre: valor})
const uno = (j: any) => { if (Array.isArray(j) && j.length === 1) j = j[0]; if (j && typeof j === "object" && !Array.isArray(j) && Object.keys(j).length === 1) j = Object.values(j)[0]; return j; };

async function rpc(fn: string, body: unknown, token = "") {
  const url = env("SUPABASE_URL"), key = token ? env("SUPABASE_ANON_KEY") : env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {method: "POST", headers: {apikey: key, Authorization: `Bearer ${token || key}`, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
  if (!r.ok) throw new Error(`base de datos ${fn}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

// ---------- cómo suelen llamarse los campos en otros sistemas ----------
const N = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SYN: Record<string, [string, string[]][]> = {
  clientes: [
    ["ext", ["id", "record id", "hs object id", "contact id", "lead id", "leadid", "contactid", "codigo", "codigo cliente"]],
    ["name", ["nombre completo", "nombres y apellidos", "full name", "fullname", "contact name", "nombre del contacto", "nombre", "nombres", "firstname", "first name", "first_name", "cliente", "contacto", "prospecto", "name", "razon social"]],
    ["last", ["apellido", "apellidos", "lastname", "last name", "last_name", "surname"]],
    ["phone", ["celular", "telefono", "tel", "movil", "whatsapp", "phone", "mobile", "mobilephone", "mobile phone", "phone number", "phones phone", "cel", "numero", "telefono celular", "telephone1", "phone mobile"]],
    ["dni", ["dni", "documento", "nro documento", "numero documento", "doc", "ce", "ruc", "documento identidad"]],
    ["email", ["correo", "email", "e mail", "mail", "correo electronico", "emailaddress1", "email address", "emails email", "email from"]],
    ["proj", ["proyecto", "condominio", "project", "producto", "inmueble", "proyecto interes", "interes"]],
    ["stage", ["etapa", "estado", "status", "fase", "stage", "lifecyclestage", "hs lead status", "lead status", "pipeline stage", "situacion", "statuscode", "status id", "stage id", "estado del lead"]],
    ["src", ["origen", "fuente", "canal", "source", "lead source", "medio", "campana", "utm source", "hs analytics source", "leadsource", "leadsourcecode", "source id", "medium id"]],
    ["adv", ["asesor", "vendedor", "agente", "ejecutivo", "responsable", "owner", "owner name", "owner id name", "ownerid value", "owner id value", "user id", "asesor asignado", "responsible user", "assigned by id", "salesperson", "comercial"]],
    ["next", ["proximo contacto", "seguimiento", "fecha seguimiento", "next activity date", "proxima llamada"]],
    ["created", ["fecha", "fecha registro", "fecha de registro", "creado", "created", "createdate", "created at", "created time", "add time", "fecha creacion", "alta", "createddate", "createdon", "created on", "date create", "create date", "createdtime", "created date"]],
    ["budget", ["presupuesto", "monto", "budget", "inversion", "valor", "amount"]],
    ["notes", ["notas", "nota", "observaciones", "observacion", "comentario", "comentarios", "detalle", "mensaje", "description"]]
  ],
  lotes: [
    ["proj", ["proyecto", "condominio", "project"]],
    ["mz", ["manzana", "mz", "mza", "bloque"]],
    ["lt", ["lote", "lt", "nro lote", "numero lote", "unidad"]],
    ["area", ["area", "area m2", "m2", "metraje", "superficie", "area total"]],
    ["price", ["precio", "precio lista", "precio de lista", "precio venta", "valor", "price"]],
    ["st", ["estado", "status", "disponibilidad", "situacion"]],
    ["loc", ["ubicacion", "tipo", "frente", "posicion", "vista"]],
    ["client", ["cliente", "propietario", "comprador", "titular"]]
  ]
};
const ETAPA: [RegExp, string][] = [[/descart|perdid|no interes|lost|cancel|unqualified|disqualif|junk|basura/, "Descartado"], [/vendid|cerrad|ganad|won|customer|compr|firm|contrato/, "Vendido"], [/separ|reserv|apart/, "Separado"],
  [/visit|cita|agend|meeting/, "Visita agendada"], [/not contacted|no contactad|sin contact|sin gestion|uncontacted/, "Nuevo"], [/contact|llamad|seguim|calif|qualified|negoci|propuest|cotiz|opportunity|in progress|in process|process|attempted|connected|convert|working|nurtur/, "Contactado"], [/nuev|lead|prospect|new|ingres|pendient|interesad|subscriber/, "Nuevo"]];
const ESTADO: [RegExp, string][] = [[/vendid|sold|cerrad/, "Vendido"], [/separ|reserv|apart|hold/, "Separado"], [/bloque|no disp|retir|block/, "Bloqueado"], [/dispon|libre|avail|venta|activo/, "Disponible"]];
const pick = (v: unknown, T: [RegExp, string][]) => { const n = N(v); if (!n) return ""; const r = T.find(([re]) => re.test(n)); return r ? r[1] : ""; };
const num = (v: unknown) => { if (typeof v === "number") return v; let s = String(v ?? "").replace(/[^\d.,-]/g, ""); if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/,/g, ""); return +s || 0; };
const fecha = (v: unknown) => { if (!v) return ""; if (v instanceof Date) return v.toISOString().slice(0, 10); if (typeof v === "number") return new Date(v > 1e11 ? v : v * 1000).toISOString().slice(0, 10);
  const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; return ""; };
const PROYECTOS = ["La Planicie de Asia", "Las Terrazas de Cerro Azul", "La Portada del Sol", "Lirios del Mar de Asia", "La Esmeralda de Cerro Azul", "Diamante de Asia", "Zafiro de Asia"];
const proyecto = (v: unknown, lista = PROYECTOS) => { const n = N(v); if (!n) return ""; const strip = (x: string) => N(x).replace(/^(la|las|el|los) /, "");
  return lista.find(p => N(p) === n) || lista.find(p => n.includes(strip(p)) || strip(p).includes(n)) || lista.find(p => strip(p).split(" ")[0] === n.replace(/^(la|las|el|los) /, "").split(" ")[0]) || ""; };

// aplana lo que devuelven los CRM: objetos anidados, listas de teléfonos o correos, y campos personalizados (Kommo, Zoho)
function plano(o: any, pre = "", out: Record<string, unknown> = {}) {
  if (o === null || o === undefined) return out;
  if (Array.isArray(o)) {
    if (o.length && o.every(x => x && typeof x === "object" && ("field_name" in x || "field_code" in x) && Array.isArray(x.values))) { o.forEach(x => { out[N(x.field_name || x.field_code)] = x.values[0] ? (x.values[0].value ?? x.values[0].enum_code ?? "") : ""; }); return out; }
    if (o.length === 2 && typeof o[0] === "number" && typeof o[1] === "string") { out[N(pre)] = o[1]; return out; }   // Odoo: [id, "Nombre"]
    const objs = o.filter(x => x && typeof x === "object" && !Array.isArray(x));
    if (objs.length) { const p = objs.find(x => x.primary || x.PRIMARY || x.is_primary) || objs[0], v = p.value ?? p.VALUE; if (v !== undefined && typeof v !== "object") { out[N(pre)] = v; return out; } plano(p, pre, out); return out; }
    out[N(pre)] = o.filter(x => typeof x !== "object").join(", "); return out;
  }
  if (typeof o === "object" && !(o instanceof Date)) { const fmt: [string, unknown][] = [];
    for (const [k, v] of Object.entries(o)) { if (k === "custom_fields_values") { plano(v, "", out); continue; } if (k === "attributes" && v && typeof v === "object") continue;
      if (k.includes("@OData.Community.Display.V1.FormattedValue")) { fmt.push([k.split("@")[0], v]); continue; } if (k.includes("@")) continue; plano(v, pre ? pre + " " + k : k, out); }
    fmt.forEach(([k, v]) => { out[N(pre ? pre + " " + k : k)] = v; });   // Dynamics: el texto («Calificado») en lugar del código
    if (pre && "name" in o) out[N(pre)] = o.name; return out; }
  out[N(pre)] = o; return out;
}
function autoMapa(claves: string[], coleccion: string) { const mapa: Record<string, string> = {}, usadas = new Set<string>(), cn = claves.map(N);
  for (const pass of [0, 1]) SYN[coleccion].forEach(([campo, syn]) => { if (mapa[campo]) return;
    let i = -1;
    if (pass === 0) { for (const s of syn) { i = cn.findIndex((h, j) => !usadas.has(claves[j]) && h === s); if (i >= 0) break; } }
    else i = cn.findIndex((h, j) => !usadas.has(claves[j]) && h && syn.some(s => s.length > 2 && (h.startsWith(s + " ") || h.endsWith(" " + s) || h === s)));
    if (i >= 0) { mapa[campo] = claves[i]; usadas.add(claves[i]); } });
  return mapa; }
function filas(rows: Record<string, unknown>[], coleccion: string, mapa: Record<string, string>, cfg: any) {
  const g = (r: Record<string, unknown>, c: string) => mapa[c] ? r[mapa[c]] ?? r[N(mapa[c])] : undefined, t = (r: Record<string, unknown>, c: string) => String(g(r, c) ?? "").trim();
  return rows.map(r => {
    if (coleccion === "clientes") { const name = [t(r, "name"), t(r, "last")].filter(Boolean).join(" ").replace(/\s+/g, " "), d = t(r, "phone").replace(/\D/g, "");
      return {ext: t(r, "ext"), name, phone: /^9\d{8}$/.test(d) ? d : /^519\d{8}$/.test(d) ? d.slice(2) : t(r, "phone"), dni: t(r, "dni").replace(/\s/g, "").toUpperCase(), email: /@/.test(t(r, "email")) ? t(r, "email").toLowerCase() : "",
        proj: proyecto(t(r, "proj")) || (cfg.proyecto_defecto || ""), stage: pick(t(r, "stage"), ETAPA), src: t(r, "src"), adv: t(r, "adv"), next: fecha(g(r, "next")), created: fecha(g(r, "created")), budget: num(g(r, "budget")) || null, notes: t(r, "notes").slice(0, 1000)}; }
    const p = t(r, "proj");
    return {proj: p ? proyecto(p) : (cfg.proyecto_defecto || ""), mz: t(r, "mz").replace(/^(mz|manzana)\.?\s*/i, "").toUpperCase(), lt: t(r, "lt").replace(/^(lt|lote)\.?\s*/i, ""),
      area: num(g(r, "area")) || null, price: num(g(r, "price")) || null, st: pick(t(r, "st"), ESTADO) || null, loc: t(r, "loc") || null, client: t(r, "client") || null};
  }); }

// ---------- lectura de cada fuente ----------
const ruta = (o: any, p: string) => !p ? o : (o && typeof o === "object" && p in o) ? o[p] : p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const secreto = (n: string) => { if (!n) return ""; if (!/^[A-Z][A-Z0-9_]{2,60}$/.test(n)) throw new Error("Nombre de secreto no válido: " + n); const v = env(n); if (!v) throw new Error(`Falta el secreto ${n} en la función`); return v; };
const segura = (u: string) => /^https:\/\//.test(u || "") || /^http:\/\/127\.0\.0\.1[:/]/.test(u || "");
const base = (c: any, def: string) => String(c.base && segura(c.base) ? c.base : def || "").replace(/\/+$/, "");
const falta = (v: unknown, m: string) => { if (!v) throw new Error(m); return v as string; };
function csvFilas(text: string) {
  text = text.replace(/^﻿/, ""); const first = text.split(/\r?\n/).find(l => l.trim()) || "";
  const sep = [";", "\t", ",", "|"].map(c => [c, first.split(c).length] as [string, number]).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const ok = rows.filter(r => r.some(c => c.trim())); if (ok.length < 1) return [];
  const h = ok[0].map(x => x.trim()); return ok.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k || "columna " + (i + 1), r[i] ?? ""]))); }
const sheetsCsv = (u: string) => { const m = u.match(/docs\.google\.com\/spreadsheets\/d\/(e\/)?([\w-]+)/); if (!m) throw new Error("Ese enlace no es de una hoja de Google Sheets");
  if (m[1] || /output=csv|format=csv/.test(u)) return /output=|format=/.test(u) ? u : u.replace(/\/pubhtml.*$|\/pub.*$/, "/pub") + "?output=csv";
  const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1]; return `https://docs.google.com/spreadsheets/d/${m[2]}/export?format=csv${gid ? "&gid=" + gid : ""}`; };
function preset(tipo: string, c: any) {
  switch (tipo) {
    case "hubspot": return {url: base(c, "https://api.hubapi.com") + "/crm/v3/objects/" + (c.objeto || "contacts") + "?limit=100&properties=" + encodeURIComponent(c.propiedades || "firstname,lastname,phone,mobilephone,email,hs_lead_status,lifecyclestage,createdate,hs_object_id,hubspot_owner_id"),
      encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "HUBSPOT_TOKEN", lista: "results", siguiente: "paging.next.link", item: "properties"};
    case "pipedrive": return {url: base(c, "https://api.pipedrive.com") + "/v1/" + (c.objeto || "persons") + "?limit=100", parametro: "api_token", secreto: c.secreto || "PIPEDRIVE_TOKEN", lista: "data", pagina: {tipo: "inicio", param: "start", siguiente: "additional_data.pagination.next_start"}};
    case "kommo": if (!c.base && !/^[a-z0-9-]{2,60}$/.test(c.subdominio || "")) throw new Error("Falta el subdominio de Kommo");
      return {url: base(c, `https://${c.subdominio}.kommo.com`) + `/api/v4/${c.objeto || "contacts"}?limit=250`, encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "KOMMO_TOKEN", lista: "_embedded." + (c.objeto || "contacts"), siguiente: "_links.next.href"};
    case "zoho": return {url: base(c, `https://www.zohoapis.${c.dominio || "com"}`) + `/crm/v2/${c.objeto || "Leads"}?per_page=200`, encabezado: "Authorization", prefijo: "Zoho-oauthtoken ", secreto: c.secreto || "ZOHO_TOKEN", lista: "data", pagina: {tipo: "numero", param: "page", hay_mas: "info.more_records"}, zoho: true, dominio: c.dominio || "com"};
    case "salesforce": { const inst = base(c, falta(c.instancia, "Falta la dirección de Salesforce (por ejemplo https://vivaldi.my.salesforce.com)"));
      const soql = c.soql || "SELECT Id, FirstName, LastName, MobilePhone, Phone, Email, Status, LeadSource, CreatedDate, Owner.Name FROM " + (c.objeto || "Lead") + " ORDER BY CreatedDate DESC";
      return {url: inst + "/services/data/" + (c.version || "v59.0") + "/query?q=" + encodeURIComponent(soql), encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "SALESFORCE_TOKEN", lista: "records", siguiente: "nextRecordsUrl"}; }
    case "dynamics": { const org = base(c, falta(c.organizacion, "Falta la dirección de Dynamics 365 (por ejemplo https://vivaldi.crm2.dynamics.com)"));
      return {url: org + "/api/data/v9.2/" + (c.objeto || "leads"), encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "DYNAMICS_TOKEN", lista: "value", siguiente: "@odata.nextLink",
        extra: {Prefer: 'odata.maxpagesize=200, odata.include-annotations="OData.Community.Display.V1.FormattedValue"', "OData-Version": "4.0"}}; }
    case "bitrix24": { const wh = base(c, secreto(c.secreto || "BITRIX_WEBHOOK")); if (!segura(wh + "/")) throw new Error("El webhook de Bitrix24 debe empezar con https://");
      return {url: wh + `/crm.${c.objeto || "contact"}.list.json?select[]=*&select[]=PHONE&select[]=EMAIL`, lista: "result", pagina: {tipo: "inicio", param: "start", siguiente: "next"}}; }
    case "airtable": return {url: base(c, "https://api.airtable.com") + `/v0/${falta(c.base_id, "Falta el identificador de la base de Airtable (empieza con app)")}/${encodeURIComponent(falta(c.tabla, "Falta el nombre de la tabla de Airtable"))}?pageSize=100`,
      encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "AIRTABLE_TOKEN", lista: "records", item: "fields", pagina: {tipo: "token", param: "offset", siguiente: "offset"}};
    case "clientify": return {url: base(c, "https://api.clientify.net") + `/v1/${c.objeto || "contacts"}/?page_size=100`, encabezado: "Authorization", prefijo: "Token ", secreto: c.secreto || "CLIENTIFY_TOKEN", lista: "results", siguiente: "next"};
    case "sheets": return {url: c.base && segura(c.base) ? c.base : sheetsCsv(falta(c.url, "Falta el enlace de la hoja")), formato: "csv"};
    case "csv": return {url: falta(c.url, "Falta la dirección del archivo CSV"), formato: "csv", secreto: c.secreto, encabezado: c.secreto ? (c.encabezado || "Authorization") : "", prefijo: c.prefijo || (c.secreto ? "Bearer " : "")};
    default: return c;
  }
}
async function zohoToken(dom: string) { // con ZOHO_REFRESH_TOKEN pide un token nuevo (los de Zoho vencen cada hora)
  if (!env("ZOHO_REFRESH_TOKEN")) return "";
  const r = await fetch(`https://accounts.zoho.${dom}/oauth/v2/token?` + new URLSearchParams({refresh_token: env("ZOHO_REFRESH_TOKEN"), client_id: env("ZOHO_CLIENT_ID"), client_secret: env("ZOHO_CLIENT_SECRET"), grant_type: "refresh_token"}), {method: "POST"});
  const j = await r.json().catch(() => ({})); if (!j.access_token) throw new Error("Zoho no renovó el token: " + (j.error || r.status)); return j.access_token; }
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));
async function pedir(u: string, init: RequestInit, intentos = 3): Promise<Response> {   // reintenta ante límites de la API (429) y caídas momentáneas (5xx)
  for (let i = 0; ; i++) { const ac = new AbortController(), t = setTimeout(() => ac.abort(), 30000);
    try { const r = await fetch(u, {...init, signal: ac.signal}); if ((r.status === 429 || r.status >= 500) && i < intentos - 1) { await espera(+(r.headers.get("retry-after") || 0) * 1000 || 1500 * (i + 1)); continue; } return r; }
    catch (e) { if (i >= intentos - 1) throw new Error("No se pudo conectar con la fuente: " + ((e as Error).name === "AbortError" ? "tardó demasiado" : (e as Error).message)); await espera(1500 * (i + 1)); }
    finally { clearTimeout(t); } } }
async function leerApi(c: any, max: number) {
  if (!segura(c.url)) throw new Error("La dirección de la API debe empezar con https://");
  const token = c.zoho ? (await zohoToken(c.dominio)) || secreto(c.secreto) : c.secreto ? secreto(c.secreto) : "";
  const out: any[] = []; let url = c.url, page = 1, start = 0, tok = "";
  for (let vuelta = 0; vuelta < 400 && url && out.length < max; vuelta++) {
    const u = new URL(url); if (c.parametro && token) u.searchParams.set(c.parametro, token);
    if (c.pagina?.tipo === "inicio") u.searchParams.set(c.pagina.param, String(start)); if (c.pagina?.tipo === "numero") u.searchParams.set(c.pagina.param, String(page));
    if (c.pagina?.tipo === "token" && tok) u.searchParams.set(c.pagina.param, tok);
    const pre = c.prefijo ? (/\s$/.test(c.prefijo) || /[:=]$/.test(c.prefijo) ? c.prefijo : c.prefijo + " ") : "";
    const h: Record<string, string> = {Accept: c.formato === "csv" ? "text/csv, text/plain, */*" : "application/json", ...(c.extra || {})}; if (c.encabezado && token) h[c.encabezado] = pre + token;
    const metodo = String(c.metodo || "GET").toUpperCase() === "POST" ? "POST" : "GET"; if (metodo === "POST") h["Content-Type"] = "application/json";
    const r = await pedir(u.toString(), {method: metodo, headers: h, body: metodo === "POST" ? String(c.cuerpo || "{}") : undefined});
    if (!r.ok) throw new Error(`La fuente respondió ${r.status}: ${(await r.text()).slice(0, 160)}`);
    if (c.formato === "csv") { const t = await r.text(); if (/^\s*<!doctype|<html/i.test(t)) throw new Error("La dirección devolvió una página web y no un CSV (¿la hoja está publicada como CSV?)"); out.push(...csvFilas(t)); break; }
    const j = await r.json(), lista = ruta(j, c.lista || ""); if (!Array.isArray(lista)) throw new Error("No se encontró la lista de registros en la respuesta (revisa «ruta de la lista»)");
    out.push(...lista.map(x => c.item && x && x[c.item] ? {...x[c.item], id: x.id ?? x[c.item].id} : x));
    if (!lista.length) break;
    if (c.siguiente && c.pagina?.tipo !== "inicio" && c.pagina?.tipo !== "token") { const nx = ruta(j, c.siguiente); url = nx ? new URL(String(nx), url).toString() : ""; }
    else if (c.pagina?.tipo === "inicio") { const nx = ruta(j, c.pagina.siguiente); if (nx == null || nx === "") url = ""; else start = +nx; }
    else if (c.pagina?.tipo === "numero") { if (ruta(j, c.pagina.hay_mas)) page++; else url = ""; }
    else if (c.pagina?.tipo === "token") { tok = String(ruta(j, c.pagina.siguiente) || ""); if (!tok) url = ""; }
    else url = "";
  }
  return out.slice(0, max); }
async function leerOdoo(c: any, max: number) {   // Odoo (en línea o propio) por JSON-RPC
  const url = base(c, falta(c.url, "Falta la dirección de Odoo (por ejemplo https://vivaldi.odoo.com)")); if (!segura(url + "/")) throw new Error("La dirección de Odoo debe empezar con https://");
  const db = falta(c.bd, "Falta el nombre de la base de Odoo"), user = falta(c.usuario, "Falta el usuario de Odoo"), clave = secreto(c.secreto || "ODOO_CLAVE");
  const call = async (service: string, method: string, args: unknown[]) => { const r = await pedir(url + "/jsonrpc", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", method: "call", params: {service, method, args}, id: Date.now()})});
    const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error("Odoo: " + ((j.error && (j.error.data?.message || j.error.message)) || r.status)); return j.result; };
  const uid = await call("common", "login", [db, user, clave]); if (!uid) throw new Error("Odoo no aceptó el usuario o la clave");
  const campos = String(c.campos || "name,contact_name,partner_name,phone,mobile,email_from,stage_id,user_id,source_id,create_date,description").split(",").map(x => x.trim()).filter(Boolean);
  return (await call("object", "execute_kw", [db, uid, clave, c.modelo || "crm.lead", "search_read", [[]], {fields: campos, limit: max}])) || []; }
const SOLO_LECTURA = /^\s*(select|with)\b/i, PROHIBIDO = /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|call|exec|execute|merge|replace|into)\b/i;
async function leerSQL(tipo: string, c: any, max: number) {
  const q = String(c.consulta || "").trim().replace(/;\s*$/, "");
  if (!SOLO_LECTURA.test(q) || PROHIBIDO.test(q) || q.includes(";")) throw new Error("La consulta debe ser de solo lectura (SELECT)");
  const cad = secreto(c.secreto || "BD_VIVALDI");
  const g: any = globalThis; if (g.__conectorSQL) return (await g.__conectorSQL(tipo, cad, q)).slice(0, max);   // pruebas
  if (tipo === "postgres") { const {Client} = await import("https://deno.land/x/postgres@v0.19.3/mod.ts"); const cl = new Client(cad); await cl.connect();
    try { await cl.queryArray("set transaction read only").catch(() => {}); const r = await cl.queryObject(q); return (r.rows as any[]).slice(0, max); } finally { await cl.end(); } }
  if (tipo === "sqlserver") { const sql: any = (await import("npm:mssql@11.0.1")).default; const pool = await sql.connect(cad);
    try { const r = await pool.request().query(q); return (r.recordset as any[]).slice(0, max); } finally { await pool.close(); } }
  const u = new URL(cad), {Client} = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  const cl = await new Client().connect({hostname: u.hostname, port: +(u.port || 3306), username: decodeURIComponent(u.username), password: decodeURIComponent(u.password), db: u.pathname.slice(1)});
  try { return ((await cl.query(q)) as any[]).slice(0, max); } finally { await cl.close(); } }
async function leer(tipo: string, cfg: any, max = 20000) {
  const rows = ["postgres", "mysql", "sqlserver"].includes(tipo) ? await leerSQL(tipo, cfg, max) : tipo === "odoo" ? await leerOdoo(cfg, max) : await leerApi(preset(tipo, cfg), max);
  return rows.map((r: any) => plano(r)); }

// ---------- salida: envíos al CRM de Vivaldi o a Zapier, Make y n8n ----------
async function firma(clave: string, cuerpo: string) { const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(cuerpo)))].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function entregar() { const lote: any[] = await rpc("webhooks_tomar", {n: 50}); let enviados = 0, fallidos = 0;
  for (const m of lote) { let ok = false, err = "";
    try { const cuerpo = JSON.stringify({evento: m.evento, id: "vv-" + m.id, fecha: m.creado, origen: "Sistema comercial Vivaldi", datos: m.datos});
      const h: Record<string, string> = {"Content-Type": "application/json", "User-Agent": "Vivaldi-Sistema-Comercial/1.0", "x-vivaldi-evento": m.evento, "x-vivaldi-id": "vv-" + m.id};
      if (m.secreto) { const s = env(m.secreto); if (!s) throw new Error(`Falta el secreto ${m.secreto} en la función`); h["x-vivaldi-firma"] = "sha256=" + await firma(s, cuerpo); }
      const r = await pedir(m.url, {method: "POST", headers: h, body: cuerpo}, 1); ok = r.ok; if (!ok) err = `respondió ${r.status}: ${(await r.text()).slice(0, 120)}`; }
    catch (e) { err = String((e as Error).message || e); }
    await rpc("webhook_marcar", {p_id: m.id, p_ok: ok, p_error: ok ? null : err}); ok ? enviados++ : fallidos++; }
  return {enviados, fallidos}; }

async function sincronizar(c: any) {
  const t0 = Date.now();
  try { const rows = await leer(c.tipo, c.config || {}), claves = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const mapa = c.config?.mapa && Object.keys(c.config.mapa).length ? c.config.mapa : autoMapa(claves, c.coleccion);
    const fl = filas(rows, c.coleccion, mapa, c.config || {}); let tot = {nuevos: 0, actualizados: 0, omitidos: 0};
    for (let i = 0; i < fl.length; i += 300) { const r: any = uno(await rpc("conector_guardar", {p_id: c.id, p_filas: fl.slice(i, i + 300)})); for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += +(r?.[k] || 0); }
    const res = `${rows.length} leídos · ${tot.nuevos} nuevos · ${tot.actualizados} actualizados${tot.omitidos ? ` · ${tot.omitidos} omitidos` : ""} · ${Math.round((Date.now() - t0) / 100) / 10} s`;
    await rpc("conector_resultado", {p_id: c.id, p_resultado: res, p_error: null}); return {id: c.id, ok: true, ...tot, leidos: rows.length, resultado: res}; }
  catch (e) { const m = String((e as Error).message || e); await rpc("conector_resultado", {p_id: c.id, p_resultado: null, p_error: m}).catch(() => {}); return {id: c.id, ok: false, error: m}; } }

async function atender(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
  let b: any = {}; try { b = await req.json(); } catch (_) { b = {}; }
  // 1) la base de datos la llama cada 15 minutos con la clave
  const clave = req.headers.get("x-conector-clave");
  if (clave) { if (!env("CONECTOR_CLAVE") || clave !== env("CONECTOR_CLAVE")) return json({error: "no autorizado"}, 401);
    const lista: any[] = await rpc("conectores_pendientes", {p_id: b.id ?? null}); const res = [];
    for (const c of lista) res.push(await sincronizar(c)); const salida = await entregar().catch(e => ({error: String(e)}));
    return json({conectores: res.length, resultados: res, salida}); }
  // 2) la jefatura desde la herramienta: probar una configuración o sincronizar ahora
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({error: "no autorizado"}, 401);
  let jefe = false; try { const j = uno(await rpc("es_jefatura", {}, token)); jefe = j === true; } catch (_) { jefe = false; }
  if (!jefe) return json({error: "Solo la jefatura puede usar el conector"}, 403);
  try {
    if (b.accion === "probar") { const rows = await leer(String(b.tipo || ""), b.config || {}, 50), claves = [...new Set(rows.flatMap(r => Object.keys(r)))];
      const mapa = b.config?.mapa && Object.keys(b.config.mapa).length ? b.config.mapa : autoMapa(claves, b.coleccion === "lotes" ? "lotes" : "clientes");
      return json({leidos: rows.length, columnas: claves, mapa, muestra: rows.slice(0, 5), filas: filas(rows.slice(0, 5), b.coleccion === "lotes" ? "lotes" : "clientes", mapa, b.config || {})}); }
    if (b.accion === "entregar") return json(await entregar());
    if (b.accion === "sincronizar" && b.id) { const lista: any[] = await rpc("conectores_pendientes", {p_id: +b.id}); if (!lista.length) return json({error: "El conector no existe"}, 404); return json(await sincronizar(lista[0])); }
    return json({error: "acción no válida"}, 400);
  } catch (e) { return json({error: String((e as Error).message || e)}, 400); }
}

if ((globalThis as any).Deno) (globalThis as any).Deno.serve(atender);
export {atender, plano, autoMapa, filas, csvFilas};
