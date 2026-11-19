// Función de Supabase "conector": conecta el CRM o la base de datos de Vivaldi con la herramienta de ventas, el portal y el explorador.
// Diseño y desarrollo: Pedrojose Andrade Paredes
//
// Cada 15 minutos (ver activar-conector.sql) lee cada conector activo y guarda clientes o lotes en la base del sistema:
//   · clientes: completa a los que ya existen (mismo contacto o mismo celular), crea los nuevos y los asigna al asesor por su nombre.
//   · lotes: actualiza precio y estado por proyecto, manzana y lote; el portal y el explorador 3D muestran la disponibilidad real.
// No envía mensajes de WhatsApp a los contactos importados.
//
// Fuentes: cualquier CRM con API (JSON), HubSpot, Pipedrive, Kommo, Zoho CRM, PostgreSQL y MySQL (con una consulta de solo lectura).
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
    ["ext", ["id", "record id", "hs object id", "contact id", "lead id", "codigo", "codigo cliente"]],
    ["name", ["nombre", "nombres", "nombre completo", "nombres y apellidos", "cliente", "contacto", "prospecto", "full name", "name", "firstname", "first name", "first_name", "razon social"]],
    ["last", ["apellido", "apellidos", "lastname", "last name", "last_name", "surname"]],
    ["phone", ["celular", "telefono", "tel", "movil", "whatsapp", "phone", "mobile", "mobilephone", "phone number", "cel", "numero", "telefono celular"]],
    ["dni", ["dni", "documento", "nro documento", "numero documento", "doc", "ce", "ruc", "documento identidad"]],
    ["email", ["correo", "email", "e mail", "mail", "correo electronico"]],
    ["proj", ["proyecto", "condominio", "project", "producto", "inmueble", "proyecto interes", "interes"]],
    ["stage", ["etapa", "estado", "status", "fase", "stage", "lifecyclestage", "hs lead status", "lead status", "pipeline stage", "situacion"]],
    ["src", ["origen", "fuente", "canal", "source", "lead source", "medio", "campana", "utm source", "hs analytics source"]],
    ["adv", ["asesor", "vendedor", "agente", "ejecutivo", "responsable", "owner", "owner name", "owner id name", "asesor asignado", "responsible user"]],
    ["next", ["proximo contacto", "seguimiento", "fecha seguimiento", "next activity date", "proxima llamada"]],
    ["created", ["fecha", "fecha registro", "fecha de registro", "creado", "created", "createdate", "created at", "created time", "add time", "fecha creacion", "alta"]],
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
const ETAPA: [RegExp, string][] = [[/descart|perdid|no interes|lost|cancel|unqualified/, "Descartado"], [/vendid|cerrad|ganad|won|customer|compr|firm|contrato/, "Vendido"], [/separ|reserv|apart/, "Separado"],
  [/visit|cita|agend|meeting/, "Visita agendada"], [/contact|llamad|seguim|calif|qualified|negoci|propuest|cotiz|opportunity|in progress|attempted|connected/, "Contactado"], [/nuev|lead|prospect|new|ingres|pendient|interesad|subscriber/, "Nuevo"]];
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
    if (o.length && o.every(x => x && typeof x === "object" && "value" in x)) { const p = o.find(x => x.primary) || o[0]; out[N(pre)] = p.value; return out; }
    out[N(pre)] = o.filter(x => typeof x !== "object").join(", "); return out;
  }
  if (typeof o === "object" && !(o instanceof Date)) { for (const [k, v] of Object.entries(o)) { if (k === "custom_fields_values") { plano(v, "", out); continue; } plano(v, pre ? pre + " " + k : k, out); } if (pre && "name" in o) out[N(pre)] = o.name; return out; }
  out[N(pre)] = o; return out;
}
function autoMapa(claves: string[], coleccion: string) { const mapa: Record<string, string> = {}, usadas = new Set<string>(), cn = claves.map(N);
  for (const pass of [0, 1]) SYN[coleccion].forEach(([campo, syn]) => { if (mapa[campo]) return;
    const i = cn.findIndex((h, j) => !usadas.has(claves[j]) && h && (pass === 0 ? syn.includes(h) : syn.some(s => s.length > 2 && (h.startsWith(s + " ") || h.endsWith(" " + s) || h === s))));
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
const ruta = (o: any, p: string) => !p ? o : p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const secreto = (n: string) => { if (!n) return ""; if (!/^[A-Z][A-Z0-9_]{2,60}$/.test(n)) throw new Error("Nombre de secreto no válido: " + n); const v = env(n); if (!v) throw new Error(`Falta el secreto ${n} en la función`); return v; };
function preset(tipo: string, c: any) {
  switch (tipo) {
    case "hubspot": return {url: "https://api.hubapi.com/crm/v3/objects/" + (c.objeto || "contacts") + "?limit=100&properties=" + encodeURIComponent(c.propiedades || "firstname,lastname,phone,mobilephone,email,hs_lead_status,lifecyclestage,createdate,hs_object_id"),
      encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "HUBSPOT_TOKEN", lista: "results", siguiente: "paging.next.link", item: "properties"};
    case "pipedrive": return {url: "https://api.pipedrive.com/v1/" + (c.objeto || "persons") + "?limit=100", parametro: "api_token", secreto: c.secreto || "PIPEDRIVE_TOKEN", lista: "data", pagina: {tipo: "inicio", param: "start", siguiente: "additional_data.pagination.next_start"}};
    case "kommo": if (!/^[a-z0-9-]{2,60}$/.test(c.subdominio || "")) throw new Error("Falta el subdominio de Kommo");
      return {url: `https://${c.subdominio}.kommo.com/api/v4/${c.objeto || "contacts"}?limit=250`, encabezado: "Authorization", prefijo: "Bearer ", secreto: c.secreto || "KOMMO_TOKEN", lista: "_embedded." + (c.objeto || "contacts"), siguiente: "_links.next.href"};
    case "zoho": return {url: `https://www.zohoapis.${c.dominio || "com"}/crm/v2/${c.objeto || "Leads"}?per_page=200`, encabezado: "Authorization", prefijo: "Zoho-oauthtoken ", secreto: c.secreto || "ZOHO_TOKEN", lista: "data", pagina: {tipo: "numero", param: "page", hay_mas: "info.more_records"}, zoho: true, dominio: c.dominio || "com"};
    default: return c;
  }
}
async function zohoToken(dom: string) { // con ZOHO_REFRESH_TOKEN pide un token nuevo (los de Zoho vencen cada hora)
  if (!env("ZOHO_REFRESH_TOKEN")) return "";
  const r = await fetch(`https://accounts.zoho.${dom}/oauth/v2/token?` + new URLSearchParams({refresh_token: env("ZOHO_REFRESH_TOKEN"), client_id: env("ZOHO_CLIENT_ID"), client_secret: env("ZOHO_CLIENT_SECRET"), grant_type: "refresh_token"}), {method: "POST"});
  const j = await r.json().catch(() => ({})); if (!j.access_token) throw new Error("Zoho no renovó el token: " + (j.error || r.status)); return j.access_token; }
async function leerApi(c: any, max: number) {
  if (!/^https:\/\//.test(c.url || "") && !/^http:\/\/127\.0\.0\.1[:/]/.test(c.url || "")) throw new Error("La dirección de la API debe empezar con https://");
  let token = c.zoho ? (await zohoToken(c.dominio)) || secreto(c.secreto) : c.secreto ? secreto(c.secreto) : "";
  const out: any[] = []; let url = c.url, page = 1, start = 0;
  for (let vuelta = 0; vuelta < 200 && url && out.length < max; vuelta++) {
    const u = new URL(url); if (c.parametro && token) u.searchParams.set(c.parametro, token);
    if (c.pagina?.tipo === "inicio") u.searchParams.set(c.pagina.param, String(start)); if (c.pagina?.tipo === "numero") u.searchParams.set(c.pagina.param, String(page));
    const pre = c.prefijo ? (/\s$/.test(c.prefijo) || /[:=]$/.test(c.prefijo) ? c.prefijo : c.prefijo + " ") : "";
    const h: Record<string, string> = {Accept: "application/json"}; if (c.encabezado && token) h[c.encabezado] = pre + token;
    const r = await fetch(u.toString(), {headers: h}); if (!r.ok) throw new Error(`La fuente respondió ${r.status}: ${(await r.text()).slice(0, 160)}`);
    const j = await r.json(), lista = ruta(j, c.lista || ""); if (!Array.isArray(lista)) throw new Error("No se encontró la lista de registros en la respuesta (revisa «ruta de la lista»)");
    out.push(...lista.map(x => c.item && x[c.item] ? {...x[c.item], id: x.id ?? x[c.item].id} : x));
    if (c.siguiente) url = ruta(j, c.siguiente) || "";
    else if (c.pagina?.tipo === "inicio") { const nx = ruta(j, c.pagina.siguiente); if (nx == null || nx === "") url = ""; else start = +nx; }
    else if (c.pagina?.tipo === "numero") { if (ruta(j, c.pagina.hay_mas)) page++; else url = ""; }
    else url = "";
  }
  return out.slice(0, max); }
const SOLO_LECTURA = /^\s*(select|with)\b/i, PROHIBIDO = /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|call|execute|merge|replace)\b/i;
async function leerSQL(tipo: string, c: any, max: number) {
  const q = String(c.consulta || "").trim().replace(/;\s*$/, "");
  if (!SOLO_LECTURA.test(q) || PROHIBIDO.test(q) || q.includes(";")) throw new Error("La consulta debe ser de solo lectura (SELECT)");
  const cad = secreto(c.secreto || "BD_VIVALDI");
  const g: any = globalThis; if (g.__conectorSQL) return (await g.__conectorSQL(tipo, cad, q)).slice(0, max);   // pruebas
  if (tipo === "postgres") { const {Client} = await import("https://deno.land/x/postgres@v0.19.3/mod.ts"); const cl = new Client(cad); await cl.connect();
    try { await cl.queryArray("set transaction read only").catch(() => {}); const r = await cl.queryObject(q); return (r.rows as any[]).slice(0, max); } finally { await cl.end(); } }
  const u = new URL(cad), {Client} = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  const cl = await new Client().connect({hostname: u.hostname, port: +(u.port || 3306), username: decodeURIComponent(u.username), password: decodeURIComponent(u.password), db: u.pathname.slice(1)});
  try { return ((await cl.query(q)) as any[]).slice(0, max); } finally { await cl.close(); } }
async function leer(tipo: string, cfg: any, max = 20000) {
  const rows = tipo === "postgres" || tipo === "mysql" ? await leerSQL(tipo, cfg, max) : await leerApi(preset(tipo, cfg), max);
  return rows.map(r => plano(r)); }

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
    for (const c of lista) res.push(await sincronizar(c)); return json({conectores: res.length, resultados: res}); }
  // 2) la jefatura desde la herramienta: probar una configuración o sincronizar ahora
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({error: "no autorizado"}, 401);
  let jefe = false; try { const j = uno(await rpc("es_jefatura", {}, token)); jefe = j === true; } catch (_) { jefe = false; }
  if (!jefe) return json({error: "Solo la jefatura puede usar el conector"}, 403);
  try {
    if (b.accion === "probar") { const rows = await leer(String(b.tipo || ""), b.config || {}, 50), claves = [...new Set(rows.flatMap(r => Object.keys(r)))];
      const mapa = b.config?.mapa && Object.keys(b.config.mapa).length ? b.config.mapa : autoMapa(claves, b.coleccion === "lotes" ? "lotes" : "clientes");
      return json({leidos: rows.length, columnas: claves, mapa, muestra: rows.slice(0, 5), filas: filas(rows.slice(0, 5), b.coleccion === "lotes" ? "lotes" : "clientes", mapa, b.config || {})}); }
    if (b.accion === "sincronizar" && b.id) { const lista: any[] = await rpc("conectores_pendientes", {p_id: +b.id}); if (!lista.length) return json({error: "El conector no existe"}, 404); return json(await sincronizar(lista[0])); }
    return json({error: "acción no válida"}, 400);
  } catch (e) { return json({error: String((e as Error).message || e)}, 400); }
}

if ((globalThis as any).Deno) (globalThis as any).Deno.serve(atender);
export {atender, plano, autoMapa, filas};
