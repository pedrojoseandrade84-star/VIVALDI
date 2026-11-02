/* ---------------- Three.js: escena realista ---------------- */
const canvas = $("#c");
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: "high-performance"}); }
catch (e) {   // equipo sin gráficos 3D disponibles: mensaje claro en vez de pantalla en blanco
  $("#loading").innerHTML = "<b>Este equipo no pudo abrir la vista 3D.</b><span>Prueba en Chrome o Safari actualizados, o en otro celular. Configurar y Análisis siguen disponibles.</span>"; $("#loading").classList.add("err"); throw e;
}
canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); $("#loading").hidden = false; $("#loading").innerHTML = "<b>Recuperando la vista 3D…</b>"; });   // iPhone libera los gráficos al cambiar de app
canvas.addEventListener("webglcontextrestored", () => { setTime(); $("#loading").hidden = true; });
let PR = Math.min(devicePixelRatio || 1, 2); renderer.setPixelRatio(PR);
const perf = {n: 0, t: 0};
function adaptQuality(dt) {   // si el equipo va lento (celulares antiguos), baja un poco la resolución para mantener la fluidez
  perf.n++; perf.t += dt; if (perf.n < 90) return;
  const avg = perf.t / perf.n; perf.n = perf.t = 0;
  if (avg > 0.045 && PR > 1.25) { PR = Math.max(1.25, PR - 0.35); renderer.setPixelRatio(PR); }
  else if (avg > 0.07 && PR <= 1.25 && !perf.low) { perf.low = true; renderer.shadowMap.type = THREE.PCFShadowMap; sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }   // equipo muy lento: sombras simples
}
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.42;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfdbe3, 260, 1700);
const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 3000);
const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
const controls = new THREE.OrbitControls(cam, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 3; controls.maxDistance = 420;
const hemi = new THREE.HemisphereLight(0xdbeaf7, 0xc9b48c, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
const MOBILE = Math.min(screen.width, screen.height) < 700;
const SH = !MOBILE && renderer.capabilities.maxTextureSize >= 8192 ? 4096 : 2048;   // en celular, sombras de 2048: misma nitidez práctica y menos calor
sun.castShadow = true; sun.shadow.mapSize.set(SH, SH); sun.shadow.radius = 3; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, {left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160});
scene.add(sun, sun.target);
const sky = new THREE.Sky();   // solo para los reflejos; el fondo visible es un cielo degradado más natural
const SKY_U = {top: {value: new THREE.Color()}, hor: {value: new THREE.Color()}, glow: {value: new THREE.Color()}, cloud: {value: new THREE.Color()}, sunDir: {value: new THREE.Vector3()}};
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), new THREE.ShaderMaterial({uniforms: SKY_U, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position + cameraPosition, 1.0); gl_Position.z = gl_Position.w; }",
  fragmentShader: "uniform vec3 top, hor, glow, sunDir, cloud; varying vec3 vD;" +
    "float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }" +
    "float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }" +
    "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * ns(p); p *= 2.03; a *= 0.5; } return v; }" +
    "void main(){ float h = max(vD.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.55)); float s = max(dot(normalize(vD), normalize(sunDir)), 0.0); c += glow * (pow(s, 6.0) * 0.35 + pow(s, 300.0) * 1.2) * (1.0 - h * 0.6);" +
    " if (vD.y > 0.01) { vec2 uv = vD.xz / (vD.y + 0.12) * 1.6; float cl = smoothstep(0.52, 0.78, fbm(uv + vec2(3.0, 7.0))) * smoothstep(0.01, 0.12, vD.y); c = mix(c, cloud + glow * pow(s, 4.0) * 0.4, cl * 0.75); }" +
    " if (vD.y < 0.0) c = hor; gl_FragColor = vec4(c, 1.0); }"}));
skyDome.renderOrder = -1; skyDome.frustumCulled = false; scene.add(skyDome);
const roomLight = new THREE.PointLight(0xfff0dc, 0, 10, 1.6); scene.add(roomLight);   // luz de ambiente interior al recorrer la casa
function updateShadow() {
  roomLight.intensity = state.mode === "walk" ? (state.time === "tarde" ? 1.8 : 1.0) : 0;
  const inside = state.mode === "walk"; if (inside !== updateShadow.inside) { updateShadow.inside = inside; if (inside) { hemi.userData.c = hemi.color.getHex(); hemi.color.set(0xf4ebdf); } else if (hemi.userData.c !== undefined) hemi.color.set(hemi.userData.c); }   // dentro de la casa, luz ambiente cálida (no el azul del cielo)
  if (state.mode === "walk") roomLight.position.set(cam.position.x, cam.position.y + 0.5, cam.position.z);   // la zona con sombras sigue a la cámara: sombras nítidas de cerca y también en la vista aérea
  const t = controls.target, dist = state.mode === "walk" ? 12 : cam.position.distanceTo(t), ext = clamp(dist * 0.62, 16, 170);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.far = 500; sc.updateProjectionMatrix();
  sun.shadow.normalBias = 0.02 + ext / 900; sun.shadow.bias = -0.0002 - ext / 400000;   // sin rayas de sombra al alejarse
  const near = state.mode === "walk" ? 0.08 : clamp(dist * 0.015, 0.1, 3);   // plano cercano según la distancia: evita parpadeos entre superficies
  if (Math.abs(cam.near - near) > near * 0.2) { cam.near = near; cam.updateProjectionMatrix(); }
  const c = state.mode === "walk" && walk ? new THREE.Vector3(walk.x, 0, walk.z) : t.clone().setY(0);
  sun.position.copy(SKY_U.sunDir.value).multiplyScalar(200).add(c); sun.target.position.copy(c); sun.target.updateMatrixWorld();
}
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
const ENV_SCENE = new THREE.Scene(), ENV_SKY = new THREE.Sky(); ENV_SKY.scale.setScalar(1000); ENV_SCENE.add(ENV_SKY);
function setTime() {   // día o atardecer: sol, cielo, reflejos y luces encendidas
  const tarde = state.time === "tarde", d = design || {W: 8, D: 25};
  const elev = tarde ? 6 : 34, azi = tarde ? 185 : 252;   // luz rasante de costado: volúmenes y sombras marcadas
  const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(azi), v = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  const u = sky.material.uniforms;
  u.turbidity.value = tarde ? 6 : 2.2; u.rayleigh.value = tarde ? 2.6 : 2.0; u.mieCoefficient.value = tarde ? 0.008 : 0.004; u.mieDirectionalG.value = 0.86; u.sunPosition.value.copy(v);
  SKY_U.sunDir.value.copy(v);
  updateShadow.inside = undefined;
  sun.color.set(tarde ? 0xffa45c : 0xffe9cc); sun.intensity = tarde ? 1.5 : 2.9;
  hemi.intensity = tarde ? 0.22 : 0.2; hemi.color.set(tarde ? 0xffc29a : 0xcfe3f5); hemi.groundColor.set(tarde ? 0x8a6a55 : 0xb89c72);
  renderer.toneMappingExposure = tarde ? 0.62 : 0.5;
  SKY_U.top.value.set(tarde ? 0x34507e : 0x2f74c0); SKY_U.hor.value.set(tarde ? 0xf3b27a : 0xc9def0); SKY_U.glow.value.set(tarde ? 0xffb066 : 0xfff3d6); SKY_U.cloud.value.set(tarde ? 0xe89a78 : 0xf6f8fb);
  if (groups.noche) groups.noche.visible = tarde;
  scene.fog.color.set(tarde ? 0xe9b386 : 0xc9def0);
  if (envRT) envRT.dispose();
  const s2 = ENV_SCENE, sk = ENV_SKY; Object.keys(u).forEach(k => sk.material.uniforms[k].value = u[k].value);
  envRT = pmrem.fromScene(s2); scene.environment = envRT.texture;
  MAT.glass.emissive.set(tarde ? 0xffb35c : 0x000000); MAT.glass.emissiveIntensity = tarde ? 0.55 : 0;
  MAT.light.emissiveIntensity = tarde ? 3.2 : 0.6; MAT.bulb.emissiveIntensity = tarde ? 4 : 0.2;
  MAT.neighWin.emissive.set(tarde ? 0xffb35c : 0x000000);
  SIGNS.forEach(m => { m.emissiveIntensity = tarde ? 0.95 : 0.12; });
  $$("#timeSw button").forEach(b => b.classList.toggle("on", b.dataset.t === state.time));
}
let root = new THREE.Group(); scene.add(root);
const groups = {};
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);

/* texturas procedurales (sin descargas): arena, pasto, adoquín, madera, cerámica, asfalto, estuco */
function rnd(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TEX = {};
function makeTex(kind) {
  if (TEX[kind]) return TEX[kind];
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rnd(kind.length * 977 + 13);
  const noise = (base, amp, n, sz) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < n; i++) { const v = (r() - 0.5) * amp; g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v)})`; g.fillRect(r() * 256, r() * 256, sz * r() + 1, sz * r() + 1); } };
  if (kind === "sand") noise("#c3a679", 0.2, 9000, 2.2);
  else if (kind === "grass") { noise("#6f9a45", 0.3, 7000, 2); for (let i = 0; i < 2500; i++) { g.strokeStyle = r() > 0.5 ? "rgba(140,190,80,.5)" : "rgba(60,95,35,.5)"; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 4 - r() * 4); g.stroke(); } }
  else if (kind === "asphalt") noise("#3c4144", 0.25, 9000, 1.6);
  else if (kind === "pavers") { noise("#c9bfae", 0.12, 3000, 2); g.strokeStyle = "rgba(90,80,65,.35)"; g.lineWidth = 2; for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } }
  else if (kind === "wood") { g.fillStyle = "#b58457"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + r() * 12}%,${44 + r() * 10}%)`; g.fillRect(0, y, 256, 31); for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(70,40,20,.18)"; g.beginPath(); const yy = y + r() * 30; g.moveTo(0, yy); g.bezierCurveTo(80, yy + r() * 4, 170, yy - r() * 4, 256, yy); g.stroke(); } g.fillStyle = "rgba(60,35,20,.4)"; g.fillRect(0, y + 31, 256, 1); g.fillRect(r() * 256, y, 1, 31); } }
  else if (kind === "deck") { g.fillStyle = "#9c6b45"; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 21) { g.fillStyle = `hsl(25,${38 + r() * 10}%,${36 + r() * 8}%)`; g.fillRect(x, 0, 19, 256); } }
  else if (kind === "tile") { g.fillStyle = "#e9e6e0"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(0,0,0,${r() * 0.04})`; g.fillRect(i * 64, j * 64, 64, 64); } g.strokeStyle = "rgba(120,115,105,.35)"; g.lineWidth = 2; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(256, x); g.stroke(); } }
  else if (kind === "porcelain") { g.fillStyle = "#d9c6aa"; g.fillRect(0, 0, 256, 256); noise("rgba(0,0,0,0)", 0.06, 3000, 3); g.strokeStyle = "rgba(110,95,75,.25)"; g.lineWidth = 2; for (let x = 0; x <= 256; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(256, x); g.stroke(); } }
  else if (kind === "foliage") { noise("#9fbf7f", 0.5, 5000, 3); }
  else if (kind === "plaster") noise("#f1ebe1", 0.05, 6000, 3);
  else if (kind === "stone") { noise("#b9a588", 0.2, 4000, 4); g.strokeStyle = "rgba(70,60,45,.35)"; for (let y = 0; y < 256; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 24 % 2) * 30; x < 256; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 24); g.stroke(); } } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return TEX[kind] = t;
}
const AO_TEX = (() => {   // sombra de contacto suave bajo construcciones, autos y árboles
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.55, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const AO_MAT = new THREE.MeshBasicMaterial({map: AO_TEX, color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8});
const PATCH_MAT = new THREE.MeshBasicMaterial({map: AO_TEX, color: 0x9a7a4a, transparent: true, opacity: 0.06, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4});
const PATCH_GREEN = Object.assign(PATCH_MAT.clone(), {color: new THREE.Color(0x2f4a1c), opacity: 0.12});
const AO_CACHE = {};
const aoMat = op => !op ? AO_MAT : AO_CACHE[op] || (AO_CACHE[op] = Object.assign(AO_MAT.clone(), {opacity: op}));
const GLOW_MAT = new THREE.MeshBasicMaterial({map: AO_TEX, color: 0xffb35a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -10});
function glow(x, z, r, layer = "noche") { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), GLOW_MAT); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.renderOrder = 2; return add(m, layer); }   // charco de luz de un poste al atardecer
function aoBlob(x, z, w, d, layer, op, y = 0.015) {   // x,z = centro
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), aoMat(op)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1; return add(m, layer);
}
function rippleTex(base, hi, n) {   // ondas de luz sobre el agua; se desplazan en cada cuadro
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rnd(n);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); g.strokeStyle = hi; g.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = r() * 256, y = r() * 256, l = 6 + r() * 22; g.lineWidth = 1 + r() * 2.2; g.globalAlpha = 0.25 + r() * 0.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3 - r() * 4, x + l, y); g.stroke();
    for (const [dx, dy] of [[-256, 0], [0, -256]]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + l / 2, y + dy - 4, x + dx + l, y + dy); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}
const RIPPLE = rippleTex("#2aa6d6", "#e9fbff", 260), RIPPLE2 = rippleTex("#1d6a93", "#bfe6f5", 420); RIPPLE.repeat.set(2, 2);
const anim = {palms: [], cars: [], waves: []};
const SIGNS = [];   // letreros que se iluminan al atardecer
function animateScene(t, dt) {   // agua, palmeras con brisa y autos en la carretera
  RIPPLE.offset.set(t * 0.012, t * 0.018); RIPPLE2.offset.set(t * 0.004, -t * 0.006);
  anim.palms.forEach(p => { p.rotation.z = Math.sin(t * 1.3 + p.userData.ph) * 0.025; p.rotation.x = Math.cos(t * 0.9 + p.userData.ph) * 0.015; });
  anim.waves.forEach(w => { const u = w.userData.wave, off = Math.sin(t * 0.5 + u.ph) * 2.2; if (u.ax === "z") w.position.z = u.z + off; else w.position.x = u.z - off; w.material.opacity = 0.45 + 0.3 * Math.sin(t * 0.5 + u.ph + 1.2); });
  anim.cars.forEach(c => { c.position.z += c.userData.v * dt; if (c.position.z > 600) c.position.z = -600; if (c.position.z < -600) c.position.z = 600; });
}
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color, roughness: 0.85, metalness: 0, envMapIntensity: 0.45}, o));
const MCACHE = new Map();
const MC = (color, o = {}) => {   // material compartido para el entorno: mismas propiedades, un solo material (menos trabajo para el celular)
  if (o.map && !Object.values(TEX).includes(o.map)) return M(color, o);   // carteles con texto propio: material aparte
  const k = color + JSON.stringify(o, (key, v) => v && v.isTexture ? v.uuid : v);
  if (!MCACHE.has(k)) MCACHE.set(k, M(color, o)); return MCACHE.get(k);
};
const MAT = {
  wall: M(0xf1ebe1, {map: makeTex("plaster")}), baseboard: M(0x8a7a68, {roughness: 0.6}), throw: M(0xb8664a, {roughness: 1}), counter: M(0x34302c, {roughness: 0.35, metalness: 0.05, envMapIntensity: 0.25}), wallExt: M(0xece2d3, {map: makeTex("plaster")}), accent: M(0x9b6a43, {roughness: 0.7}), slab: M(0xd8d3cb), glass: M(0x9fcbe6, {transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0.5, envMapIntensity: 1.3}),
  frame: M(0x3b3f44, {metalness: 0.5, roughness: 0.4}),
  sand: M(0xffffff, {map: makeTex("sand")}), grass: M(0xffffff, {map: makeTex("grass")}), street: M(0xffffff, {map: makeTex("asphalt"), roughness: 0.95}), walk: M(0xffffff, {map: makeTex("pavers")}),
  pave: M(0xffffff, {map: makeTex("pavers")}), water: M(0x7fd3ee, {map: RIPPLE, transparent: true, opacity: 0.9, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.2}), sea: M(0x5aa3c4, {map: RIPPLE2, roughness: 0.1, metalness: 0.3, envMapIntensity: 1}),
  poolEdge: M(0xf0ebe2, {roughness: 0.6}), wood: M(0xffffff, {map: makeTex("wood")}), deck: M(0xffffff, {map: makeTex("deck")}),
  floorLiving: M(0xffffff, {map: makeTex("porcelain")}), floorWet: M(0xffffff, {map: makeTex("tile")}), floorBed: M(0xffffff, {map: makeTex("wood")}), floorTerr: M(0xffffff, {map: makeTex("deck")}),
  white: M(0xfafafa, {roughness: 0.35}), dark: M(0x3d4247), fabric: M(0x7d9cb3), fabric2: M(0xd9c7a7), cushion: M(0xe9a65c), rug: M(0xcdb79a, {roughness: 1}), bedding: M(0xf4f1ea), steel: M(0xb5bcc2, {metalness: 0.7, roughness: 0.3}),
  leaf: M(0x3f6a2c, {map: makeTex("foliage")}), leaf2: M(0x557f36, {map: makeTex("foliage")}), trunk: M(0x7a5c40), pot: M(0xc0704a), flower: M(0xe85d75),
  neigh: M(0xf6efe4, {map: makeTex("plaster")}), roof: M(0xbdb5a8, {map: makeTex("plaster"), roughness: 0.95}), neighWin: M(0x2a3a46, {roughness: 0.06, metalness: 0.7, envMapIntensity: 1.3}), stone: M(0xffffff, {map: makeTex("stone")}),
  tank: M(0x2c2f33), meter: M(0x6d7680), light: M(0xfff6c8, {emissive: 0xffd27a}), bulb: M(0xfff1c2, {emissive: 0xffcf73}),
  e1: M(0xffc400, {emissive: 0x6b5200}), e2: M(0xff7a00, {emissive: 0x5a2b00}), e3: M(0xe53935, {emissive: 0x5a1414}),
  cold: M(0x1e88e5, {emissive: 0x0a2f55}), hot: M(0xe53935, {emissive: 0x4a0c0c}), sew: M(0x8d6e63, {emissive: 0x2a1d18}),
  court: M(0x2f7d6d), courtLine: M(0xffffff), clay: M(0xb55b3c), toy1: M(0xe53935), toy2: M(0xffc107), toy3: M(0x1e88e5),
};
const BUILD_MATS = ["baseboard", "throw", "counter", "wall", "wallExt", "accent", "slab", "glass", "frame", "floorLiving", "floorWet", "floorBed", "floorTerr", "wood", "deck", "white", "dark", "fabric", "fabric2", "cushion", "rug", "bedding", "steel", "tank", "light", "bulb", "water", "poolEdge", "leaf", "leaf2", "trunk", "pot", "flower", "toy1", "toy2", "toy3", "stone"];
[...BUILD_MATS, "e1", "e2", "e3", "cold", "hot", "sew", "meter"].forEach(k => { MAT[k].clippingPlanes = [cutPlane]; });
["wall", "baseboard", "throw", "floorLiving", "floorWet", "floorBed", "fabric", "fabric2", "cushion", "rug", "bedding", "white", "wood", "accent", "slab", "pot", "flower"].forEach(k => { MAT[k].envMapIntensity = 0.12; });   // interiores: sin reflejo azul del cielo

function add(o, layer) { (groups[layer] || (groups[layer] = new THREE.Group(), groups[layer].name = layer, root.add(groups[layer]), groups[layer])).add(o); return o; }
function box(w, h, d, mat, x, y, z, layer, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), mat);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = opts.cast !== false; m.receiveShadow = true; return add(m, layer);
}
function plane(x, z, w, d, y, mat, layer, tile = 1) {   // superficie horizontal con textura en coordenadas reales (no se estira)
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x + w / 2, y, z + d / 2);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return add(m, layer);
}
function cyl(r, h, mat, x, y, z, layer, seg = 16, r2) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 === undefined ? r : r2, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return add(m, layer); }
function ball(r, mat, x, y, z, layer, detail = 0) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); m.castShadow = true; return add(m, layer); }

/* vegetación */
const FROND = (() => {   // hoja de palmera dibujada: nervio central y foliolos, con transparencia
  const c = document.createElement("canvas"); c.width = 128; c.height = 512; const g = c.getContext("2d"), r = rnd(77);
  g.strokeStyle = "#6f7f3a"; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 512); g.stroke();
  for (let y = 10; y < 500; y += 7) { const L = 58 * Math.sin(Math.PI * Math.min(1, (y + 40) / 540)) * (0.85 + r() * 0.3);
    [-1, 1].forEach(k => { g.strokeStyle = `hsl(${88 + r() * 18},${38 + r() * 14}%,${24 + r() * 14}%)`; g.lineWidth = 3 + r() * 1.5; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + k * L * 0.5, y + 6, 64 + k * L, y + 22 + r() * 8); g.stroke(); }); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
})();
const PALM_LEAF = (() => { const g = new THREE.PlaneGeometry(1.3, 3.0, 1, 8); g.rotateX(-Math.PI / 2); g.translate(0, 0, 1.5); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setY(i, p.getY(i) - 0.085 * z * z + Math.abs(p.getX(i)) * 0.25); } g.computeVertexNormals(); return g; })();
const FROND_MAT = M(0xffffff, {map: FROND, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75}), FROND_DEPTH = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, map: FROND, alphaTest: 0.45, side: THREE.DoubleSide});
const TRUNK_TEX = (() => { const c = document.createElement("canvas"); c.width = 32; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#8f8270"; g.fillRect(0, 0, 32, 128); const r = rnd(9); for (let y = 0; y < 128; y += 6 + r() * 4) { g.fillStyle = `rgba(55,45,35,${0.15 + r() * 0.2})`; g.fillRect(0, y, 32, 1.5); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,250,240" : "40,30,20"},.12)`; g.fillRect(r() * 32, r() * 128, 2, 1); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 4); t.encoding = THREE.sRGBEncoding; return t; })();
const PALM_TRUNK = M(0xffffff, {map: TRUNK_TEX});
function palm(x, z, h, layer = "entorno", rr = Math.random) {
  const g = new THREE.Group(), lean = (rr() - 0.5) * 0.25;
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 9), PALM_TRUNK); tr.position.y = h / 2; tr.rotation.z = lean; tr.castShadow = true; g.add(tr);
  const top = new THREE.Vector3(-Math.sin(lean) * h, h, 0);
  for (let i = 0; i < 12; i++) { const l = new THREE.Mesh(PALM_LEAF, FROND_MAT); l.customDepthMaterial = FROND_DEPTH; l.position.copy(top); l.rotation.set(0, i / 12 * Math.PI * 2 + rr() * 0.4, 0, "YXZ"); l.rotateX(-(0.25 + rr() * 0.5) + (i % 3 === 0 ? 0.35 : 0)); l.castShadow = true; g.add(l); }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), MC(0x4a3826)); nut.position.copy(top); g.add(nut);
  g.position.set(x, 0, z); g.userData.ph = rr() * 6; g.userData.anim = true; mergeMeshes(g); anim.palms.push(g); return add(g, layer);
}
function bush(x, z, s, layer = "entorno", flower = false) {
  [[0, 0.7, 0, 1], [0.45, 0.5, 0.2, 0.7], [-0.4, 0.5, -0.15, 0.75], [0.1, 0.45, -0.45, 0.65]].forEach(([a, b, c, k], i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s * k, 12, 9), i % 2 ? MAT.leaf2 : MAT.leaf); m.position.set(x + a * s, b * s, z + c * s); m.scale.y = 0.85; m.castShadow = true; add(m, layer); }); if (flower) for (let i = 0; i < 4; i++) ball(0.07, MAT.flower, x + Math.cos(i * 1.6) * s * 0.7, s * 1.1, z + Math.sin(i * 1.6) * s * 0.7, layer); }
function person(x, z, rot, shirt, layer = "entorno", s = 1, pose = "stand") {
  const g = new THREE.Group(), skin = PSKIN[(Math.abs(x * 7 + z * 3) | 0) % PSKIN.length], cloth = MC(shirt, {roughness: 0.9}), pants = MC([0x2f3b4c, 0x6b5a45, 0xe8e2d6, 0x3d4a3a][(Math.abs(x + z) | 0) % 4], {roughness: 0.9});
  const part = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
  const sit = pose === "sit";
  if (!sit) { part(new THREE.CylinderGeometry(0.075, 0.06, 0.82, 8), pants, -0.1, 0.41, 0); part(new THREE.CylinderGeometry(0.075, 0.06, 0.82, 8), pants, 0.1, 0.41, 0); }
  else { const l = part(new THREE.CylinderGeometry(0.075, 0.07, 0.5, 8), pants, -0.1, 0.48, 0.22); l.rotation.x = Math.PI / 2; const l2 = l.clone(); l2.position.x = 0.1; g.add(l2); }
  const y0 = sit ? 0.45 : 0.82;
  part(new THREE.CylinderGeometry(0.19, 0.16, 0.62, 10), cloth, 0, y0 + 0.31, 0);
  [-1, 1].forEach(k => { const a = part(new THREE.CylinderGeometry(0.05, 0.045, 0.58, 6), cloth, k * 0.24, y0 + 0.32, 0); a.rotation.z = k * 0.12; });
  part(new THREE.SphereGeometry(0.115, 12, 10), skin, 0, y0 + 0.78, 0);
  part(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), MC(0x2b2018), 0, y0 + 0.8, -0.01);
  g.position.set(x, sit ? 0 : 0, z); g.rotation.y = rot; g.scale.setScalar(s); add(g, layer); aoBlob(x, z, 0.8 * s, 0.8 * s, layer, 0.35); return g;
}
const PSKIN = [M(0xc68a62), M(0xa96f4a), M(0xe0b08a), M(0x8d5a3b)];
function plantPot(x, y, z, layer = "mob") { cyl(0.18, 0.4, MAT.pot, x, y, z, layer, 10, 0.13); ball(0.32, MAT.leaf2, x, y + 0.7, z, layer); }

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
function textCanvas(lines, w, h, bg, fg) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach(([t, size, color, y, weight]) => { g.fillStyle = color || fg; g.font = `${weight || 800} ${size}px Manrope, Arial`; g.fillText(t, w / 2, y); });
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
function label(text, x, y, z, size = 0.55, sub = "") {
  const c = document.createElement("canvas"), g = c.getContext("2d"), fs = 44;
  g.font = `800 ${fs}px Manrope, Arial`; const w1 = g.measureText(text).width; g.font = `600 ${fs * 0.72}px Manrope, Arial`; const w2 = sub ? g.measureText(sub).width : 0;
  c.width = Math.ceil(Math.max(w1, w2) + 40); c.height = sub ? 120 : 76;
  g.fillStyle = "rgba(10,56,86,.86)"; const rr = 18; g.beginPath(); g.moveTo(rr, 0); g.arcTo(c.width, 0, c.width, c.height, rr); g.arcTo(c.width, c.height, 0, c.height, rr); g.arcTo(0, c.height, 0, 0, rr); g.arcTo(0, 0, c.width, 0, rr); g.fill();
  g.fillStyle = "#fff"; g.font = `800 ${fs}px Manrope, Arial`; g.textBaseline = "middle"; g.fillText(text, 20, sub ? 40 : 39);
  if (sub) { g.fillStyle = "#BFE3FF"; g.font = `600 ${fs * 0.72}px Manrope, Arial`; g.fillText(sub, 20, 88); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: t, depthTest: false, transparent: true, clippingPlanes: [cutPlane], toneMapped: false}));
  s.scale.set(size * c.width / c.height, size, 1); s.userData.base = s.scale.clone(); s.position.set(x, y, z); s.renderOrder = 10; add(s, "etiquetas"); return s;
}

