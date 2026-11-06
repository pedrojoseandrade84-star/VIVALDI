// Capturas del simulador 3D para el explorador de lotes (estilo "elige tu unidad").
// Uso: node capturas_explorador.js <carpeta_salida> [proyecto]
// Genera: fachada (fila de lotes desde la calle), corte de la casa por piso, ambientes interiores y lotes.json (posición de cada lote en pantalla).
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2], PROJ = process.argv[3] || 'portada', W = 1920, H = 1080;
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

  // 1) Fachada: la fila de lotes vista desde la calle
  await click('Exterior'); await click('Día'); await p.waitForTimeout(1500); await sinRotulos();
  const FPOS = [3, 17, -13.5], FTGT = [3, 2.6, 6.5];
  await camara(FPOS, FTGT, 50); await foto('e1-fachada', 7000);
  await click('Atardecer'); await p.waitForTimeout(800); await sinRotulos(); await camara(FPOS, FTGT, 50); await foto('e1-fachada-tarde', 7000);
  // posición en pantalla de cada lote de la fila (frente de 6 m, casa hasta 7.5 m de alto)
  const lotes = await p.evaluate(([W, H]) => { const {cam} = window.__sim, T = window.THREE, out = [];
    for (let k = -4; k <= 4; k++) { const x0 = 6 * k, pts = [];
      for (const x of [x0 + .15, x0 + 5.85]) for (const y of [0, 7.4]) for (const z of [2.6, 3.2]) { const v = new T.Vector3(x, y, z).project(cam); pts.push([(v.x + 1) / 2, (1 - v.y) / 2]); }
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      out.push({k, l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys)}); }
    return out.filter(q => q.r > 0.02 && q.l < 0.98); }, [W, H]);
  fs.writeFileSync(path.join(OUT, 'lotes.json'), JSON.stringify(lotes, null, 1)); console.log('lotes', lotes.length);

  // 2) Corte de la casa (vista diagonal desde arriba), piso 1 y piso 2
  await click('Día'); await click('Corte'); await p.waitForTimeout(800);
  for (const [piso, nombre] of [['Piso 1', 'e2-corte-p1'], ['Piso 2', 'e3-corte-p2']]) {
    await click(piso); await p.waitForTimeout(800); await sinRotulos(); await camara([3.4, 15.5, -5.2], [3, 0.6, 7.6], 46); await foto(nombre, 6000); }

  // 3) Ambientes: cámara a la altura de los ojos dentro de cada uno
  await click('Recorrer'); await p.waitForTimeout(2000); await sinRotulos();
  const h = await p.evaluate(() => window.__sim.state.norm.h);
  const AMB = [['e4-sala', 5.6, 6.2, 0, 0.64], ['e5-comedor-cocina', 0.45, 10.6, 0, -2.45], ['e6-dormitorio', 4.15, 6.2, 1, 0.905], ['e7-terraza', 5.6, 10.6, 1, 2.62]];
  await p.evaluate(() => { const c = window.__sim.cam; c.fov = 74; c.updateProjectionMatrix(); });
  for (const [nombre, x, z, lvl, yaw] of AMB) {
    await p.evaluate(([x, z, y, yaw]) => { const w = window.__sim.walk; w.x = x; w.z = z; w.y = y; w.yaw = yaw; w.pitch = -0.06; }, [x, z, lvl * h, yaw]);
    await foto(nombre, 5000); }
  const d = await p.evaluate(() => { const g = window.__sim.design; return {m: g.metrics, rooms: g.rooms.map(r => ({n: r.name, lvl: r.lvl, a: +r.area.toFixed(1)})), pisos: g.pisos}; });
  fs.writeFileSync(path.join(OUT, 'casa.json'), JSON.stringify(d, null, 1));
  console.log('errores', errs); await b.close(); })();
