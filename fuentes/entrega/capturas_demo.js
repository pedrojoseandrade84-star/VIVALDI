// Capturas para la portada de la demostración (ABRIR-AQUI.html). Uso: node capturas_demo.js <carpeta_salida>
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, 'capturas'), E = '/home/user/VIVALDI/entregables/';
fs.mkdirSync(OUT, {recursive: true});
const SHOTS = [
  ['web', 'web/Vivaldi-web-final.html', null, 2500],
  ['landing', 'landings/lirios.html', null, 2600],
  ['explorador', 'experiencia/explorar-portada.html', null, 2500],
  ['portal', 'web/portal.html#lotes', async p => { await p.click('#plano button >> nth=0').catch(() => {}); }, 1800],
  ['herramienta', 'software/planicie-herramienta-final.html?demo=1#direccion', async p => { await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('direccion').scrollIntoView(); }); }, 3200],
  ['marketing', 'software/planicie-herramienta-final.html?demo=1#marketing', async p => { await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('marketing').scrollIntoView(); }); }, 3200],
  ['buscador', 'software/planicie-herramienta-final.html?demo=1', async p => { await p.keyboard.press('Control+k'); await p.keyboard.type('lu'); }, 3200],
  ['conectar', 'software/planicie-herramienta-final.html?demo=1#conectar', async p => { await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('conectar').scrollIntoView(); }); await p.click('#conectar [data-t="crm"]'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#cnCrm .cn-card:nth-child(2)').scrollIntoView({block: 'center'})); }, 3200],
  ['simulador', 'simulador/Simulador-3D-Lotes-Vivaldi.html', null, 7000]
];
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [name, url, act, wait] of SHOTS) {
    const c = await b.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1}); const p = await c.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await c.route(/^https?:/, r => r.abort());
    await p.goto('file://' + E + url); await p.waitForTimeout(wait);
    // avisos flotantes de demostración y cookies fuera de la foto
    await p.evaluate(() => [...document.querySelectorAll('body *')].forEach(el => { const cs = getComputedStyle(el); if (cs.position === 'fixed' && /Mostrando datos de ejemplo|Sin conectar|cookies/i.test(el.textContent || '') && (el.textContent || '').length < 300) el.style.display = 'none'; }));
    if (act) { await act(p); await p.waitForTimeout(900); }
    await p.screenshot({path: path.join(OUT, name + '.png')}); console.log('ok', name); await c.close(); }
  console.log('errores', errs); await b.close(); })();
