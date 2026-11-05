// Historial del cliente: llegada, etapas, WhatsApp, notas, proformas, separación, visitas y pagos
const {chromium} = require('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = 'file://' + (process.argv[2] || '/home/user/VIVALDI/entregables/software/planicie-herramienta-whatsapp.html');
(async () => { const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await p.route(/^https?:/, r => r.abort());
  await p.goto(F); await p.waitForTimeout(1000);
  // cliente nuevo real
  await p.evaluate(() => document.getElementById('clientes').scrollIntoView()); await p.fill('#cName', 'Marco Díaz'); await p.fill('#cPhone', '987222333'); await p.click('#cSave'); await p.waitForTimeout(500);
  const idx = () => p.evaluate(() => [...document.querySelectorAll('#crmList .crm-item[data-id] .crm-row b')].findIndex(b => b.textContent === 'Marco Díaz'));
  let i = await idx(); await p.click(`#crmList .crm-item[data-id] >> nth=${i} >> button[data-a="next"]`); await p.waitForTimeout(300);
  i = await idx(); await p.click(`#crmList .crm-item[data-id] >> nth=${i} >> button[data-a="wa"]`); await p.waitForTimeout(300);
  i = await idx(); await p.click(`#crmList .crm-item[data-id] >> nth=${i} >> button[data-hx]`); await p.waitForTimeout(300);
  await p.fill('#hxNota', 'Prefiere lote esquina, llamar el sábado'); await p.click('#hxAdd'); await p.waitForTimeout(300);
  const t = await p.evaluate(() => [...document.querySelectorAll('.hx li b')].map(x => x.textContent));
  ok(t.includes('Etapa: Nuevo → Contactado'), 'registra cambio de etapa');
  ok(t.includes('WhatsApp enviado desde la herramienta'), 'registra WhatsApp enviado');
  ok(t.some(x => /^Nota: Prefiere lote esquina/.test(x)), 'agrega nota');
  ok(t.includes('Registrado en la herramienta'), 'registra la creación');
  const saved = await p.evaluate(() => (JSON.parse(localStorage.getItem('vivaldi-clientes-v1')).find(c => c.name === 'Marco Díaz').hist || []).length);
  ok(saved >= 4, 'el historial queda guardado (' + saved + ' eventos)');
  await p.keyboard.press('Escape');
  await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => (CLIENTS.find(c => c.name === 'Marco Díaz').hist || []).length) === saved, 'se conserva al recargar');
  // cliente con todo el ciclo (datos de ejemplo)
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(800); await p.click('#demoBtn'); await p.waitForLoadState('load'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('clientes').scrollIntoView()); await p.click('#crmFilter button >> text=Todos').catch(() => {}); await p.waitForTimeout(300);
  const j = await p.evaluate(() => [...document.querySelectorAll('#crmList .crm-item[data-id] .crm-row b')].findIndex(b => b.textContent === 'Pedro Salas Rojas'));
  await p.click(`#crmList .crm-item[data-id] >> nth=${j} >> button[data-hx]`); await p.waitForTimeout(300);
  const t2 = await p.evaluate(() => [...document.querySelectorAll('.hx li b')].map(x => x.textContent));
  ok(t2.some(x => /^Proforma PF-EJ-0003/.test(x)) && t2.some(x => /^Separación SEP-EJ-0002/.test(x)) && t2.includes('Venta registrada') && t2.some(x => /^Pago de cuota/.test(x)), 'ciclo completo: proforma, separación, venta y pagos (' + t2.length + ' eventos)');
  await p.screenshot({path: __dirname + '/../rev/crm_hist.png'});
  console.log('errores', errs); await b.close(); })();
