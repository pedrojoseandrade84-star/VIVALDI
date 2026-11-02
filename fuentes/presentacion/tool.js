const {chromium} = require('playwright'); const L = require('./lib');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1600, height: 900}}); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.addInitScript(L.CURSOR); await p.route(/^https?:/, r => r.abort()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const F = 'file:///home/user/VIVALDI/entregables/software/planicie-herramienta-whatsapp.html';
  await p.goto(F); await L.sleep(1000); await p.click('#demoBtn'); await p.waitForLoadState('load'); await L.sleep(1500); await L.preload(p);
  const R = await L.recorder(p, __dirname + '/fr_tool'); await p.mouse.move(1200, 400); await R.start(); await L.sleep(1500);
  // tablero de dirección
  await L.click(p, 'nav.top a[href="#direccion"]', 1600);
  await L.moveTo(p, '#dxKpis .dx-k >> nth=0'); await L.sleep(700); await L.moveTo(p, '#dxKpis .dx-k >> nth=2'); await L.sleep(700);
  await L.scrollToEl(p, '#dxTrend', 160, 1400); await L.sleep(500);
  for (const n of [7, 9, 11]) { await L.moveTo(p, `#dxTrend g[data-tip] >> nth=${n}`, 22); await L.sleep(900); }
  await L.scrollToEl(p, '#dxFun', 140, 1500); await L.sleep(1400);
  await L.scrollToEl(p, '#dxTeam', 140, 1500); await L.sleep(500); await L.click(p, '#direccion .dx-seg button[data-p="todo"]', 1300); await L.click(p, '#direccion .dx-seg button[data-p="mes"]', 800);
  // agenda de hoy
  await L.click(p, 'nav.top a[href="#hoy"]', 2200);
  // proforma en vivo
  await L.click(p, 'nav.top a[href="#proforma"]', 1300);
  await L.type(p, '#pfName', 'Carlos Mendoza Vega', 55); await L.type(p, '#pfPhone', '986222333', 55);
  await L.type(p, '#pfMz', 'B', 80); await L.type(p, '#pfLt', '6', 80);
  await L.moveTo(p, '#pfTerm'); await L.sleep(300); await p.selectOption('#pfTerm', '36'); await L.sleep(1200);
  await L.scrollToEl(p, '#pfTerm', 300, 1200); await L.sleep(1400);
  await L.moveTo(p, '#pfXlsx'); await L.sleep(1200);
  // clientes: borrar y deshacer
  await L.click(p, 'nav.top a[href="#clientes"]', 1500); await L.scrollToEl(p, '#crmList', 260, 900); await L.sleep(600);
  await L.click(p, '#crmList .crm-item[data-id] >> nth=1 >> button[data-a="del"]', 1500); await L.click(p, '#delUndo', 1800);
  const rec = await R.stop(); L.build(rec, __dirname + '/tool.mp4'); console.log('frames', rec.frames.length, 'secs', (rec.end - rec.frames[0].t).toFixed(1), errs); await b.close(); })();
