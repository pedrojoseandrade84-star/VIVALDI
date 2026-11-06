// Capturas para el Anexo 2 del manual (funciones nuevas), en modo demostración. Uso: node capturas_anexo2.js <carpeta_salida>
const {chromium} = require('playwright'); const path = require('path');
const OUT = process.argv[2] || __dirname, E = '/home/user/VIVALDI/entregables/';
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 860}, deviceScaleFactor: 2}); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await p.route(/^https?:/, r => r.abort());
  const shot = async (sel, name, pad = 12) => { const el = await p.$(sel); if (!el) { console.log('falta', sel); return; } await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    const q = await el.boundingBox(); await p.screenshot({path: path.join(OUT, name + '.png'), clip: {x: Math.max(0, q.x - pad), y: Math.max(0, q.y - pad), width: Math.min(1280, q.width + pad * 2), height: Math.min(1400, q.height + pad * 2)}}); console.log('ok', name); };
  await p.goto('file://' + E + 'software/planicie-herramienta-final.html?demo=1'); await p.waitForTimeout(2500);
  // la etiqueta flotante de datos de ejemplo y el indicador de conexión no van en las capturas
  await p.evaluate(() => [...document.querySelectorAll('body *')].forEach(el => { const cs = getComputedStyle(el); if (cs.position === 'fixed' && /Mostrando datos de ejemplo|Sin conectar/.test(el.textContent || '') && el.textContent.length < 80) el.style.display = 'none'; }));
  // 1) Mis clientes con "Borrar varios"
  await p.evaluate(() => { location.hash = 'clientes'; document.getElementById('clientes').scrollIntoView(); }); await p.waitForTimeout(800);
  await p.evaluate(() => { const l = document.getElementById('crmList'); if (l) l.style.maxHeight = '520px'; l && (l.style.overflow = 'hidden'); });
  await shot('#crmList', 'a1-clientes');
  await p.click('#bulkOn'); await p.waitForTimeout(300);
  await p.evaluate(() => { const c = [...document.querySelectorAll('#crmList input[type=checkbox]')].slice(0, 2); c.forEach(x => x.click()); });
  await p.waitForTimeout(300); await shot('#crmList', 'a2-borrar-varios'); await p.click('#bulkOff');
  // 2) Historial del cliente
  await p.locator('#crmList .crm-item[data-id] .crm-acts button', {hasText: 'Historial'}).first().click(); await p.waitForTimeout(700);
  await shot('.hx', 'a3-historial', 0); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // 3) Proyectos y automatización
  for (const [t, n] of [['Mis enlaces de venta', 'a4-enlaces'], ['Proyectos', 'a5-proyectos'], ['Mensajes automáticos', 'a6-mensajes']]) {
    await p.evaluate(() => { location.hash = 'gestion'; document.getElementById('gestion').scrollIntoView(); }); await p.waitForTimeout(400);
    const tab = p.locator('#gestion button', {hasText: t}).first(); if (await tab.count()) { await tab.click(); await p.waitForTimeout(600); }
    await p.evaluate(() => { const g = document.getElementById('gestion'); g.style.maxHeight = '1100px'; g.style.overflow = 'hidden'; }); await shot('#gestion', n, 0);
    await p.evaluate(() => { const g = document.getElementById('gestion'); g.style.maxHeight = ''; g.style.overflow = ''; });
  }
  // 4) Tablero de dirección
  await p.evaluate(() => { location.hash = 'direccion'; document.getElementById('direccion').scrollIntoView(); }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const g = document.getElementById('direccion'); g.style.maxHeight = '1150px'; g.style.overflow = 'hidden'; }); await shot('#direccion', 'a7-direccion', 0);
  // 5) Mi Vivaldi: asesor y comprador
  const F = 'file://' + E + 'web/portal.html';
  await p.goto(F + '#asesor'); await p.fill('#aM', 'rosa@vivaldi.pe'); await p.fill('#aP', 'clave'); await p.click('#fA button'); await p.waitForTimeout(900);
  await p.evaluate(() => { const w = document.getElementById('aWrap'); w.style.maxHeight = '900px'; w.style.overflow = 'hidden'; }); await shot('#aWrap', 'a8-portal-asesor');
  await p.click('[data-t="ven"]'); await p.waitForTimeout(800); await shot('#aWrap', 'a9-portal-accesos');
  await p.click('#aSalir'); await p.goto(F + '#lotes'); await p.waitForTimeout(800); await p.addStyleTag({content: '.top{position:static!important}'}); await p.click('.lt.disp >> nth=2'); await p.waitForTimeout(300); await shot('.lotes', 'a10-portal-lotes');
  await p.goto(F + '#comprador'); await p.fill('#cM', 'maria.fernandez@gmail.com'); await p.click('#fMail button'); await p.waitForTimeout(600); await p.fill('#cC', '123456'); await p.click('#fCode button[type=submit]'); await p.waitForTimeout(900);
  await p.evaluate(() => { const w = document.querySelector('.compra'); w.style.maxHeight = '760px'; w.style.overflow = 'hidden'; }); await shot('.compra', 'a11-portal-comprador');
  console.log('errores', errs); await b.close(); })();
