let walls = [], stairs = [];
const ENV = {};   // materiales del entorno: no se vuelven transparentes en Rayos X ni se cortan en Corte
["wood","dark","steel","white","slab","stone","wallExt","frame"].forEach(k => { ENV[k] = MAT[k].clone(); ENV[k].clippingPlanes = []; });
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const PAL = [0xebe1d2, 0xe6d6bf, 0xdfc8ab, 0xefe9df, 0xdde4e1, 0xe2c3a6, 0xe9dcc8];
const ACC = [0xc2694a, 0xd6a35b, 0x4f8db3, 0x8ea887, 0x6b5b4e, 0xe0c9a6, 0x2f5f7c];   // terracota, ocre, azul mar, salvia, café, arena, azul profundo
function tree(x, z, s, layer = "entorno", rr = Math.random) {   // huarango: árbol del desierto costero
  const g = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.8 * s, 6), MAT.trunk); tr.position.y = 0.9 * s; tr.rotation.z = (rr() - 0.5) * 0.3; g.add(tr);
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(1.1 * s * (0.6 + rr() * 0.4), 12, 8), i % 2 ? MAT.leaf : MAT.leaf2); c.scale.y = 0.45; c.position.set((rr() - 0.5) * 1.6 * s, 1.9 * s + rr() * 0.4 * s, (rr() - 0.5) * 1.6 * s); g.add(c); }
  g.traverse(o => o.castShadow = true); g.position.set(x, 0, z); add(g, layer); aoBlob(x, z, 3.4 * s, 3.4 * s, layer, 0.3); return g;
}
function build(keep) {
  scene.remove(root); const shared = new Set([...Object.values(TEX), FROND, TRUNK_TEX, RIPPLE, RIPPLE2, AO_TEX]), sharedGeo = SHARED_GEO; root.traverse(o => { if (o.geometry && !sharedGeo.has(o.geometry)) o.geometry.dispose(); [].concat(o.material || []).forEach(m => { if (m.map && !shared.has(m.map)) m.map.dispose(); }); });
  root = new THREE.Group(); scene.add(root); Object.keys(groups).forEach(k => delete groups[k]); Object.keys(metrado).forEach(k => delete metrado[k]);
  walls = []; stairs = []; anim.palms.length = 0; anim.cars.length = 0; anim.waves.length = 0; SIGNS.length = 0;
  const d = design, h = state.norm.h;
  buildSite(d);
  buildLot(d);
  { const fp = d.rooms.filter(r => r.lvl === 0); if (fp.length) { const x0 = Math.min(...fp.map(r => r.x)), x1 = Math.max(...fp.map(r => r.x + r.w)), z0 = Math.min(...fp.map(r => r.z)), z1 = Math.max(...fp.map(r => r.z + r.d)); aoBlob((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 1.8, z1 - z0 + 1.8, "terreno", 0.35, 0.05); } }
  d.rooms.forEach(r => {
    const y = r.lvl * h, wet = ["bath", "kitchen", "laundry", "prokitchen"].includes(r.type);
    const mat = wet ? MAT.floorWet : ["bed", "guest", "study"].includes(r.type) ? MAT.floorBed : r.type === "terrace" ? MAT.floorTerr : MAT.floorLiving;
    if (r.type !== "stair") plane(r.x + 0.01, r.z + 0.01, r.w - 0.02, r.d - 0.02, y + 0.025, mat, "losas", wet ? 1.2 : 1.6);
    if (!r.open && r.type !== "stair") { const t = 0.1, k = 0.015, zb = MAT.baseboard;   // contrazócalo: remata el encuentro del piso con el muro
      box(r.w - 0.2, t, k, zb, r.x + 0.1, y + 0.03, r.z + 0.07, "muros", {cast: false}); box(r.w - 0.2, t, k, zb, r.x + 0.1, y + 0.03, r.z + r.d - 0.085, "muros", {cast: false});
      box(k, t, r.d - 0.2, zb, r.x + 0.07, y + 0.03, r.z + 0.1, "muros", {cast: false}); box(k, t, r.d - 0.2, zb, r.x + r.w - 0.085, y + 0.03, r.z + 0.1, "muros", {cast: false}); }
  });
  for (let lvl = 0; lvl < d.pisos; lvl++) buildWalls(d.rooms.filter(r => r.lvl === lvl), lvl, h);
  buildSlabs(d, h);
  buildStairs(d, h);
  buildFurniture(d, h);
  buildInstalls(d, h);
  d.rooms.forEach(r => label(r.name, r.x + r.w / 2, r.lvl * h + 0.9, r.z + r.d / 2, 0.42, r.type === "stair" ? "" : `${fmt(r.w)} × ${fmt(r.d)} m · ${fmt(r.area)} m²`));
  label(`Frente ${fmt(d.W)} m`, d.W / 2, 0.3, -0.6, 0.5); label(`Fondo ${fmt(d.D)} m`, d.W + 1.8, 0.3, d.D / 2, 0.5);
  if (d.pool) label("Piscina", d.pool.x + d.pool.w / 2, 0.6, d.pool.z + d.pool.d / 2, 0.45, `${fmt(d.pool.w)} × ${fmt(d.pool.d)} m`);
  Object.values(groups).forEach(g => { if (g.name !== "etiquetas" && g.name !== "lugares") mergeMeshes(g); });
  setTime(); applyLayers(); applyMode(!keep);
}
function mergeMeshes(container) {   // une las piezas que comparten material: miles de objetos pasan a decenas y el celular va fluido
  container.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(container.matrixWorld).invert(), buckets = new Map();
  container.traverse(o => {
    if (o === container || !o.isMesh || Array.isArray(o.material) || o.userData.keep || o.userData.anim) return;
    for (let q = o.parent; q && q !== container; q = q.parent) if (q.userData.anim) return;
    const k = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}|${o.customDepthMaterial ? o.customDepthMaterial.uuid : ""}`;
    if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(o);
  });
  buckets.forEach(list => {
    if (list.length < 2) return;
    const parts = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
    if (!parts.every(g => g.attributes.position && g.attributes.normal && g.attributes.uv)) { parts.forEach(g => g.dispose()); return; }
    const merged = new THREE.BufferGeometry();
    [["position", 3], ["normal", 3], ["uv", 2]].forEach(([a, n]) => { const arr = new Float32Array(parts.reduce((t, g) => t + g.attributes[a].count * n, 0)); let off = 0; parts.forEach(g => { arr.set(g.attributes[a].array, off); off += g.attributes[a].count * n; }); merged.setAttribute(a, new THREE.BufferAttribute(arr, n)); });
    merged.computeBoundingSphere(); parts.forEach(g => g.dispose());
    const f = list[0], m = new THREE.Mesh(merged, f.material); m.castShadow = f.castShadow; m.receiveShadow = f.receiveShadow; m.renderOrder = f.renderOrder; if (f.customDepthMaterial) m.customDepthMaterial = f.customDepthMaterial;
    list.forEach(o => { o.parent.remove(o); if (!SHARED_GEO.has(o.geometry)) o.geometry.dispose(); });
    container.add(m);
  });
}

/* ---------------- entorno del proyecto ---------------- */
function buildSite(d) {
  const P = PROJ.find(p => p.id === state.proj), {W, D} = d, n = state.norm, rr = rnd(hash(P.id)), S = 8, NL = 5;
  const x0 = -NL * W - 10, cx0 = (NL + 1) * W + 4, x1 = cx0 + 42;
  const opp = P.front === "parque" ? 18 : D, zF = -S - opp - 1.5, zB = D + 1.5;
  const verde = P.ground === "verde";   // La Esmeralda: valle agrícola y arboledas; el resto, desierto costero
  plane(-900, -900, 1800, 1800, -0.12, verde ? MC(0xb9c79a, {map: makeTex("grass")}) : MAT.sand, "entorno", verde ? 4 : 5);
  plane(x0 - 40, -S, x1 - x0 + 40, S, -0.03, MAT.street, "entorno", 5);
  box(x1 - x0, 0.14, 1.4, MAT.walk, x0, -0.07, -1.4, "entorno", {cast: false}); box(x1 - x0, 0.14, 1.4, MAT.walk, x0, -0.07, -S, "entorno", {cast: false});
  for (let x = x0 + 4; x < x1 - 4; x += 6) box(1.6, 0.012, 0.14, ENV.white, x, -0.02, -S / 2 - 0.07, "entorno", {cast: false});
  // fila del lote y fila del frente
  for (let k = -NL; k <= NL; k++) if (k) neighborLot(k * W, 0, W, D, 1, rr, P, Math.abs(k) === 1);   // los vecinos de al lado, con casa
  if (P.front === "parque") park(x0 + 2, -S - opp - 1.4, x1 - x0 - 46, opp, rr);
  else for (let k = -NL; k <= NL; k++) neighborLot(k * W, -S, W, D, -1, rr, P);
  // postes de luz y palmeras en la vereda
  for (let x = x0 + 6, i = 0; x < cx0 - 2; x += W * 1.5, i++) { const px = x + W * 0.75; if (x < -1.5 || x > W + 1.5) streetLamp(x, -0.6); if (i % 2 && (px < -2.5 || px > W + 2.5)) palm(px, -0.7, 5 + rr() * 2, "entorno", rr); }
  [[x0 + 14, -S + 0.7, 1.57, 0x2a85c5], [x0 + 15, -S + 0.6, 1.57, 0xe8553d], [cx0 - 12, -0.7, -1.57, 0xffffff], [cx0 - 30, -S + 0.7, 1.57, 0x6b5b4e]].forEach(([a, b, r, c]) => person(a, b, r, c));
  // cerco perimétrico
  [[x0, zF, x1 - x0, 0.25], [x0, zB, x1 - x0, 0.25]].forEach(([x, z, w, t]) => box(w, 2.4, t, ENV.wallExt, x, 0, z, "entorno"));
  box(0.25, 2.4, zB - zF, ENV.wallExt, x1, 0, zF, "entorno");
  box(0.25, 2.4, -S - 1.2 - zF, ENV.wallExt, x0, 0, zF, "entorno"); box(0.25, 2.4, zB - 1.2, ENV.wallExt, x0, 0, 1.2, "entorno");
  portico(x0, S, P);
  club(cx0, -S - 26, P, rr);
  // Panamericana Sur y vía de acceso
  const px = x0 - 46;
  plane(px - 8, -900, 16, 1800, -0.02, MAT.street, "entorno", 6);
  for (let z = -880; z < 880; z += 9) box(0.15, 0.012, 3, MC(0xf2c14e), px - 0.07, 0, z, "entorno", {cast: false});
  for (let i = 0; i < 10; i++) { const c = car(px + (i % 2 ? 3.5 : -3.5), -500 + i * 100 + rr() * 40, i % 2 ? 0 : Math.PI, [0xe8e8e8, 0x2a6fa8, 0xb03a2e, 0x3d4247, 0xd9d4c7][i % 5], "entorno", true); c.userData.v = (i % 2 ? 1 : -1) * (16 + rr() * 8); c.userData.anim = true; mergeMeshes(c); anim.cars.push(c); }
  const sign = textCanvas([["PANAMERICANA SUR", 54, "#fff", 70], [P.km || "Lima Sur", 96, "#fff", 170]], 640, 240, "#1F7A3D");
  const sb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 5.8), [MC(0x1F7A3D), MC(0x1F7A3D, {map: sign}), MC(0x1F7A3D), MC(0x1F7A3D), MC(0x1F7A3D), MC(0x1F7A3D)]);
  sb.position.set(px + 10, 4.2, -S - 8); add(sb, "entorno"); box(0.2, 3.2, 0.2, ENV.steel, px + 10, 0, -S - 10, "entorno"); box(0.2, 3.2, 0.2, ENV.steel, px + 10, 0, -S - 6, "entorno");
  // mar y playa (los proyectos miran al oeste: atardecer sobre el mar)
  if (P.seaSide === "via") {   // La Portada del Sol: la playa está cruzando la Panamericana
    const bx = px - 8 - 55;
    plane(bx, -900, 55, 1800, -0.05, MC(0xe9dcbc, {map: makeTex("sand")}), "entorno", 3);
    const sea = plane(-2400, -900, bx + 2400, 1800, -0.03, MAT.sea, "entorno", 30); sea.receiveShadow = false;
    for (let i = 0; i < 26; i++) { const f = box(0.5, 0.02, 20 + rr() * 30, MC(0xffffff, {transparent: true, opacity: 0.7}), bx - 4 - rr() * 14, -0.02, -300 + rr() * 600, "entorno", {cast: false}); f.userData.anim = true; f.userData.wave = {z: f.position.x, ph: rr() * 6, ax: "x"}; anim.waves.push(f); }
    for (let i = 0; i < 5; i++) { umbrella(bx + 25 + rr() * 20, -80 + i * 35 + rr() * 10); lounger(bx + 22 + rr() * 20, -76 + i * 35); }
    for (let i = 0; i < 14; i++) person(bx + 5 + rr() * 40, -100 + rr() * 200, rr() * 6, [0xe8553d, 0xf2c14e, 0x2a85c5, 0xffffff, 0x4caf7a][i % 5]);
  }
  if (P.sea) {
    const zs = D + P.sea;
    plane(-900, zs - 40, 1800, 40, -0.05, MC(0xe9dcbc, {map: makeTex("sand")}), "entorno", 3);
    const sea = plane(-1500, zs, 3000, 1600, -0.03, MAT.sea, "entorno", 30); sea.receiveShadow = false;
    for (let i = 0; i < 26; i++) { const f = box(20 + rr() * 30, 0.02, 0.5, MC(0xffffff, {transparent: true, opacity: 0.7}), -400 + rr() * 800, -0.02, zs + 4 + rr() * 14, "entorno", {cast: false}); f.userData.anim = true; f.userData.wave = {z: f.position.z, ph: rr() * 6, ax: "z"}; anim.waves.push(f); }
    for (let i = 0; i < 6; i++) { umbrella(-60 + i * 25 + rr() * 8, zs - 22 + rr() * 8); person(-58 + i * 25 + rr() * 6, zs - 15 + rr() * 6, rr() * 6, [0xe8553d, 0xf2c14e, 0x2a85c5, 0xffffff][i % 4]); }
  }
  // lomas del desierto costero hacia el este
  const hill = MC(verde ? 0x9a9468 : 0xc8a77a, {flatShading: true, roughness: 1}), hill2 = MC(verde ? 0x8a845c : 0xb8956a, {flatShading: true, roughness: 1});
  for (let i = 0; i < 14; i++) { const r = 60 + rr() * 90, m = new THREE.Mesh(new THREE.ConeGeometry(r, 30 + rr() * 55, 7, 1), i % 2 ? hill : hill2); m.position.set(-700 + i * 105 + rr() * 40, 10, -330 - rr() * 260); m.rotation.y = rr() * 3; add(m, "entorno"); }
  // dunas suaves, manchas de arena, huarangos y arbustos en los alrededores
  for (let i = 0; i < 40; i++) bush(-260 + rr() * 520, -60 - rr() * 220, 0.4 + rr() * 0.6, "entorno");
  for (let i = 0; i < 70; i++) { const a = 30 + rr() * 110, m = new THREE.Mesh(new THREE.PlaneGeometry(a, a * (0.4 + rr() * 0.5)), verde ? PATCH_GREEN : PATCH_MAT); m.rotation.set(-Math.PI / 2, 0, rr() * 3); m.position.set(-450 + rr() * 900, -0.1, -420 + rr() * 820); add(m, "entorno"); }
  for (let i = 0; i < 26; i++) { const tx = x0 - 30 + rr() * (x1 - x0 + 60), tz = rr() < 0.5 ? zF - 6 - rr() * 40 : zB + 6 + rr() * Math.max(10, (P.sea || 60) - 50); tree(tx, tz, 1 + rr() * 0.8, "entorno", rr); }
  for (let x = x0 + 5; x < x1 - 3; x += 9 + rr() * 5) tree(x, zB + 2.2, 0.8 + rr() * 0.4, "entorno", rr);
  if (verde) {   // arboledas y chacras alrededor del condominio
    for (let i = 0; i < 140; i++) { const a = rr() * Math.PI * 2, r = 70 + rr() * 220, tx = W / 2 + Math.cos(a) * r * 1.4, tz = D / 2 + Math.sin(a) * r; if (Math.abs(tx - px) > 12) tree(tx, tz, 1.2 + rr() * 1.1, "entorno", rr); }
    const rows = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#8a7350"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#5f8a3a"; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 5); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t; })();
    const crop = MC(0xffffff, {map: rows});
    for (let i = 0; i < 10; i++) { const w = 40 + rr() * 50, dd = 30 + rr() * 40; plane(x0 - 60 + (i % 5) * 95 + rr() * 10, zB + 25 + Math.floor(i / 5) * 55 + rr() * 10, w, dd, -0.06, crop, "entorno", 4); }
  }
  for (let i = 0; i < (verde ? 0 : 6); i++) { const r = 4 + rr() * 6, m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), MC(0xd2b98d, {map: makeTex("sand")})); m.scale.y = 0.18; m.position.set(-300 + rr() * 600, -0.1, zB + 20 + rr() * Math.max(20, (P.sea || 80) - 60)); m.receiveShadow = true; add(m, "entorno"); }
  // nombres de los lugares (vista Entorno)
  place("Tu lote", `${fmt(W)} × ${fmt(D)} m · ${fmt(W * D, 0)} m²`, W / 2, 14 + d.pisos * 3, D / 2, true);
  place("Ingreso al condominio", P.name, x0 - 1, 9, -S / 2);
  if (P.club.length) place(P.clubName || "Club y áreas comunes", P.club.map(k => ({piscina: "piscina", club: "casa club", parrilla: "parrillas", juegos: "juegos", tenis: "tenis", bicicross: "bicicross", gimnasio: "gimnasio", losa: "losa", futbol: "fútbol", voley: "vóley"})[k]).join(" · "), cx0 + 20, 9, -S - 10);
  if (P.front === "parque") place("Parque", "frente a tu lote", W / 2, 8, -S - opp / 2);
  place("Panamericana Sur", P.km || "acceso principal", px, 10, -S - 30);
  if (P.sea) place("Playa", `a ${P.sea} m de tu lote`, W / 2, 10, D + P.sea - 10);
  if (P.seaSide === "via") place("Playa", "cruzando la Panamericana", px - 40, 10, -S - 10);
}
function place(t, sub, x, y, z, main) {   // etiqueta de lugar: tamaño fijo en pantalla
  const s = label(t, x, y, z, 1, sub); s.parent.remove(s); s.material.sizeAttenuation = false; s.material.depthTest = false; s.material.clippingPlanes = [];
  const k = (main ? 0.075 : 0.055) / s.scale.y; s.scale.multiplyScalar(k); s.userData.base = null; s.userData.pbase = s.scale.clone(); add(s, "lugares");
  if (main) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, y - 0.5, 6), new THREE.MeshBasicMaterial({color: 0x0A3856})); pin.position.set(x, (y - 0.5) / 2, z); add(pin, "lugares"); }
  return s;
}
function stringLights(x0, z0, x1, z1, y, sag, layer) {   // guirnalda de focos colgando en curva
  const n = Math.max(6, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55)), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), z0 + (z1 - z0) * t]); }
  run(pts, 0.008, ENV.dark, layer, "_guirnalda"); delete metrado._guirnalda;
  pts.forEach((p, i) => { if (i % 1 === 0 && i && i < n) ball(0.045, MAT.bulb, p[0], p[1] - 0.07, p[2], layer, 1); });
}
function streetLamp(x, z) { cyl(0.06, 4.2, ENV.dark, x, 0, z, "entorno", 8); box(0.9, 0.08, 0.12, ENV.dark, x - 0.45, 4.1, z - 0.06, "entorno"); ball(0.13, MAT.bulb, x - 0.4, 4.0, z, "entorno", 1); glow(x - 0.4, z - 1.2, 3.2); }
const CAR_GEO = (() => {   // perfil lateral de una camioneta tipo SUV, extruido a lo ancho
  const sh = (pts) => { const p = new THREE.Shape(); pts.forEach(([a, b], k) => k ? p.lineTo(a, b) : p.moveTo(a, b)); return p; };
  const ext = (shape, w) => { const g = new THREE.ExtrudeGeometry(shape, {depth: w, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, steps: 1}); g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2); return g; };
  return {
    body: ext(sh([[-2.2, 0.32], [2.2, 0.32], [2.26, 0.62], [2.18, 0.86], [1.25, 0.95], [-2.08, 1.0], [-2.22, 0.78]]), 1.7),
    cabin: ext(sh([[1.2, 0.94], [0.52, 1.5], [-1.48, 1.54], [-2.02, 1.0]]), 1.6),
    roof: ext(sh([[0.48, 1.5], [0.42, 1.58], [-1.45, 1.6], [-1.5, 1.52]]), 1.56),
    tire: new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18).rotateZ(Math.PI / 2), rim: new THREE.CylinderGeometry(0.22, 0.22, 0.28, 12).rotateZ(Math.PI / 2),
  };
})();
const SHARED_GEO = new Set([PALM_LEAF, ...Object.values(CAR_GEO)]);
const CAR_GLASS = MC(0x1b2630, {roughness: 0.05, metalness: 0.8, envMapIntensity: 1.4}), CAR_RIM = MC(0xc9ced3, {metalness: 0.9, roughness: 0.25}), CAR_TIRE = MC(0x1c1d1f, {roughness: 0.9});
function car(x, z, rot, color, layer, moving) {
  const g = new THREE.Group(), paint = MC(color, {roughness: 0.28, metalness: 0.35, envMapIntensity: 0.7});
  [[CAR_GEO.body, paint], [CAR_GEO.cabin, CAR_GLASS], [CAR_GEO.roof, paint]].forEach(([geo, m]) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; g.add(o); });
  [[-0.86, -1.38], [0.86, -1.38], [-0.86, 1.42], [0.86, 1.42]].forEach(([a, b]) => { const t = new THREE.Mesh(CAR_GEO.tire, CAR_TIRE); t.position.set(a, 0.36, b); t.castShadow = true; const r = new THREE.Mesh(CAR_GEO.rim, CAR_RIM); r.position.set(a, 0.36, b); g.add(t, r); });
  [-0.6, 0.6].forEach(a => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.06), MAT.light); h.position.set(a, 0.74, 2.27); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), MC(0xb3201c, {emissive: 0x400000})); tl.position.set(a, 0.8, -2.25); g.add(h, tl); });
  g.position.set(x, 0, z); g.rotation.y = rot;
  const sw = Math.abs(Math.sin(rot)) > 0.5; if (!moving) aoBlob(x, z, sw ? 5 : 2.6, sw ? 2.6 : 5, layer, 0.5);   // los autos en movimiento no dejan sombra fija en la pista
  return add(g, layer);
}
function neighborLot(lx, fz, W, D, dir, rr, P, built) {
  const t = built ? rr() * 0.49 : rr(), L = "vecinos", zAt = (a, b) => dir > 0 ? fz + a : fz - b;   // a..b medido desde el frente
  if (t < 0.5) {   // casa construida
    const floors = rr() < 0.2 ? 1 : rr() < 0.85 ? 2 : 3, dep = 9 + rr() * 4, setb = 3, H = 2.8, style = (rr() * 3) | 0;
    const base = MC(PAL[(rr() * PAL.length) | 0], {map: makeTex("plaster")}), acc = MC(ACC[(rr() * ACC.length) | 0], {map: makeTex("plaster")});
    const fzWall = dir > 0 ? fz + setb : fz - setb, out = dir > 0 ? -1 : 1, wz = fzWall + out * 0.03;   // fachada y plano de ventanas
    box(W - 0.3, H, dep, base, lx + 0.15, 0, zAt(setb, setb + dep), L);
    for (let f = 1; f < floors; f++) {   // pisos altos: volado de 0.8 m y, a veces, color de acento
      const m = style === 1 || (style === 2 && f === floors - 1) ? acc : base, cant = style === 0 ? 0.8 : 0.4;
      box(W - 0.3, H, dep - 1, m, lx + 0.15, f * H, zAt(setb - cant, setb - cant + dep - 1), L);
      box(W - 0.3, 0.18, cant + 0.05, ENV.slab, lx + 0.15, f * H - 0.18, zAt(setb - cant, setb + 0.05), L, {cast: false});
    }
    const top = floors * H; box(W - 0.3, 0.5, dep - 1, base, lx + 0.15, top, zAt(setb + 3, setb + dep - 1), L);   // azotea con parapeto
    [0.15, W - 0.25].forEach(px => box(0.1, 1.0, 3, base, lx + px, top, zAt(setb, setb + 3), L));
    box(W - 0.5, 0.9, 0.04, MAT.glass, lx + 0.25, top + 0.05, zAt(setb + 0.05, setb + 0.09), L, {cast: false});
    if (rr() < 0.6) pergola(lx + 0.4, Math.min(zAt(setb + 0.2, setb + 0.2), zAt(setb + 2.8, setb + 2.8)) , W - 0.8, 2.6, L, top);
    for (let f = 0; f < floors; f++) {   // ventanal con marco, celosía de madera y baranda en pisos altos
      const fzF = f ? wz + (style === 0 ? 0.8 : 0.4) * out : wz, ww = Math.min(W - 2.4, 3.6);
      box(ww, 1.6, 0.05, MAT.neighWin, lx + 0.7, f * H + 0.7, fzF - 0.025, L, {cast: false});
      box(ww + 0.16, 0.08, 0.12, ENV.frame, lx + 0.62, f * H + 0.66, fzF - 0.06, L, {cast: false}); box(ww + 0.16, 0.08, 0.12, ENV.frame, lx + 0.62, f * H + 2.3, fzF - 0.06, L, {cast: false});
      box(0.06, 1.6, 0.08, ENV.frame, lx + 0.7 + ww / 2, f * H + 0.7, fzF - 0.04, L, {cast: false});
      if (f && rr() < 0.7) box(ww + 0.4, 1.0, 0.04, MAT.glass, lx + 0.5, f * H, fzF + out * 0.15, L, {cast: false});
      if (style === 2 || (f === 0 && rr() < 0.5)) for (let k = 0; k < 7; k++) box(0.07, H - 0.3, 0.07, ENV.wood, lx + W - 1.9 + k * 0.22, f * H + 0.15, fzF + out * 0.04, L, {cast: false});
    }
    box(1.0, 2.2, 0.06, ENV.wood, lx + W - 1.7, 0, wz - 0.03, L, {cast: false});
    ball(0.08, MAT.bulb, lx + W - 1.95, 2.3, wz + out * 0.08, L); glow(lx + W - 1.2, wz + out * 1.2, 1.6);
    const bz = dir > 0 ? fz + setb + dep + 0.01 : fz - setb - dep - 0.06;   // fachada posterior y techo con tanque y terma solar
    for (let f = 0; f < floors; f++) box(Math.min(W - 2, 2.4), 1.2, 0.05, MAT.neighWin, lx + 1, f * H + 0.9, f ? bz - out * 1 : bz, L, {cast: false});
    plane(lx + 0.15, Math.min(zAt(setb - (floors > 1 ? (style === 0 ? 0.8 : 0.4) : 0), 0), zAt(setb + dep - (floors > 1 ? 1 : 0), setb + dep - (floors > 1 ? 1 : 0))), W - 0.3, dep - (floors > 1 ? 1 : 0) + (floors > 1 ? (style === 0 ? 0.8 : 0.4) : 0), top + 0.012, MAT.roof, L, 3);
    const tz = zAt(setb + dep - 2.6, setb + dep - 2.6); cyl(0.55, 1.3, MAT.tank, lx + W - 1.2, top + 0.5, tz, L, 14); box(0.9, 0.5, 0.9, ENV.slab, lx + W - 1.65, top, tz - 0.45, L);
    if (rr() < 0.5) { const sp = box(1.8, 0.05, 1.1, MAT.neighWin, lx + 1, top + 0.6, tz - 0.55, L); sp.rotation.x = dir > 0 ? 0.5 : -0.5; }
    // cerco bajo con reja, jardín y estacionamiento
    box(W * 0.45, 0.6, 0.18, acc, lx, 0, zAt(0, 0.18), L); for (let k = 0; k < 9; k++) box(0.04, 0.8, 0.04, ENV.dark, lx + 0.15 + k * W * 0.05, 0.6, zAt(0.07, 0.11), L, {cast: false});
    plane(lx + 0.2, Math.min(zAt(0.3, 0.3), zAt(setb - 0.2, setb - 0.2)), W * 0.42, setb - 0.5, 0.012, MAT.grass, L, 2);
    plane(lx + W * 0.47, Math.min(zAt(0, 0), zAt(setb, setb)), W * 0.5, setb, 0.01, MAT.walk, L, 1.2);
    const nearCam = dir < 0 && lx + W > -18 && lx < 4;   // frente a la cámara inicial: sin palmeras que tapen la vista
    if (rr() < 0.65 && !nearCam) palm(lx + 1.1, zAt(1.5, 1.5), 4.5 + rr() * 2.5, L, rr); else bush(lx + 1.2, zAt(1.3, 1.3), 0.7, L, true);
    bush(lx + 2.4, zAt(0.8, 0.8), 0.45, L, rr() < 0.5);
    if (rr() < 0.55) { const cx = lx + W * 0.62; car(cx, fz - dir * 2.45, dir > 0 ? -Math.PI / 2 : Math.PI / 2, [0xe8e8e8, 0x8b9aa5, 0x2a6fa8, 0x7a1f1f, 0x2d2f33][(rr() * 5) | 0], L); }   // estacionado en la calle, frente a su casa
    aoBlob(lx + W / 2, zAt(setb + dep / 2, setb + dep / 2), W + 1.6, dep + 2.2, L, 0.42);
  } else if (t < 0.6) {   // en construcción
    const dep = 10, cols = [[0.3, 3], [W - 0.6, 3], [0.3, 3 + dep], [W - 0.6, 3 + dep], [W / 2, 3], [W / 2, 3 + dep]];
    cols.forEach(([a, b]) => { box(0.3, 2.9, 0.3, ENV.slab, lx + a, 0, zAt(b, b + 0.3), L); for (let k = 0; k < 4; k++) box(0.03, 1.0, 0.03, ENV.steel, lx + a + 0.05 + (k % 2) * 0.2, 2.9, zAt(b + 0.05 + (k >> 1) * 0.2, b + 0.05 + (k >> 1) * 0.2), L, {cast: false}); });
    box(W - 0.6, 1.0, 0.15, MC(0xb4553a, {map: makeTex("plaster")}), lx + 0.3, 0, zAt(3 + dep, 3 + dep + 0.15), L);   // muro de ladrillo a medio levantar
    plane(lx + 0.1, Math.min(zAt(0, 0), zAt(D, D)), W - 0.2, D, 0.008, MC(0xa98f6a, {map: makeTex("sand")}), L, 2);
    aoBlob(lx + W / 2, zAt(3 + dep / 2, 3 + dep / 2), W + 1, dep + 1.5, L, 0.3);
    box(W - 0.3, 0.2, dep + 0.3, ENV.slab, lx + 0.15, 2.7, zAt(3, 3 + dep + 0.3), L);
    const pile = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.9, 9), MC(0xcbb48a, {map: makeTex("sand")})); pile.position.set(lx + W / 2, 0.45, zAt(1.5, 1.5)); add(pile, L);
  } else {   // lote libre con estacas
    [[0.2, 0.2], [W - 0.2, 0.2], [0.2, D - 0.2], [W - 0.2, D - 0.2]].forEach(([a, b]) => box(0.08, 0.6, 0.08, ENV.wood, lx + a, 0, zAt(b, b), L));
    if (rr() < 0.3) bush(lx + W / 2, zAt(D / 2, D / 2), 0.35 + rr() * 0.3, L);
    const sg = textCanvas([["LOTE", 60, "#0A3856", 70], ["DISPONIBLE", 52, "#0A3856", 135]], 300, 190, "#ffffff");   // cartel de venta
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.76), MC(0xffffff, {map: sg})); sm.position.set(lx + W / 2, 1.2, zAt(0.6, 0.6)); if (dir < 0) sm.rotation.y = Math.PI; add(sm, L);
    box(0.06, 0.85, 0.06, ENV.wood, lx + W / 2 - 0.03, 0, zAt(0.62, 0.62), L);
  }
}
function park(x, z, w, d, rr) {
  plane(x, z, w, d, -0.02, MAT.grass, "entorno", 2.5);
  plane(x, z + d / 2 - 1, w, 2, -0.01, MAT.walk, "entorno", 1.5);
  for (let i = 0; i < 9; i++) { const px = x + 4 + i * (w - 8) / 8; palm(px, z + 2 + rr() * 2, 5 + rr() * 2.5, "entorno", rr); bush(px + 2, z + d - 2.5, 0.7, "entorno", i % 2 === 0); }
  for (let i = 0; i < 6; i++) { const bx = x + 6 + i * (w - 12) / 5; box(1.6, 0.45, 0.5, ENV.wood, bx, 0, z + d / 2 + 1.1, "entorno"); }
  playground(x + w / 2 - 4, z + 3, "entorno");
  const pg = x + w * 0.25; for (let i = 0; i < 4; i++) box(0.15, 2.6, 0.15, ENV.wood, pg + (i % 2) * 4, 0, z + 3 + (i > 1 ? 3 : 0), "entorno");
  for (let i = 0; i < 6; i++) box(4.3, 0.12, 0.12, ENV.wood, pg - 0.05, 2.6, z + 3 + i * 0.6, "entorno");
}
function playground(x, z, layer) {
  box(0.12, 2.2, 0.12, MAT.toy1, x, 0, z, layer); box(0.12, 2.2, 0.12, MAT.toy1, x + 3, 0, z, layer); box(3.12, 0.12, 0.12, MAT.toy1, x, 2.2, z, layer);
  [0.8, 2.1].forEach(a => { box(0.02, 1.6, 0.02, ENV.dark, x + a, 0.6, z, layer); box(0.5, 0.05, 0.25, MAT.toy2, x + a - 0.25, 0.55, z - 0.12, layer); });
  box(0.9, 1.5, 0.9, MAT.toy3, x + 4.2, 0, z - 0.4, layer);
  const sl = box(0.6, 0.06, 2.4, MAT.toy2, x + 4.35, 0.7, z + 0.5, layer); sl.rotation.x = -0.55;
}
function portico(x0, S, P) {
  const L = "entorno", zA = -S - 1.6, zB = 0.4;
  box(1.4, 5.4, 1.4, ENV.stone, x0 - 0.7, 0, zA - 1.4, L); box(1.4, 5.4, 1.4, ENV.stone, x0 - 0.7, 0, zB, L);
  box(1.6, 1.1, zB - zA + 2.8, ENV.wood, x0 - 0.8, 5.4, zA - 1.4, L);
  const t = textCanvas([[P.name.toUpperCase(), 64, "#ffffff", 80], ["VIVALDI · Construyendo tu futuro juntos", 34, "#cfe4f3", 150, 600]], 1400, 210, "#0A3856");
  const sm = M(0xffffff, {map: t, roughness: 0.5, emissive: 0xffffff, emissiveMap: t}); SIGNS.push(sm); const sign = new THREE.Mesh(new THREE.PlaneGeometry(zB - zA + 2.4, 1.4), sm);
  sign.position.set(x0 - 0.82, 4.55, (zA + zB) / 2 + 0.0); sign.rotation.y = -Math.PI / 2; add(sign, L);
  const s2 = sign.clone(); s2.position.x = x0 + 0.82; s2.rotation.y = Math.PI / 2; add(s2, L);
  box(2.4, 2.6, 2.2, ENV.wallExt, x0 + 1.4, 0, zB + 1.8, L); box(2.0, 1.0, 0.04, MAT.neighWin, x0 + 1.6, 1.2, zB + 1.78, L, {cast: false});
  palm(x0 - 3, zA - 3, 6, L); palm(x0 - 3, zB + 3, 6.5, L);
}
function club(x, z, P, rr) {
  const L = "entorno"; let colA = z, colB = z;
  const place = (w, d) => { if (colA <= colB) { const p = [x + 1, colA]; colA += d + 3; return p; } const p = [x + 22, colB]; colB += d + 3; return p; };
  plane(x, z - 2, 41, 60, -0.02, MAT.grass, L, 2.5);
  P.club.forEach(k => {
    if (k === "piscina") { const [a, b] = place(18, 12); plane(a, b, 18, 12, 0.02, MAT.walk, L, 1.4); box(12, 0.1, 6, MAT.water, a + 3, -0.02, b + 3, L, {cast: false}); for (let i = 0; i < 4; i++) { lounger(a + 3.5 + i * 2.8, b + 10.2); } umbrella(a + 1.5, b + 1.6); umbrella(a + 16.5, b + 1.6); person(a + 1, b + 7, 1.2, 0xe8553d); person(a + 16.6, b + 6, -1.5, 0x2a85c5); person(a + 9, b + 11.2, 3.1, 0xf2c14e, L, 0.75); }
    if (k === "club") { const [a, b] = place(18, 9); box(12, 3.2, 7, ENV.wallExt, a + 3, 0, b + 1, L); box(10, 2.2, 0.05, MAT.glass, a + 4, 0.4, b + 0.97, L, {cast: false}); pergola(a, b - 2.5, 18, 3, L); }
    if (k === "juegos") { const [a, b] = place(18, 6); plane(a, b, 18, 6, 0.01, MC(0xd9a066, {map: makeTex("sand")}), L, 2); playground(a + 4, b + 3, L); }
    if (k === "parrilla") { const [a, b] = place(18, 7); plane(a, b, 18, 7, 0.02, MAT.walk, L, 1.4); pergola(a + 1, b + 0.5, 16, 6, L); for (let i = 0; i < 3; i++) { grill(a + 2 + i * 5.5, b + 1.2, L); table(a + 3 + i * 5.5, b + 3.8, 4, L); } }
    if (k === "tenis") { const [a, b] = place(18, 26); plane(a, b, 18, 26, 0.01, MAT.clay, L); courtLines(a + 3.5, b + 1.1, 10.97, 23.77, L); box(11, 1.0, 0.05, ENV.dark, a + 3.5, 0, b + 13, L, {cast: false}); }
    if (k === "losa") { const [a, b] = place(18, 30); plane(a, b, 18, 30, 0.01, MAT.court, L); courtLines(a + 1.5, b + 1, 15, 28, L); [b + 1.2, b + 28.6].forEach(zz => box(0.15, 3.05, 0.15, ENV.steel, a + 9, 0, zz, L)); }
    if (k === "futbol") { const [a, b] = place(18, 32); plane(a, b, 18, 32, 0.01, MAT.grass, L, 1.2); courtLines(a + 1, b + 1, 16, 30, L); [b + 1, b + 30.8].forEach(zz => { box(4, 2, 0.1, ENV.white, a + 7, 0, zz, L); }); }
    if (k === "voley") { const [a, b] = place(18, 12); plane(a, b, 18, 12, 0.01, MC(0xe6d3a8, {map: makeTex("sand")}), L, 2); box(9, 0.9, 0.04, ENV.white, a + 4.5, 1.5, b + 6, L, {cast: false}); [a + 4.4, a + 13.5].forEach(xx => box(0.1, 2.5, 0.1, ENV.steel, xx, 0, b + 6, L)); }
    if (k === "bicicross") { const [a, b] = place(18, 16); plane(a, b, 18, 16, 0.01, MC(0xa97b52, {map: makeTex("sand")}), L, 2); for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MC(0x9a6c45)); m.scale.y = 0.35; m.position.set(a + 3 + i * 3, 0, b + 4 + (i % 2) * 7); add(m, L); } }
    if (k === "gimnasio") { const [a, b] = place(18, 6); plane(a, b, 18, 6, 0.01, MAT.court, L); for (let i = 0; i < 5; i++) { box(0.1, 2.2, 0.1, ENV.steel, a + 2 + i * 3, 0, b + 2, L); box(0.1, 2.2, 0.1, ENV.steel, a + 3.4 + i * 3, 0, b + 2, L); box(1.5, 0.08, 0.08, ENV.steel, a + 2, 2.1, b + 2, L).position.x = a + 2.75 + i * 3; } }
  });
  for (let i = 0; i < 8; i++) palm(x + 40 - rr() * 3, z + i * 7, 5 + rr() * 3, L, rr);
  if (P.club.includes("juegos")) { person(x + 8, z + 4, 0.3, 0x4caf7a, L, 0.62); person(x + 10, z + 5, 2.5, 0xf2c14e, L, 0.58); }
}
function courtLines(x, z, w, d, L) { [[x, z, w, 0.08], [x, z + d - 0.08, w, 0.08], [x, z, 0.08, d], [x + w - 0.08, z, 0.08, d], [x, z + d / 2 - 0.04, w, 0.08]].forEach(([a, b, c, e]) => box(c, 0.012, e, MAT.courtLine, a, 0.012, b, L, {cast: false})); }
function lounger(x, z, layer = "entorno") { const b = box(0.7, 0.12, 1.9, MAT.white, x - 0.35, 0.3, z - 0.95, layer); const back = box(0.7, 0.08, 0.7, MAT.fabric2, x - 0.35, 0.55, z - 0.95, layer); back.rotation.x = 0.7; [[-0.3, -0.85], [0.25, -0.85], [-0.3, 0.8], [0.25, 0.8]].forEach(([a, c]) => box(0.05, 0.3, 0.05, MAT.white, x + a, 0, z + c, layer)); return b; }
function umbrella(x, z, layer = "entorno") { cyl(0.04, 2.4, MAT.white, x, 0, z, layer, 8); const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.55, 10), MC(0xf4ede0)); c.position.set(x, 2.45, z); c.castShadow = true; add(c, layer); }
function pergola(x, z, w, d, layer, y0 = 0) { [[0, 0], [w - 0.15, 0], [0, d - 0.15], [w - 0.15, d - 0.15]].forEach(([a, b]) => box(0.15, 2.4, 0.15, MAT.wood, x + a, y0, z + b, layer)); for (let i = 0; i <= Math.floor(w / 0.6); i++) box(0.08, 0.14, d, MAT.wood, x + Math.min(i * 0.6, w - 0.08), y0 + 2.4, z, layer); }
function grill(x, z, layer) { box(1.0, 0.9, 0.6, MAT.dark, x, 0, z, layer); box(1.0, 0.05, 0.6, MAT.steel, x, 0.9, z, layer); }
function table(x, z, seats, layer, round) {
  if (round) cyl(0.45, 0.75, MAT.wood, x, 0, z, layer, 16); else box(1.4, 0.06, 0.8, MAT.wood, x - 0.7, 0.72, z - 0.4, layer);
  if (!round) [[-0.6, -0.32], [0.55, -0.32], [-0.6, 0.27], [0.55, 0.27]].forEach(([a, b]) => box(0.05, 0.72, 0.05, MAT.dark, x + a, 0, z + b, layer));
  const pos = seats === 2 ? [[0, -0.7], [0, 0.7]] : seats === 6 ? [[-0.45, -0.75], [0.45, -0.75], [-0.45, 0.75], [0.45, 0.75], [-1.05, 0], [1.05, 0]] : [[-0.4, -0.75], [0.4, -0.75], [-0.4, 0.75], [0.4, 0.75]];
  pos.forEach(([a, b]) => chair(x + a, z + b, layer));
}
function chair(x, z, layer) { box(0.42, 0.05, 0.42, MAT.wood, x - 0.21, 0.45, z - 0.21, layer); box(0.42, 0.45, 0.04, MAT.wood, x - 0.21, 0.5, z + (z > 0 ? 0.19 : -0.23), layer); box(0.04, 0.45, 0.04, MAT.dark, x - 0.19, 0, z - 0.19, layer); box(0.04, 0.45, 0.04, MAT.dark, x + 0.15, 0, z + 0.15, layer); }

/* ---------------- el lote del cliente: retiro, patio y ambientación ---------------- */
function buildLot(d) {
  const {W, D} = d, n = state.norm, a = state.prog.amb || {}, L = "mob";
  plane(0, 0, W, n.rf, 0.01, MAT.pave, "losas", 1.4);
  plane(0, d.yardZ, W, d.yardD, 0.005, MAT.grass, "losas", 2.2);
  [[-0.12, 0.12], [W, 0.12]].forEach(([x, t]) => box(t, 1.8, D - n.rf, MAT.wallExt, x, 0, n.rf, "terreno"));
  box(W + 0.24, 1.8, 0.12, MAT.wallExt, -0.12, 0, D, "terreno");
  // jardín frontal
  bush(0.6, 0.7, 0.45, L, true); if (!d.parking || W > 7) palm(W / 2 - 0.5, 1.0, 4.2, "jardin");
  { const x1 = d.parking ? W - 3.2 : W;   // cerco bajo con reja y jardinera; la puerta peatonal queda libre frente al ingreso
    if (x1 - 1.9 > 0.6) { box(x1 - 1.9, 0.55, 0.2, MAT.stone, 1.9, 0, 0, "terreno"); for (let x = 2.0; x < x1 - 0.05; x += 0.12) box(0.03, 0.85, 0.03, MAT.dark, x, 0.55, 0.08, "terreno", {cast: false}); box(x1 - 1.9, 0.04, 0.05, MAT.dark, 1.9, 1.4, 0.07, "terreno", {cast: false});
      plane(1.9, 0.25, x1 - 1.9, 0.7, 0.03, MAT.grass, "terreno", 2); for (let x = 2.3; x < x1 - 0.3; x += 0.9) bush(x, 0.6, 0.28, "terreno", (x * 10 | 0) % 2 === 0); }
    [0.05, 1.75].forEach(x => box(0.15, 1.5, 0.22, MAT.stone, x, 0, -0.01, "terreno"));
    ball(0.07, MAT.bulb, 0.35, 2.25, d.z0 - 0.06, "terreno"); glow(0.9, d.z0 - 0.9, 1.4); }
  if (d.parking) { const p = d.parking;   // el auto mide 4.5 m: si el retiro no alcanza, queda estacionado en la calle junto a la vereda
    if (p.short) car(Math.min(p.x + p.w / 2, W - 2.4), -2.45, -Math.PI / 2, 0x2a6fa8, L);
    else car(p.x + p.w / 2, p.z + Math.min(p.d - 0.25, 4.95) - 2.3, 0, 0x2a6fa8, L); }
  else if (state.prog.estilo === "restaurante") { table(W - 2.4, 1.6, 4, L, true); umbrella(W - 2.4, 1.6, "jardin"); }
  if (state.prog.estilo === "restaurante") stringLights(0.2, 0.9, W - 0.2, 0.9, 2.8, 0.35, "terreno");
  // patio posterior
  const yz = d.yardZ, yd = d.yardD;
  if (yd > 3) { stringLights(0.1, yz + Math.min(yd - 1, 2.2), W - 0.1, yz + Math.min(yd - 1, 2.2), 1.75, 0.3, "terreno"); stringLights(0.1, yz + Math.min(yd - 0.6, 4.5), W - 0.1, yz + Math.min(yd - 0.6, 4.5), 1.75, 0.3, "terreno"); } let free = [W, yz + (d.pool ? d.pool.d + 2.4 : 0.4)];
  if (d.pool) {
    const p = d.pool; plane(p.x - 0.5, p.z - 0.5, p.w + 1, p.d + 1, 0.02, MAT.walk, "losas", 1.2);
    box(p.w, 0.04, p.d, MAT.water, p.x, 0.0, p.z, "losas", {cast: false});
    lounger(Math.min(W - 0.8, p.x + p.w + 0.6), p.z + 1.2, L); umbrella(Math.min(W - 0.8, p.x + p.w + 0.6), p.z + 3, "jardin");
  }
  const spot = () => { const z = free[1]; free[1] += 2.4; return z < D - 1 ? z : null; };
  if (a.ninos) { const z = spot(); if (z !== null) playground(0.6, z + 0.6, L); }
  if (a.parrilla) { const z = spot(); if (z !== null) { grill(W - 1.4, z, L); table(W / 2, z + 0.6, 6, L); } }
  if (a.hamaca) { const z = spot(); if (z !== null) { box(0.12, 1.8, 0.12, MAT.wood, 0.5, 0, z, L); box(0.12, 1.8, 0.12, MAT.wood, 3.8, 0, z, L); const hm = box(3.0, 0.05, 0.9, MAT.cushion, 0.65, 0.8, z - 0.4, L); hm.rotation.z = 0.02; } }
  if (a.huerto) { for (let i = 0; i < Math.min(3, Math.floor(W / 2.4)); i++) { box(2.0, 0.45, 0.9, MAT.wood, 0.3 + i * 2.4, 0, D - 1.1, L); for (let k = 0; k < 4; k++) ball(0.22, MAT.leaf2, 0.6 + i * 2.4 + k * 0.45, 0.55, D - 0.65, L); } }
  if (a.mascota) { const z = Math.min(D - 1.6, free[1]); box(0.9, 0.7, 0.9, MAT.wood, W - 1.2, 0, z, L); const rf = box(1.05, 0.06, 1.05, MAT.accent, W - 1.27, 0.7, z - 0.07, L); rf.rotation.x = 0.0; }
  if (a.deportes) { box(0.12, 3.05, 0.12, MAT.steel, W / 2, 0, D - 0.4, L); box(1.2, 0.8, 0.05, MAT.white, W / 2 - 0.55, 2.8, D - 0.55, L); }
  bush(W - 0.6, D - 0.6, 0.55, L, true); bush(0.6, D - 0.6, 0.5, L);
  if (a.mayores) { const r = box(1.2, 0.15, 1.8, MAT.slab, 0.4, 0, n.rf - 1.8, L); r.rotation.x = 0.06; }
}

/* ---------------- mobiliario y ambientación interior ---------------- */
function buildFurniture(d, h) {
  let tables = 0;
  d.rooms.forEach(r => {
    const y = r.lvl * h, cx = r.x + r.w / 2, cz = r.z + r.d / 2, L = "mob", at = (o) => { o.position.y += y; return o; };
    const G = (fn) => { const before = groups[L] ? groups[L].children.length : 0; fn(); if (groups[L]) groups[L].children.slice(before).forEach(o => o.position.y += y); };
    const pend = () => { cyl(0.01, 0.6, MAT.dark, cx, y + h - 0.85, cz, L, 4); cyl(0.22, 0.2, MAT.fabric2, cx, y + h - 1.0, cz, L, 14, 0.12); };
    if (r.type === "bed" || r.type === "guest") {
      const kids = /niños/.test(r.name), big = !kids && r.area >= 10.5, bw = big ? 1.6 : 1.0, bl = 2.0, bz = r.z + r.d - bl - 0.12;
      const beds = kids && r.w >= 2.8 ? [cx - 0.85, cx + 0.85 - bw] : [cx - bw / 2];
      G(() => beds.forEach(bx => { box(bw, 0.35, bl, MAT.wood, bx, 0, bz, L); box(bw - 0.06, 0.2, bl - 0.1, MAT.bedding, bx + 0.03, 0.35, bz + 0.05, L); box(bw, 0.9, 0.08, MAT.fabric2, bx, 0.2, bz + bl - 0.02, L); box(bw - 0.1, 0.12, 0.35, MAT.white, bx + 0.05, 0.55, bz + bl - 0.5, L); box(bw + 0.04, 0.05, 0.8, kids ? MAT.toy3 : MAT.throw, bx - 0.02, 0.55, bz + 0.15, L); box(bw + 0.04, 0.2, 0.05, kids ? MAT.toy3 : MAT.throw, bx - 0.02, 0.37, bz + 0.12, L); }));
      if (!kids && r.w > bw + 1.2) G(() => [cx - bw / 2 - 0.5, cx + bw / 2 + 0.05].forEach(nx => { box(0.45, 0.5, 0.4, MAT.wood, nx, 0, r.z + r.d - 0.55, L); cyl(0.1, 0.3, MAT.light, nx + 0.22, 0.5, r.z + r.d - 0.35, L, 10, 0.07); }));
      G(() => { plane(cx - 1, bz - 0.9, 2, 1.4, 0.03, MAT.rug, L); box(Math.min(1.8, r.w - 0.4), 2.2, 0.55, MAT.white, r.x + 0.2, 0, r.z + 0.25, L); });
      if (kids) G(() => { box(0.6, 0.4, 0.4, MAT.toy2, r.x + r.w - 0.8, 0, r.z + 1.2, L); ball(0.15, MAT.toy1, r.x + r.w - 1.2, 0.15, r.z + 1.8, L); });
      if (r.type === "guest") G(() => box(0.7, 0.45, 0.45, MAT.dark, r.x + r.w - 0.9, 0, r.z + 1.1, L));
      G(() => plantPot(r.x + 0.4, 0, r.z + r.d - 0.4));
    } else if (r.type === "living") {
      const dining = /Comedor|comedor/.test(r.name), sofaW = Math.min(2.6, r.w - 1.2);
      if (!/^Comedor/.test(r.name)) G(() => {
        plane(cx - 1.5, cz - 1.2, 3, 2.2, 0.03, MAT.rug, L);
        box(sofaW, 0.42, 0.9, MAT.fabric, cx - sofaW / 2, 0, r.z + r.d - 1.3, L); box(sofaW, 0.45, 0.22, MAT.fabric, cx - sofaW / 2, 0.42, r.z + r.d - 0.62, L);
        [0.25, sofaW - 0.65].forEach(o => box(0.4, 0.35, 0.12, MAT.cushion, cx - sofaW / 2 + o, 0.45, r.z + r.d - 0.75, L));
        box(1.1, 0.38, 0.6, MAT.wood, cx - 0.55, 0, cz - 0.3, L);
        box(1.8, 0.45, 0.4, MAT.wood, cx - 0.9, 0, r.z + 0.25, L); box(1.4, 0.8, 0.05, MAT.dark, cx - 0.7, 1.0, r.z + 0.3, L);
        plantPot(r.x + 0.45, 0, r.z + 0.6); plantPot(r.x + r.w - 0.45, 0, r.z + r.d - 0.5);
      });
      if (dining) G(() => table(/^Comedor/.test(r.name) ? cx : r.x + Math.max(1.4, r.w * 0.22), /^Comedor/.test(r.name) ? cz : cz - 0.2, 6, L));
      pend();
    } else if (r.type === "kitchen") {
      G(() => { box(r.w - 0.3, 0.88, 0.6, MAT.wood, r.x + 0.15, 0, r.z + r.d - 0.75, L); box(r.w - 0.3, 0.04, 0.62, MAT.counter, r.x + 0.15, 0.88, r.z + r.d - 0.76, L);
        box(r.w - 0.3, 0.58, 0.02, MAT.floorWet, r.x + 0.15, 0.92, r.z + r.d - 0.17, L, {cast: false}); box(r.w - 0.3, 0.7, 0.35, MAT.wood, r.x + 0.15, 1.5, r.z + r.d - 0.5, L); box(0.75, 1.8, 0.7, MAT.steel, r.x + r.w - 0.95, 0, r.z + 0.25, L);
        box(0.6, 0.05, 0.5, MAT.dark, r.x + 0.4, 0.93, r.z + r.d - 0.7, L); if (r.area > 11) box(1.4, 0.9, 0.7, MAT.wood, cx - 0.7, 0, cz - 0.6, L); });
      r.fx = {sink: [r.x + r.w - 0.8, y + 0.85, r.z + r.d - 0.45], stove: [r.x + 0.6, y + 0.9, r.z + r.d - 0.45]};
    } else if (r.type === "prokitchen") {
      G(() => { box(r.w - 0.3, 0.9, 0.7, MAT.steel, r.x + 0.15, 0, r.z + r.d - 0.85, L); box(1.6, 0.9, 0.8, MAT.dark, r.x + 0.3, 0, r.z + 0.3, L); box(1.8, 0.5, 0.9, MAT.steel, r.x + 0.2, 2.0, r.z + 0.25, L);
        box(Math.min(2.4, r.w - 1.2), 0.9, 0.8, MAT.steel, cx - Math.min(1.2, r.w / 2 - 0.6), 0, cz - 0.4, L); box(0.8, 1.9, 0.75, MAT.steel, r.x + r.w - 1.0, 0, r.z + 0.3, L); });
      r.fx = {sink: [r.x + r.w - 0.8, y + 0.85, r.z + r.d - 0.5], stove: [r.x + 1.1, y + 0.9, r.z + 0.7]};
    } else if (r.type === "bath") {
      const wc = [r.x + 0.4, y, r.z + r.d - 0.45], lav = [r.x + r.w - 0.45, y, r.z + r.d - 0.4], sh = [r.x + r.w - 0.55, y, r.z + 0.6];
      G(() => { box(0.4, 0.42, 0.6, MAT.white, wc[0] - 0.2, 0, wc[2] - 0.3, L); box(0.42, 0.4, 0.18, MAT.white, wc[0] - 0.21, 0.42, wc[2] + 0.12, L);
        box(0.6, 0.82, 0.45, MAT.wood, lav[0] - 0.3, 0, lav[2] - 0.22, L); box(0.45, 0.06, 0.35, MAT.white, lav[0] - 0.22, 0.83, lav[2] - 0.17, L); box(0.55, 0.75, 0.02, MAT.glass, lav[0] - 0.27, 1.2, r.z + r.d - 0.16, L, {cast: false});
        if (!/SS\.HH\.|recepción/.test(r.name)) { box(0.9, 0.06, 0.9, MAT.white, sh[0] - 0.45, 0, sh[2] - 0.45, L); box(0.03, 2.0, 0.9, MAT.glass, sh[0] - 0.47, 0, sh[2] - 0.45, L, {cast: false}); } });
      r.fx = /SS\.HH\.|recepción/.test(r.name) ? {wc, lav} : {wc, lav, sh};
    } else if (r.type === "laundry") {
      G(() => { box(0.6, 0.85, 0.6, MAT.white, r.x + 0.2, 0, r.z + r.d - 0.75, L); box(0.55, 0.85, 0.55, MAT.white, r.x + 0.9, 0, r.z + r.d - 0.7, L); });
      cyl(0.25, 0.8, MAT.white, r.x + r.w - 0.4, y + 1.2, r.z + r.d - 0.4, L);
      r.fx = {lav: [r.x + 0.5, y, r.z + r.d - 0.45], therma: [r.x + r.w - 0.4, y + 1.2, r.z + r.d - 0.4]};
    } else if (r.type === "terrace" && r.open) {
      if (r.dining) G(() => { const nx = Math.max(1, Math.floor((r.w - 1) / 2.4)), nz = Math.max(1, Math.floor((r.d - 1) / 2.4)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { table(r.x + 1.4 + i * 2.4, r.z + 1.3 + j * 2.4, 4, L, true); tables++; } });
      else G(() => { pergola(r.x + 0.3, r.z + 0.3, Math.min(r.w - 0.6, 5), Math.min(r.d - 0.6, 3.2), L); grill(r.x + r.w - 1.4, r.z + r.d - 0.9, L); table(r.x + 2.4, r.z + 1.9, 4, L);
        box(2.0, 0.4, 0.8, MAT.fabric2, r.x + r.w - 2.6, 0, r.z + 0.5, L); plantPot(r.x + 0.4, 0, r.z + r.d - 0.4); });
      for (let i = 0; i < 8; i++) ball(0.05, MAT.bulb, r.x + 0.4 + i * (r.w - 0.8) / 7, y + 2.5 - Math.sin(i / 7 * Math.PI) * 0.25, r.z + 0.35, L, 1);
    } else if (r.type === "study") G(() => { box(1.2, 0.75, 0.6, MAT.wood, cx - 0.6, 0, r.z + r.d - 0.7, L); chair(cx, r.z + r.d - 1.2, L); box(1.0, 1.8, 0.35, MAT.wood, r.x + 0.2, 0, r.z + 0.2, L); });
    else if (r.type === "shop") {
      G(() => { const rows = Math.max(1, Math.floor((r.d - 1.6) / 1.6)); for (let i = 0; i < rows; i++) { const z = r.z + 1.4 + i * 1.6; box(r.w - 3.2, 1.6, 0.45, MAT.steel, r.x + 1.0, 0, z, L); for (let k = 0; k < 3; k++) for (let j = 0; j < Math.floor((r.w - 3.4) / 0.35); j++) box(0.25, 0.28, 0.3, [MAT.toy1, MAT.toy2, MAT.toy3, MAT.cushion][(i + j + k) % 4], r.x + 1.05 + j * 0.35, 0.15 + k * 0.5, z + 0.07, L); }
        box(2.0, 1.0, 0.6, MAT.wood, r.x + r.w - 2.3, 0, r.z + 0.4, L); box(0.4, 0.3, 0.3, MAT.dark, r.x + r.w - 1.0, 1.0, r.z + 0.5, L);
        box(0.8, 1.9, 0.7, MAT.glass, r.x + r.w - 0.95, 0, r.z + r.d - 0.85, L); });
      pend();
    } else if (r.type === "dining") {
      G(() => { box(Math.min(3, r.w - 1), 1.05, 0.55, MAT.wood, r.x + r.w - Math.min(3, r.w - 1) - 0.3, 0, r.z + r.d - 0.75, L);
        const nx = Math.max(1, Math.floor((r.w - 1) / 2.2)), nz = Math.max(1, Math.floor((r.d - 1.8) / 2.2)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { table(r.x + 1.2 + i * 2.2, r.z + 1.2 + j * 2.2, 4, L, true); tables++; }
        plantPot(r.x + 0.4, 0, r.z + 0.4); });
      for (let i = 0; i < 3; i++) cyl(0.18, 0.2, MAT.light, r.x + (i + 0.5) * r.w / 3, y + h - 0.9, cz, L, 12, 0.1);
    } else if (r.type === "reception") G(() => { box(2.0, 1.05, 0.6, MAT.wood, cx - 1.0, 0, r.z + r.d - 1.2, L); box(2.2, 0.42, 0.85, MAT.fabric, r.x + 0.4, 0, r.z + 0.5, L); plantPot(r.x + r.w - 0.5, 0, r.z + 0.5); });
    else if (r.type === "storage") G(() => { for (let i = 0; i < Math.max(1, Math.floor(r.w / 1.4)); i++) box(1.1, 2.0, 0.45, MAT.steel, r.x + 0.15 + i * 1.3, 0, r.z + r.d - 0.6, L); });
    else if (r.type === "hall" && r.w > 2) G(() => { plantPot(r.x + 0.5, 0, r.z + r.d / 2); box(1.0, 0.8, 0.35, MAT.wood, r.x + r.w - 1.3, 0, r.z + 0.2, L); });
  });
  d.tables = tables;
}

