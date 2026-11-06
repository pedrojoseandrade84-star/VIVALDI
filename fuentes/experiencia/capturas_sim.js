// Vistas del simulador 3D para la experiencia guiada por scroll. Uso: node capturas_sim.js <carpeta_salida> [proyecto]
const {chromium} = require('playwright'); const path = require('path');
const OUT = process.argv[2], PROJ = process.argv[3] || 'portada';
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 2000, height: 1150}, deviceScaleFactor: 1.25});
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
  await p.goto('file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html'); await p.waitForTimeout(5000);
  await p.selectOption('#proj', PROJ); await p.waitForTimeout(2500);
  await p.locator('button', {hasText: 'Familia de playa'}).first().click(); await p.waitForTimeout(800);
  await p.click('#aiGo'); await p.waitForTimeout(5000);
  await p.addStyleTag({content: '.bar,#toast{visibility:hidden!important}'});
  const vista = async (botones, nombre, espera = 6000) => {
    for (const t of botones) { const ok = await p.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, t); if (!ok) console.log('sin botón', t); await p.waitForTimeout(700); }
    await p.waitForTimeout(espera); const q = await p.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height}; }); await p.screenshot({path: path.join(OUT, nombre + '.png'), clip: q, timeout: 120000}); console.log('ok', nombre); };
  await vista(['Entorno', 'Día'], 's1-entorno', 8000);
  await vista(['Exterior', 'Día'], 's2-exterior');
  await vista(['Exterior', 'Atardecer'], 's3-atardecer');
  await vista(['Corte', 'Día'], 's4-corte');
  await vista(['Rayos X'], 's5-rayosx');
  await vista(['Plano', 'Piso 1'], 's6-plano-p1');
  await vista(['Plano', 'Piso 2'], 's7-plano-p2');
  const datos = await p.evaluate(() => document.body.innerText.match(/(\d+) m²\s*área techada|(\d+)\s*dormitorios|(\d+)\s*baños/g));
  console.log('datos', JSON.stringify(datos)); console.log('errores', errs); await b.close(); })();
