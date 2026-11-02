/* ---------------- datos ---------------- */
// cada proyecto con su entorno: qué hay frente al lote, qué tiene el club y si se ve el mar
const PROJ = [
  {id: "planicie", name: "La Planicie de Asia", km: "Km 111.5", W: 8, D: 25, front: "parque", club: ["piscina", "juegos", "parrilla"], sea: 420, tone: 0x3FA2E0},
  {id: "terrazas", name: "Las Terrazas de Cerro Azul", km: "Km 117.5", W: 8, D: 25, front: "lotes", club: ["piscina", "club", "parrilla", "juegos"], sea: 150, tone: 0xF0772E},
  {id: "esmeralda", name: "La Esmeralda de Cerro Azul", km: "Cerro Azul", W: 10, D: 25, front: "lotes", club: ["piscina", "tenis", "bicicross", "gimnasio", "parrilla"], clubName: "Club House Resort Privado", ground: "verde", sea: 260, tone: 0x22A35F},
  {id: "portada", name: "La Portada del Sol", km: "Km 115.2", W: 6, D: 15, front: "lotes", club: ["piscina", "gimnasio", "losa", "futbol"], sea: 0, seaSide: "via", tone: 0xF2A93B},
  {id: "lirios", name: "Lirios del Mar de Asia", km: "Km 100", W: 6, D: 15, front: "lotes", club: ["piscina", "futbol", "voley", "parrilla", "juegos"], sea: 380, tone: 0x1C9A9F},
  {id: "bahia", name: "La Bahía de Paracas", km: "Paracas", W: 8, D: 20, front: "lotes", club: ["club", "piscina", "futbol", "juegos", "parrilla"], sea: 0, tone: 0x2A7FB8},
  {id: "otro", name: "Otro lote (medidas libres)", km: "", W: 8, D: 20, front: "lotes", club: [], sea: 0, tone: 0x2A85C5},
];
const OPTS = {compacta: "Compacta", equilibrada: "Equilibrada", maxima: "Máximo aprovechamiento"};
const USOS = {playa: "Casa de playa", vivienda: "Vivienda permanente", renta: "Departamentos para alquilar", bodega: "Bodega o minimarket + vivienda",
  restaurante: "Restaurante o cevichería", hospedaje: "Hospedaje (habitaciones con baño)", comercio: "Local comercial + departamentos"};
const BIZ = ["bodega", "restaurante", "hospedaje", "comercio"];
const BIZ_NAME = {bodega: "Minimarket", restaurante: "Cevichería", hospedaje: "Hospedaje", comercio: "Local comercial"};
const AMB = {ninos: "Niños", mascota: "Mascota", parrilla: "Parrilla", hamaca: "Hamaca y descanso", huerto: "Huerto y jardín", deportes: "Deportes", mayores: "Adultos mayores"};
const state = {
  proj: "planicie", W: 8, D: 25,
  norm: {rf: 3, rp: 0, al: 30, maxP: 3, h: 2.7},
  prog: {pisos: 2, dorm: 3, banos: 3, piscina: true, cochera: true, terraza: true, servicio: false, estilo: "playa", negocio: "", amb: {ninos: true, parrilla: true}},
  opt: "equilibrada", desague: "red", costM2: 1500, time: "dia",
  mark: {},
  mode: "ext", floor: 0, cut: 1.3,
  layers: {muros: true, losas: true, mob: true, elec: true, agua: true, caliente: true, desague: true, etiquetas: true, vecinos: true},
};
let design = null;

/* ---------------- programa arquitectónico ---------------- */
const R = (name, type, a, o = {}) => Object.assign({name, type, a}, o);
function homeFloors(p, from, pisos, dormsLeft, bathsLeft, opt) {   // pisos de vivienda sobre un negocio o local
  const out = [];
  for (let i = from; i < pisos; i++) {
    const fl = {front: [R(i === from ? "Sala-comedor" : "Sala de estar", "living", 15)], core: [], back: []};
    if (i === from) fl.back.push(R("Cocina", "kitchen", 7));
    const n = i === pisos - 1 ? dormsLeft : Math.min(dormsLeft, 2);
    for (let k = 0; k < n; k++) fl.back.push(R(k || i > from ? "Dormitorio" : "Dormitorio principal", "bed", k || i > from ? 9.5 : 12));
    dormsLeft -= n;
    fl.core.push(R("Baño", "bath", 4)); fl.core.push(R("Escalera", "stair", 0));
    if (!fl.back.length || (opt === "maxima" && i === pisos - 1)) fl.back.push(R("Terraza con parrilla", "terrace", 14, {open: true}));
    out.push(fl);
  }
  return out;
}
function business(p, pisos, opt) {
  const u = p.estilo, name = (p.negocio || "").trim() || BIZ_NAME[u], floors = [], st = pisos > 1 ? [R("Escalera", "stair", 0)] : [];
  if (u === "bodega") {
    floors.push({front: [R(name, "shop", 30, {biz: true})], core: [R("Baño", "bath", 3)].concat(st),
      back: [R("Depósito", "storage", 8)].concat(pisos === 1 ? [R("Cocina-comedor", "kitchen", 12), R("Dormitorio", "bed", 10)] : [R("Patio de servicio", "laundry", 5)])});
    floors.push(...homeFloors(p, 1, pisos, p.dorm, p.banos, opt));
  } else if (u === "restaurante") {
    floors.push({front: [R(name, "dining", 42, {biz: true})], core: [R("SS.HH. damas", "bath", 3), R("SS.HH. varones", "bath", 3)].concat(st),
      back: [R("Cocina del restaurante", "prokitchen", 16), R("Depósito", "storage", 6), R("Vestuario del personal", "storage", 4)]});
    if (pisos > 1) floors.push({front: [R("Salón 2", "dining", 30)], core: [R("Baño", "bath", 3)].concat(pisos > 2 ? st : [R("Escalera", "stair", 0)]), back: [R("Terraza comedor", "terrace", 24, {open: true, dining: true})]});
    if (pisos > 2) floors.push(...homeFloors(p, 2, pisos, p.dorm, p.banos, opt));
  } else if (u === "hospedaje") {
    let rooms = Math.max(2, p.dorm); const per = [];
    for (let i = 0; i < pisos; i++) { const n = i === pisos - 1 ? rooms : Math.min(rooms, i === 0 ? 2 : 3); per.push(n); rooms -= n; }
    let k = 1;
    per.forEach((n, i) => {
      const back = [];
      for (let j = 0; j < n; j++, k++) back.push(R(`Habitación ${k}`, "guest", 10.5), R(`Baño ${k}`, "bath", 3));
      if (i === pisos - 1 && pisos > 1) back.push(R("Terraza", "terrace", 12, {open: true}));
      floors.push({front: [i === 0 ? R(`${name} · recepción`, "reception", 16, {biz: true}) : R(`Habitación ${k++}`, "guest", 14)], core: [R(i ? "Depósito de ropa" : "Baño de recepción", i ? "storage" : "bath", 3)].concat(st), back});
    });
  } else {
    floors.push({front: [R(name, "shop", 34, {biz: true})], core: [R("Baño", "bath", 3)].concat(st), back: [R("Depósito", "storage", 8), R("Kitchenette", "kitchen", 5)]});
    for (let i = 1; i < pisos; i++) floors.push({front: [R(`Sala-comedor ${String.fromCharCode(64 + i)}`, "living", 16)], core: [R("Baño", "bath", 4), R("Escalera", "stair", 0)],
      back: [R("Cocina", "kitchen", 7), R("Dormitorio principal", "bed", 12), R("Dormitorio", "bed", 9)], unit: String.fromCharCode(64 + i)});
  }
  return {floors, pisos};
}
function program(p, opt, maxP) {
  const pisos = opt === "maxima" ? Math.max(p.pisos, maxP) : p.pisos;
  if (BIZ.includes(p.estilo)) return business(p, pisos, opt);
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
  if ((p.amb && p.amb.mayores) && dorms >= 2) { g.back.push(R("Dormitorio en 1er piso", "bed", 11)); g.core[0] = R("Baño accesible", "bath", 4.2); dorms--; }
  else if (dorms >= 4) { g.back.push(R("Dormitorio de visitas", "bed", 9)); dorms--; }
  floors.push(g);
  for (let i = 1; i < pisos; i++) {
    const fl = {front: [], core: [], back: []};
    if (i === 1) {
      fl.front.push(R("Dormitorio principal", "bed", 13), R("Baño principal", "bath", 4.5)); dorms--; baths -= 2;
      const n = Math.min(dorms, pisos === 2 ? dorms : 2);
      for (let k = 0; k < n; k++) fl.back.push(R(p.amb && p.amb.ninos && k < 2 ? "Dormitorio de niños" : "Dormitorio", "bed", 10));
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

