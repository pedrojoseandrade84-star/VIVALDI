// /* ---------------- interfaz ---------------- */
// /* ---------------- ficha para el cliente ---------------- */
/* ---------------- interfaz ---------------- */
function syncForm() {
  $("#proj").value = state.proj; $("#W").value = state.W; $("#D").value = state.D;
  Object.entries(state.norm).forEach(([k, v]) => { const e = $("#n_" + k); if (e) e.value = v; });
  const p = state.prog; $("#pisos").value = p.pisos; $("#dorm").value = p.dorm; $("#banos").value = p.banos; $("#estilo").value = p.estilo; $("#negocio").value = p.negocio || "";
  ["piscina", "cochera", "terraza", "servicio"].forEach(k => $("#" + k).checked = p[k]);
  Object.keys(AMB).forEach(k => $("#amb_" + k).checked = !!(p.amb && p.amb[k]));
  $("#desague").value = state.desague;
  const biz = BIZ.includes(p.estilo); $("#bizRow").hidden = !biz;
  $("#dormLbl").firstChild.textContent = p.estilo === "hospedaje" ? "Habitaciones" : "Dormitorios";
  $$("#opts button").forEach(b => b.classList.toggle("on", b.dataset.o === state.opt));
  $("#lotArea").textContent = `${fmt(state.W * state.D, 0)} m²`;
}
function readForm() {
  state.W = clamp(+$("#W").value || 8, 4, 40); state.D = clamp(+$("#D").value || 20, 8, 80);
  Object.keys(state.norm).forEach(k => { const e = $("#n_" + k); if (e) state.norm[k] = +e.value; });
  state.norm.maxP = clamp(Math.round(state.norm.maxP), 1, 4); state.norm.al = clamp(state.norm.al, 0, 80); state.norm.h = clamp(state.norm.h, 2.4, 3.5);
  const p = state.prog; p.pisos = clamp(+$("#pisos").value, 1, state.norm.maxP); p.dorm = clamp(+$("#dorm").value, 1, 10); p.banos = clamp(+$("#banos").value, 1, 6); p.estilo = $("#estilo").value; p.negocio = $("#negocio").value.slice(0, 28);
  ["piscina", "cochera", "terraza", "servicio"].forEach(k => p[k] = $("#" + k).checked);
  p.amb = {}; Object.keys(AMB).forEach(k => { if ($("#amb_" + k).checked) p.amb[k] = true; });
  state.desague = $("#desague").value;
}
function regen(keepView) {
  design = generate(); state.floor = Math.min(state.floor, design.pisos - 1);
  $("#floors").innerHTML = Array.from({length: design.pisos}, (_, i) => `<button data-f="${i}" class="${i === state.floor ? "on" : ""}">Piso ${i + 1}</button>`).join("");
  $("#optTitle").textContent = `${OPTS[state.opt]} · ${USOS[state.prog.estilo]} · ${PROJ.find(p => p.id === state.proj).name}`;
  build(keepView); syncMaq(); analysis(); syncForm();
}
$("#proj").innerHTML = PROJ.map(p => `<option value="${p.id}">${p.name}${p.km ? " · " + p.km : ""}</option>`).join("");
$("#estilo").innerHTML = Object.entries(USOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
$("#ambs").innerHTML = Object.entries(AMB).map(([k, v]) => `<label><input id="amb_${k}" type="checkbox">${v}</label>`).join("");
$("#proj").addEventListener("change", e => { const p = PROJ.find(x => x.id === e.target.value); state.proj = p.id; state.W = p.W; state.D = p.D; state.intro = state.mode === "ext"; syncForm(); regen(); });
$("#form").addEventListener("change", e => { if (e.target.id === "proj") return; readForm(); regen(true); });
$("#opts").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.opt = b.dataset.o; regen(true); });
$("#modes").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.mode = b.dataset.m; applyMode(false); });
$("#floors").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.floor = +b.dataset.f; if (state.mode === "ext" || state.mode === "xray" || state.mode === "site") state.mode = "cut"; applyMode(state.mode === "walk"); });
$("#timeSw").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.time = b.dataset.t; setTime(); });
$("#cut").addEventListener("input", e => { state.cut = +e.target.value; applyMode(false); });
$("#layers").addEventListener("change", e => { state.layers[e.target.name] = e.target.checked; applyLayers(); });
$$(".tabs button").forEach(b => b.addEventListener("click", () => { document.body.dataset.tab = b.dataset.t; $$(".tabs button").forEach(x => x.classList.toggle("on", x === b)); setTimeout(resize, 50); }));

/* ---------------- asistente de diseño: lee el pedido del cliente ---------------- */
const NUM = {un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8};
function localParse(t) {
  const raw = t; t = t.toLowerCase(); const out = {amb: []}, num = s => NUM[s] || +s, W = "(\\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho)";
  const g = re => { const m = t.match(re); return m ? num(m[1]) : null; };
  const dorm = g(new RegExp(W + "\\s*(?:dormitorios?|cuartos?|habitaciones?|rec[aá]maras?)")); if (dorm) out.dormitorios = dorm;
  const ban = g(new RegExp(W + "\\s*baños?")); if (ban) out.banos = ban;
  const pis = g(new RegExp(W + "\\s*(?:pisos?|plantas?|niveles?)")); if (pis) out.pisos = pis;
  if (/(?:una )?sola planta|un solo (?:piso|nivel)|de una planta|todo en (?:un|el primer) piso/.test(t)) out.pisos = 1;
  if (/piscina|pileta|alberca/.test(t)) out.piscina = !/sin piscina|no.{0,12}piscina/.test(t);
  if (/cochera|estacionamiento|garaje|carro|auto|camioneta/.test(t)) out.cochera = !/sin cochera|no .{0,18}(?:cochera|estacionamiento|garaje)/.test(t);
  if (/terraza|balc[oó]n|azotea/.test(t)) out.terraza = true;
  if (/servicio|empleada|nana/.test(t)) out.cuarto_servicio = true;
  if (/bodega|minimarket|abarrotes|tiendita|tienda de/.test(t)) out.uso = "bodega";
  else if (/restaurant|cevicher|poller[ií]a|cafeter[ií]a|comida|men[uú]|juguer[ií]a|helader[ií]a/.test(t)) out.uso = "restaurante";
  else if (/hospedaje|hostal|hotel|airbnb|habitaciones para (?:alquilar|turistas)|alquiler por noche|por cuartos|por habitaciones|a turistas/.test(t)) out.uso = "hospedaje";
  else if (/local comercial|negocio|oficina|consultorio|farmacia|ferreter[ií]a|peluquer[ií]a|lavander[ií]a/.test(t)) out.uso = "comercio";
  else if (/alquil|rentar|renta|departamentos/.test(t)) out.uso = "renta";
  else if (/vivir|vivienda|permanente|todo el a[ñn]o|mudarnos/.test(t)) out.uso = "vivienda";
  else if (/playa|verano|vacaciones|fines? de semana|descanso/.test(t)) out.uso = "playa";
  if (/m[aá]ximo|aprovechar todo|lo m[aá]s grande|todo el terreno|lo m[aá]s posible/.test(t)) out.opcion = "maxima"; else if (/econ[oó]mic|barat|peque[ñn]|sencill|b[aá]sic|poco presupuesto/.test(t)) out.opcion = "compacta";
  const fam = g(new RegExp("(?:familia de|somos) " + W)); if (fam && !out.dormitorios) out.dormitorios = clamp(Math.ceil(fam / 2) + (fam > 4 ? 1 : 0), 1, 6);
  if (/niñ|hij|nietos|bebé|chicos/.test(t)) out.amb.push("ninos");
  if (/perro|gato|mascota|engreído/.test(t)) out.amb.push("mascota");
  if (/parrilla|bbq|asado|anticucho/.test(t)) out.amb.push("parrilla");
  if (/hamaca|descans|tranquil|relaj/.test(t)) out.amb.push("hamaca");
  if (/huerto|plantas|jard[ií]n|verde|flores/.test(t)) out.amb.push("huerto");
  if (/deporte|f[uú]tbol|fulbito|b[aá]squet|v[oó]ley|ejercicio|gimnasio/.test(t)) out.amb.push("deportes");
  if (/abuel|mayores|adulto mayor|silla de ruedas|discapacidad|rodilla|no pueden subir|bast[oó]n|andador|muletas/.test(t)) out.amb.push("mayores");
  const nm = raw.match(/(?:llamad[oa]|se llamar[aá]|nombre(?: del negocio)?(?: es| ser[aá])?)\s*[:"“']?\s*([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'&]+(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'&]+){0,3})/);
  if (nm) out.nombre_negocio = nm[1];
  return out;
}
const SCHEMA_G = {type: "OBJECT", properties: {
  uso: {type: "STRING", enum: Object.keys(USOS)}, pisos: {type: "INTEGER"}, dormitorios: {type: "INTEGER", description: "dormitorios de vivienda, o número de habitaciones si el uso es hospedaje"},
  banos: {type: "INTEGER"}, piscina: {type: "BOOLEAN"}, cochera: {type: "BOOLEAN"}, terraza: {type: "BOOLEAN"}, cuarto_servicio: {type: "BOOLEAN"},
  opcion: {type: "STRING", enum: ["compacta", "equilibrada", "maxima"]}, nombre_negocio: {type: "STRING"},
  ambientacion: {type: "ARRAY", items: {type: "STRING", enum: Object.keys(AMB)}},
  explicacion: {type: "STRING"}, recomendaciones: {type: "ARRAY", items: {type: "STRING"}}},
  required: ["uso", "pisos", "dormitorios", "banos", "piscina", "cochera", "terraza", "cuarto_servicio", "opcion", "ambientacion", "explicacion", "recomendaciones"]};
const store = {get: k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }};
const GAPI = "https://generativelanguage.googleapis.com/v1beta";
const SYS = "Eres el asistente de diseño de Vivaldi Inmobiliaria (lotes de playa en Asia y Cerro Azul, Perú). Analizas lo que el cliente le cuenta al asesor (familia, presupuesto, si quiere emprender un negocio, gustos) y lo conviertes en parámetros para un simulador de construcción. Respeta los límites del lote y la normativa indicada. 'dormitorios' es el número de habitaciones si el uso es hospedaje. En 'explicacion' escribe 2 a 4 frases en español, cálidas y concretas, dirigidas al cliente, explicando por qué esta propuesta le conviene. Da 2 a 4 recomendaciones técnicas breves. No inventes precios ni prometas valorización. No menciones que eres un modelo ni una inteligencia artificial.";
const FIELDS = `Responde SOLO con un objeto JSON con estas claves: uso (${Object.keys(USOS).join("|")}), pisos (entero), dormitorios (entero), banos (entero), piscina (true/false), cochera (true/false), terraza (true/false), cuarto_servicio (true/false), opcion (compacta|equilibrada|maxima), nombre_negocio (texto, vacío si no hay negocio), ambientacion (lista con cero o más de: ${Object.keys(AMB).join(", ")}), explicacion (texto), recomendaciones (lista de textos).`;
function briefing(text) {
  const n = state.norm, proj = PROJ.find(p => p.id === state.proj);
  return `Proyecto: ${proj.name}. Lote de ${state.W} m de frente por ${state.D} m de fondo (${state.W * state.D} m²). Normativa ingresada: retiro frontal ${n.rf} m, área libre mínima ${n.al}%, máximo ${n.maxP} pisos.\nLo que cuenta el cliente: ${text}`;
}
async function post(url, body, headers, ms) {   // POST con tiempo máximo de espera
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", ...headers}, body: JSON.stringify(body), signal: c.signal});
    const j = await r.json().catch(() => ({}));
    return {status: r.status, ok: r.ok, j};
  } catch (e) { return {status: 0, ok: false, j: {error: {message: c.signal.aborted ? "tardó demasiado" : "sin conexión"}}}; }
  finally { clearTimeout(t); }
}
const errMsg = r => r.status === 429 ? "límite del momento" : r.status === 503 ? "servicio saturado" : ((r.j.error && (r.j.error.message || r.j.error)) || "error " + r.status);
function readJSON(s) {   // tolera texto alrededor del objeto
  s = String(s || ""); const i = s.indexOf("{"), k = s.lastIndexOf("}");
  const o = JSON.parse(i >= 0 && k > i ? s.slice(i, k + 1) : s);
  if (!o || typeof o !== "object" || !o.uso) throw new Error("respuesta incompleta");
  const num = v => (v === "" || v == null || isNaN(+v)) ? undefined : Math.round(+v), bool = v => v == null || v === "" ? undefined : (v === true || v === "true" || v === "si" || v === "sí");
  return {...o, uso: USOS[o.uso] ? o.uso : undefined, pisos: num(o.pisos), dormitorios: num(o.dormitorios), banos: num(o.banos),
    piscina: bool(o.piscina), cochera: bool(o.cochera), terraza: bool(o.terraza), cuarto_servicio: bool(o.cuarto_servicio),
    opcion: OPTS[o.opcion] ? o.opcion : undefined, ambientacion: [].concat(o.ambientacion || []).filter(a => AMB[a]),
    explicacion: String(o.explicacion || ""), recomendaciones: [].concat(o.recomendaciones || []).map(String).slice(0, 4)};
}
async function pickModel(key) {   // el modelo Flash más reciente disponible para la clave (los Flash están en la capa gratuita)
  const cached = store.get("viv_gm"); if (cached) return cached;
  let best = "gemini-flash-latest";
  try {
    const r = await fetch(`${GAPI}/models?pageSize=200&key=${encodeURIComponent(key)}`); const j = await r.json();
    const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", ""))
      .filter(n => /^gemini-\d+(\.\d+)?-flash$/.test(n));
    ok.sort((a, b) => parseFloat(b.split("-")[1]) - parseFloat(a.split("-")[1]));
    if (ok.length) best = ok[0];
  } catch (e) {}
  store.set("viv_gm", best); return best;
}
async function viaGemini(key, text) {   // si un modelo está saturado o sin cupo, prueba el siguiente (cada modelo tiene su propio cupo)
  const body = {systemInstruction: {parts: [{text: SYS}]}, contents: [{role: "user", parts: [{text: briefing(text)}]}],
    generationConfig: {responseMimeType: "application/json", responseSchema: SCHEMA_G, temperature: 0.4}};
  const models = [...new Set([await pickModel(key), "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"])];
  let last = "";
  for (const m of models) {
    const r = await post(`${GAPI}/models/${m}:generateContent?key=${encodeURIComponent(key)}`, body, {}, 30000);
    if (r.ok) { const parts = (((r.j.candidates || [])[0] || {}).content || {}).parts; if (parts) return readJSON(parts.map(p => p.text || "").join("")); last = "respuesta vacía"; continue; }
    last = errMsg(r); if (r.status === 400 || r.status === 401 || r.status === 403) break;   // clave inválida: no insistir
  }
  throw new Error("Gemini: " + last);
}
async function viaChat(name, url, key, models, text, ms) {   // servicios con formato de chat estándar
  let last = "";
  for (const m of models) {
    const r = await post(url, {model: m, temperature: 0.4, response_format: {type: "json_object"}, messages: [{role: "system", content: SYS + "\n" + FIELDS}, {role: "user", content: briefing(text)}]},
      key ? {authorization: "Bearer " + key} : {}, ms);
    if (r.ok) { try { return readJSON((((r.j.choices || [])[0] || {}).message || {}).content); } catch (e) { last = e.message; continue; } }
    last = errMsg(r); if (r.status === 401 || r.status === 403) break;
  }
  throw new Error(name + ": " + last);
}
async function askAssistant(text, onStep) {   // cadena: servicios con clave propia (más rápidos) y luego el servicio abierto sin clave
  const gk = store.get("viv_gk"), qk = store.get("viv_qk"), steps = [];
  if (qk) steps.push(["Groq", () => viaChat("Groq", "https://api.groq.com/openai/v1/chat/completions", qk, ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"], text, 25000)]);
  if (gk) steps.push(["Gemini", () => viaGemini(gk, text)]);
  steps.push(["servicio abierto", () => viaChat("Servicio abierto", "https://text.pollinations.ai/openai", "", ["openai", "openai-fast"], text, 60000)]);
  const errs = [];
  for (const [name, fn] of steps) {
    onStep && onStep(name);
    try { const res = await fn(); res.via = name; return res; } catch (e) { errs.push(e.message); }
  }
  throw new Error(errs.join(" · "));
}
function applyParams(o) {
  const p = state.prog, n = state.norm;
  if (o.uso) p.estilo = o.uso;
  if (o.pisos) p.pisos = clamp(o.pisos, 1, n.maxP);
  if (o.dormitorios) p.dorm = clamp(o.dormitorios, 1, 10);
  if (o.banos) p.banos = clamp(o.banos, 1, 6);
  ["piscina", "cochera", "terraza"].forEach(k => { if (typeof o[k] === "boolean") p[k] = o[k]; });
  if (typeof o.cuarto_servicio === "boolean") p.servicio = o.cuarto_servicio;
  if (o.opcion) state.opt = o.opcion;
  if (o.nombre_negocio) p.negocio = String(o.nombre_negocio).slice(0, 28);
  const amb = o.ambientacion || o.amb; if (amb && amb.length) { p.amb = {}; amb.forEach(k => { if (AMB[k]) p.amb[k] = true; }); }
  if (p.pisos > 1 && p.banos < 2) p.banos = 2;
}
$("#aiGo").addEventListener("click", async () => {
  const t = $("#aiText").value.trim(), out = $("#aiOut"), btn = $("#aiGo");
  if (!t) { out.innerHTML = "<p>Escribe o dicta lo que el cliente quiere.</p>"; return; }
  btn.disabled = true; btn.textContent = "Afinando la propuesta…";
  const local = localParse(t);   // 1) propuesta inmediata con la lectura del equipo
  state.prog = JSON.parse(JSON.stringify(PROG0)); state.opt = "equilibrada";   // cada pedido nuevo parte de cero (no arrastra datos del cliente anterior)
  applyParams(local); syncForm(); regen();
  const tagsHtml = () => { const tg = Object.keys(state.prog.amb || {}).map(k => `<span class="chip">${AMB[k]}</span>`).join(""); return tg ? `<p>${tg}</p>` : ""; };
  out.innerHTML = `<p class="tag">Propuesta preliminar</p><p>${summary()}</p>${tagsHtml()}<p class="small">Afinando con el asistente en línea…</p>`;
  document.body.dataset.tab = "view"; $$(".tabs button").forEach(x => x.classList.toggle("on", x.dataset.t === "view")); setTimeout(resize, 50);
  toast("Propuesta lista. Afinando los detalles…");
  let res = null, err = null;   // 2) el asistente en línea la afina (puede tardar unos segundos)
  try { res = await askAssistant(t, name => { out.querySelector(".small:last-child").textContent = `Afinando con el asistente en línea (${name})…`; }); } catch (e) { err = e.message; }
  if (res) {
    const amb = [...new Set([...(res.ambientacion || []), ...(local.amb || [])])];
    res = {...local, ...Object.fromEntries(Object.entries(res).filter(([, v]) => v !== undefined)), ambientacion: amb};   // lo que el servicio no captó lo completa la lectura local
    applyParams(res); syncForm(); regen(true);
    out.innerHTML = `<p class="tag">Propuesta para el cliente</p><p>${esc(res.explicacion)}</p>${tagsHtml()}${res.recomendaciones && res.recomendaciones.length ? `<ul>${res.recomendaciones.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p class="small">Analizado en línea (${esc(res.via)}).</p>`;
    toast("Propuesta afinada ✓ La explicación para el cliente está en Configurar.");
  } else {
    out.innerHTML = `<p class="tag">Propuesta para el cliente</p><p>${summary()}</p>${tagsHtml()}<p class="small">${navigator.onLine === false ? "Sin internet: la propuesta se armó con la lectura automática del equipo." : `Los servicios en línea no respondieron esta vez (${esc(err || "")}); la propuesta se armó con la lectura automática. Puedes intentarlo de nuevo en un momento.`}</p>`;
  }
  btn.disabled = false; btn.textContent = "Diseñar propuesta";
});
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; el.classList.remove("out"); clearTimeout(toast.t); toast.t = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.hidden = true, 500); }, 4200); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
function summary() {
  const p = state.prog, biz = BIZ.includes(p.estilo), parts = [`${p.pisos} piso${p.pisos > 1 ? "s" : ""}`];
  if (biz) parts.push(`${USOS[p.estilo].toLowerCase()}${p.negocio ? ` «${esc(p.negocio)}»` : ""}`);
  parts.push(`${p.dorm} ${p.estilo === "hospedaje" ? "habitaciones" : "dormitorio" + (p.dorm > 1 ? "s" : "")}`, `${p.banos} baño${p.banos > 1 ? "s" : ""}`);
  if (p.piscina) parts.push("piscina"); if (p.cochera) parts.push("cochera"); if (p.terraza) parts.push("terraza"); if (p.servicio) parts.push("cuarto de servicio");
  return `Propuesta: ${parts.join(", ")}${biz ? "" : `, como ${USOS[p.estilo].toLowerCase()}`}. Opción ${OPTS[state.opt].toLowerCase()}. Puedes ajustar cualquier detalle en Configurar.`;
}
$("#gear").addEventListener("click", () => { $("#keyDlg").showModal(); $("#akey").value = store.get("viv_gk"); $("#qkey").value = store.get("viv_qk"); $("#advName").value = store.get("viv_an"); $("#advPhone").value = store.get("viv_ap"); });
$("#keySave").addEventListener("click", () => { store.set("viv_an", $("#advName").value.trim()); store.set("viv_ap", $("#advPhone").value.replace(/[^\d+ ]/g, "").trim()); store.set("viv_gk", $("#akey").value.trim()); store.set("viv_qk", $("#qkey").value.trim()); store.set("viv_gm", ""); $("#keyDlg").close(); });
/* plano de la maqueta del condominio: el asesor marca dónde está el lote */
let maqZ = 1;
function syncMaq() { $("#maqPill").hidden = !MAQ[state.proj]; }
function zoomMaq() {
  const im = $("#maqImg"), wide = im.naturalWidth > im.naturalHeight, box = $(".maqWrap").clientWidth || innerWidth - 60;
  if (wide) { im.style.height = "auto"; im.style.width = box * maqZ + "px"; } else { im.style.width = "auto"; im.style.height = `${58 * maqZ}vh`; }
  $("#maqZoom").textContent = maqZ > 1 ? "Alejar" : "Acercar";
}
function pinMaq() { const m = state.mark[state.proj], pin = $("#maqPin"); pin.hidden = !m; if (m) { pin.style.left = m.x * 100 + "%"; pin.style.top = m.y * 100 + "%"; } }
$("#maqBtn").addEventListener("click", () => {
  const p = PROJ.find(x => x.id === state.proj), im = $("#maqImg"); $("#maqTitle").textContent = `Plano del condominio · ${p.name}`;
  maqZ = 1; im.onload = zoomMaq; im.src = MAQ[state.proj]; $("#maqDlg").showModal(); zoomMaq(); pinMaq();
});
$("#maqImg").addEventListener("click", e => { const r = e.target.getBoundingClientRect(); state.mark[state.proj] = {x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height}; pinMaq(); });
$("#maqZoom").addEventListener("click", () => { maqZ = maqZ > 1 ? 1 : 2.2; zoomMaq(); });
$("#maqClear").addEventListener("click", () => { delete state.mark[state.proj]; pinMaq(); });
/* presentación automática: entorno, casa, vuelta completa, atardecer e interior; un toque la detiene */
const tour = {on: false};
const wait = ms => new Promise(r => { const t0 = performance.now(), chk = () => !tour.on ? r(false) : performance.now() - t0 >= ms ? r(true) : requestAnimationFrame(chk); chk(); });
function stopTour() { if (!tour.on) return; tour.on = false; controls.autoRotate = false; $("#tourBtn").classList.remove("on"); $("#tourBtn").textContent = "▶ Presentar"; }
$("#tourBtn").addEventListener("click", async () => {
  if (tour.on) { stopTour(); return; }
  tour.on = true; $("#tourBtn").classList.add("on"); $("#tourBtn").textContent = "■ Detener";
  const t0 = state.time, go = m => { state.mode = m; applyMode(false); };
  go("site"); if (!await wait(4500)) return;
  go("ext"); flyTo(homeView(design), 3); if (!await wait(3600)) return;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.6; if (!await wait(9000)) return;
  state.time = "tarde"; setTime(); if (!await wait(7000)) return;
  controls.autoRotate = false; state.time = t0; setTime();
  state.floor = 0; go("cut"); flyTo({pos: new THREE.Vector3(design.W / 2 - 4, 14 + design.pisos * 2, design.z0 - 6), tgt: new THREE.Vector3(design.W / 2, 0, design.z0 + design.fd / 2)}, 2.5); if (!await wait(5000)) return;
  if (design.pisos > 1) { state.floor = 1; applyMode(false); $$("#floors button").forEach(b => b.classList.toggle("on", +b.dataset.f === 1)); if (!await wait(4500)) return; }
  state.floor = 0; go("ext"); flyTo(homeView(design), 2.5); stopTour();
});
canvas.addEventListener("pointerdown", stopTour); $("#modes").addEventListener("click", e => { if (e.isTrusted) stopTour(); });
/* dictado por voz (Chrome en Android y Safari en iPhone lo traen; si no, queda el micrófono del teclado) */
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, b = $("#micBtn"); if (!SR) return; b.hidden = false;
  let rec = null;
  b.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = "es-PE"; rec.interimResults = true; rec.continuous = true;
    const base = $("#aiText").value.trim(); let fin = "";
    rec.onresult = e => { let tmp = ""; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript + " "; else tmp += e.results[i][0].transcript; } $("#aiText").value = (base ? base + " " : "") + fin + tmp; };
    rec.onend = () => { rec = null; b.classList.remove("rec"); b.textContent = "🎤 Dictar"; };
    rec.onerror = ev => { if (ev.error === "not-allowed") toast("Permite el uso del micrófono para dictar."); };
    rec.start(); b.classList.add("rec"); b.textContent = "■ Listo";
  });
})();
const PROG0 = {pisos: 2, dorm: 3, banos: 2, piscina: false, cochera: true, terraza: true, servicio: false, estilo: "playa", negocio: "", amb: {}};
$("#examples").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("#aiText").value = b.dataset.t; $("#aiText").focus(); });
/* doble toque: acercarse al punto tocado (en Exterior, Entorno, Corte y Rayos X) */
(() => {
  const ray = new THREE.Raycaster(), v = new THREE.Vector2(); let lastTap = 0, lastXY = null;
  const focus = (cx, cy) => {
    const r = canvas.getBoundingClientRect(); v.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(v, cam);
    if (state.mode === "walk" && walk) {   // al recorrer: caminar hasta el punto del piso tocado
      const h = ray.intersectObjects(root.children, true).find(h => h.object.visible && h.object.isMesh && h.distance > 0.3);
      if (h && Math.abs(h.point.y - walk.y) < 0.4 && h.distance < 15) walk.goal = {x: h.point.x, z: h.point.z};
      return;
    }
    if (!["ext", "site", "cut", "xray"].includes(state.mode)) return;
    const hit = ray.intersectObjects(root.children, true).find(h => h.object.visible && h.object.isMesh && h.distance > 0.5 && (!h.object.material.clippingPlanes || !h.object.material.clippingPlanes.length || h.point.y < cutPlane.constant + 0.01));
    if (!hit) return;
    const dir = cam.position.clone().sub(controls.target).normalize(), dist = clamp(cam.position.distanceTo(controls.target) * 0.45, 6, 40);
    if (state.mode === "site") { state.mode = "ext"; applyMode(false); }
    flyTo({pos: hit.point.clone().add(dir.multiplyScalar(dist)), tgt: hit.point.clone()}, 1.1);
  };
  canvas.addEventListener("dblclick", e => focus(e.clientX, e.clientY));
  canvas.addEventListener("pointerup", e => { if (e.pointerType !== "touch") return; const now = performance.now(); if (now - lastTap < 320 && lastXY && Math.hypot(e.clientX - lastXY[0], e.clientY - lastXY[1]) < 30) { focus(e.clientX, e.clientY); lastTap = 0; } else { lastTap = now; lastXY = [e.clientX, e.clientY]; } });
})();
setTimeout(() => { if (!store.get("viv_tip")) { toast("Arrastra para girar · Dos dedos para acercar · Doble toque para ir a un punto"); store.set("viv_tip", "1"); } }, 6000);   // ayuda la primera vez
