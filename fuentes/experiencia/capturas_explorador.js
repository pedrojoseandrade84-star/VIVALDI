// Capturas del simulador 3D para el explorador de lotes (estilo "elige tu unidad").
// Uso: node capturas_explorador.js <carpeta_salida> [proyecto]
// Genera: fachada (fila de lotes desde la calle, de día y al atardecer), corte de la casa por piso, ambientes interiores,
// lotes.json (posición de cada lote en pantalla) y casa.json (medidas del lote, métricas y ambientes capturados).
// Las cámaras se calculan con el ancho y fondo del lote y con los ambientes del diseño: sirven para cualquier proyecto del simulador.
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2], PROJ = process.argv[3] || 'portada', W = 1920, H = 1080;
fs.mkdirSync(OUT, {recursive: true});
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport: {width: W, height: H}});
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
  await p.goto('file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html'); await p.waitForTimeout(5000);
  await p.selectOption('#proj', PROJ); await p.waitForTimeout(2000);
  const click = t => p.evaluate(t => { const x = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === t); if (x) x.click(); return !!x; }, t);
  await click('Familia de playa'); await p.click('#aiGo'); await p.waitForTimeout(4000);
  // lienzo a pantalla completa, sin interfaz ni rótulos
  await p.addStyleTag({content: 'body>*:not(main):not(.app){visibility:hidden} #c{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999;visibility:visible!important}'});
  await p.evaluate(() => { dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(1500);
  const sinRotulos = () => p.evaluate(() => { window.__sim.scene.traverse(o => { if (o.name === 'etiquetas' || o.name === 'lugares') o.visible = false; }); });
  const foto = async (nombre, espera = 5000) => { await p.waitForTimeout(espera); await p.screenshot({path: path.join(OUT, nombre + '.png'), clip: {x: 0, y: 0, width: W, height: H}, timeout: 120000}); console.log('ok', nombre); };
  const camara = (pos, tgt, fov = 50) => p.evaluate(([pos, tgt, fov]) => { const {cam, controls} = window.__sim; cam.fov = fov; cam.updateProjectionMatrix(); controls.target.set(...tgt); cam.position.set(...pos); controls.update(); }, [pos, tgt, fov]);
  const g = await p.evaluate(() => { const d = window.__sim.design; return {W: d.W, D: d.D, z0: d.z0, fd: d.fd, rooms: d.rooms.map(r => ({n: r.name, t: r.type, x: r.x, z: r.z, w: r.w, d: r.d, lvl: r.lvl}))}; });
  const s = g.W / 6;

  // 1) Fachada: la fila de lotes vista desde la calle (la toma se aleja según el ancho del lote)
  await click('Exterior'); await click('Día'); await p.waitForTimeout(1500); await sinRotulos();
  const sf = 1 + (s - 1) * .55, FPOS = [g.W / 2, 17 * sf, g.z0 - 16.5 * sf], FTGT = [g.W / 2, 2.6, g.z0 + 3.5];   // con lote de 6 m: [3, 17, -13.5] → [3, 2.6, 6.5]
  await camara(FPOS, FTGT, 50); await foto('e1-fachada', 7000);
  await click('Atardecer'); await p.waitForTimeout(800); await sinRotulos(); await camara(FPOS, FTGT, 50); await foto('e1-fachada-tarde', 7000);
  // posición en pantalla de cada lote de la fila (frente del lote, casa hasta 7.4 m de alto)
  const lotes = await p.evaluate(([Wl, z0]) => { const {cam} = window.__sim, T = window.THREE, out = [];
    for (let k = -4; k <= 4; k++) { const x0 = Wl * k, pts = [];
      for (const x of [x0 + .15, x0 + Wl - .15]) for (const y of [0, 7.4]) for (const z of [z0 - .4, z0 + .2]) { const v = new T.Vector3(x, y, z).project(cam); pts.push([(v.x + 1) / 2, (1 - v.y) / 2]); }
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      out.push({k, l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys)}); }
    return out.filter(q => q.r > 0.02 && q.l < 0.98); }, [g.W, g.z0]);
  fs.writeFileSync(path.join(OUT, 'lotes.json'), JSON.stringify(lotes, null, 1)); console.log('lotes', lotes.length);

  // 2) Corte de la casa (vista diagonal desde arriba), piso 1 y piso 2
  const s2 = Math.max(s, g.fd / 10.5), zc = g.z0 + g.fd / 2;
  await click('Día'); await click('Corte'); await p.waitForTimeout(800);
  for (const [piso, nombre] of [['Piso 1', 'e2-corte-p1'], ['Piso 2', 'e3-corte-p2']]) {
    await click(piso); await p.waitForTimeout(800); await sinRotulos(); await camara([g.W / 2 + .4, 15.5 * s2, zc - 12.8 * s2], [g.W / 2, .6, zc - .65], 46); await foto(nombre, 6000); }

  // 3) Ambientes: cámara a la altura de los ojos, en una esquina de cada ambiente y mirando en diagonal
  const pick = f => g.rooms.find(f);
  const sala = pick(r => r.lvl === 0 && r.n === 'Sala') || pick(r => r.lvl === 0 && r.t === 'living');
  const comedor = pick(r => r.n === 'Comedor') || pick(r => r.t === 'kitchen');
  const dorm = pick(r => r.t === 'bed' && /principal/i.test(r.n)) || pick(r => r.t === 'bed');
  const terr = pick(r => r.t === 'terrace');
  const AMB = [];
  if (sala) AMB.push(['e4-sala', 'Sala', sala.lvl, [sala.x + sala.w - .4, sala.z + sala.d - .2], [sala.x + sala.w * .5, sala.z]]);
  if (comedor) AMB.push(['e5-comedor-cocina', comedor.n === 'Comedor' ? 'Comedor y cocina' : 'Cocina', comedor.lvl, [comedor.x + .45, comedor.z + .2], [comedor.x + comedor.w * .9, comedor.z + comedor.d]]);
  if (dorm) AMB.push(['e6-dormitorio', 'Dormitorio principal', dorm.lvl, [dorm.x + dorm.w - .3, dorm.z + dorm.d - .2], [dorm.x, dorm.z]]);
  if (terr) AMB.push(['e7-terraza', 'Terraza', terr.lvl, [terr.x + terr.w - .4, terr.z + .2], [terr.x + terr.w * .65, terr.z + terr.d]]);
  await click('Recorrer'); await p.waitForTimeout(2000); await sinRotulos();
  const h = await p.evaluate(() => window.__sim.state.norm.h);
  await p.evaluate(() => { const c = window.__sim.cam; c.fov = 74; c.updateProjectionMatrix(); });
  for (const [nombre, , lvl, [x, z], [tx, tz]] of AMB) {
    const yaw = Math.atan2(-(tx - x), -(tz - z));
    await p.evaluate(([x, z, y, yaw]) => { const w = window.__sim.walk; w.x = x; w.z = z; w.y = y; w.yaw = yaw; w.pitch = -0.06; }, [x, z, lvl * h, yaw]);
    await foto(nombre, 5000); }
  const d = await p.evaluate(() => { const g = window.__sim.design; return {m: g.metrics, rooms: g.rooms.map(r => ({n: r.name, lvl: r.lvl, a: +r.area.toFixed(1)})), pisos: g.pisos}; });
  fs.writeFileSync(path.join(OUT, 'casa.json'), JSON.stringify({...d, W: g.W, D: g.D, amb: AMB.map(([k, n, lvl]) => ({k, n, lvl}))}, null, 1));
  console.log('errores', errs); await b.close(); })();
