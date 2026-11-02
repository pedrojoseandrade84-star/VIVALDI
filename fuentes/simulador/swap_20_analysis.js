// function analysis() {
// /* ---------------- interfaz ---------------- */
function analysis() {
  const d = design, m = d.metrics, cost = m.techada * state.costM2, u = state.prog.estilo, biz = BIZ.includes(u);
  const byFloor = Array.from({length: d.pisos}, (_, i) => d.rooms.filter(r => r.lvl === i && r.type !== "stair"));
  const met = Object.entries(metrado).filter(([k]) => !/Acometida/.test(k)).sort();
  const guests = d.rooms.filter(r => r.type === "guest").length, shopA = d.rooms.filter(r => r.biz).reduce((s, r) => s + r.area, 0);
  const k3 = biz ? (u === "hospedaje" ? [`${guests}`, "habitaciones"] : u === "restaurante" ? [`${d.tables || 0}`, "mesas de 4 personas"] : [`${fmt(shopA, 0)} m²`, "de local"]) : [`${m.dorm}`, "dormitorios"];
  const cmp = ["compacta", "equilibrada", "maxima"].map(o => { const keep = state.opt; state.opt = o; const dd = generate(); state.opt = keep; return {o, d: dd}; });
  $("#analysis").innerHTML = `
  <div class="kpis">
    <div><b>${fmt(m.techada, 0)} m²</b><span>área techada</span></div>
    <div><b>${fmt(m.ocup, 0)}%</b><span>ocupación del lote</span></div>
    <div><b>${fmt(m.libreP, 0)}%</b><span>área libre</span></div>
    <div><b>${fmt(m.coef, 2)}</b><span>coeficiente de edificación</span></div>
    <div><b>${k3[0]}</b><span>${k3[1]}</span></div>
    <div><b>${m.banos}</b><span>baños</span></div>
  </div>
  <h4>Comparar opciones</h4>
  <table class="rooms cmp"><tr><td></td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}"><button type="button" data-o="${c.o}">${OPTS[c.o].replace(" aprovechamiento", "")}</button></td>`).join("")}</tr>
    <tr><td>Pisos</td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}">${c.d.pisos}</td>`).join("")}</tr>
    <tr><td>Área techada</td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}">${fmt(c.d.metrics.techada, 0)} m²</td>`).join("")}</tr>
    <tr><td>${biz ? "Ambientes" : "Dormitorios"}</td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}">${biz ? c.d.rooms.filter(r => r.type !== "stair" && r.type !== "hall").length : c.d.metrics.dorm}</td>`).join("")}</tr>
    <tr><td>Área libre</td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}">${fmt(c.d.metrics.libreP, 0)}%</td>`).join("")}</tr>
    <tr><td>Costo ref.</td>${cmp.map(c => `<td class="${c.o === state.opt ? "on" : ""}">${soles(c.d.metrics.techada * state.costM2)}</td>`).join("")}</tr></table>
  <h4>Normativa (parámetros ingresados)</h4>
  <ul class="checks">${d.checks.map(c => `<li class="${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "!"} ${c.t}</li>`).join("")}</ul>
  ${d.warnings.length ? `<div class="warn">${d.warnings.map(w => `<p>${w}</p>`).join("")}</div>` : ""}
  ${biz ? `<div class="warn biz"><p><b>Antes de invertir en un negocio:</b> confirma que la zonificación del lote y el reglamento interno del condominio permiten uso comercial. Muchos condominios de playa solo admiten vivienda.</p></div>` : ""}
  <h4>Ambientes</h4>
  ${byFloor.map((rs, i) => `<table class="rooms"><caption>Piso ${i + 1}</caption>${rs.map(r => `<tr><td>${r.name}</td><td>${fmt(r.w)} × ${fmt(r.d)}</td><td>${fmt(r.area)} m²</td></tr>`).join("")}</table>`).join("")}
  <h4>Instalaciones (metrado referencial)</h4>
  <table class="rooms">
    <tr><td>Puntos de luz</td><td></td><td>${d.counts.puntosLuz}</td></tr>
    <tr><td>Tomacorrientes</td><td></td><td>${d.counts.tomas}</td></tr>
    <tr><td>Salidas de agua a aparatos</td><td></td><td>${d.counts.aparatos}</td></tr>
    ${met.map(([k, v]) => `<tr><td>${k}</td><td></td><td>${fmt(v, 0)} m</td></tr>`).join("")}
  </table>
  <p class="small">Desagüe ${state.desague === "bio" ? "a biodigestor" : "a red pública"}${u === "restaurante" ? " con trampa de grasa para la cocina" : ""} · agua con tanque elevado · tablero general junto al ingreso.</p>
  <h4>Costo referencial de construcción</h4>
  <div class="cost"><label>Costo por m² (S/)<input id="costM2" type="number" inputmode="numeric" value="${state.costM2}" min="500" step="50"></label><b>${soles(cost)}</b></div>
  <p class="small">Casco y acabados según el costo por m² que ingreses; ajústalo con la cotización de un constructor. No incluye licencia, expediente técnico, equipamiento ni piscina.</p>
  <h4>Recomendaciones técnicas</h4>
  <ul class="recs">${recommendations(d).map(r => `<li>${r}</li>`).join("")}</ul>
  <h4>Compra segura: verificar antes de firmar</h4>
  <ul class="checks list">
    <li>Partida registral del lote independizado en SUNARP, sin cargas ni gravámenes.</li>
    <li>Certificado de Parámetros Urbanísticos de la municipalidad (retiros, altura, área libre y usos permitidos).</li>
    <li>Factibilidad de agua, desagüe y electricidad para el lote.</li>
    <li>Plano perimétrico con medidas y linderos iguales a la partida.</li>
    <li>Estudio de mecánica de suelos antes de diseñar la cimentación.</li>
    ${biz ? `<li>Reglamento interno del condominio: que permita ${u === "hospedaje" ? "hospedaje" : "comercio"}.</li><li>Licencia de funcionamiento municipal e Inspección Técnica de Seguridad (ITSE).</li>${u === "restaurante" ? "<li>Carné de sanidad del personal, trampa de grasa y extracción de humos.</li>" : ""}${u === "hospedaje" ? "<li>Inscripción del establecimiento de hospedaje y señalización de evacuación.</li>" : ""}` : ""}
  </ul>`;
  $$("#analysis .cmp button").forEach(b => b.addEventListener("click", () => { state.opt = b.dataset.o; regen(true); }));
  const ci = $("#costM2"); ci.addEventListener("change", () => { state.costM2 = Math.max(100, +ci.value || 0); analysis(); });
}
function recommendations(d) {
  const r = [], W = d.W, u = state.prog.estilo, a = state.prog.amb || {};
  r.push("Zona costera: concreto con recubrimiento adecuado al ambiente salino, acero protegido y carpintería de aluminio o PVC; prever mantenimiento de pintura exterior.");
  if (W <= 6.5) r.push("Frente angosto: priorice la ventilación cruzada y la luz natural desde el frente y el patio posterior.");
  if (d.pisos >= 3) r.push("Tres pisos o más: la estructura de concreto armado debe diseñarla un ingeniero civil colegiado según la Norma E.030 (sismorresistente).");
  if (d.pool) r.push("Piscina: incluir cuarto de bomba y filtro, cerco o cobertor de seguridad y verificar la distancia a los muros colindantes.");
  if (u === "restaurante") r.push("Restaurante: cocina con superficies lavables, extracción mecánica de humos, trampa de grasa y baños diferenciados para clientes.");
  if (u === "hospedaje") r.push("Hospedaje: cada habitación con baño propio, buena ventilación y señalización de evacuación; la terraza de azotea suma valor para el alquiler.");
  if (u === "bodega" || u === "comercio") r.push("Local comercial: frente libre y bien iluminado, puerta enrollable o de vidrio templado y medidor eléctrico independiente para el negocio.");
  if (a.ninos) r.push("Con niños: barandas de al menos 1 m en escaleras y terrazas, y cerco de seguridad en la piscina.");
  if (a.mayores) r.push("Adultos mayores: dormitorio y baño accesible en el primer piso, barras de apoyo, rampa de ingreso y pisos antideslizantes.");
  if (a.mascota) r.push("Mascota: espacio sombreado en el patio y pisos exteriores fáciles de lavar.");
  if (state.desague === "bio") r.push("Biodigestor: ubicarlo en zona de fácil acceso para el mantenimiento y lejos de la toma de agua.");
  r.push("Dejar la montante y el tablero con capacidad para therma eléctrica, cocina de inducción y una futura ampliación.");
  return r;
}

