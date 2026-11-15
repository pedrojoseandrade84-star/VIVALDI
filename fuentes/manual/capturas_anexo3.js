// Capturas para el Anexo 3 del manual (guía para la gerencia), en modo demostración. Uso: node capturas_anexo3.js capturas
const {chromium} = require('playwright'); const path = require('path');
const OUT = process.argv[2] || __dirname, E = '/home/user/VIVALDI/entregables/';
(async () => { const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({viewport: {width: 1280, height: 860}, deviceScaleFactor: 2}); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await ctx.route(/^https?:/, r => r.abort());
  const shot = async (sel, name, pad = 0, maxH = 1600) => { const el = await p.$(sel); if (!el) { console.log('falta', sel); return; } await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    const q = await el.boundingBox(); await p.screenshot({path: path.join(OUT, name + '.png'), clip: {x: Math.max(0, q.x - pad), y: Math.max(0, q.y - pad), width: Math.min(1280, q.width + pad * 2), height: Math.min(maxH, q.height + pad * 2)}}); console.log('ok', name); };
  await p.goto('file://' + E + 'software/planicie-herramienta-final.html?demo=1'); await p.waitForTimeout(2500);
  // la etiqueta flotante de datos de ejemplo y el indicador de conexión no van en las capturas
  await p.evaluate(() => [...document.querySelectorAll('body *')].forEach(el => { const cs = getComputedStyle(el); if (cs.position === 'fixed' && /Mostrando datos de ejemplo|Sin conectar/.test(el.textContent || '') && el.textContent.length < 80) el.style.display = 'none'; }));
  await p.evaluate(() => { const s = document.getElementById('direccion'); s.scrollIntoView(); s.style.scrollMarginTop = '0'; }); await p.waitForTimeout(1200);
  await shot('#direccion .dx-band', 'g1_cabecera', 0, 520);
  await shot('#direccion .dx-kpis', 'g2_indicadores', 6);
  await shot('#direccion .dx-res', 'g3_resumen', 0);
  await shot('#dxAl', 'g4_alertas', 10);
  const meta = await p.evaluateHandle(() => document.getElementById('goal').closest('.panel')); await meta.asElement().scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  { const q = await meta.asElement().boundingBox(); await p.screenshot({path: path.join(OUT, 'g5_meta.png'), clip: {x: q.x, y: q.y, width: q.width, height: Math.min(250, q.height)}}); console.log('ok g5_meta'); }
  // explorador: lotes guardados y comparación
  const c2 = await b.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 2}); const q = await c2.newPage(); q.on('pageerror', e => errs.push(e.message)); await c2.route(/^https?:/, r => r.abort());
  await q.goto('file://' + E + 'experiencia/explorar-portada.html'); await q.waitForTimeout(1500);
  await q.evaluate(() => { localStorage.setItem('vv-lotes-portada', '[1,3,5]'); }); await q.reload(); await q.waitForTimeout(1500);
  await q.evaluate(() => document.querySelectorAll('#boxF .hot')[3].focus()); await q.waitForTimeout(900);
  await q.screenshot({path: path.join(OUT, 'g6_guardar.png')}); console.log('ok g6_guardar');
  await q.click('#mis'); await q.waitForTimeout(500); await (await q.$('#cmp')).screenshot({path: path.join(OUT, 'g7_comparar.png')}); console.log('ok g7_comparar');
  console.log('errores', errs); await b.close(); })();
