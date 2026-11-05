// Servidor de prueba con la misma API que Supabase (auth + PostgREST) sobre PostgreSQL real con las políticas RLS
const http = require("http"), {execFileSync} = require("child_process"), crypto = require("crypto");
const PG = ["-h", "/var/tmp/vvpg", "-p", "5544", "-U", "postgres", "-d", "vv", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"];
const USERS = {"ana@vivaldi.pe": {id: "00000000-0000-0000-0000-00000000000a", pass: "clave-ana"}, "beto@vivaldi.pe": {id: "00000000-0000-0000-0000-00000000000b", pass: "clave-beto"}, "jefa@vivaldi.pe": {id: "00000000-0000-0000-0000-00000000000c", pass: "clave-jefa"}, "baja@vivaldi.pe": {id: "00000000-0000-0000-0000-00000000000d", pass: "clave-baja"}};
const SKEY = "service-test-key", KEY = "anon-test-key", TOK = {}, REF = {}; let DOWN = false, EXPIRE_NEXT = false; const LOG = [];
const lit = v => { const t = "q" + crypto.randomBytes(4).toString("hex"); return `$${t}$${v}$${t}$`; };
function sql(uid, q) {
  const s = uid === "anon" ? `begin; set local role anon; ${q}; commit;` : `begin; set local role authenticated; set local request.jwt.claim.sub = ${lit(uid)}; ${q}; commit;`;
  try { return {ok: true, out: execFileSync("psql", [...PG, "-c", s], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim()}; }
  catch (e) { return {ok: false, err: (e.stderr || "").replace(/^.*ERROR:\s*/s, "").trim()}; }
}
const send = (res, code, obj) => { res.writeHead(code, {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}); res.end(obj === undefined ? "" : JSON.stringify(obj)); };
const issue = uid => { const a = "at-" + crypto.randomBytes(8).toString("hex"), r = "rt-" + crypto.randomBytes(8).toString("hex"); TOK[a] = uid; REF[r] = uid; return {a, r}; };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"}); return res.end(); }
  const u = new URL(req.url, "http://x"); let body = ""; req.on("data", d => body += d); req.on("end", () => {
    if (u.pathname === "/__ctl") { const c = u.searchParams.get("c"); if (c === "down") DOWN = true; if (c === "up") DOWN = false; if (c === "expire") EXPIRE_NEXT = true; if (c === "log") return send(res, 200, LOG); return send(res, 200, {ok: 1}); }
    if (DOWN) { req.socket.destroy(); return; }
    LOG.push(req.method + " " + u.pathname + u.search);
    if (req.headers.apikey !== KEY && req.headers.apikey !== SKEY) return send(res, 401, {message: "Invalid API key"});
    if (u.pathname === "/auth/v1/token") {
      const b = JSON.parse(body || "{}");
      if (u.searchParams.get("grant_type") === "password") { const x = USERS[b.email]; if (!x || x.pass !== b.password) return send(res, 400, {error: "invalid_grant", error_description: "Invalid login credentials"}); const t = issue(x.id); return send(res, 200, {access_token: t.a, refresh_token: t.r, user: {id: x.id, email: b.email}}); }
      const uid = REF[b.refresh_token]; if (!uid) return send(res, 400, {error_description: "Invalid Refresh Token"}); delete REF[b.refresh_token]; const t = issue(uid); return send(res, 200, {access_token: t.a, refresh_token: t.r});
    }
    const tok = (req.headers.authorization || "").replace("Bearer ", ""); let uid = TOK[tok];
    if (!uid && (!tok || tok === KEY)) uid = "anon"; if (req.headers.apikey === SKEY && tok === SKEY) uid = "service";
    if (EXPIRE_NEXT && uid) { EXPIRE_NEXT = false; delete TOK[tok]; uid = null; }
    if (!uid) return send(res, 401, {message: "JWT expired"});
    if (req.headers.apikey === SKEY && tok === SKEY) uid = "service";
    const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    if (rpc && req.method === "POST") { const b = JSON.parse(body || "{}"), fn = rpc[1];
      const args = Object.entries(b).map(([k, v]) => `${k} => ${v === null ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : lit(String(v))}`).join(", ");
      const q = `select coalesce(json_agg(t), '[]') from public.${fn}(${args}) t`;
      const r = uid === "service" ? (() => { try { return {ok: true, out: execFileSync("psql", [...PG, "-c", q], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim()}; } catch (e) { return {ok: false, err: (e.stderr || "").replace(/^.*ERROR:\s*/s, "").trim()}; } })() : sql(uid, q);
      return r.ok ? send(res, 200, JSON.parse(r.out)) : send(res, 403, {message: r.err}); }
    if (u.pathname === "/rest/v1/proyectos" && req.method === "POST") { let arr = JSON.parse(body); if (!Array.isArray(arr)) arr = [arr];
      const r = sql(uid, `with x as (select * from jsonb_to_recordset(${lit(JSON.stringify(arr))}::jsonb) as y(id text, contenido jsonb)),
        i as (insert into public.proyectos (id, contenido) select id, contenido from x on conflict (id) do update set contenido = excluded.contenido returning *) select coalesce(json_agg(i), '[]') from i`);
      return r.ok ? send(res, 201, JSON.parse(r.out)) : send(res, 403, {message: r.err}); }
    const m = u.pathname.match(/^\/rest\/v1\/(perfiles|registros|solicitudes|reclamos|proyectos|mensajes)$/); if (!m) return send(res, 404, {message: "not found"});
    const t = m[1], p = u.searchParams;
    if (req.method === "GET") {
      const w = [];
      for (const [k, v] of p) { if (["select", "order", "limit", "offset"].includes(k)) continue; const [op, val] = [v.slice(0, v.indexOf(".")), v.slice(v.indexOf(".") + 1)]; const ops = {eq: "=", gt: ">", gte: ">=", lt: "<"}; if (!ops[op] || !/^\w+$/.test(k)) return send(res, 400, {message: "bad filter"}); w.push(`${k} ${ops[op]} ${lit(val)}`); }
      const cols = (p.get("select") || "*").split(",").filter(c => c === "*" || /^\w+$/.test(c)).join(",");
      const ord = p.get("order") ? "order by " + p.get("order").replace(/\.(asc|desc)$/, " $1").replace(/[^\w ]/g, "") : "";
      const r = sql(uid, `select coalesce(json_agg(t), '[]') from (select ${cols} from public.${t} ${w.length ? "where " + w.join(" and ") : ""} ${ord} limit ${+p.get("limit") || 1000} offset ${+p.get("offset") || 0}) t`);
      return r.ok ? send(res, 200, JSON.parse(r.out)) : send(res, 400, {message: r.err});
    }
    if (req.method === "POST" && t === "registros") {
      let arr = JSON.parse(body); if (!Array.isArray(arr)) arr = [arr];
      const r = sql(uid, `with x as (select * from jsonb_to_recordset(${lit(JSON.stringify(arr))}::jsonb) as y(id text, coleccion text, contenido jsonb, eliminado boolean)),
        i as (insert into public.registros (id, coleccion, contenido, eliminado) select id, coleccion, contenido, coalesce(eliminado, false) from x
              on conflict (id) do update set coleccion = excluded.coleccion, contenido = excluded.contenido, eliminado = excluded.eliminado returning *)
        select coalesce(json_agg(i), '[]') from i`);
      return r.ok ? send(res, 201, JSON.parse(r.out)) : send(res, 403, {message: r.err});
    }
    if (req.method === "PATCH" && t === "registros") {
      const id = (p.get("id") || "").replace(/^eq\./, ""), b = JSON.parse(body || "{}");
      const r = sql(uid, `with i as (update public.registros set eliminado = ${b.eliminado ? "true" : "false"} where id = ${lit(id)} returning *) select coalesce(json_agg(i), '[]') from i`);
      return r.ok ? send(res, 200, JSON.parse(r.out)) : send(res, 403, {message: r.err});
    }
    if (req.method === "POST" && (t === "solicitudes" || t === "reclamos")) {
      let arr = JSON.parse(body); if (!Array.isArray(arr)) arr = [arr];
      const r = sql(uid, `insert into public.${t} select * from json_populate_recordset(null::public.${t}, ${lit(JSON.stringify(arr))}::json)`.replace("select *", t === "solicitudes" ? "select nextval('solicitudes_id_seq'), now(), nombre, celular, proyecto, plazo, pago, visita, mensaje, coalesce(acepta_promos,false), coalesce(origen,'Web'), campana, null, 'nueva', null, null, asesor_codigo, pais" : "select nextval('reclamos_id_seq'), codigo, now(), null, tipo, nombre, documento, celular, correo, proyecto, detalle, pedido, 'abierto', null, null"));
      return r.ok ? send(res, 201) : send(res, 400, {message: r.err});
    }
    if (req.method === "PATCH" && (t === "solicitudes" || t === "reclamos")) {
      const id = (p.get("id") || "").replace(/^eq\./, ""), b = JSON.parse(body || "{}");
      const sets = Object.entries(b).filter(([k]) => /^\w+$/.test(k)).map(([k, v]) => `${k} = ${v === null ? "null" : lit(String(v))}`).join(", ");
      const r = sql(uid, `with i as (update public.${t} set ${sets} where id = ${+id} returning *) select coalesce(json_agg(i), '[]') from i`);
      return r.ok ? send(res, 200, JSON.parse(r.out)) : send(res, 403, {message: r.err});
    }
    send(res, 405, {message: "method"});
  });
}).listen(+process.argv[2] || 54321, () => console.log("mock up"));
