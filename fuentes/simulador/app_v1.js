/* Simulador 3D de construcción en lotes Vivaldi
   - Motor de diseño generativo: reparte el programa del cliente en el lote respetando retiros, área libre y pisos máximos,
     y genera tres opciones (compacta, equilibrada y máximo aprovechamiento).
   - Escena Three.js: lote, casa por pisos, escalera transitable, piscina, cochera, vecinos y calle.
   - Instalaciones: eléctricas (alumbrado, tomacorrientes, fuerza), agua fría, agua caliente y desagüe, con metrado referencial.
   - Modos: exterior, recorrido en primera persona, corte por piso, rayos X y plano 2D. */
(function () {
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = (n, d = 1) => Number(n).toLocaleString("es-PE", {minimumFractionDigits: d, maximumFractionDigits: d});
const soles = n => "S/ " + Math.round(n).toLocaleString("es-PE");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- datos ---------------- */
const PROJ = [
  {id: "planicie", name: "La Planicie de Asia", km: "Km 111.5", W: 8, D: 25},
  {id: "terrazas", name: "Las Terrazas de Cerro Azul", km: "Km 117.5", W: 8, D: 25},
  {id: "esmeralda", name: "La Esmeralda de Cerro Azul", km: "Cerro Azul", W: 10, D: 25},
  {id: "portada", name: "La Portada del Sol", km: "Km 115.5", W: 6, D: 15},
  {id: "lirios", name: "Lirios del Mar de Asia", km: "Km 100", W: 6, D: 15},
  {id: "otro", name: "Otro lote (medidas libres)", km: "", W: 8, D: 20},
];
const OPTS = {compacta: "Compacta", equilibrada: "Equilibrada", maxima: "Máximo aprovechamiento"};
const state = {
  proj: "planicie", W: 8, D: 25,
  norm: {rf: 3, rp: 0, al: 30, maxP: 3, h: 2.7},
  prog: {pisos: 2, dorm: 3, banos: 3, piscina: true, cochera: true, terraza: true, servicio: false, estilo: "playa"},
  opt: "equilibrada", desague: "red", costM2: 1500,
  mode: "ext", floor: 0, cut: 1.3,
  layers: {muros: true, losas: true, mob: true, elec: true, agua: true, caliente: true, desague: true, etiquetas: true, vecinos: true},
};
let design = null;

/* ---------------- programa arquitectónico ---------------- */
const R = (name, type, a, o = {}) => Object.assign({name, type, a}, o);
function program(p, opt, maxP) {
  const pisos = opt === "maxima" ? Math.max(p.pisos, maxP) : p.pisos;
  const floors = [];
  if (p.estilo === "renta" && pisos >= 2) {
    const per = Math.max(1, Math.round(p.dorm / pisos));
    for (let i = 0; i < pisos; i++) floors.push({
      front: [R(`Sala-comedor ${String.fromCharCode(65 + i)}`, "living", 17)],
      core: [R("Baño", "bath", 4), R("Escalera", "stair", 0)],
      back: [R("Cocina", "kitchen", 7), R("Lavandería", "laundry", 3)].concat(Array.from({length: per}, (_, k) => R(k ? "Dormitorio" : "Dormitorio principal", "bed", k ? 9 : 12))),
      unit: String.fromCharCode(65 + i)});
    return {floors, pisos};
  }
  if (pisos === 1) {
    const back = [R("Cocina", "kitchen", 9), R("Lavandería", "laundry", 4)];
    for (let k = 0; k < p.dorm; k++) back.push(R(k ? "Dormitorio" : "Dormitorio principal", "bed", k ? 9 : 12));
    for (let k = 2; k < p.banos; k++) back.push(R("Baño", "bath", 4));
    if (p.servicio) back.push(R("Cuarto de servicio", "bed", 6));
    floors.push({front: [R("Sala-comedor", "living", 22)], core: [R("Baño principal", "bath", 4.5)].concat(p.banos >= 2 ? [R("Baño", "bath", 4)] : []), back});
    return {floors, pisos};
  }
  let dorms = p.dorm + (opt === "maxima" ? Math.max(0, pisos - p.pisos) : 0);
  let baths = Math.max(2, p.banos);
  const g = {front: [R("Sala", "living", 16)], core: [R("Baño de visitas", "bath", 2.6), R("Escalera", "stair", 0)], back: [R("Comedor", "living", 10), R("Cocina", "kitchen", 9), R("Lavandería", "laundry", 4)]};
  if (p.servicio) g.back.push(R("Cuarto de servicio", "bed", 6), R("Baño de servicio", "bath", 2.6));
  if (dorms >= 4) { g.back.push(R("Dormitorio de visitas", "bed", 9)); dorms--; }
  floors.push(g);
  for (let i = 1; i < pisos; i++) {
    const fl = {front: [], core: [], back: []};
    if (i === 1) {
      fl.front.push(R("Dormitorio principal", "bed", 13), R("Baño principal", "bath", 4.5)); dorms--; baths -= 2;
      const n = Math.min(dorms, pisos === 2 ? dorms : 2);
      for (let k = 0; k < n; k++) fl.back.push(R("Dormitorio", "bed", 10));
      dorms -= n;
      fl.core.push(baths > 0 ? R("Baño", "bath", 4) : R("Estudio", "study", 5)); if (baths > 0) baths--;
    } else {
      fl.front.push(R("Sala de estar", "living", 14));
      for (let k = 0; k < dorms; k++) fl.back.push(R("Dormitorio", "bed", 10));
      dorms = 0;
      fl.core.push(R("Baño", "bath", 3.6));
      if (!fl.back.length || opt === "maxima") fl.back.push(R("Terraza con parrilla", "terrace", 14, {open: true}));
    }
    fl.core.push(R("Escalera", "stair", 0));
    floors.push(fl);
  }
  return {floors, pisos};
}

/* ---------------- motor de distribución ---------------- */
const MINW = {bath: 1.5, laundry: 1.5, storage: 1.3, kitchen: 2.2, bed: 2.6, living: 2.8, study: 2.0, hall: 1.0, terrace: 2.0};
function packRows(rooms, W) {
  const rows = [], target = W * 3.6, maxN = W >= 9.5 ? 4 : 3; let cur = [], acc = 0;
  rooms.forEach(r => { cur.push(r); acc += r.a; if (acc >= target * 0.85 || cur.length >= maxN) { rows.push(cur); cur = []; acc = 0; } });
  if (cur.length) { const lastR = rows[rows.length - 1]; if (lastR && acc < W * 2.0 && lastR.length + cur.length <= maxN) lastR.push(...cur); else rows.push(cur); }
  return rows.map(rs => ({rooms: rs, nat: clamp(rs.reduce((s, r) => s + r.a, 0) / W, 2.7, 5.2)}));
}
function widths(rs, avail) {   // reparte el ancho en proporción al área, con anchos mínimos por tipo
  const tot = rs.reduce((s, r) => s + r.a, 0) || 1; let w = rs.map(r => avail * r.a / tot);
  for (let it = 0; it < 4; it++) {
    const mins = rs.map((r, i) => Math.max(MINW[r.type] || 1.5, 0) > w[i]);
    const fixed = rs.reduce((s, r, i) => s + (mins[i] ? (MINW[r.type] || 1.5) : 0), 0), free = rs.reduce((s, r, i) => s + (mins[i] ? 0 : r.a), 0) || 1;
    w = rs.map((r, i) => mins[i] ? (MINW[r.type] || 1.5) : Math.max(0.8, (avail - fixed) * r.a / free));
  }
  const k = avail / w.reduce((s, x) => s + x, 0); return w.map(x => x * k);
}
function placeRow(row, W, z, d, lvl, out, stairW, core) {
  let rs = row.filter(r => r.type !== "stair"); const st = row.find(r => r.type === "stair");
  const avail = W - (st ? stairW : 0);
  if (core) {   // fila central: baños con su medida y el resto como hall de distribución
    const need = rs.reduce((s, r) => s + Math.max(MINW[r.type] || 1.5, r.a / d), 0);
    if (avail - need > 1.0) rs = rs.map(r => Object.assign({}, r, {a: Math.max(MINW[r.type] || 1.5, r.a / d) * d})).concat([R("Hall", "hall", (avail - need) * d)]);
  }
  const ws = widths(rs, avail); let x = 0;
  rs.forEach((r, i) => { out.push(Object.assign({}, r, {x, z, w: ws[i], d, lvl})); x += ws[i]; });
  if (st) out.push(Object.assign({}, st, {x: W - stairW, z, w: stairW, d, lvl}));
}
function generate() {
  const {W, D} = state, n = state.norm, p = state.prog, opt = state.opt;
  const {floors, pisos} = program(p, opt, n.maxP);
  const z0 = n.rf, maxDepth = D - n.rf - n.rp;
  const fdMax = Math.min(maxDepth, (W * D * (1 - n.al / 100)) / W);
  const hasStair = pisos > 1, coreD = hasStair ? 4.0 : clamp(floors[0].core.reduce((s, r) => s + r.a, 0) / W, 2.6, 3.6);
  const frontD = clamp(floors[0].front.reduce((s, r) => s + r.a, 0) / W, 3.4, 5.2);
  const sumNat = rows => rows.reduce((s, r) => s + r.nat, 0);
  let rows0 = packRows(floors[0].back, W);
  const natural = frontD + coreD + sumNat(rows0), base = Math.min(natural, fdMax);
  let fd = opt === "compacta" ? base : opt === "equilibrada" ? (base + fdMax) / 2 : fdMax;
  const warnings = [];
  if (natural > fdMax + 0.01) warnings.push("El programa pedido no entra completo en el área permitida: los ambientes se ajustaron por debajo de su medida ideal.");
  const backD = Math.max(2.7, fd - frontD - coreD), rooms = [];
  const extras = [R("Sala de TV", "living", 12), R("Depósito", "storage", 5), R("Estudio", "study", 8), R("Dormitorio de visitas", "bed", 9)];
  while (backD > sumNat(rows0) * 1.3 && extras.length) { floors[0].back.push(extras.shift()); rows0 = packRows(floors[0].back, W); }
  floors.forEach((f, lvl) => {
    let z = z0;
    placeRow(f.front, W, z, frontD, lvl, rooms, 1.2); z += frontD;
    placeRow(f.core, W, z, coreD, lvl, rooms, 1.2, true); z += coreD;
    const rows = lvl ? packRows(f.back, W) : rows0, tot = sumNat(rows);
    let used = lvl === 0 || tot >= backD - 1.6 ? backD : Math.min(backD, tot * 1.15);
    if (!rows.length) used = 0;
    rows.forEach(r => { const d = used * r.nat / tot; placeRow(r.rooms, W, z, d, lvl, rooms, 1.2); z += d; });
    if (lvl > 0 && backD - used > 0.3) rooms.push({name: p.terraza ? "Terraza" : "Azotea", type: "terrace", open: true, x: 0, z, w: W, d: backD - used, lvl, a: W * (backD - used)});
  });
  rooms.forEach(r => { r.area = r.w * r.d; if (r.type === "bed" && r.area < 7.5) warnings.push(`${r.name} (piso ${r.lvl + 1}) queda en ${fmt(r.area)} m²: por debajo de lo recomendable.`); });
  fd = frontD + coreD + backD;
  const yardZ = z0 + fd, yardD = D - yardZ;
  const pool = p.piscina && yardD >= 4.5 && W >= 6 ? {x: 1, z: yardZ + 1.2, w: Math.min(W - 2, 4), d: Math.min(yardD - 2.2, 8)} : null;
  if (p.piscina && !pool) warnings.push("No queda espacio en el patio para una piscina (se necesita un patio de al menos 4.5 m de fondo).");
  const parking = p.cochera ? (n.rf >= 4.8 ? {x: W - 3, z: 0, w: 3, d: n.rf, inside: false} : {x: W - 3, z: 0, w: 3, d: Math.max(n.rf, 2.5), inside: false, short: n.rf < 4.8}) : null;
  if (parking && parking.short) warnings.push("El retiro frontal es menor a 5 m: el auto queda parcialmente sobre la vereda. Considere ampliar el retiro o techar una cochera interior.");
  const closed = rooms.filter(r => !r.open);
  const techada = closed.reduce((s, r) => s + r.area, 0);
  const footprint = W * fd, lot = W * D;
  const d = {W, D, z0, fd, frontD, coreD, backD, pisos, rooms, pool, parking, yardZ, yardD, warnings, opt,
    metrics: {lot, footprint, techada, libre: lot - footprint, ocup: footprint / lot * 100, libreP: (lot - footprint) / lot * 100, coef: techada / lot,
      dorm: rooms.filter(r => r.type === "bed").length, banos: rooms.filter(r => r.type === "bath").length}};
  d.checks = [
    {ok: d.metrics.libreP >= n.al - 0.05, t: `Área libre ${fmt(d.metrics.libreP)}% (mínimo ${n.al}%)`},
    {ok: pisos <= n.maxP, t: `${pisos} piso${pisos > 1 ? "s" : ""} (máximo ${n.maxP})`},
    {ok: true, t: `Retiro frontal ${fmt(n.rf)} m respetado`},
    {ok: !warnings.some(w => w.includes("por debajo")), t: "Ambientes con medidas mínimas recomendables"},
  ];
  return d;
}

/* ---------------- Three.js: escena ---------------- */
const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfeaf2); scene.fog = new THREE.Fog(0xdfeaf2, 60, 140);
const cam = new THREE.PerspectiveCamera(55, 1, 0.05, 400);
const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
const controls = new THREE.OrbitControls(cam, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 4; controls.maxDistance = 90;
scene.add(new THREE.HemisphereLight(0xffffff, 0xcdb994, 0.75));
const sun = new THREE.DirectionalLight(0xfff3e0, 0.85);
sun.position.set(-14, 26, -10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80}); sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
let root = new THREE.Group(); scene.add(root);
const groups = {};
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);

const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness: 0.85, metalness: 0}, o));
const MAT = {
  wall: M(0xf3eee6), wallExt: M(0xf4ede1), accent: M(0x9b6a43, {roughness: 0.7}), slab: M(0xd9d6d0), glass: M(0x8ec5e8, {transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2}),
  sand: M(0xe6d8b8), grass: M(0x88b06a), street: M(0x3d4246), walk: M(0xc9c3b6), pave: M(0xbdb6a8), water: M(0x3fb6e0, {transparent: true, opacity: 0.85, roughness: 0.15}),
  poolEdge: M(0xece6da), wood: M(0xb07a4f), floorLiving: M(0xd7b98f), floorWet: M(0xe4e7ea), floorBed: M(0xcaa47a), floorTerr: M(0xc8b9a3),
  white: M(0xffffff, {roughness: 0.4}), dark: M(0x4a4f55), fabric: M(0x6c8ea8), bedding: M(0xf2efe8), steel: M(0x9aa3ab, {metalness: 0.6, roughness: 0.35}),
  neigh: M(0xffffff, {transparent: true, opacity: 0.16, depthWrite: false}), tank: M(0x2c2f33), meter: M(0x6d7680),
  e1: M(0xffc400, {emissive: 0x6b5200}), e2: M(0xff7a00, {emissive: 0x5a2b00}), e3: M(0xe53935, {emissive: 0x5a1414}),
  cold: M(0x1e88e5, {emissive: 0x0a2f55}), hot: M(0xe53935, {emissive: 0x4a0c0c}), sew: M(0x8d6e63, {emissive: 0x2a1d18}),
  light: M(0xfff6c8, {emissive: 0xffe680}),
};
const BUILD_MATS = ["wall", "wallExt", "accent", "slab", "glass", "floorLiving", "floorWet", "floorBed", "floorTerr", "wood", "white", "dark", "fabric", "bedding", "steel", "tank", "light", "water", "poolEdge"];
BUILD_MATS.forEach(k => { MAT[k].clippingPlanes = [cutPlane]; });
["e1", "e2", "e3", "cold", "hot", "sew", "meter"].forEach(k => { MAT[k].clippingPlanes = [cutPlane]; });

function box(w, h, d, mat, x, y, z, layer, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), mat);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = opts.cast !== false; m.receiveShadow = true; add(m, layer); return m;
}
function add(o, layer) { (groups[layer] || (groups[layer] = new THREE.Group(), groups[layer].name = layer, root.add(groups[layer]), groups[layer])).add(o); return o; }
function cyl(r, h, mat, x, y, z, layer, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; add(m, layer); return m; }

/* tuberías y cables: tramos rectos con uniones, y metrado */
const metrado = {};
function run(pts, r, mat, layer, key) {
  const v = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  for (let i = 0; i < v.length - 1; i++) {
    const a = v[i], b = v[i + 1], len = a.distanceTo(b); if (len < 1e-3) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    add(m, layer); metrado[key] = (metrado[key] || 0) + len;
    if (i) { const j = new THREE.Mesh(new THREE.SphereGeometry(r * 1.4, 8, 6), mat); j.position.copy(a); add(j, layer); }
  }
}
function label(text, x, y, z, size = 0.55, sub = "") {
  const c = document.createElement("canvas"), g = c.getContext("2d"), fs = 44;
  g.font = `800 ${fs}px Manrope, Arial`; const w1 = g.measureText(text).width; g.font = `600 ${fs * 0.72}px Manrope, Arial`; const w2 = sub ? g.measureText(sub).width : 0;
  c.width = Math.ceil(Math.max(w1, w2) + 40); c.height = sub ? 120 : 76;
  g.fillStyle = "rgba(10,56,86,.86)"; const rr = 18; g.beginPath(); g.moveTo(rr, 0); g.arcTo(c.width, 0, c.width, c.height, rr); g.arcTo(c.width, c.height, 0, c.height, rr); g.arcTo(0, c.height, 0, 0, rr); g.arcTo(0, 0, c.width, 0, rr); g.fill();
  g.fillStyle = "#fff"; g.font = `800 ${fs}px Manrope, Arial`; g.textBaseline = "middle"; g.fillText(text, 20, sub ? 40 : 39);
  if (sub) { g.fillStyle = "#BFE3FF"; g.font = `600 ${fs * 0.72}px Manrope, Arial`; g.fillText(sub, 20, 88); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: t, depthTest: false, transparent: true, clippingPlanes: [cutPlane]}));
  s.scale.set(size * c.width / c.height, size, 1); s.userData.base = s.scale.clone(); s.position.set(x, y, z); s.renderOrder = 10; add(s, "etiquetas"); return s;
}

let walls = [], stairs = [];
function build() {
  scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
  root = new THREE.Group(); scene.add(root); Object.keys(groups).forEach(k => delete groups[k]); Object.keys(metrado).forEach(k => delete metrado[k]);
  walls = []; stairs = [];
  const d = design, {W, D} = d, h = state.norm.h, n = state.norm;
  // terreno, calle, vecinos
  box(140, 0.1, 140, MAT.sand, -70 + W / 2, -0.12, -70 + D / 2, "terreno", {cast: false});
  box(140, 0.06, 8, MAT.street, -70 + W / 2, -0.1, -10, "terreno", {cast: false});
  box(140, 0.15, 2, MAT.walk, -70 + W / 2, -0.1, -2, "terreno", {cast: false});
  box(W, 0.04, d.yardD, MAT.grass, 0, -0.04, d.yardZ, "terreno", {cast: false});
  box(W, 0.04, n.rf, MAT.pave, 0, -0.03, 0, "terreno", {cast: false});
  [[-0.12, 0.12], [W, 0.12]].forEach(([x, t]) => box(t, 1.8, D - n.rf, MAT.wallExt, x, 0, n.rf, "terreno"));
  box(W + 0.24, 1.8, 0.12, MAT.wallExt, -0.12, 0, D, "terreno");
  for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) {
    const nx = s < 0 ? -k * W : W + (k - 1) * W, hh = (k === 1 ? 2 : 1) * h + 0.3;
    box(W - 0.4, hh, Math.min(D - n.rf - 4, 12), MAT.neigh, nx + 0.2, 0, n.rf, "vecinos", {cast: false});
  }
  // poste y acometidas
  cyl(0.12, 8, MAT.dark, 0.3, 0, -1.6, "terreno");
  // cochera
  if (d.parking) {
    const p = d.parking; box(p.w, 0.03, p.d, MAT.walk, p.x, -0.01, p.z, "terreno", {cast: false});
    const car = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.3), M(0x2a6fa8, {roughness: 0.35, metalness: 0.3})); body.position.y = 0.55;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), M(0x1d2b36, {roughness: 0.2})); top.position.set(0, 1.15, 0.2); car.add(body, top);
    [[-0.8, -1.4], [0.8, -1.4], [-0.8, 1.4], [0.8, 1.4]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 14), MAT.dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); car.add(w); });
    car.traverse(o => o.castShadow = true); car.position.set(p.x + p.w / 2, 0, p.z + Math.max(p.d, 4.4) / 2 - (p.short ? 2.2 - p.d / 2 : 0)); add(car, "mob");
  }
  // piscina
  if (d.pool) {
    const p = d.pool; box(p.w + 0.6, 0.06, p.d + 0.6, MAT.poolEdge, p.x - 0.3, 0, p.z - 0.3, "losas", {cast: false});
    box(p.w, 0.02, p.d, MAT.water, p.x, 0.05, p.z, "losas", {cast: false});
  }
  // ambientes: pisos, muros, puertas, ventanas
  d.rooms.forEach(r => {
    const y = r.lvl * h, mat = r.type === "bath" || r.type === "kitchen" || r.type === "laundry" ? MAT.floorWet : r.type === "bed" ? MAT.floorBed : r.type === "terrace" ? MAT.floorTerr : MAT.floorLiving;
    if (r.type !== "stair") box(r.w - 0.02, 0.03, r.d - 0.02, mat, r.x + 0.01, y + 0.01, r.z + 0.01, "losas", {cast: false});
  });
  for (let lvl = 0; lvl < d.pisos; lvl++) buildWalls(d.rooms.filter(r => r.lvl === lvl), lvl, h);
  buildSlabs(d, h);
  buildStairs(d, h);
  buildFurniture(d, h);
  buildInstalls(d, h);
  d.rooms.forEach(r => label(r.name, r.x + r.w / 2, r.lvl * h + 0.9, r.z + r.d / 2, 0.42, r.type === "stair" ? "" : `${fmt(r.w)} × ${fmt(r.d)} m · ${fmt(r.area)} m²`));
  label(`Frente ${fmt(W)} m`, W / 2, 0.3, -0.6, 0.5); label(`Fondo ${fmt(D)} m`, W + 0.6, 0.3, D / 2, 0.5);
  if (d.pool) label("Piscina", d.pool.x + d.pool.w / 2, 0.6, d.pool.z + d.pool.d / 2, 0.45, `${fmt(d.pool.w)} × ${fmt(d.pool.d)} m`);
  label(`Patio ${fmt(W * d.yardD, 0)} m²`, W / 2, 0.4, d.yardZ + Math.min(d.yardD - 0.4, 0.9), 0.4);
  applyLayers(); applyMode(true);
}

function buildWalls(rooms, lvl, h) {
  const y = lvl * h, H = new Map(), V = new Map(), doors = [];
  const fz0 = design.z0, fz1 = design.z0 + design.fd, W = design.W;
  const addL = (map, k, a, b) => { k = Math.round(k * 100) / 100; (map.get(k) || map.set(k, []).get(k)).push([a, b]); };
  const closed = rooms.filter(r => !r.open);
  closed.forEach(r => {
    if (r.type === "stair") {   // escalera: abierta adelante y atrás para poder subir y llegar
      addL(V, r.x, r.z, r.z + r.d); addL(V, r.x + r.w, r.z, r.z + r.d);
      doors.push({o: "h", c: r.z, a: r.x + 0.02, b: r.x + r.w - 0.02}, {o: "h", c: r.z + r.d, a: r.x + 0.02, b: r.x + r.w - 0.02}); return;
    }
    addL(H, r.z, r.x, r.x + r.w); addL(H, r.z + r.d, r.x, r.x + r.w); addL(V, r.x, r.z, r.z + r.d); addL(V, r.x + r.w, r.z, r.z + r.d);
    const front = Math.abs(r.z - fz0) < 0.01;
    if (front && lvl === 0 && r.x === 0) doors.push({o: "h", c: r.z, a: r.x + 0.6, b: r.x + 1.6, main: true});
    else if (front && lvl > 0) doors.push({o: "h", c: r.z + r.d, a: r.x + r.w / 2 - 0.45, b: r.x + r.w / 2 + 0.45});
    else if (!front) doors.push({o: "h", c: r.z, a: r.x + Math.min(r.w / 2, 1.2) - 0.45, b: r.x + Math.min(r.w / 2, 1.2) + 0.45});
    if (r.x > 0.01) doors.push({o: "v", c: r.x, a: r.z + r.d / 2 - 0.45, b: r.z + r.d / 2 + 0.45});
  });
  rooms.filter(r => r.open).forEach(r => {   // parapetos de terrazas
    if (Math.abs(r.z + r.d - fz1) < 0.01) box(r.w, 1.0, 0.12, MAT.wallExt, r.x, y, r.z + r.d - 0.12, "muros");
    if (r.x < 0.01) box(0.12, 1.0, r.d, MAT.wallExt, 0, y, r.z, "muros");
    if (r.x + r.w > W - 0.01) box(0.12, 1.0, r.d, MAT.wallExt, W - 0.12, y, r.z, "muros");
  });
  const merge = list => { list.sort((a, b) => a[0] - b[0]); const out = []; list.forEach(([a, b]) => { const l = out[out.length - 1]; if (l && a <= l[1] + 0.01) l[1] = Math.max(l[1], b); else out.push([a, b]); }); return out; };
  const cut = (segs, gaps) => { let res = segs; gaps.forEach(g => { const nx = []; res.forEach(([a, b]) => { if (g.b <= a || g.a >= b) nx.push([a, b]); else { if (g.a > a) nx.push([a, g.a]); if (g.b < b) nx.push([g.b, b]); } }); res = nx; }); return res; };
  const wallSeg = (o, c, a, b, ext, lateral) => {
    const t = ext ? 0.2 : 0.13, len = b - a; if (len < 0.05) return;
    const place = (y0, y1, mat, along0 = a, along1 = b, layer = "muros") => o === "h" ? box(along1 - along0, y1 - y0, t, mat, along0, y + y0, c - t / 2, layer) : box(t, y1 - y0, along1 - along0, mat, c - t / 2, y + y0, along0, layer);
    const win = ext && !lateral && len > 1.3;
    if (!win) { const m = place(0, h, ext ? MAT.wallExt : MAT.wall); walls.push({o, c, a, b, t, y0: y, y1: y + h}); return m; }
    const ww = Math.min(len - 0.6, lvl === 0 ? 2.8 : 2.2), w0 = a + (len - ww) / 2, w1 = w0 + ww, sill = lvl === 0 && c < fz0 + 0.1 ? 0.35 : 0.9;
    place(0, h, MAT.wallExt, a, w0); place(0, h, MAT.wallExt, w1, b);
    place(0, sill, MAT.wallExt, w0, w1); place(2.2, h, MAT.wallExt, w0, w1);
    o === "h" ? box(ww, 2.2 - sill, 0.03, MAT.glass, w0, y + sill, c - 0.015, "muros", {cast: false}) : box(0.03, 2.2 - sill, ww, MAT.glass, c - 0.015, y + sill, w0, "muros", {cast: false});
    walls.push({o, c, a, b: w0, t, y0: y, y1: y + h}, {o, c, a: w1, b, t, y0: y, y1: y + h}, {o, c, a: w0, b: w1, t, y0: y, y1: y + h});
  };
  for (const [k, l] of H) {
    const ext = Math.abs(k - fz0) < 0.02 || Math.abs(k - fz1) < 0.02;
    const segs = cut(merge(l), doors.filter(dd => dd.o === "h" && Math.abs(dd.c - k) < 0.02));
    segs.forEach(([a, b]) => wallSeg("h", k, a, b, ext, false));
    doors.filter(dd => dd.o === "h" && Math.abs(dd.c - k) < 0.02).forEach(dd => {
      box(dd.b - dd.a, h - 2.1, ext ? 0.2 : 0.13, ext ? MAT.wallExt : MAT.wall, dd.a, y + 2.1, k - (ext ? 0.1 : 0.065), "muros");
      if (dd.main) { const door = box(0.05, 2.08, 0.95, MAT.wood, dd.a, y, k, "muros"); door.rotation.y = 0; }
    });
  }
  for (const [k, l] of V) {
    const ext = Math.abs(k) < 0.02 || Math.abs(k - W) < 0.02;
    const gaps = doors.filter(dd => dd.o === "v" && Math.abs(dd.c - k) < 0.02);
    cut(merge(l), gaps).forEach(([a, b]) => wallSeg("v", k, a, b, ext, ext));
    gaps.forEach(dd => box(0.13, h - 2.1, dd.b - dd.a, MAT.wall, k - 0.065, y + 2.1, dd.a, "muros"));
  }
  // fachada: listones de madera en el frente del último piso y volado de balcón
  if (lvl > 0 && state.prog.terraza && state.norm.rf >= 2) {
    box(W, 0.15, 1.1, MAT.slab, 0, y - 0.15, fz0 - 1.1, "losas");
    box(W, 1.0, 0.04, MAT.glass, 0, y, fz0 - 1.1, "muros", {cast: false});
    box(W, 0.06, 0.08, MAT.steel, 0, y + 1.0, fz0 - 1.12, "muros");
  }
  if (lvl === design.pisos - 1 && state.prog.estilo === "playa") for (let i = 0; i < Math.floor(W / 0.5); i++) if (i % 3 !== 1) box(0.08, 0.6, 0.06, MAT.accent, i * 0.5 + 0.2, y + h - 0.62, fz0 - 0.16, "muros");
}

function buildSlabs(d, h) {
  const {W, z0, fd} = d, st = d.rooms.find(r => r.type === "stair");
  for (let lvl = 1; lvl <= d.pisos; lvl++) {
    const y = lvl * h - 0.18, top = lvl === d.pisos;
    const cover = top ? d.rooms.filter(r => r.lvl === lvl - 1 && !r.open) : d.rooms.filter(r => r.lvl === lvl);
    cover.forEach(r => {
      if (st && r.type === "stair" && !top) return;
      box(r.w, 0.18, r.d, MAT.slab, r.x, y, r.z, "losas");
    });
    if (top) {   // azotea: parapeto y tanque elevado
      box(W, 0.9, 0.12, MAT.wallExt, 0, y + 0.18, z0, "muros"); box(0.12, 0.9, fd, MAT.wallExt, 0, y + 0.18, z0, "muros"); box(0.12, 0.9, fd, MAT.wallExt, W - 0.12, y + 0.18, z0, "muros");
      const roofBack = Math.max(...cover.map(r => r.z + r.d)); box(W, 0.9, 0.12, MAT.wallExt, 0, y + 0.18, roofBack - 0.12, "muros");
      const bath = d.rooms.filter(r => r.type === "bath" && r.lvl === d.pisos - 1)[0] || cover[0];
      cyl(0.55, 1.25, MAT.tank, bath.x + bath.w / 2, y + 0.18, bath.z + bath.d / 2, "agua", 20);
      d.tank = {x: bath.x + bath.w / 2, y: y + 0.18, z: bath.z + bath.d / 2};
    }
  }
  if (d.pisos === 1) { /* techo de un piso ya cubierto arriba */ }
}

function buildStairs(d, h) {
  d.rooms.filter(r => r.type === "stair").forEach(r => {
    if (r.lvl >= d.pisos - 1) return;
    const n = 15, run0 = 0.35, runLen = r.d - 0.7, up = r.lvl % 2 === 0;
    for (let i = 0; i < n; i++) {
      const zz = up ? r.z + run0 + i * runLen / n : r.z + r.d - run0 - (i + 1) * runLen / n;
      box(r.w - 0.1, (i + 1) * h / n, runLen / n, MAT.slab, r.x + 0.05, r.lvl * h, zz, "losas");
    }
    stairs.push({x0: r.x, x1: r.x + r.w, z0: r.z + run0, z1: r.z + r.d - run0, lvl: r.lvl, up});
    box(0.04, 0.9, runLen, MAT.steel, r.x + 0.02, r.lvl * h + h / 2, r.z + run0, "muros");
  });
}

function buildFurniture(d, h) {
  d.rooms.forEach(r => {
    const y = r.lvl * h, cx = r.x + r.w / 2, cz = r.z + r.d / 2, L = "mob";
    if (r.type === "bed") {
      const big = r.area >= 11, bw = big ? 1.6 : 1.05, bl = 1.95;
      box(bw, 0.45, bl, MAT.wood, cx - bw / 2, y, r.z + r.d - bl - 0.15, L); box(bw - 0.06, 0.18, bl - 0.25, MAT.bedding, cx - bw / 2 + 0.03, y + 0.45, r.z + r.d - bl - 0.02, L);
      box(Math.min(1.6, r.w - 0.4), 2.2, 0.55, MAT.white, r.x + 0.2, y, r.z + 0.25, L);
    } else if (r.type === "living") {
      if (/Comedor|comedor/.test(r.name) && !/Sala/.test(r.name)) { box(1.6, 0.75, 0.9, MAT.wood, cx - 0.8, y, cz - 0.45, L); }
      else { box(Math.min(2.2, r.w - 1), 0.75, 0.85, MAT.fabric, cx - Math.min(2.2, r.w - 1) / 2, y, r.z + r.d - 1.2, L); box(1.2, 0.4, 0.6, MAT.wood, cx - 0.6, y, cz - 0.3, L); box(1.6, 0.9, 0.06, MAT.dark, cx - 0.8, y + 0.7, r.z + 0.25, L);
        if (/comedor/.test(r.name)) box(1.4, 0.75, 0.8, MAT.wood, r.x + 0.4, y, cz - 0.4, L); }
    } else if (r.type === "kitchen") {
      box(r.w - 0.3, 0.9, 0.6, MAT.white, r.x + 0.15, y, r.z + r.d - 0.75, L); box(0.6, 0.92, 0.6, MAT.steel, r.x + 0.3, y, r.z + r.d - 0.75, L);
      r.fx = {sink: [r.x + r.w - 0.8, y + 0.85, r.z + r.d - 0.45], stove: [r.x + 0.6, y + 0.9, r.z + r.d - 0.45]};
    } else if (r.type === "bath") {
      const wc = [r.x + 0.4, y, r.z + r.d - 0.45], lav = [r.x + r.w - 0.45, y, r.z + r.d - 0.4], sh = [r.x + r.w - 0.55, y, r.z + 0.6];
      box(0.4, 0.42, 0.6, MAT.white, wc[0] - 0.2, y, wc[2] - 0.3, L); box(0.42, 0.4, 0.18, MAT.white, wc[0] - 0.21, y + 0.42, wc[2] + 0.12, L);
      box(0.5, 0.82, 0.42, MAT.white, lav[0] - 0.25, y, lav[2] - 0.21, L);
      box(0.9, 0.06, 0.9, MAT.white, sh[0] - 0.45, y, sh[2] - 0.45, L); box(0.03, 2.0, 0.9, MAT.glass, sh[0] - 0.47, y, sh[2] - 0.45, L);
      r.fx = {wc, lav, sh};
    } else if (r.type === "laundry") {
      box(0.6, 0.85, 0.6, MAT.white, r.x + 0.2, y, r.z + r.d - 0.75, L); cyl(0.25, 0.8, MAT.white, r.x + r.w - 0.4, y + 1.2, r.z + r.d - 0.4, L);
      r.fx = {lav: [r.x + 0.5, y, r.z + r.d - 0.45], therma: [r.x + r.w - 0.4, y + 1.2, r.z + r.d - 0.4]};
    } else if (r.type === "terrace" && r.open) {
      box(1.2, 0.9, 0.6, MAT.dark, r.x + 0.3, y, r.z + r.d - 0.8, L); box(1.6, 0.75, 0.9, MAT.wood, cx - 0.8, y, cz - 0.45, L);
    } else if (r.type === "study") { box(1.2, 0.75, 0.6, MAT.wood, cx - 0.6, y, r.z + r.d - 0.7, L); }
  });
}

/* ---------------- instalaciones ---------------- */
function buildInstalls(d, h) {
  const {W, z0} = d, rooms = d.rooms.filter(r => r.type !== "stair"), closed = rooms.filter(r => !r.open);
  const st = d.rooms.find(r => r.type === "stair" && r.lvl === 0);
  const riserX = st ? st.x - 0.12 : W - 0.3, riserZ = st ? st.z + 0.2 : z0 + 0.4;
  // eléctrico: red pública -> medidor -> tablero general -> circuitos por piso
  box(0.4, 0.55, 0.18, MAT.meter, 0.6, 1.0, z0 - 0.3, "elec");
  run([[0.3, 7.6, -1.6], [0.8, 1.4, z0 - 0.25]], 0.012, MAT.dark, "elec", "Acometida eléctrica");
  const tg = [0.8, 1.5, z0 + 0.25];
  box(0.4, 0.55, 0.12, MAT.meter, 0.6, 1.2, z0 + 0.12, "elec");
  run([[0.8, 1.4, z0 - 0.2], [0.8, 1.4, z0 + 0.2]], 0.025, MAT.e3, "elec", "Acometida eléctrica");
  let pts = 0, outs = 0;
  for (let lvl = 0; lvl < d.pisos; lvl++) {
    const ceil = lvl * h + h - 0.22, src = lvl === 0 ? [tg[0], ceil, tg[2]] : [riserX, ceil, riserZ];
    if (lvl === 0) run([[tg[0], tg[1], tg[2]], [tg[0], ceil, tg[2]]], 0.02, MAT.e1, "elec", "Cable de alumbrado");
    else run([[riserX, (lvl - 1) * h + h - 0.22, riserZ], [riserX, ceil, riserZ]], 0.03, MAT.e3, "elec", "Montante eléctrico");
    if (lvl === 0 && d.pisos > 1) run([[tg[0], ceil, tg[2]], [tg[0], ceil, riserZ], [riserX, ceil, riserZ]], 0.03, MAT.e3, "elec", "Montante eléctrico");
    rooms.filter(r => r.lvl === lvl).forEach(r => {
      const cx = r.x + r.w / 2, cz = r.z + r.d / 2, cy = r.open ? lvl * h + 2.3 : ceil;
      const lp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), MAT.light); lp.position.set(cx, cy - 0.06, cz); add(lp, "elec"); pts++;
      run([src, [src[0], ceil, cz], [cx, ceil, cz], [cx, cy, cz]], 0.016, MAT.e1, "elec", "Cable de alumbrado");
      if (r.open) return;
      [[r.x + 0.08, cz], [cx, r.z + r.d - 0.08]].forEach(([ox, oz]) => {
        box(0.08, 0.12, 0.08, MAT.white, ox - 0.04, lvl * h + 0.3, oz - 0.04, "elec");
        run([[cx, ceil, cz], [ox, ceil, oz], [ox, lvl * h + 0.36, oz]], 0.014, MAT.e2, "elec", "Cable de tomacorrientes"); outs++;
      });
      if (r.fx && r.fx.stove) run([[cx, ceil, cz], [r.fx.stove[0], ceil, r.fx.stove[2]], [r.fx.stove[0], r.fx.stove[1] - 0.4, r.fx.stove[2]]], 0.02, MAT.e3, "elec", "Circuito de fuerza (cocina, therma)");
      if (r.fx && r.fx.therma) run([[cx, ceil, cz], [r.fx.therma[0], ceil, r.fx.therma[2]], [r.fx.therma[0], r.fx.therma[1] + 0.8, r.fx.therma[2]]], 0.02, MAT.e3, "elec", "Circuito de fuerza (cocina, therma)");
    });
  }
  // agua: red pública -> medidor -> tubería troncal bajo piso -> tanque elevado -> bajadas a cada aparato
  const wx = W - 0.35;
  box(0.35, 0.25, 0.35, MAT.meter, wx - 0.17, -0.05, -0.9, "agua");
  run([[wx, -0.35, -6], [wx, -0.35, -0.75]], 0.03, MAT.cold, "agua", "Agua fría");
  run([[wx, -0.35, -0.75], [wx, 0.04, z0 + 0.3]], 0.025, MAT.cold, "agua", "Agua fría");
  const wet = closed.filter(r => r.fx);
  const tank = d.tank || {x: W / 2, y: d.pisos * h, z: z0 + 4};
  const upX = tank.x + 0.4, upZ = tank.z;
  run([[wx, 0.04, z0 + 0.3], [wx, 0.04, upZ], [upX, 0.04, upZ], [upX, tank.y + 0.4, upZ], [tank.x + 0.3, tank.y + 0.4, tank.z]], 0.025, MAT.cold, "agua", "Agua fría");
  run([[tank.x - 0.3, tank.y + 0.1, tank.z], [tank.x - 0.45, tank.y + 0.1, tank.z], [tank.x - 0.45, 0.25, tank.z]], 0.025, MAT.cold, "agua", "Agua fría");
  const therma = (wet.find(r => r.fx.therma) || {}).fx;
  let fixtures = 0;
  wet.forEach(r => {
    const yb = r.lvl * h + 0.25, dn = [tank.x - 0.45, yb, tank.z];
    const targets = Object.entries(r.fx).filter(([k]) => k !== "stove" && k !== "therma");
    targets.forEach(([k, p]) => {
      run([dn, [dn[0], yb, p[2]], [p[0], yb, p[2]], [p[0], p[1] + (k === "sh" ? 2.0 : 0.6), p[2]]], 0.018, MAT.cold, "agua", "Agua fría"); fixtures++;
      if (therma && (k === "sh" || k === "lav" || k === "sink")) {
        const ht = therma.therma, yh = r.lvl * h + 0.4;
        run([[ht[0], ht[1], ht[2]], [ht[0], r.lvl === 0 ? yh : ht[1], ht[2]], ...(r.lvl ? [[ht[0], h * r.lvl + 0.4, ht[2]]] : []), [ht[0], yh, p[2]], [p[0] + 0.12, yh, p[2]], [p[0] + 0.12, p[1] + (k === "sh" ? 2.0 : 0.65), p[2]]], 0.016, MAT.hot, "caliente", "Agua caliente");
      }
    });
  });
  // desagüe: aparatos -> montantes -> colector bajo piso (pendiente 1%) -> caja de registro -> red pública o biodigestor
  const colX = W * 0.5, reg = [colX, -0.45, z0 - 0.6];
  box(0.6, 0.06, 0.6, MAT.slab, colX - 0.3, -0.02, z0 - 0.9, "desague");
  if (state.desague === "bio") { cyl(0.75, 1.6, M(0x2d6a3e), colX + 1.6, -1.65, z0 - 1.6, "desague", 20); run([reg, [colX + 1.6, -0.6, z0 - 1.6]], 0.05, MAT.sew, "desague", "Desagüe"); }
  else run([reg, [colX, -0.6, -1.0], [colX, -1.2, -6]], 0.05, MAT.sew, "desague", "Desagüe");
  const zMax = Math.max(...wet.map(r => r.z + r.d));
  run([[colX, -0.45 + (zMax - z0) * 0.01, zMax], reg], 0.05, MAT.sew, "desague", "Desagüe");
  wet.forEach(r => {
    const stackX = r.x + 0.15, stackZ = r.z + r.d - 0.15;
    Object.entries(r.fx).filter(([k]) => k !== "stove" && k !== "therma").forEach(([k, p]) => {
      const yb = r.lvl * h - 0.12;
      run([[p[0], r.lvl * h + 0.05, p[2]], [p[0], yb, p[2]], [stackX, yb, stackZ]], k === "wc" ? 0.05 : 0.03, MAT.sew, "desague", "Desagüe");
    });
    const yColl = -0.45 + (stackZ - z0) * 0.01;
    run([[stackX, r.lvl * h - 0.12, stackZ], [stackX, yColl, stackZ], [colX, yColl, stackZ]], 0.05, MAT.sew, "desague", "Desagüe");
    if (r.type === "bath") run([[stackX, r.lvl * h - 0.12, stackZ], [stackX, d.pisos * h + 0.6, stackZ]], 0.025, MAT.sew, "desague", "Ventilación");
  });
  if (d.pool) run([[d.pool.x, 0.05, d.pool.z], [d.pool.x - 0.4, -0.2, d.pool.z], [colX, -0.2, d.pool.z], [colX, -0.3, zMax]], 0.03, MAT.sew, "desague", "Desagüe");
  d.counts = {puntosLuz: pts, tomas: outs, aparatos: fixtures};
}

/* ---------------- capas y modos ---------------- */
function applyLayers() {
  const L = state.layers, xr = state.mode === "xray";
  const vis = {muros: L.muros, losas: L.losas, mob: L.mob, elec: L.elec, agua: L.agua, caliente: L.caliente, desague: L.desague, etiquetas: L.etiquetas && state.mode !== "ext", vecinos: L.vecinos, terreno: true};
  Object.entries(groups).forEach(([k, g]) => g.visible = vis[k] !== false);
  ["wall", "wallExt", "slab", "accent", "floorLiving", "floorWet", "floorBed", "floorTerr", "wood", "fabric", "bedding", "white", "steel", "dark"].forEach(k => {
    const m = MAT[k]; const t = xr ? (k.startsWith("floor") ? 0.35 : 0.13) : 1;
    m.transparent = xr || false; m.opacity = t; m.depthWrite = !xr; m.needsUpdate = true;
  });
  const f = state.mode === "plan" ? 2.3 : state.mode === "walk" ? 0.35 : 1.15;
  if (groups.etiquetas) groups.etiquetas.children.forEach(s => { s.material.depthTest = state.mode === "walk"; if (s.userData.base) s.scale.copy(s.userData.base).multiplyScalar(f); });
}
let walk = null;
function applyMode(rebuild) {
  const m = state.mode, d = design, h = state.norm.h;
  cutPlane.constant = m === "cut" || m === "plan" ? state.floor * h + state.cut : 1000;
  $("#cutRow").hidden = m !== "cut";
  $("#joy").hidden = m !== "walk"; $("#walkHelp").hidden = m !== "walk";
  controls.enabled = m !== "walk" && m !== "plan";
  if (m === "walk") {
    if (!walk || rebuild) walk = {x: 1.1, y: 0, z: d.z0 + 1.2, yaw: Math.PI, pitch: -0.05};
    walk.y = state.floor * h;
    if (state.floor > 0) { const st = stairs.find(s => s.lvl === state.floor - 1) || stairs[0]; if (st) { walk.x = (st.x0 + st.x1) / 2 - 1.2; walk.z = (st.z0 + st.z1) / 2; } }
  } else if (m === "plan") {
    const W = d.W, D = d.D, c = canvas.clientWidth / Math.max(1, canvas.clientHeight), span = Math.max(D / 2 + 2.5, (W / 2 + 2.5) / c);
    ortho.left = -span * c; ortho.right = span * c; ortho.top = span; ortho.bottom = -span; ortho.updateProjectionMatrix();
    ortho.position.set(W / 2, 60, D / 2); ortho.up.set(0, 0, 1); ortho.lookAt(W / 2, 0, D / 2);
  } else if (rebuild || m === "ext") {
    if (rebuild) { controls.target.set(d.W / 2, d.pisos * h * 0.4, d.z0 + d.fd * 0.55); cam.position.set(d.W / 2 + 7, 3.2 + d.pisos * 1.9, -9.5); }
  }
  applyLayers();
  $$("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
  $$("#floors button").forEach(b => b.classList.toggle("on", +b.dataset.f === state.floor));
}

/* recorrido en primera persona: arrastre para mirar, joystick o WASD para caminar, escaleras transitables */
const keys = {}; let joy = {x: 0, y: 0};
addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; }); addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
let drag = null;
canvas.addEventListener("pointerdown", e => { if (state.mode === "walk") { drag = {x: e.clientX, y: e.clientY}; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener("pointermove", e => { if (drag && walk) { walk.yaw -= (e.clientX - drag.x) * 0.005; walk.pitch = clamp(walk.pitch - (e.clientY - drag.y) * 0.004, -1.2, 1.2); drag = {x: e.clientX, y: e.clientY}; } });
canvas.addEventListener("pointerup", () => drag = null);
(function joystick() {
  const j = $("#joy"), k = $("#joyKnob"); let id = null, c = null;
  j.addEventListener("pointerdown", e => { id = e.pointerId; j.setPointerCapture(id); const r = j.getBoundingClientRect(); c = {x: r.left + r.width / 2, y: r.top + r.height / 2}; move(e); e.stopPropagation(); });
  const move = e => { if (id !== e.pointerId) return; let dx = e.clientX - c.x, dy = e.clientY - c.y; const l = Math.hypot(dx, dy), mx = 42; if (l > mx) dx *= mx / l, dy *= mx / l; k.style.transform = `translate(${dx}px,${dy}px)`; joy = {x: dx / mx, y: dy / mx}; };
  j.addEventListener("pointermove", move);
  const end = () => { id = null; joy = {x: 0, y: 0}; k.style.transform = ""; };
  j.addEventListener("pointerup", end); j.addEventListener("pointercancel", end);
})();
function blocked(x, z, feet) {
  const rad = 0.25;
  return walls.some(w => {
    if (feet + 0.3 > w.y1 || feet + 1.6 < w.y0) return false;
    if (w.o === "h") return x > w.a - rad && x < w.b + rad && Math.abs(z - w.c) < w.t / 2 + rad;
    return z > w.a - rad && z < w.b + rad && Math.abs(x - w.c) < w.t / 2 + rad;
  });
}
function floorAt(x, z, feet) {
  const h = state.norm.h; let best = null;
  stairs.forEach(s => {
    if (x < s.x0 || x > s.x1 || z < s.z0 - 0.3 || z > s.z1 + 0.3) return;
    const t = clamp((z - s.z0) / (s.z1 - s.z0), 0, 1), y = s.lvl * h + (s.up ? t : 1 - t) * h;
    if (Math.abs(y - feet) < 0.6 && (best === null || Math.abs(y - feet) < Math.abs(best - feet))) best = y;
  });
  if (best !== null) return best;
  const lv = clamp(Math.round(feet / h), 0, design.pisos - 1); return lv * h;
}
function stepWalk(dt) {
  const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y, s = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
  const sp = 1.6 * dt, dx = (-Math.sin(walk.yaw) * f + Math.cos(walk.yaw) * s) * sp, dz = (-Math.cos(walk.yaw) * f - Math.sin(walk.yaw) * s) * sp;
  if (!blocked(walk.x + dx, walk.z, walk.y)) walk.x += dx;
  if (!blocked(walk.x, walk.z + dz, walk.y)) walk.z += dz;
  walk.x = clamp(walk.x, 0.2, design.W - 0.2); walk.z = clamp(walk.z, -3, design.D - 0.2);
  walk.y = floorAt(walk.x, walk.z, walk.y);
  const lv = Math.round(walk.y / state.norm.h); if (lv !== state.floor && Math.abs(walk.y - lv * state.norm.h) < 0.05) { state.floor = lv; $$("#floors button").forEach(b => b.classList.toggle("on", +b.dataset.f === lv)); }
  cam.position.set(walk.x, walk.y + 1.6, walk.z);
  cam.rotation.set(0, 0, 0, "YXZ"); cam.rotation.order = "YXZ"; cam.rotation.y = walk.yaw; cam.rotation.x = walk.pitch;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  resize();
  if (state.mode === "walk" && walk) stepWalk(dt); else if (state.mode !== "plan") controls.update();
  renderer.clippingPlanes = [];
  renderer.render(scene, state.mode === "plan" ? ortho : cam);
  requestAnimationFrame(frame);
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (state.mode === "plan") applyMode(false);
  }
}

/* ---------------- análisis ---------------- */
function analysis() {
  const d = design, m = d.metrics, cost = m.techada * state.costM2, h = state.norm.h;
  const byFloor = Array.from({length: d.pisos}, (_, i) => d.rooms.filter(r => r.lvl === i && r.type !== "stair"));
  const met = Object.entries(metrado).filter(([k]) => !/Acometida/.test(k)).sort();
  const rec = recommendations(d);
  $("#analysis").innerHTML = `
  <div class="kpis">
    <div><b>${fmt(m.techada, 0)} m²</b><span>área techada</span></div>
    <div><b>${fmt(m.ocup, 0)}%</b><span>ocupación del lote</span></div>
    <div><b>${fmt(m.libreP, 0)}%</b><span>área libre</span></div>
    <div><b>${fmt(m.coef, 2)}</b><span>coeficiente de edificación</span></div>
    <div><b>${m.dorm}</b><span>dormitorios</span></div>
    <div><b>${m.banos}</b><span>baños</span></div>
  </div>
  <h4>Normativa (parámetros ingresados)</h4>
  <ul class="checks">${d.checks.map(c => `<li class="${c.ok ? "ok" : "no"}">${c.ok ? "✓" : "!"} ${c.t}</li>`).join("")}</ul>
  ${d.warnings.length ? `<div class="warn">${d.warnings.map(w => `<p>${w}</p>`).join("")}</div>` : ""}
  <h4>Ambientes</h4>
  ${byFloor.map((rs, i) => `<table class="rooms"><caption>Piso ${i + 1}${d.pisos > 1 && state.prog.estilo === "renta" ? ` · departamento ${String.fromCharCode(65 + i)}` : ""}</caption>${rs.map(r => `<tr><td>${r.name}</td><td>${fmt(r.w)} × ${fmt(r.d)}</td><td>${fmt(r.area)} m²</td></tr>`).join("")}</table>`).join("")}
  <h4>Instalaciones (metrado referencial)</h4>
  <table class="rooms">
    <tr><td>Puntos de luz</td><td></td><td>${d.counts.puntosLuz}</td></tr>
    <tr><td>Tomacorrientes</td><td></td><td>${d.counts.tomas}</td></tr>
    <tr><td>Salidas de agua a aparatos</td><td></td><td>${d.counts.aparatos}</td></tr>
    ${met.map(([k, v]) => `<tr><td>${k}</td><td></td><td>${fmt(v, 0)} m</td></tr>`).join("")}
  </table>
  <p class="small">Desagüe ${state.desague === "bio" ? "a biodigestor" : "a red pública"} · agua con tanque elevado sobre el baño · tablero general junto al ingreso.</p>
  <h4>Costo referencial de construcción</h4>
  <div class="cost"><label>Costo por m² (S/)<input id="costM2" type="number" inputmode="numeric" value="${state.costM2}" min="500" step="50"></label><b>${soles(cost)}</b></div>
  <p class="small">Solo casco y acabados según el costo por m² que ingreses; ajústalo con la cotización de un constructor. No incluye licencia, expediente técnico ni piscina.</p>
  <h4>Recomendaciones técnicas</h4>
  <ul class="recs">${rec.map(r => `<li>${r}</li>`).join("")}</ul>
  <h4>Compra segura: verificar antes de firmar</h4>
  <ul class="checks list">
    <li>Partida registral del lote independizado en SUNARP, sin cargas ni gravámenes.</li>
    <li>Certificado de Parámetros Urbanísticos de la municipalidad (retiros, altura y área libre reales).</li>
    <li>Factibilidad de agua, desagüe y electricidad para el lote.</li>
    <li>Plano perimétrico con medidas y linderos iguales a la partida.</li>
    <li>Estudio de mecánica de suelos antes de diseñar la cimentación.</li>
  </ul>`;
  const ci = $("#costM2"); ci.addEventListener("change", () => { state.costM2 = Math.max(100, +ci.value || 0); analysis(); });
}
function recommendations(d) {
  const r = [], W = d.W;
  r.push("Zona costera: concreto con recubrimiento adecuado al ambiente salino, acero protegido y carpintería de aluminio o PVC; prever mantenimiento de pintura exterior.");
  if (W <= 6.5) r.push("Frente angosto: priorice la ventilación cruzada y la luz natural desde el frente y el patio posterior; evite ambientes ciegos.");
  if (d.pisos >= 3) r.push("Tres pisos: la estructura de concreto armado debe diseñarla un ingeniero civil colegiado según la Norma E.030 (sismorresistente).");
  if (d.pool) r.push("Piscina: incluir cuarto de bomba y filtro, y verificar la distancia a los muros colindantes y al tanque.");
  if (state.desague === "bio") r.push("Biodigestor: ubicarlo en zona de fácil acceso para el mantenimiento y lejos de la toma de agua.");
  if (d.yardD < 3) r.push("Patio posterior pequeño: considere un tragaluz o pozo de luz para los ambientes del fondo.");
  r.push("Dejar la montante y el tablero con capacidad para una therma eléctrica, cocina de inducción y una futura ampliación.");
  return r;
}

/* ---------------- interfaz ---------------- */
function syncForm() {
  $("#proj").value = state.proj; $("#W").value = state.W; $("#D").value = state.D;
  Object.entries(state.norm).forEach(([k, v]) => { const e = $("#n_" + k); if (e) e.value = v; });
  const p = state.prog; $("#pisos").value = p.pisos; $("#dorm").value = p.dorm; $("#banos").value = p.banos; $("#estilo").value = p.estilo;
  ["piscina", "cochera", "terraza", "servicio"].forEach(k => $("#" + k).checked = p[k]);
  $("#desague").value = state.desague;
  $$("#opts button").forEach(b => b.classList.toggle("on", b.dataset.o === state.opt));
  $("#lotArea").textContent = `${fmt(state.W * state.D, 0)} m²`;
}
function readForm() {
  state.W = clamp(+$("#W").value || 8, 4, 40); state.D = clamp(+$("#D").value || 20, 8, 80);
  Object.keys(state.norm).forEach(k => { const e = $("#n_" + k); if (e) state.norm[k] = +e.value; });
  state.norm.maxP = clamp(Math.round(state.norm.maxP), 1, 4); state.norm.al = clamp(state.norm.al, 0, 80);
  const p = state.prog; p.pisos = clamp(+$("#pisos").value, 1, state.norm.maxP); p.dorm = clamp(+$("#dorm").value, 1, 8); p.banos = clamp(+$("#banos").value, 1, 6); p.estilo = $("#estilo").value;
  ["piscina", "cochera", "terraza", "servicio"].forEach(k => p[k] = $("#" + k).checked);
  state.desague = $("#desague").value;
}
function regen(keepView) {
  design = generate(); state.floor = Math.min(state.floor, design.pisos - 1);
  $("#floors").innerHTML = Array.from({length: design.pisos}, (_, i) => `<button data-f="${i}" class="${i === state.floor ? "on" : ""}">Piso ${i + 1}</button>`).join("");
  $("#optTitle").textContent = `${OPTS[state.opt]} · ${PROJ.find(p => p.id === state.proj).name}`;
  build(); if (keepView) applyMode(false); analysis(); syncForm();
}
$("#proj").innerHTML = PROJ.map(p => `<option value="${p.id}">${p.name}${p.km ? " · " + p.km : ""}</option>`).join("");
$("#proj").addEventListener("change", e => { const p = PROJ.find(x => x.id === e.target.value); state.proj = p.id; state.W = p.W; state.D = p.D; syncForm(); regen(); });
$("#form").addEventListener("change", e => { if (e.target.id === "proj") return; readForm(); regen(true); });
$("#opts").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.opt = b.dataset.o; regen(true); });
$("#modes").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.mode = b.dataset.m; applyMode(false); });
$("#floors").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.floor = +b.dataset.f; if (state.mode === "ext" || state.mode === "xray") state.mode = "cut"; applyMode(true); });
$("#cut").addEventListener("input", e => { state.cut = +e.target.value; applyMode(false); });
$("#layers").addEventListener("change", e => { state.layers[e.target.name] = e.target.checked; applyLayers(); });
$$(".tabs button").forEach(b => b.addEventListener("click", () => { document.body.dataset.tab = b.dataset.t; $$(".tabs button").forEach(x => x.classList.toggle("on", x === b)); setTimeout(resize, 50); }));

/* ---------------- IA: interpretación del pedido del cliente ---------------- */
const NUM = {un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6};
function localParse(t) {
  t = t.toLowerCase(); const out = {}, num = s => NUM[s] || +s;
  const g = re => { const m = t.match(re); return m ? num(m[1]) : null; };
  const dorm = g(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|cuartos?|habitaciones?|rec[aá]maras?)/); if (dorm) out.dormitorios = dorm;
  const ban = g(/(\d+|un|uno|dos|tres|cuatro|cinco)\s*baños?/); if (ban) out.banos = ban;
  const pis = g(/(\d+|un|uno|dos|tres|cuatro)\s*(?:pisos?|plantas?|niveles?)/); if (pis) out.pisos = pis;
  if (/piscina|pileta|alberca/.test(t)) out.piscina = !/sin piscina|no.{0,10}piscina/.test(t);
  if (/cochera|estacionamiento|garaje|carro|auto|camioneta/.test(t)) out.cochera = !/sin cochera/.test(t);
  if (/terraza|balc[oó]n|parrilla|bbq/.test(t)) out.terraza = true;
  if (/servicio|empleada|nana/.test(t)) out.cuarto_servicio = true;
  if (/alquil|rentar|renta|departamentos|inversi[oó]n para alquilar/.test(t)) out.estilo = "renta"; else if (/vivir|vivienda|permanente|todo el a[ñn]o/.test(t)) out.estilo = "vivienda"; else if (/playa|verano|vacaciones|fin de semana/.test(t)) out.estilo = "playa";
  if (/m[aá]ximo|aprovechar todo|lo m[aá]s grande|todo el terreno/.test(t)) out.opcion = "maxima"; else if (/econ[oó]mic|barat|peque[ñn]|sencill|b[aá]sic/.test(t)) out.opcion = "compacta";
  const fam = g(/familia de (\d+|dos|tres|cuatro|cinco|seis)/); if (fam && !out.dormitorios) out.dormitorios = clamp(Math.ceil(fam / 2) + (fam > 4 ? 1 : 0), 1, 6);
  return out;
}
const SCHEMA = {type: "object", additionalProperties: false,
  required: ["pisos", "dormitorios", "banos", "piscina", "cochera", "terraza", "cuarto_servicio", "estilo", "opcion", "explicacion", "recomendaciones"],
  properties: {pisos: {type: "integer"}, dormitorios: {type: "integer"}, banos: {type: "integer"}, piscina: {type: "boolean"}, cochera: {type: "boolean"}, terraza: {type: "boolean"},
    cuarto_servicio: {type: "boolean"}, estilo: {type: "string", enum: ["playa", "vivienda", "renta"]}, opcion: {type: "string", enum: ["compacta", "equilibrada", "maxima"]},
    explicacion: {type: "string"}, recomendaciones: {type: "array", items: {type: "string"}}}};
async function askClaude(text) {
  const key = (() => { try { return localStorage.getItem("viv_ak") || ""; } catch (e) { return ""; } })();
  if (!key) return null;
  const n = state.norm, proj = PROJ.find(p => p.id === state.proj);
  const body = {model: "claude-opus-5-5", max_tokens: 8000, fallbacks: "default",
    output_config: {effort: "low", format: {type: "json_schema", schema: SCHEMA}},
    system: "Eres el asistente de diseño de Vivaldi Inmobiliaria (lotes de playa en Asia y Cerro Azul, Perú). Traduces lo que un cliente le cuenta al asesor en parámetros para un simulador de construcción. Respeta los límites del lote y de la normativa indicada. Escribe explicacion (2 a 4 frases, en español, dirigidas al cliente, cálidas y concretas) y 2 a 4 recomendaciones técnicas breves. No inventes precios ni promesas de valorización.",
    messages: [{role: "user", content: `Lote: ${proj.name}, frente ${state.W} m, fondo ${state.D} m (${state.W * state.D} m²). Normativa ingresada: retiro frontal ${n.rf} m, área libre mínima ${n.al}%, máximo ${n.maxP} pisos.\nPedido del cliente: ${text}`}]};
  const r = await fetch("https://api.anthropic.com/v1/messages", {method: "POST",
    headers: {"content-type": "application/json", "x-api-key": key, "anthropic-version": "2026-10-21", "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true"},
    body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "Error " + r.status);
  if (j.stop_reason === "refusal") throw new Error("La IA no pudo procesar este pedido. Reformúlalo.");
  const tb = (j.content || []).find(b => b.type === "text");
  if (!tb) throw new Error("Respuesta vacía de la IA.");
  return JSON.parse(tb.text);
}
function applyParams(o) {
  const p = state.prog, n = state.norm;
  if (o.pisos) p.pisos = clamp(o.pisos, 1, n.maxP);
  if (o.dormitorios) p.dorm = clamp(o.dormitorios, 1, 8);
  if (o.banos) p.banos = clamp(o.banos, 1, 6);
  ["piscina", "cochera", "terraza"].forEach(k => { if (typeof o[k] === "boolean") p[k] = o[k]; });
  if (typeof o.cuarto_servicio === "boolean") p.servicio = o.cuarto_servicio;
  if (o.estilo) p.estilo = o.estilo;
  if (o.opcion) state.opt = o.opcion;
  if (p.pisos > 1 && p.banos < 2) p.banos = 2;
}
$("#aiGo").addEventListener("click", async () => {
  const t = $("#aiText").value.trim(), out = $("#aiOut"), btn = $("#aiGo");
  if (!t) { out.innerHTML = "<p>Escribe lo que el cliente quiere construir.</p>"; return; }
  btn.disabled = true; btn.textContent = "Diseñando…";
  let res = null, err = null;
  try { res = await askClaude(t); } catch (e) { err = e.message; }
  const local = localParse(t);
  applyParams(res || local); syncForm(); regen();
  out.innerHTML = res
    ? `<p class="tag">IA · Claude</p><p>${esc(res.explicacion)}</p>${res.recomendaciones && res.recomendaciones.length ? `<ul>${res.recomendaciones.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`
    : `<p class="tag">Interpretación automática</p><p>${summary(local)}</p>${err ? `<p class="small">No se pudo usar la IA en línea (${esc(err)}); se usó la interpretación automática.</p>` : `<p class="small">Para respuestas más completas, activa la IA en línea con una clave de API (⚙).</p>`}`;
  btn.disabled = false; btn.textContent = "Diseñar con IA";
  document.body.dataset.tab = "view"; $$(".tabs button").forEach(x => x.classList.toggle("on", x.dataset.t === "view"));
});
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
function summary(o) {
  const p = state.prog, parts = [`${p.pisos} piso${p.pisos > 1 ? "s" : ""}`, `${p.dorm} dormitorio${p.dorm > 1 ? "s" : ""}`, `${p.banos} baño${p.banos > 1 ? "s" : ""}`];
  if (p.piscina) parts.push("piscina"); if (p.cochera) parts.push("cochera"); if (p.terraza) parts.push("terraza"); if (p.servicio) parts.push("cuarto de servicio");
  return `Entendí: ${parts.join(", ")}, estilo ${({playa: "casa de playa", vivienda: "vivienda permanente", renta: "departamentos para alquilar"})[p.estilo]}. Opción: ${OPTS[state.opt]}. Revisa y ajusta en Configurar si hace falta.`;
}
$("#gear").addEventListener("click", () => { $("#keyDlg").showModal(); try { $("#akey").value = localStorage.getItem("viv_ak") || ""; } catch (e) {} });
$("#keySave").addEventListener("click", () => { try { const v = $("#akey").value.trim(); v ? localStorage.setItem("viv_ak", v) : localStorage.removeItem("viv_ak"); } catch (e) {} $("#keyDlg").close(); });

/* ---------------- ficha para el cliente ---------------- */
$("#ficha").addEventListener("click", async () => {
  const d = design, m = d.metrics, proj = PROJ.find(p => p.id === state.proj);
  renderer.render(scene, state.mode === "plan" ? ortho : cam);
  const shot = new Image(); shot.src = renderer.domElement.toDataURL("image/jpeg", 0.92); await shot.decode();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1500; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, 1080, 1500);
  g.fillStyle = "#0A3856"; g.fillRect(0, 0, 1080, 150);
  g.fillStyle = "#fff"; g.font = "800 46px Manrope, Arial"; g.fillText("VIVALDI", 50, 85); g.font = "600 24px Manrope, Arial"; g.fillStyle = "#BFE3FF"; g.fillText("Simulación de construcción en tu lote", 50, 122);
  g.textAlign = "right"; g.fillStyle = "#fff"; g.font = "700 26px Manrope, Arial"; g.fillText(proj.name, 1030, 85); g.font = "500 22px Manrope, Arial"; g.fillStyle = "#BFE3FF"; g.fillText(`Lote ${fmt(state.W)} × ${fmt(state.D)} m · ${fmt(m.lot, 0)} m²`, 1030, 122); g.textAlign = "left";
  const sw = 1080, sh = sw * shot.height / shot.width, cropH = Math.min(sh, 700);
  g.drawImage(shot, 0, (sh - cropH) / 2 * shot.height / sh, shot.width, cropH * shot.height / sh, 0, 150, sw, cropH);
  let y = 150 + cropH + 60;
  g.fillStyle = "#0A3856"; g.font = "800 40px Manrope, Arial"; g.fillText(`${OPTS[state.opt]} · ${d.pisos} piso${d.pisos > 1 ? "s" : ""}`, 50, y);
  y += 60; const k = [[`${fmt(m.techada, 0)} m²`, "área techada"], [`${m.dorm}`, "dormitorios"], [`${m.banos}`, "baños"], [`${fmt(m.libreP, 0)}%`, "área libre"]];
  k.forEach(([a, b], i) => { const x = 50 + i * 250; g.fillStyle = "#F3F6F8"; g.fillRect(x, y, 230, 120); g.fillStyle = "#0A3856"; g.font = "800 40px Manrope, Arial"; g.fillText(a, x + 20, y + 60); g.fillStyle = "#53686C"; g.font = "500 22px Manrope, Arial"; g.fillText(b, x + 20, y + 95); });
  y += 170; g.fillStyle = "#1F2A30"; g.font = "600 24px Manrope, Arial";
  const extras = [d.pool ? "piscina" : "", d.parking ? "cochera" : "", state.prog.terraza ? "terraza" : "", "instalaciones eléctricas y sanitarias trazadas"].filter(Boolean).join(" · ");
  g.fillText("Incluye: " + extras, 50, y); y += 50;
  g.fillStyle = "#6B7A86"; g.font = "500 20px Manrope, Arial";
  wrap(g, "Simulación referencial para orientar la compra. El diseño definitivo requiere proyecto de arquitectura e ingeniería firmado por profesionales colegiados, estudio de suelos y licencia municipal.", 50, y, 980, 30);
  g.fillStyle = "#0A3856"; g.fillRect(0, 1430, 1080, 70); g.fillStyle = "#fff"; g.font = "700 26px Manrope, Arial"; g.fillText("WhatsApp 922 549 723 · vivaldiinmobiliaria.com", 50, 1475);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const file = new File([blob], `simulacion-${state.proj}.png`, {type: "image/png"});
  if (navigator.canShare && navigator.canShare({files: [file]})) { try { await navigator.share({files: [file], title: "Simulación Vivaldi", text: `Simulación de construcción en ${proj.name}`}); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
function wrap(g, t, x, y, w, lh) { const ws = t.split(" "); let line = ""; ws.forEach(word => { const test = line ? line + " " + word : word; if (g.measureText(test).width > w) { g.fillText(line, x, y); y += lh; line = word; } else line = test; }); g.fillText(line, x, y); }

/* ---------------- inicio ---------------- */
syncForm(); regen();
requestAnimationFrame(frame);
window.__sim = {state, get design() { return design; }, regen, applyMode, cam, controls, renderer, generate, syncForm, scene, get walk() { return walk; }, get stairs() { return stairs; }, get walls() { return walls; }, blocked, floorAt, localParse};
})();
