// Prueba del módulo Marketing y campañas de la herramienta: costos por canal, campañas, inversión por mes y enlace con QR.
const {chromium} = require('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = process.argv[2] && process.argv[2].endsWith('.html') ? process.argv[2] : '/home/user/VIVALDI/entregables/software/planicie-herramienta-final.html';
(async () => { const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); await c.route(/^https?:/, r => r.abort());
  await p.goto('file://' + F); await p.evaluate(() => localStorage.clear());
  const ym = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  await p.evaluate(ym => { const C = [['Ana', 'Facebook', 'preventa', 'Vendido'], ['Beto', 'Facebook', 'preventa', 'Contactado'], ['Caro', 'Instagram', 'recorrido-3d', 'Visita agendada'], ['Dino', 'Google', 'busqueda', 'Separado'],
      ['Eva', 'Google', 'busqueda', 'Nuevo'], ['Fito', 'Google', '', 'Nuevo'], ['Gina', 'TikTok', 'obra', 'Nuevo'], ['Hugo', 'Referido', '', 'Separado']];
    localStorage.setItem('vivaldi-clientes-v1', JSON.stringify(C.map(([n, s, camp, st], i) => ({id: 'm' + i, name: n, phone: '9' + String(10000000 + i), proj: 'La Planicie de Asia', stage: st, src: s, camp, created: ym + '-05'}))));
    localStorage.setItem('vivaldi-marketing-v1', JSON.stringify({[ym]: {meta: 1000, google: 1500, tiktok: 300}})); }, ym);
  await p.reload(); await p.waitForTimeout(1800);
  ok(!!(await p.$('#marketing')) && await p.evaluate(() => !!document.querySelector('#vvSide a[data-s="marketing"]')), 'la sección está y aparece en la barra lateral');
  const k = await p.textContent('#mkK'); ok(/S\/ 2,800/.test(k) && /S\/ 350/.test(k) && /S\/ 933/.test(k), 'inversión S/ 2,800; costo por interesado S/ 350 (8); costo por cierre S/ 933 (3 cierres): ' + k.replace(/\s+/g, ' '));
  const meta = await p.$$eval('#mkTb tbody tr', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ')).find(t => /^Meta/.test(t)) || '');
  ok(/Meta \(Facebook e Instagram\).* 3 2 1 33% S\/ 1,000 S\/ 333 S\/ 1,000/.test(meta), 'Meta suma Facebook e Instagram: 3 interesados, 2 visitas, 1 cierre, S/ 333 por interesado: ' + meta);
  ok(/Mejor costo/i.test(await p.$eval('#mkTb tr.best', r => r.innerText)), 'resalta el canal con cierre más barato');
  const cp = await p.textContent('#mkCp'); ok(/preventa/.test(cp) && /busqueda/.test(cp) && /recorrido-3d/.test(cp), 'lista las campañas');
  ok(/Referidos/.test(await p.textContent('#mkTb')), 'los referidos se cuentan aunque no tengan inversión');
  await p.fill('[data-inv="portales"]', '500'); await p.dispatchEvent('[data-inv="portales"]', 'change'); await p.waitForTimeout(200);
  ok(await p.evaluate(ym => JSON.parse(localStorage.getItem('vivaldi-marketing-v1'))[ym].portales === 500, ym) && /S\/ 3,300/.test(await p.textContent('#mkK')), 'guardar la inversión de un canal actualiza el total');
  await p.selectOption('#mkCan', 'auto'); await p.fill('#mkCamp', 'Camionetas Ñaña 2026'); await p.waitForTimeout(200);
  const url = await p.textContent('#mkUrl'); ok(url === 'https://vivaldiinmobiliaria.com/proyectos/planicie.html?utm_source=auto&utm_medium=impreso&utm_campaign=camionetas-nana-2026', 'enlace de campaña correcto y limpio: ' + url);
  ok(await p.$eval('#mkQr svg', s => s.querySelectorAll('rect, path').length > 0), 'genera el código QR');
  const ins = await p.textContent('#mkIns'); ok(/TikTok/.test(ins) && /aún no tiene cierres/.test(ins), 'la lectura en palabras avisa del canal con inversión y sin cierres');
  const AX = require('child_process').execSync('find / -name axe.min.js -path "*axe*" -not -path "/proc/*" 2>/dev/null | head -1').toString().trim();
  if (AX) { await p.addScriptTag({path: AX}); const v = await p.evaluate(async () => (await axe.run('#marketing')).violations.map(x => x.id + ':' + x.nodes.length)); ok(!v.length, 'accesibilidad de la sección: ' + JSON.stringify(v)); }
  ok(!errs.length, 'sin errores ' + JSON.stringify(errs)); await b.close(); })();
