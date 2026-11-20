// Showroom virtual de Vivaldi · motor fotorrealista: three.js con cielos HDR reales, materiales PBR, muebles 3D escaneados,
// oclusión ambiental (GTAO), brillo, antialias MSAA, realidad virtual (WebXR) y «Foto realista» por trazado de rayos.
// Diseño y desarrollo: Pedrojose Andrade Paredes
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {WebGLPathTracer} from 'three-gpu-pathtracer/src/core/WebGLPathTracer.js';

const DATA = window.VV_DATOS, REC = window.VV_REC;
const Q = new URLSearchParams(location.search), CAPTURA = Q.has('captura');
const coarse = matchMedia('(pointer: coarse)').matches, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const S = n => 'S/ ' + Math.round(n).toLocaleString('en-US');
const PROY = DATA.proyectos.filter(p => p.m2 && p.estado !== 'Vendido 100%');
const LOTE = {90: [6, 15], 200: [10, 20], 250: [10, 25]};
let P = PROY.find(p => p.id === Q.get('proyecto')) || PROY[0];
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const progreso = t => { const e = $('loadT'); if (e) e.textContent = t; };

// ---------- motor ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURA});
let DPR = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
let ALTA = !coarse && !Q.has('ligero');
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 6000);
const dolly = new THREE.Group(); dolly.add(camera); scene.add(dolly);
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const pmrem = new THREE.PMREMGenerator(renderer);

// posprocesado: MSAA en HDR, oclusión ambiental, brillo suave y salida con tono de cine
const rt = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: 4});
const composer = new EffectComposer(renderer, rt);
const pRender = new RenderPass(scene, camera); composer.addPass(pRender);
const pAO = new GTAOPass(scene, camera, innerWidth, innerHeight); pAO.blendIntensity = .9; pAO.updateGtaoMaterial({radius: .6, distanceExponent: 1.2, thickness: 1.2, scale: 1, samples: 16});
pAO.enabled = ALTA; composer.addPass(pAO);
const pBloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .12, .4, 2.5); composer.addPass(pBloom);
composer.addPass(new OutputPass());
function tamano() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight); }
addEventListener('resize', tamano);

// ---------- recursos ----------
const blobURL = (b64, tipo) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], {type: tipo})); };
const URLS = {}; for (const [k, v] of Object.entries(REC)) URLS[k] = blobURL(v, k.endsWith('.hdr') ? 'application/octet-stream' : k.endsWith('.glb') ? 'model/gltf-binary' : 'image/jpeg');
const texLoader = new THREE.TextureLoader();
const TAM = {piso: 1.6, deck: 2.2, revest: 2.4, muro: 2.5, pasto: 2.5, arena: 3, asfalto: 3.5, vereda: 2.4, marmol: 1.4, tela: .8, piedra: 2.2};
function texturas(k) { const t = {}; for (const m of ['color', 'normal', 'rugosidad']) { const key = `tex-${k}-${m}.jpg`; if (!URLS[key]) continue;
    t[m] = texLoader.load(URLS[key]); t[m].wrapS = t[m].wrapT = THREE.RepeatWrapping; t[m].anisotropy = ANISO; if (m === 'color') t[m].colorSpace = THREE.SRGBColorSpace;
    const r = 2.4 / TAM[k]; t[m].repeat.set(r, r); } return t; }
function pbr(k, o = {}) { const t = texturas(k); return new THREE.MeshStandardMaterial(Object.assign({map: t.color, normalMap: t.normal, roughnessMap: t.rugosidad, roughness: 1, normalScale: new THREE.Vector2(.9, .9)}, o)); }
const M = o => new THREE.MeshStandardMaterial(o);
const mat = {
  muro: pbr('muro', {color: 0xffffff, normalScale: new THREE.Vector2(.5, .5)}), muroInt: M({color: 0xf5f2ec, roughness: .9}), cielo: M({color: 0xfbfaf6, roughness: .95}),
  revest: pbr('revest', {color: 0xd6b08a}), piso: pbr('piso', {color: 0xffffff}), deck: pbr('deck', {color: 0xe6c7a5}), piedra: pbr('piedra', {color: 0xf1ede6}), marmol: pbr('marmol', {roughness: .35}),
  alu: M({color: 0x23262a, metalness: .85, roughness: .32}),
  vidrio: new THREE.MeshPhysicalMaterial({color: 0xeef6f8, metalness: 0, roughness: .02, transparent: true, opacity: .12, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide, ior: 1.5, specularIntensity: 1}),
  barandaV: new THREE.MeshPhysicalMaterial({color: 0xdff0f2, roughness: .03, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide}),
  pasto: pbr('pasto', {color: 0xffffff}), arena: pbr('arena'), asfalto: pbr('asfalto', {color: 0xbfbfbf}), vereda: pbr('vereda'), tela: pbr('tela', {color: 0xe7ded0}), telaOsc: pbr('tela', {color: 0x707a82}),
  roble: pbr('deck', {color: 0xf0d9bd, roughness: .8}), negro: M({color: 0x1d1f22, metalness: .5, roughness: .4}), blanco: M({color: 0xf4f2ee, roughness: .35}),
  tronco: M({color: 0x7f6a52, roughness: .95}), foco: M({color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0}), tv: M({color: 0x0c0d0f, metalness: .3, roughness: .12}),
  vecino: pbr('muro', {color: 0xf0ece4}), vecinoV: M({color: 0x2c3a44, metalness: .4, roughness: .12}), estaca: M({color: 0xd9572b, roughness: .7}),
  techo: pbr('piedra', {color: 0xc9c5be}), concreto: pbr('piedra', {color: 0xd6d2ca}), terreno: pbr('arena', {color: 0xffffff}), afirmado: pbr('arena', {color: 0xe6d9c2, normalScale: new THREE.Vector2(.5, .5)}), adoquin: pbr('vereda', {color: 0xb9b3aa}), solar: M({color: 0x18263d, metalness: .6, roughness: .18}),
  linea: new THREE.LineDashedMaterial({color: 0xffffff, dashSize: .5, gapSize: .3, transparent: true, opacity: .9})
};
// hoja de palmera (lienzo) con transparencia
const hojaTex = (() => { const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.translate(n / 2, n); let s = 31; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 64; i++) { const t = i / 64, y = -t * n * .98, w = Math.sin(Math.min(1, t * 1.15) * Math.PI) * n * .46 + 6;
    for (const sg of [-1, 1]) { const gr = g.createLinearGradient(0, 0, sg * w, 0); gr.addColorStop(0, '#2a4f1c'); gr.addColorStop(1, r() > .5 ? '#6a9636' : '#577f2e'); g.fillStyle = gr;
      g.save(); g.translate(0, y); g.rotate(sg * (.55 + t * .25)); g.beginPath(); g.ellipse(sg * w / 2, 0, w / 2, 3.2 + (1 - t) * 2.4, 0, 0, 7); g.fill(); g.restore(); } }
  g.fillStyle = '#4a6a2a'; g.fillRect(-3, -n, 6, n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; })();
mat.hoja = new THREE.MeshStandardMaterial({map: hojaTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .75});
const abanicoTex = (() => { const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.translate(n / 2, n * .92);
  for (let i = 0; i <= 46; i++) { const a = -Math.PI * .92 + i / 46 * Math.PI * .84, L = n * (.78 + .08 * Math.sin(i * 1.7)); const gr = g.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); gr.addColorStop(0, '#3d5a2a'); gr.addColorStop(.6, i % 3 ? '#5b7d3a' : '#6e8e45'); gr.addColorStop(1, '#8a9a5a');
    g.strokeStyle = gr; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; })();
mat.abanico = new THREE.MeshStandardMaterial({map: abanicoTex, alphaTest: .45, side: THREE.DoubleSide, roughness: .7});
mat.falda = new THREE.MeshStandardMaterial({color: 0x8a7556, roughness: 1});

// muebles 3D
const MUEBLES = {}; const gltf = new GLTFLoader();
async function cargarMuebles() { await Promise.all(Object.keys(URLS).filter(k => k.endsWith('.glb')).map(k => new Promise(ok => gltf.load(URLS[k], g => {
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = ANISO; } }); MUEBLES[k.slice(7, -4)] = g.scene; ok(); }, undefined, () => ok())))); }
function mueble(nombre, x, y, z, rot = 0, parte = null, escala = 1) { const base = MUEBLES[nombre]; if (!base) return null; const o = (parte ? base.getObjectByName(parte) : base).clone(true);
  const g = new THREE.Group(); g.add(o); o.position.set(0, 0, 0); o.scale.multiplyScalar(escala); const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(v3());
  o.position.set(-c.x, -b.min.y, -c.z); g.position.set(x, y, z); g.rotation.y = rot; raiz.add(g); return g; }

// cielos HDR: cada uno se carga, se ubica su sol y se gira para que el sol caiga sobre el mar (oeste)
const CIELOS = {}; const hdr = new HDRLoader();
const LUZ = {tarde: {obj: [.62, -.78], exp: +(Q.get('exp') || .66), sol: 3.6, noche: 0}, atardecer: {obj: [.3, -.95], exp: +(Q.get('exp') || .62), sol: 2.6, noche: .55}, noche: {obj: [.5, -.86], exp: +(Q.get('exp') || 1), sol: .05, noche: 1}};
async function cargarCielos() { for (const k of ['tarde', 'atardecer', 'noche']) { const t = await new Promise(ok => hdr.load(URLS[`cielo-${k}.hdr`], ok)); t.mapping = THREE.EquirectangularReflectionMapping;
  const {width: w, height: h, data} = t.image, half = data instanceof Uint16Array, f = half ? THREE.DataUtils.fromHalfFloat : x => x; let mx = -1, mi = 0;
  const top = [0, 0, 0], hor = [0, 0, 0]; let nt = 0, nh = 0;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, r = f(data[i]), g = f(data[i + 1]), b = f(data[i + 2]), L = r * .2126 + g * .7152 + b * .0722;
    if (L > mx) { mx = L; mi = y * w + x; } if (y < h * .08) { top[0] += r; top[1] += g; top[2] += b; nt++; } if (y > h * .44) { hor[0] += r; hor[1] += g; hor[2] += b; nh++; } }
  const px = mi % w, py = Math.floor(mi / w), u = (px + .5) / w, vv = 1 - (py + .5) / h, ph = (u - .5) * 2 * Math.PI, th = (vv - .5) * Math.PI;
  const sun = v3(Math.cos(th) * Math.cos(ph), Math.sin(th), Math.cos(th) * Math.sin(ph)).normalize();
  const [ox, oz] = LUZ[k].obj, rot = Math.atan2(ox, oz) - Math.atan2(sun.x, sun.z); const solRot = sun.clone().applyAxisAngle(v3(0, 1, 0), rot);
  CIELOS[k] = {tex: t, env: pmrem.fromEquirectangular(t).texture, rot, sol: solRot, top: top.map(x => x / nt), hor: hor.map(x => x / nh)}; } }

// ---------- agua (piscina y mar) ----------
const U = {time: {value: 0}, sunDir: {value: v3(0, 1, 0)}, sunCol: {value: new THREE.Color(1, .9, .7)}, skyTop: {value: new THREE.Color(.3, .5, .8)}, skyHor: {value: new THREE.Color(.8, .85, .9)}};
function agua(deep, shallow, escala, brillo) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {deep: {value: new THREE.Color(deep)}, shallow: {value: new THREE.Color(shallow)}, esc: {value: escala}, brillo: {value: brillo}}]),
    vertexShader: `varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `uniform float time; uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 skyTop; uniform vec3 skyHor; uniform vec3 deep; uniform vec3 shallow; uniform float esc; uniform float brillo; varying vec3 vW;
      #include <common>
      #include <fog_pars_fragment>
      vec2 ola(vec2 p, vec2 d, float f, float a, float s){ float ph = dot(p,d)*f + time*s; return d * cos(ph) * a * f; }
      void main(){
        float dist = length(cameraPosition.xz - vW.xz); float at = 1.0 / (1.0 + dist * dist * .00004 / max(esc, .05));
        vec2 p = vW.xz * esc; vec2 g = at * (ola(p, normalize(vec2(1.,.3)), 1.0, .08, 1.1) + ola(p, normalize(vec2(-.4,1.)), 1.7, .05, 1.6) + ola(p, normalize(vec2(.7,-.8)), 3.1, .025, 2.3) + ola(p, normalize(vec2(-.9,-.2)), 6.3, .012, 3.4) + ola(p, normalize(vec2(.2,.9)), 11.7, .006, 4.1) * at);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y)); vec3 V = normalize(cameraPosition - vW);
        float fr = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
        vec3 R = reflect(-V, N); vec3 cielo = mix(skyHor, skyTop, clamp(R.y * 1.6, 0., 1.));
        vec3 base = mix(shallow, deep, clamp(.35 + .65 * (1. - V.y), 0., 1.)) * (.25 + .75 * clamp(sunDir.y * 3., .03, 1.));
        vec3 col = mix(base, cielo * .9, fr * .9);
        col += sunCol * pow(max(dot(R, normalize(sunDir)), 0.), 420.) * brillo * step(0., sunDir.y);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`, fog: true});
  for (const k of ['time', 'sunDir', 'sunCol', 'skyTop', 'skyHor']) m.uniforms[k] = U[k]; return m; }
const matPisc = agua(0x0a6a88, 0x4cc1d6, 2.4, 3), matMar = agua(0x1f4352, 0x3e6670, .35, 6);   // mar frío de la corriente de Humboldt: azul acero / gris verdoso
const PT_AGUA = new Map([[matPisc, new THREE.MeshPhysicalMaterial({color: 0x2aa7c4, roughness: .03, metalness: 0, transmission: 0, clearcoat: 1})], [matMar, new THREE.MeshPhysicalMaterial({color: 0x0f4a63, roughness: .08, clearcoat: 1})]]);

// ---------- ayudas de modelado (UV en metros reales) ----------
const raiz = new THREE.Group(); scene.add(raiz);
const WALK = [], MUROS = [], LUCES = [];
function caja(w, h, d, m, x, y, z, padre = raiz, sombra = true) { const g = new THREE.BoxGeometry(w, h, d);
  if (m.map) { const uv = g.attributes.uv, pos = g.attributes.position, nor = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)); const px = pos.getX(i) + x, py = pos.getY(i) + y + h / 2, pz = pos.getZ(i) + z;
      const [u, v] = ny > .5 ? [px, pz] : nx > .5 ? [pz, py] : [px, py]; uv.setXY(i, u / 2.4, v / 2.4); } }
  const o = new THREE.Mesh(g, m); o.position.set(x, y + h / 2, z); o.castShadow = sombra; o.receiveShadow = true; padre.add(o); return o; }
function plano(w, d, m, x, y, z) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + x) / 2.4, -(p.getZ(i) + z) / 2.4);
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.receiveShadow = true; raiz.add(o); return o; }
function cil(rt0, rb, h, m, x, y, z, seg = 24) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt0, rb, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; raiz.add(o); return o; }
function muro(eje, fijo, a0, a1, y0, alto, esp, vanos = [], m = mat.muro) {
  const put = (a, b, y, h) => { if (b - a < .01 || h < .01) return; const c = (a + b) / 2, L = b - a; const o = eje === 'x' ? caja(L, h, esp, m, c, y, fijo) : caja(esp, h, L, m, fijo, y, c); MUROS.push(o); };
  let cur = a0; for (const v of vanos.slice().sort((p, q) => p.a - q.a)) { put(cur, v.a, y0, alto); put(v.a, v.b, y0, v.s); put(v.a, v.b, y0 + v.h, alto - v.h); cur = v.b; if (v.vidrio !== false) ventana(eje, fijo, v.a, v.b, y0 + v.s, v.h - v.s, esp); }
  put(cur, a1, y0, alto); }
function ventana(eje, fijo, a, b, y, h, esp) { const L = b - a, c = (a + b) / 2, f = .05;
  const g = eje === 'x' ? caja(L, h, .02, mat.vidrio, c, y, fijo, raiz, false) : caja(.02, h, L, mat.vidrio, fijo, y, c, raiz, false); g.renderOrder = 2; MUROS.push(g);
  const mk = (w, hh, d, x, yy, z) => caja(w, hh, d, mat.alu, x, yy, z); const n = Math.max(1, Math.round(L / 1.6));
  if (eje === 'x') { mk(L, f, esp * .6, c, y, fijo); mk(L, f, esp * .6, c, y + h - f, fijo); mk(f, h, esp * .6, a + f / 2, y, fijo); mk(f, h, esp * .6, b - f / 2, y, fijo); for (let i = 1; i < n; i++) mk(.04, h, .06, a + L * i / n, y, fijo); }
  else { mk(esp * .6, f, L, fijo, y, c); mk(esp * .6, f, L, fijo, y + h - f, c); mk(esp * .6, h, f, fijo, y, a + f / 2); mk(esp * .6, h, f, fijo, y, b - f / 2); for (let i = 1; i < n; i++) mk(.06, h, .04, fijo, y, a + L * i / n); } }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function palmera(x, z, h = 7, s = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); raiz.add(g); const r = rng(Math.round(x * 13 + z * 7) + 99); let px = 0, pz = 0, py = 0; const lx = (r() - .5) * .5, lz = (r() - .5) * .5;
  for (let i = 0; i < 10; i++) { const sh = h / 10, t = i / 10; const o = new THREE.Mesh(new THREE.CylinderGeometry(.3 - t * .05, .34 - t * .05, sh * 1.02, 14), mat.tronco); o.position.set(px, py + sh / 2, pz); o.castShadow = true; g.add(o); py += sh; px += lx * t * .4; pz += lz * t * .4; }
  const top = v3(px, py, pz); const geo = new THREE.PlaneGeometry(1, 1, 1, 8); geo.translate(0, .5, 0); const p0 = geo.attributes.position; for (let k = 0; k < p0.count; k++) { const yy = p0.getY(k); p0.setZ(k, -yy * yy * .9); } geo.computeVertexNormals();
  for (let i = 0; i < 13; i++) { const L = (2.6 + r() * .9) * s; const f = new THREE.Mesh(geo, mat.hoja); f.scale.set(1.0 * s, L, 1); f.position.copy(top); f.rotation.set(-Math.PI / 2 + .5 + r() * .4, i / 13 * Math.PI * 2 + r() * .3, 0, 'YXZ'); f.castShadow = true; g.add(f); } }
function abanico(x, z, h = 11, s = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); raiz.add(g); const r = rng(Math.round(x * 17 + z * 5) + 7), lean = (r() - .5) * .06;
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.17, .26, h, 14), mat.tronco); tr.position.y = h / 2; tr.rotation.z = lean; tr.castShadow = true; g.add(tr);
  const top = v3(-Math.sin(lean) * h, h, 0); const falda = new THREE.Mesh(new THREE.ConeGeometry(.75 * s, 2.2 * s, 16, 1, true), mat.falda); falda.position.copy(top).add(v3(0, -1.0 * s, 0)); falda.rotation.x = Math.PI; falda.castShadow = true; g.add(falda);
  const geo = new THREE.PlaneGeometry(1.6, 1.6); geo.translate(0, .8, 0);
  for (let i = 0; i < 16; i++) { const f = new THREE.Mesh(geo, mat.abanico); f.scale.setScalar(s * (.85 + r() * .3)); f.position.copy(top); f.rotation.set(-Math.PI / 2 + .35 + r() * .9, i / 16 * Math.PI * 2 + r() * .3, 0, 'YXZ'); f.castShadow = true; g.add(f); } return g; }
function arbusto(x, z, r0 = .6) { if (MUEBLES.shrub_02 && r0 >= .45) { const o = mueble('shrub_02', x, 0, z, (x * 7 + z) % 6.28, (Math.round(x * 3 + z) % 2) ? 'shrub_02_a' : 'shrub_02_b', r0 / .55); return o; }
  const g = new THREE.IcosahedronGeometry(r0, 2); const o = new THREE.Mesh(g, M({color: 0x3c6329, roughness: .95})); o.position.set(x, r0 * .6, z); o.scale.y = .8; o.castShadow = o.receiveShadow = true; raiz.add(o); return o; }
function luz(x, y, z, int = 25, col = 0xffd6a0, dist = 9) { const l = new THREE.PointLight(col, 0, dist, 2); l.position.set(x, y, z); l.userData.int = int; raiz.add(l); LUCES.push(l);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), mat.foco); b.position.set(x, y, z); raiz.add(b); return l; }

// ---------- sol, entorno y mar ----------
const sol = new THREE.DirectionalLight(0xfff1dc, 3); sol.castShadow = true; const SM = ALTA ? 4096 : 2048; sol.shadow.mapSize.set(SM, SM); sol.shadow.bias = -.0002; sol.shadow.normalBias = .025; sol.shadow.radius = 3;
scene.add(sol, sol.target);
scene.fog = new THREE.Fog(0xcfd9df, 900, 5200);
{ const mar = new THREE.Mesh(new THREE.PlaneGeometry(9000, 4400), matMar); mar.rotation.x = -Math.PI / 2; mar.position.set(0, -.6, -2350); scene.add(mar);
  const dg = new THREE.PlaneGeometry(1600, 900, 160, 80); dg.rotateX(-Math.PI / 2); const p = dg.attributes.position, uv = dg.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const lj = Math.min(1, Math.max(0, (z + 170) / 380)); const cresta = Math.max(0, Math.sin(x * .006 + 1.3) * .5 + .5); p.setY(i, Math.pow(lj, 1.6) * (cresta * 70 + Math.sin(x * .021 + z * .017) * 9 + Math.cos(z * .03 + x * .004) * 7 + 12) + lj * (Math.sin(x * .09) * Math.cos(z * .07)) * 1.5); uv.setXY(i, x / 6, z / 6); }
  dg.computeVertexNormals(); const dunas = new THREE.Mesh(dg, pbr('arena', {color: 0xb39c80}));   // lomas pardas de Asia dunas.position.set(0, -.08, 380); dunas.receiveShadow = true; scene.add(dunas); }

let luzActual = Q.get('luz') && LUZ[Q.get('luz')] ? Q.get('luz') : 'tarde';
function aplicarLuz(k) { luzActual = k; const c = CIELOS[k], L = LUZ[k]; if (!c) return;
  scene.background = c.tex; scene.environment = c.env; scene.backgroundRotation.set(0, c.rot, 0); scene.environmentRotation.set(0, c.rot, 0); scene.backgroundIntensity = 1; scene.environmentIntensity = k === 'noche' ? 1.4 : 1.25;
  const sd = c.sol.clone(); if (sd.y < .06) sd.y = .06; sd.normalize(); sol.position.copy(sd).multiplyScalar(140); sol.intensity = L.sol;
  sol.color.setRGB(1, k === 'atardecer' ? .78 : .95, k === 'atardecer' ? .55 : .88); if (k === 'noche') sol.color.setRGB(.6, .7, 1);
  renderer.toneMappingExposure = L.exp;
  const hz = new THREE.Color().fromArray(c.hor), tp = new THREE.Color().fromArray(c.top); U.skyHor.value.copy(hz).multiplyScalar(Math.min(1, 1.2 / Math.max(hz.r, hz.g, hz.b))); U.skyTop.value.copy(tp); U.sunDir.value.copy(c.sol); U.sunCol.value.copy(sol.color).multiplyScalar(k === 'noche' ? .2 : 2.5);
  scene.fog.color.copy(hz).multiplyScalar(1 / Math.max(.001, Math.max(hz.r, hz.g, hz.b))).multiplyScalar(k === 'noche' ? .08 : .85);
  LUCES.forEach(l => l.intensity = l.userData.int * L.noche); mat.foco.emissiveIntensity = 4 * L.noche;
  document.querySelectorAll('#luz button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === k)); if (PT && ptOn) PT.updateEnvironment(); }

// ---------- el lote y la casa ----------
let G = {};
function construir() {
  raiz.clear(); WALK.length = MUROS.length = LUCES.length = 0;
  const [W, D] = LOTE[P.m2] || [Math.sqrt(P.m2 / 2), Math.sqrt(P.m2 * 2)], angosto = W < 8;
  const zf = D / 2, zb = -D / 2, calleZ = zf + 1.8 + 4;
  const zA = calleZ + 14, zB = zb - 26;
  // entorno real de Asia y Cerro Azul: lotes sobre arena compactada, calles afirmadas en preventa, cerco de paneles de concreto, playa y mar
  const preventa = /preventa|construcci/i.test(P.estado || ''), parque = (P.beneficios || []).some(x => /parque/i.test(x));
  WALK.push(plano(240, zA - zB + 40, mat.terreno, 0, -.03, (zA + zB) / 2 + 20));
  WALK.push(plano(W - .2, D - .2, mat.pasto, 0, -.012, 0));   // jardín del lote (lo construye el propietario)
  WALK.push(plano(240, 8, preventa ? mat.afirmado : mat.adoquin, 0, .005, calleZ));   // en preventa: calle afirmada; entregados: adoquín, como en los condominios de Asia
  for (const zz of [zf + .9, calleZ + 4.9]) { WALK.push(plano(240, 1.8, mat.vereda, 0, .02, zz)); caja(240, .15, .15, mat.piedra, 0, 0, zz + (zz > calleZ ? -.95 : .95), raiz, false); }
  if (parque) { WALK.push(plano(120, 22, mat.pasto, 0, -.012, calleZ + 17)); for (let i = -5; i <= 5; i++) abanico(i * 9 + 2, calleZ + 9 + (i % 2) * 6, 10 + (i % 3) * 1.4, 1);
    plano(3, 22, mat.vereda, 8, -.005, calleZ + 17); for (let i = -6; i <= 6; i++) arbusto(i * 8 - 3, calleZ + 7.2, .45); }
  // cerco perimétrico de paneles prefabricados, como en obra
  for (let x = -110; x < 110; x += 2.5) { caja(2.4, 2.4, .1, mat.concreto, x + 1.25, 0, zB); caja(.22, 2.6, .22, mat.concreto, x, 0, zB); }
  WALK.push(plano(320, 160, mat.arena, 0, -.04, zB - 82));
  for (let i = -4; i <= 4; i++) { const sx = i * 16 + 3, sz = zB - 120 - (i % 2) * 6; cil(.03, .03, 2.2, mat.alu, sx, 0, sz, 8); const so = new THREE.Mesh(new THREE.ConeGeometry(1.5, .5, 24, 1, true), i % 3 ? mat.tela : M({color: 0xb5653f, roughness: 1})); so.position.set(sx, 2.35, sz); so.castShadow = true; raiz.add(so); }
  // borde del lote, estacas y medidas
  const borde = new THREE.BufferGeometry().setFromPoints([v3(-W / 2, .05, zf), v3(W / 2, .05, zf), v3(W / 2, .05, zb), v3(-W / 2, .05, zb), v3(-W / 2, .05, zf)]);
  const lb = new THREE.Line(borde, mat.linea); lb.computeLineDistances(); raiz.add(lb);
  for (const [x, z] of [[-W / 2, zf], [W / 2, zf], [W / 2, zb], [-W / 2, zb]]) caja(.08, .5, .08, mat.estaca, x, 0, z);
  const rotulo = (t, x, z, rot) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(11,34,54,.82)'; g.beginPath(); g.roundRect(28, 88, 200, 80, 40); g.fill();
    g.fillStyle = '#fff'; g.font = '700 46px Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, 130); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({map: tx, transparent: true, depthWrite: false})); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .08, z); m.renderOrder = 3; m.userData.rotulo = true; raiz.add(m); };
  rotulo(`${W} m`, 0, zf + .9, 0); rotulo(`${D} m`, W / 2 + .9, 0, Math.PI / 2);
  // vecinos
  for (const k of [-3, -2, -1, 1, 2, 3]) { const cx = k * W; if (Math.abs(k) === 1) { for (const [x, z] of [[cx - W / 2 + .1, zf], [cx + W / 2 - .1, zf], [cx - W / 2 + .1, zb], [cx + W / 2 - .1, zb]]) caja(.06, .4, .06, mat.estaca, x, 0, z); continue; }
    const vw = W - 1.6, vd = Math.min(12, D - 9), alt = Math.abs(k) % 2, ox = vw * .09 * (alt ? -1 : 1);
    caja(vw, 3.2, vd, mat.vecino, cx, 0, zf - 3 - vd / 2); caja(vw * .82, 2.9, vd * .72, alt ? mat.revest : mat.vecino, cx - ox, 3.2, zf - 3.6 - vd * .36);
    caja(vw + .3, .25, vd + .3, mat.vecino, cx, 3.05, zf - 3 - vd / 2); caja(vw * .82 + .3, .22, vd * .72 + .3, mat.techo, cx - ox, 6.1, zf - 3.6 - vd * .36);
    caja(vw * .55, 2.1, .05, mat.vecinoV, cx + vw * .15, .35, zf - 2.98); caja(.9, 2.2, .06, mat.revest, cx - vw * .3, .3, zf - 2.97); caja(vw * .5, 1.3, .05, mat.vecinoV, cx - ox, 4.1, zf - 3.58);
    arbusto(cx + vw / 2 - .4, zf - 1, .6); arbusto(cx - vw / 2 + .6, zf - .9, .5); }
  // casa
  const HW = angosto ? W - .4 : W - 2.2, x0 = -HW / 2, x1 = HW / 2, z1 = zf - (angosto ? 2.5 : 3.5), HD = Math.min(12, Math.max(8, D - (angosto ? 7 : 9.5))), z2 = z1 - HD;
  const e = .2, h1 = 3.1, base = .3, y1 = base + h1 + .3;
  caja(HW + .3, base, HD + .3, mat.piedra, 0, 0, (z1 + z2) / 2);
  WALK.push(caja(HW - 2 * e, .02, HD - 2 * e, mat.piso, 0, base, (z1 + z2) / 2, raiz, false));
  const puertaX = angosto ? x0 + .6 : x0 + 1.0;
  muro('x', z1, x0, x1, base, h1, e, [{a: puertaX, b: puertaX + 1.1, s: 0, h: 2.45, vidrio: false}, {a: puertaX + 1.6, b: x1 - .6, s: .5, h: 2.5}]);
  MUROS.push(caja(1.06, 2.42, .06, mat.revest, puertaX + .55, base, z1 + .06)); caja(.04, .5, .04, mat.alu, puertaX + .95, base + 1.05, z1 + .12);
  muro('x', z2, x0, x1, base, h1, e, [{a: x0 + .5, b: x1 - .5, s: 0, h: 2.75}]);
  muro('z', x0, z2, z1, base, h1, e, angosto ? [] : [{a: z2 + 2, b: z2 + 4.5, s: 1.9, h: 2.6}]);
  muro('z', x1, z2, z1, base, h1, e, angosto ? [] : [{a: z1 - 4.8, b: z1 - 2.6, s: 1.1, h: 2.4}]);
  const za = z1 - 1.2, zc = z2 - (angosto ? 1.2 : 2.0), H2 = 2.9;
  const esc = {x: x0 + e + .5, z0: z1 - 1.2, z1: z1 - 1.2 - 4.6};
  const losa = (xa, xb, q1, q2) => caja(xb - xa, .3, q1 - q2, mat.muro, (xa + xb) / 2, y1 - .3, (q1 + q2) / 2);
  losa(x0 + e + 1.0, x1, za, zc); losa(x0, x0 + e + 1.0, za, esc.z0); losa(x0, x0 + e + 1.0, esc.z1, zc); caja(HW, .3, z1 - za, mat.muro, 0, y1 - .3, (z1 + za) / 2);
  WALK.push(caja(HW - 2 * e, .02, za - zc - 2 * e, mat.piso, 0, y1, (za + zc) / 2, raiz, false));
  muro('x', za, x0, x1, y1, H2, e, [{a: x0 + 1.4, b: x1 - 1.0, s: 1.0, h: 2.3}], mat.revest);
  muro('x', zc, x0, x1, y1, H2, e, [{a: x0 + .4, b: x1 - .4, s: 0, h: 2.6}], mat.muro);
  muro('z', x0, zc, za, y1, H2, e, [], mat.revest); muro('z', x1, zc, za, y1, H2, e, angosto ? [] : [{a: zc + 1.4, b: zc + 3.4, s: .9, h: 2.4}], mat.revest);
  caja(HW + .5, .35, za - zc + .5, mat.muro, 0, y1 + H2, (za + zc) / 2); caja(HW + .2, .02, za - zc + .2, mat.techo, 0, y1 + H2 + .35, (za + zc) / 2, raiz, false);
  const npx = Math.max(1, Math.floor((HW - 1.2) / 1.1)); for (let i = 0; i < npx; i++) for (let j = 0; j < 2; j++) { const sp = caja(1.0, .05, 1.7, mat.solar, x0 + 1.3 + i * 1.1, y1 + H2 + .55, za - 1.6 - j * 1.85); sp.rotation.x = -.18; caja(.04, .2, .04, mat.alu, x0 + 1.3 + i * 1.1, y1 + H2 + .35, za - 1.6 - j * 1.85); }
  caja(HW - .4, .06, za - zc - .4, mat.cielo, 0, y1 + H2 - .06, (za + zc) / 2, raiz, false);
  const balz = zc - 1.4; WALK.push(caja(HW, .25, 1.4, mat.muro, 0, y1 - .25, zc - .7)); caja(HW - .1, .02, 1.3, mat.deck, 0, y1, zc - .7, raiz, false);
  caja(HW, 1.05, .03, mat.barandaV, 0, y1, balz + .05, raiz, false); caja(HW, .04, .06, mat.alu, 0, y1 + 1.05, balz + .05);
  caja(HW - 2 * e, .04, HD - 2 * e, mat.cielo, 0, y1 - .34, (z1 + z2) / 2, raiz, false);
  muro('x', (za + zc) / 2, x0 + e, x1 - e, y1, H2, .12, [{a: x0 + 1.4, b: x0 + 2.3, s: 0, h: 2.2, vidrio: false}], mat.muroInt);
  for (let i = 0; i < 16; i++) WALK.push(caja(1.0, .04, .29, mat.roble, esc.x, base + (i + 1) * (y1 - base) / 16 - .04, esc.z0 - .29 * i - .15));
  caja(.02, 1.0, 4.6, mat.barandaV, esc.x + .52, y1, (esc.z0 + esc.z1) / 2, raiz, false);
  // sala: muebles reales
  const sz = z2 + 3.0, cx = angosto ? .6 : .9, dz = (z1 + z2) / 2 + (angosto ? 0 : .3), kz = z1 - 1.5, bz = zc + 2.3;
  caja(3.2, .012, 2.3, pbr('tela', {color: 0xcbbca6}), cx, base + .01, sz - .5, raiz, false);
  if (!mueble('sofa_03', cx, base, sz + .5, Math.PI)) caja(2.4, .8, .9, mat.tela, cx, base, sz + .5);
  mueble('throw_pillows_01', cx - .55, base + .45, sz + .55, Math.PI, 'throw_pillows_01_pillow01'); mueble('throw_pillows_01', cx + .55, base + .45, sz + .55, Math.PI + .2, 'throw_pillows_01_pillow02');
  mueble('modern_coffee_table_01', cx, base, sz - .55, 0);
  if (!angosto) { mueble('mid_century_lounge_chair', cx - 1.9, base, sz - .8, Math.PI * .7); mueble('side_table_01', cx + 1.7, base, sz + .45, 0); }
  mueble('potted_plant_02', x1 - .6, base, z2 + .6, 0); mueble('potted_plant_02', x0 + .6, base, z1 - 3.2, 1.2);
  caja(1.6, .9, .04, mat.tv, x0 + e + .03, base + 1.0, sz - .4).rotation.y = Math.PI / 2; caja(.45, .42, 2.2, mat.roble, x0 + e + .25, base, sz - .4);
  // comedor
  if (!mueble('round_wooden_table_01', cx, base, dz, 0)) caja(1.9, .75, .95, mat.roble, cx, base, dz);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; mueble('dining_chair_02', cx + Math.sin(a) * .85, base, dz + Math.cos(a) * .85, a + Math.PI); }
  for (let i = 0; i < 2; i++) { const lx = cx - .35 + i * .7; cil(.004, .004, .8, mat.negro, lx, y1 - 1.14, dz); mueble('modern_ceiling_lamp_01', lx, y1 - 1.6, dz, 0) || cil(.14, .2, .2, mat.negro, lx, y1 - 1.45, dz); }
  // cocina
  if (!angosto) { caja(2.4, .9, .9, mat.blanco, x1 - 1.8, base, kz - 1.2); caja(2.5, .05, 1.0, mat.marmol, x1 - 1.8, base + .9, kz - 1.2); }
  const kl = angosto ? 3 : 4, kc = kz - (angosto ? 1 : 1.6);
  caja(.62, .9, kl, mat.blanco, x1 - e - .31, base, kc); caja(.65, .04, kl, mat.marmol, x1 - e - .33, base + .9, kc); caja(.36, .7, kl, mat.roble, x1 - e - .18, base + 1.55, kc);
  // dormitorio
  caja(1.9, .32, 2.1, mat.roble, cx, y1, bz); caja(1.8, .24, 2.0, mat.blanco, cx, y1 + .32, bz); caja(1.84, .05, 1.3, mat.tela, cx, y1 + .56, bz - .3); caja(2.1, 1.0, .1, mat.roble, cx, y1 + .3, bz + 1.1);
  mueble('throw_pillows_01', cx - .45, y1 + .56, bz + .75, Math.PI, 'throw_pillows_01_pillow01'); mueble('throw_pillows_01', cx + .45, y1 + .56, bz + .75, Math.PI, 'throw_pillows_01_pillow01');
  for (const s of [-1, 1]) mueble('side_table_01', cx + s * 1.3, y1, bz + .85, 0) || caja(.45, .5, .4, mat.roble, cx + s * 1.3, y1, bz + .85);
  mueble('mid_century_lounge_chair', x1 - .9, y1, zc + 1.0, -Math.PI * .8);
  // terraza, deck y piscina
  const tz0 = z2 - .15, fondo = zb + .3, largo = tz0 - fondo;
  const pw = angosto ? Math.min(2.6, W - 1.6) : Math.min(4, W - 4), pl = Math.min(angosto ? 4.5 : 7, largo - 2.6), pz = fondo + .8 + pl / 2, px = angosto ? 0 : x1 - pw / 2 - .3;
  const anillo = (rx0, rx1, rz0, rz1, hx0, hx1, hz0, hz1, h, m) => { const o = [];
    if (rz1 - hz1 > .01) o.push(caja(rx1 - rx0, h, rz1 - hz1, m, (rx0 + rx1) / 2, 0, (hz1 + rz1) / 2)); if (hz0 - rz0 > .01) o.push(caja(rx1 - rx0, h, hz0 - rz0, m, (rx0 + rx1) / 2, 0, (rz0 + hz0) / 2));
    if (hx0 - rx0 > .01) o.push(caja(hx0 - rx0, h, hz1 - hz0, m, (rx0 + hx0) / 2, 0, (hz0 + hz1) / 2)); if (rx1 - hx1 > .01) o.push(caja(rx1 - hx1, h, hz1 - hz0, m, (hx1 + rx1) / 2, 0, (hz0 + hz1) / 2)); return o; };
  const dW = HW + (angosto ? 0 : 1.2), cb = .3;
  WALK.push(...anillo(-dW / 2, dW / 2, fondo, tz0, px - pw / 2 - cb, px + pw / 2 + cb, pz - pl / 2 - cb, pz + pl / 2 + cb, .12, mat.deck));
  WALK.push(...anillo(px - pw / 2 - cb, px + pw / 2 + cb, pz - pl / 2 - cb, pz + pl / 2 + cb, px - pw / 2, px + pw / 2, pz - pl / 2, pz + pl / 2, .15, mat.piedra));
  const agP = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), matPisc); agP.rotation.x = -Math.PI / 2; agP.position.set(px, .06, pz); agP.receiveShadow = true; raiz.add(agP);
  luz(px, -.2, pz, 8, 0x8fe3ff, 6);
  if (!angosto) { for (let i = 0; i < 2; i++) mueble('mid_century_lounge_chair', x0 + 1.0 + i * 1.1, .12, tz0 - 2.6, Math.PI + .3 * (i ? -1 : 1));
    mueble('outdoor_table_chair_set_01', x0 + 1.6, .12, fondo + 2.0, .4, 'outdoor_table_chair_set_01_table'); mueble('outdoor_table_chair_set_01', x0 + 1.0, .12, fondo + 1.4, 1.2, 'outdoor_table_chair_set_01_chair_01'); }
  // jardín y muro bajo
  caja(W, .9, .2, mat.muro, 0, 0, zb - .1); for (const s of [-1, 1]) caja(.15, 1.6, D - (zf - z1) - .2, mat.muro, s * (W / 2 - .07), 0, (z1 + zb) / 2 - .1);
  for (let i = 0; i < Math.floor(W / 1.6); i++) arbusto(-W / 2 + .8 + i * 1.6, zb + .5, .5);
  arbusto(x1 - .5, zf - .8, .6); arbusto(x1 - 1.6, zf - .7, .5); if (!angosto) { palmera(x0 - .3, zb + 1.0, 7.5); palmera(x1 + .2, zf - 1.0, 6.2, .9); } else palmera(x1 - .5, zb + 1.2, 6.5, .85);
  for (let i = -3; i <= 3; i++) if (i) abanico(i * W * 1.5 + 2, calleZ + 6.3, 10.5 + (i % 2) * 1.5, 1);
  // luces
  luz(cx, y1 - .45, sz - .3, 45); luz(cx, y1 - .45, dz, 35); luz(x1 - 1.6, y1 - .45, kz - 1.2, 35); luz(cx, y1 + H2 - .2, bz, 30); luz(cx, y1 + H2 - .2, (za + zc) / 2 + 2, 20);
  luz(0, 2.6, z1 + .5, 14); luz(0, .25, zb + .8, 6, 0xffc98a, 5);
  for (const k of [-1, 1]) { const lx = k * W * 1.2; cil(.1, .16, 8, mat.concreto, lx, 0, zf + 1.6); caja(1.4, .1, .22, mat.alu, lx - .6 * k, 7.6, zf + 1.6); luz(lx - 1.2 * k, 7.5, zf + 1.6, 90, 0xffcf96, 26); }
  G = {W, D, zf, zb, x0, x1, z1, z2, za, zc, y1, base, sz, dz, kz, bz, pz, px, cx, calleZ, fondo, tz0, angosto, HW};
  const r = Math.max(W, D) / 2 + 14; Object.assign(sol.shadow.camera, {left: -r, right: r, top: r, bottom: -r, near: 1, far: 320}); sol.shadow.camera.updateProjectionMatrix();
  hotspots(); paradas(); aplicarLuz(luzActual);
}

// ---------- cámara: explorar, recorrido, caminar, lote ----------
const ctl = new OrbitControls(camera, canvas); ctl.enableDamping = true; ctl.dampingFactor = .07; ctl.maxPolarAngle = Math.PI * .495; ctl.minDistance = 2; ctl.maxDistance = 140; ctl.screenSpacePanning = true;
let modo = 'orbit', vuelo = null;
function volar(pos, tgt, dur = 2.4, fin) { if (reduce || CAPTURA) dur = 0; vuelo = {p0: camera.position.clone(), t0: ctl.target.clone(), p1: pos, t1: tgt, s: performance.now(), d: dur * 1000, fin}; if (!dur) paso(performance.now() + 1); }
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function paso(now) { if (!vuelo) return; const k = vuelo.d ? Math.min(1, (now - vuelo.s) / vuelo.d) : 1, e = ease(k);
  camera.position.lerpVectors(vuelo.p0, vuelo.p1, e); ctl.target.lerpVectors(vuelo.t0, vuelo.t1, e);
  if (vuelo.d) camera.position.y += Math.sin(e * Math.PI) * Math.min(6, vuelo.p0.distanceTo(vuelo.p1) * .12);
  camera.lookAt(ctl.target); if (k >= 1) { const f = vuelo.fin; vuelo = null; if (f) f(); } }
let PARADAS = [];
function paradas() { const g = G, y = g.base + 1.62, y2 = g.y1 + 1.62;
  PARADAS = [
    {t: 'Llegada', p: `${P.nombre}: así podría verse tu casa en un lote de ${P.m2} m² (${g.W} × ${g.D} m), frente a una calle del condominio.`, pos: v3(g.W * 1.3 + 6, 7.5, g.calleZ + 13), tg: v3(0, 3, (g.z1 + g.z2) / 2)},
    {t: 'Fachada', p: 'Volúmenes limpios, madera y vidrio. El segundo piso vuela sobre la terraza para dar sombra en la tarde.', pos: v3(-g.W * .55, 1.7, g.zf + 6.5), tg: v3(.5, 3.2, g.z1)},
    {t: 'Sala con vista al mar', p: 'Un ventanal de piso a techo abre la sala a la terraza, la piscina y el mar.', pos: v3(g.x1 - (g.angosto ? .7 : 1.4), y, g.dz + .6), tg: v3(g.cx - .6, y - .35, g.z2 - 6)},
    {t: 'Cocina y comedor', p: 'Cocina abierta con isla de piedra; el comedor queda entre la cocina y la terraza.', pos: v3(g.cx - 1.2, y + .1, g.z2 + 1.4), tg: v3(g.x1 - 1.5, y - .6, g.kz - 1.2)},
    {t: 'Terraza y piscina', p: `Deck de madera, piscina de ${g.angosto ? '2.6' : '4'} m y jardín. Prueba la luz del atardecer y de la noche.`, pos: v3(g.x1 - .3, 2.9, g.fondo + .2), tg: v3(g.x0 + 1.4, .9, g.z2 + .6)},
    {t: 'Dormitorio principal', p: 'Despierta frente al mar: el dormitorio tiene ventanal y balcón con baranda de vidrio.', pos: v3(g.x1 - (g.angosto ? .5 : .8), y2, (g.za + g.zc) / 2 - .5), tg: v3(g.cx - 1, y2 - .55, g.zc - 7)},
    {t: 'Vista desde el balcón', p: 'El balcón mira hacia el mar y la puesta de sol, sobre los jardines del condominio.', pos: v3(g.cx + 1.6, y2, g.zc - .5), tg: v3(-2, y2 - 7.5, g.zb - 26)},
    {t: 'Tu lote, en planta', p: `Lote de ${g.W} × ${g.D} m (${P.m2} m²) con título independizado. Las estacas marcan sus vértices; los lotes vecinos se ven a los lados.`, pos: v3(.01, Math.max(g.W, g.D) * 2.1 + 10, 4), tg: v3(0, 0, 0)}];
  $('cDots').innerHTML = PARADAS.map(() => '<i></i>').join(''); }
let ip = -1, tourT = null, tourOn = false;
function parada(i, auto = true) { ip = (i + PARADAS.length) % PARADAS.length; const s = PARADAS[ip]; $('capN').textContent = `Parada ${ip + 1} de ${PARADAS.length}`; $('capT').textContent = s.t; $('capP').textContent = s.p;
  [...$('cDots').children].forEach((d, k) => d.classList.toggle('on', k === ip)); $('cap').classList.add('on');
  volar(s.pos.clone(), s.tg.clone(), 2.6, () => { clearTimeout(tourT); if (tourOn && auto) tourT = setTimeout(() => parada(ip + 1), 6500); }); }
function tourPlay(on) { tourOn = on; $('cPlay').setAttribute('aria-label', on ? 'Pausar el recorrido' : 'Seguir el recorrido'); $('cPlayI').innerHTML = on ? '<path d="M8 5v14M16 5v14"/>' : '<path d="M7 5l12 7-12 7z"/>'; clearTimeout(tourT); if (on) tourT = setTimeout(() => parada(ip + 1), 6500); }

// caminar
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let yaw = 0, pitch = 0, teclas = {}, objetivo = null;
function aplicarMirada() { camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
function pisoBajo(x, y, z) { ray.set(v3(x, y + .3, z), v3(0, -1, 0)); ray.far = 3.2; const h = ray.intersectObjects(WALK, false)[0]; return h ? h.point.y : null; }
function entrarCaminar() { const g = G, x = g.cx - 1.5, z = g.zf + 4; const y = pisoBajo(x, 1.5, z); camera.position.set(x, (y === null ? 0 : y) + 1.62, z); yaw = 0; pitch = -.03; objetivo = null; aplicarMirada(); }
function chocar(desde, dir, dist) { ray.set(v3(desde.x, desde.y - .7, desde.z), dir); ray.far = dist + .3; return ray.intersectObjects(MUROS, false).length > 0; }
function moverA(dx, dz) { const d = v3(dx, 0, dz); const L = d.length(); if (!L) return; d.normalize(); if (chocar(camera.position, d, L)) return;
  const nx = camera.position.x + d.x * L, nz = camera.position.z + d.z * L; const y = pisoBajo(nx, camera.position.y - 1.62 + .45, nz); if (y === null) return;
  camera.position.set(Math.max(-60, Math.min(60, nx)), y + 1.62, Math.max(G.zb - 30, Math.min(G.calleZ + 8, nz))); }

// puntos de interés
let HS = [];
function hotspots() { document.querySelectorAll('.hs').forEach(e => e.remove()); const g = G;
  HS = [['Piscina', v3(g.px, 1.1, g.pz), 4], ['Sala', v3(g.cx, g.base + 2.2, g.sz), 2], ['Cocina', v3(g.x1 - 1.4, g.base + 2.2, g.kz - 1.2), 3], ['Dormitorio', v3(g.cx, g.y1 + 2.2, g.bz), 5], ['Balcón', v3(g.cx, g.y1 + 1.6, g.zc - .8), 6], [`Lote ${g.W} × ${g.D} m`, v3(g.W / 2, .8, g.zf), 7]]
    .map(([t, p, i], k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hs'; b.innerHTML = `<i>${k + 1}</i>${t}`; b.setAttribute('aria-label', 'Ir a: ' + t); b.addEventListener('click', () => { setModo('tour'); tourPlay(false); parada(i); }); document.body.appendChild(b); return {b, p}; }); }
const pv = new THREE.Vector3();
function moverHotspots() { const ver = modo === 'orbit' && !vuelo && !renderer.xr.isPresenting && !ptOn, fuera = camera.position.distanceTo(ctl.target) > 9;
  for (const h of HS) { if (!ver || !fuera) { h.b.classList.remove('on'); continue; } pv.copy(h.p).project(camera); const on = pv.z < 1 && Math.abs(pv.x) < .95 && Math.abs(pv.y) < .9;
    h.b.classList.toggle('on', on); if (on) h.b.style.transform = `translate(${(pv.x * .5 + .5) * innerWidth}px,${(-pv.y * .5 + .5) * innerHeight}px) translate(-50%,-50%)`; } }

// modos
function setModo(m) { if (renderer.xr.isPresenting) return; if (ptOn) salirFoto(); modo = m; document.querySelectorAll('.dock [data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); document.body.classList.toggle('touring', m === 'tour');
  ctl.enabled = m === 'orbit' || m === 'aerial'; $('mira').classList.toggle('on', m === 'walk'); clearTimeout(tourT); if (m !== 'tour') { $('cap').classList.remove('on'); tourOn = false; }
  $('hint').classList.remove('on');
  if (m === 'tour') { tourPlay(true); parada(ip < 0 ? 0 : ip); }
  if (m === 'orbit') volar(v3(G.W * 1.3 + 8, 9, G.calleZ + 12), v3(0, 2.5, (G.z1 + G.z2) / 2), 1.8);
  if (m === 'aerial') volar(PARADAS[7].pos.clone(), PARADAS[7].tg.clone(), 2.2);
  if (m === 'walk') { vuelo = null; entrarCaminar(); aviso(coarse ? 'Arrastra para mirar. Toca el piso para caminar hasta ahí.' : 'Arrastra para mirar. Haz clic en el piso o usa W A S D / flechas para caminar.'); } }
function aviso(t) { const h = $('hint'); h.textContent = t; h.classList.add('on'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('on'), 4200); }
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2600); }
document.querySelectorAll('.dock [data-m]').forEach(b => b.addEventListener('click', () => setModo(b.dataset.m)));
$('cPrev').addEventListener('click', () => { tourPlay(false); parada(ip - 1); }); $('cNext').addEventListener('click', () => { tourPlay(false); parada(ip + 1); }); $('cPlay').addEventListener('click', () => tourPlay(!tourOn));
let drag = null;
canvas.addEventListener('pointerdown', e => { if (ptOn) return; if (modo === 'tour' && !vuelo) tourPlay(false); if (modo !== 'walk') return; drag = {x: e.clientX, y: e.clientY, yaw, pitch, mov: 0}; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.mov = Math.max(drag.mov, Math.abs(dx) + Math.abs(dy));
  yaw = drag.yaw + dx * .0042; pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + dy * .0042)); aplicarMirada(); });
canvas.addEventListener('pointerup', e => { if (!drag) return; const d = drag; drag = null; if (d.mov > 6) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ptr, camera); ray.far = 60; const h = ray.intersectObjects([...WALK, ...MUROS], false)[0];
  if (h && WALK.includes(h.object) && h.face && h.face.normal.y > .5) objetivo = v3(h.point.x, h.point.y + 1.62, h.point.z); });
addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,select,textarea')) return; teclas[e.key.toLowerCase()] = true;
  if (modo === 'tour' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { tourPlay(false); parada(ip + (e.key === 'ArrowRight' ? 1 : -1)); }
  if (/^[1-8]$/.test(e.key) && modo !== 'walk') { setModo('tour'); tourPlay(false); parada(+e.key - 1); }
  if (e.key === 'Escape' && ptOn) salirFoto(); });
addEventListener('keyup', e => { teclas[e.key.toLowerCase()] = false; }); addEventListener('blur', () => { teclas = {}; });
function caminar(dt) { if (modo !== 'walk') return; const v = 2.4 * dt * (teclas.shift ? 2 : 1); const f = (teclas.w || teclas.arrowup ? 1 : 0) - (teclas.s || teclas.arrowdown ? 1 : 0), l = (teclas.d || teclas.arrowright ? 1 : 0) - (teclas.a || teclas.arrowleft ? 1 : 0);
  if (f || l) { objetivo = null; const fx = -Math.sin(yaw), fz = -Math.cos(yaw); moverA((fx * f + Math.cos(yaw) * l) * v, (fz * f - Math.sin(yaw) * l) * v); }
  if (objetivo) { const d = v3(objetivo.x - camera.position.x, 0, objetivo.z - camera.position.z), L = d.length(); if (L < .08) objetivo = null; else { const pL = Math.min(L, 2.6 * dt); const y0 = camera.position.y, x0 = camera.position.x; moverA(d.x / L * pL, d.z / L * pL);
    if (camera.position.x === x0 && camera.position.y === y0) { if (Math.abs(objetivo.y - y0) > 1) camera.position.copy(objetivo); objetivo = null; } } } }

// ---------- realidad virtual (WebXR) ----------
const ctrls = [], marca = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 40), new THREE.MeshBasicMaterial({color: 0xe8b04b, transparent: true, opacity: .9})); marca.rotation.x = -Math.PI / 2; marca.visible = false; scene.add(marca);
for (let i = 0; i < 2; i++) { const c = renderer.xr.getController(i); const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), v3(0, 0, -1)]), new THREE.LineBasicMaterial({color: 0xe8b04b})); linea.scale.z = 8; c.add(linea); dolly.add(c); ctrls.push(c);
  c.addEventListener('selectstart', () => { c.userData.apunta = true; }); c.addEventListener('selectend', () => { c.userData.apunta = false; if (marca.visible) teleport(marca.position); marca.visible = false; });
  c.addEventListener('squeezeend', () => vrParada(vrI + 1)); }
const mt = new THREE.Matrix4();
function apuntar() { marca.visible = false; for (const c of ctrls) { if (!c.userData.apunta) continue; mt.identity().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(mt); ray.far = 30;
    const h = ray.intersectObjects([...WALK, ...MUROS], false)[0]; if (h && WALK.includes(h.object) && h.face && h.face.normal.y > .5) { marca.position.copy(h.point).add(v3(0, .02, 0)); marca.visible = true; } } }
function teleport(p) { const xc = renderer.xr.getCamera(); const off = v3().setFromMatrixPosition(xc.matrixWorld).sub(dolly.position); dolly.position.set(p.x - off.x, p.y, p.z - off.z); }
let vrI = 0, giro = 0;
const VRP = () => [[G.cx, G.base, G.zf + 4, 0], [G.cx - .8, G.base, G.z1 - 2, 0], [G.cx + .5, G.base, G.fondo + 1.4, Math.PI * .9], [G.cx, G.y1, G.za - 1.2, 0], [G.cx + .8, G.y1, G.zc - .6, 0]];
function vrParada(i) { const L = VRP(); vrI = (i + L.length) % L.length; const [x, y, z, r] = L[vrI]; dolly.rotation.y = r; dolly.position.set(x, y, z); }
function snap() { const s = renderer.xr.getSession(); if (!s) return; for (const src of s.inputSources) { const gp = src.gamepad; if (!gp || gp.axes.length < 4) continue; const ax = gp.axes[2];
    if (Math.abs(ax) > .7 && !giro) { giro = 1; dolly.rotation.y -= Math.sign(ax) * Math.PI / 6; } else if (Math.abs(ax) < .3) giro = 0; } }
renderer.xr.addEventListener('sessionstart', () => { if (ptOn) salirFoto(); document.body.classList.add('xr'); camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); ctl.enabled = false; vrParada(1); });
renderer.xr.addEventListener('sessionend', () => { document.body.classList.remove('xr'); dolly.position.set(0, 0, 0); dolly.rotation.set(0, 0, 0); setModo('orbit'); });
let vrOk = false;
if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(ok => { vrOk = ok; }).catch(() => {});
$('bVR').addEventListener('click', async () => {
  if (!vrOk) { $('dVR').showModal(); return; }
  try { const s = await navigator.xr.requestSession('immersive-vr', {optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']}); await renderer.xr.setSession(s); }
  catch (e) { $('dVRp').textContent = 'No se pudo abrir la realidad virtual en este dispositivo. Para entrar con un visor:'; $('dVR').showModal(); } });

// ---------- foto realista: trazado de rayos con luz física ----------
let PT = null, ptOn = false, ptMeta = 0, ptGuardar = false; const ocultos = [];
function fotoRealista() {
  if (ptOn) return salirFoto();
  if (renderer.xr.isPresenting) return;
  ptOn = true; vuelo = null; ctl.enabled = false; clearTimeout(tourT); tourOn = false; $('cap').classList.remove('on'); $('mira').classList.remove('on');
  document.body.classList.add('foto'); $('foto').classList.add('on'); $('fotoT').textContent = 'Preparando la escena…'; $('fotoBar').style.width = '0%'; $('bHD').setAttribute('aria-pressed', 'true');
  setTimeout(() => {
    for (const [a, b] of PT_AGUA) scene.traverse(o => { if (o.material === a) { o.userData.mat = a; o.material = b; } });
    scene.traverse(o => { if ((o.isLine || o.userData.rotulo || o === marca) && o.visible) { o.visible = false; ocultos.push(o); } });
    if (!PT) { PT = new WebGLPathTracer(renderer); PT.renderDelay = 0; PT.minSamples = 1; PT.fadeDuration = 0; PT.bounces = 6; PT.transmissiveBounces = 6; PT.filterGlossyFactor = .5; PT.tiles.set(coarse ? 3 : 2, coarse ? 3 : 2); PT.dynamicLowRes = false; }
    PT.renderScale = Math.min(1, 1.5 / DPR); ptMeta = coarse ? 96 : 256;
    try { PT.setScene(scene, camera); } catch (e) { console.warn('trazado de rayos no disponible:', e); toast('Este equipo no puede generar la foto realista'); return salirFoto(); }
    $('fotoT').textContent = 'Calculando la luz real…';
  }, 60);
}
function salirFoto() { ptOn = false; document.body.classList.remove('foto'); $('foto').classList.remove('on'); $('bHD').setAttribute('aria-pressed', 'false');
  scene.traverse(o => { if (o.userData.mat) { o.material = o.userData.mat; delete o.userData.mat; } }); ocultos.splice(0).forEach(o => o.visible = true);
  ctl.enabled = modo === 'orbit' || modo === 'aerial'; if (modo === 'walk') $('mira').classList.add('on'); }
$('bHD').addEventListener('click', fotoRealista); $('fotoX').addEventListener('click', salirFoto); $('fotoG').addEventListener('click', () => { ptGuardar = true; });

// ---------- interfaz ----------
function ficha() {
  $('pZona').textContent = `${P.zona}${P.km ? ' · km ' + P.km + ' Panamericana Sur' : ''}`; $('pName').textContent = P.nombre; $('pFrase').textContent = P.frase || P.lema || '';
  const [W, D] = LOTE[P.m2] || ['', '']; $('pLote').textContent = `${P.m2} m²`; $('pMed').textContent = W ? `${W} × ${D} m` : ''; $('pPrecio').textContent = P.precio ? S(P.precio) : 'Consultar';
  $('pCuota').textContent = P.precio ? S(P.precio * .8 / 36) + '/mes' : '—'; $('pEstado').textContent = P.estado;
  $('pWa').href = `https://wa.me/${DATA.empresa.whatsapp}?text=${encodeURIComponent(`Hola Vivaldi, recorrí el showroom virtual de ${P.nombre} y quiero agendar una visita.`)}`;
  $('pWeb').href = `https://vivaldiinmobiliaria.com/proyectos/${P.id}.html`;
  $('proj').innerHTML = PROY.map(p => `<button type="button" data-p="${p.id}" aria-pressed="${p.id === P.id}">${p.nombre.replace(/ de (Asia|Cerro Azul)$/, '')}</button>`).join(''); }
$('proj').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b || b.dataset.p === P.id) return; if (ptOn) salirFoto(); P = PROY.find(p => p.id === b.dataset.p); ficha(); construir();
  const u = new URL(location.href); u.searchParams.set('proyecto', P.id); history.replaceState(null, '', u); ip = -1; setModo(modo === 'walk' ? 'walk' : modo === 'tour' ? 'tour' : 'orbit'); toast(`${P.nombre}: lote de ${P.m2} m²`); });
$('bMin').addEventListener('click', () => { const m = $('info').classList.toggle('min'); $('bMin').setAttribute('aria-expanded', !m); $('bMin').textContent = m ? '+' : '–'; $('bMin').setAttribute('aria-label', m ? 'Abrir la ficha' : 'Minimizar la ficha'); });
$('luz').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) { aplicarLuz(b.dataset.l); if (ptOn) { salirFoto(); fotoRealista(); } } });
$('bFull').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); });
function descargar() { canvas.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `Vivaldi-${P.id}-showroom.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Foto guardada'); }, 'image/png'); }
let fotoPend = false; $('bFoto').addEventListener('click', () => { if (ptOn) ptGuardar = true; else fotoPend = true; });

// ---------- bucle ----------
const reloj = new THREE.Timer(); let fpsT = 0, fpsN = 0, bajo = 0;
renderer.setAnimationLoop(() => {
  reloj.update(); const dt = Math.min(.05, reloj.getDelta()); U.time.value += dt;
  if (renderer.xr.isPresenting) { apuntar(); snap(); renderer.render(scene, camera); return; }
  if (ptOn && PT && !PT.isCompiling) { if (PT.samples < ptMeta || ptGuardar) { PT.renderSample(); const k = Math.min(1, PT.samples / ptMeta); $('fotoBar').style.width = Math.round(k * 100) + '%'; $('fotoT').textContent = k < 1 ? `Calculando la luz real… ${Math.round(k * 100)} %` : 'Foto lista';
      if (ptGuardar) { ptGuardar = false; descargar(); } } return; }
  if (ptOn) return;
  paso(performance.now()); caminar(dt); if (ctl.enabled && !vuelo) ctl.update(); moverHotspots();
  composer.render(dt); if (fotoPend) { fotoPend = false; descargar(); }
  if (!CAPTURA) { fpsN++; fpsT += dt; if (fpsT > 2) { const fps = fpsN / fpsT; fpsN = fpsT = 0; if (fps < 30) { if (++bajo >= 2) { bajo = 0; if (pAO.enabled) { pAO.enabled = false; } else if (DPR > 1) { DPR = Math.max(1, DPR - .25); tamano(); } } } else bajo = 0; } }
});

// ---------- inicio ----------
(async () => {
  progreso('Cargando cielos reales…'); await cargarCielos();
  progreso('Cargando muebles 3D…'); await cargarMuebles();
  progreso('Construyendo la casa…'); ficha(); construir(); tamano();
  const inicio = Q.get('parada');
  if (inicio) { setModo('tour'); tourPlay(false); parada(Math.max(0, +inicio - 1)); } else { camera.position.set(G.W * 1.3 + 8, 9, G.calleZ + 12); ctl.target.set(0, 2.5, (G.z1 + G.z2) / 2); camera.lookAt(ctl.target); }
  if (Q.has('foto')) fotoRealista();
  requestAnimationFrame(() => requestAnimationFrame(() => { $('load').classList.add('out'); document.body.dataset.listo = '1'; }));
})().catch(e => { console.error(e); progreso('No se pudo iniciar el showroom en este equipo: ' + e.message); });
window.VVS = {CIELOS, setModo, parada, aplicarLuz, get G() { return G; }, get modo() { return modo; }, get ip() { return ip; }, renderer, camera, teleport, vrParada, dolly, get vrOk() { return vrOk; }, get pt() { return PT; }, fotoRealista, salirFoto, get ptOn() { return ptOn; }, pAO};
