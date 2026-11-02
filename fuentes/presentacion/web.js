const {chromium} = require('playwright'); const L = require('./lib');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1600, height: 900}}); const p = await ctx.newPage();
  await p.addInitScript(L.CURSOR); await p.route(/^https?:/, r => r.abort()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/VIVALDI/entregables/web/Vivaldi-web-whatsapp.html'); await L.sleep(1500); await L.preload(p);
  const R = await L.recorder(p, __dirname + '/fr_web'); await p.mouse.move(1300, 500); await R.start(); await L.sleep(2200);
  await L.click(p, p.getByRole ? '#cookie button:has-text("Aceptar todas")' : '', 600).catch(() => {});
  await L.moveTo(p, {x: 1100, y: 600}); await L.sleep(800);
  // proyectos y filtros
  await L.scrollToEl(p, '#filters', 330, 2600); await L.sleep(900);
  await L.click(p, '#filters button[data-f="pre"]', 1400); await L.click(p, '#filters button[data-f="cerro"]', 1400); await L.click(p, '#filters button[data-f="all"]', 900);
  // plano interactivo
  await L.scrollToEl(p, '#plano', 40, 2200); await L.sleep(800);
  const cv = await p.locator('#planCanvas').boundingBox();
  await L.click(p, {x: cv.x + cv.width * .5, y: cv.y + cv.height * .45}, 600);
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) { await p.keyboard.press(k); await L.sleep(750); }
  console.log('lote', await p.evaluate(() => (document.querySelector('#lotCard h3, #lotCard .h-md') || {}).textContent)); await L.sleep(600);
  // simulador de cuota
  await L.scrollToEl(p, '#sIni', 260, 2400); await L.sleep(700);
  const s = await p.locator('#sIni').boundingBox(); await p.mouse.move(s.x + s.width * .2, s.y + s.height / 2, {steps: 20}); await p.mouse.down(); await p.mouse.move(s.x + s.width * .45, s.y + s.height / 2, {steps: 40}); await p.mouse.up(); await L.sleep(700);
  await L.click(p, '#sTerm button >> nth=2', 1200); await L.click(p, '#sTerm button >> nth=0', 1200);
  // formulario
  await L.scrollToEl(p, '#fName', 300, 2400); await L.sleep(500); console.log('form y', await p.evaluate(() => document.querySelector('#fName').getBoundingClientRect().top));
  await L.type(p, '#fName', 'María Fernández'); await L.type(p, '#fPhone', '987654321'); await L.sleep(300);
  await L.click(p, '#fPriv', 900); await L.sleep(1500);
  const rec = await R.stop(); if (process.argv[2]) { await b.close(); return; } L.build(rec, __dirname + '/web.mp4'); console.log('frames', rec.frames.length, 'secs', (rec.end - rec.frames[0].t).toFixed(1), errs); await b.close(); })();
