// Proyectos y automatización en la herramienta: enlaces del asesor, publicar proyectos (solo jefatura) y cola de mensajes
const {chromium} = require('playwright'); const M = 'http://127.0.0.1:54321';
const {execSync} = require('child_process'); const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -At -d vv -c "${s}"`, {encoding: 'utf8'}).trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = 'file://' + (process.argv[2] || '/home/user/VIVALDI/entregables/software/planicie-herramienta-whatsapp.html');
(async () => { const b = await chromium.launch(); const errs = [];
  q("update perfiles set codigo='ana', celular='911111111' where nombre='Ana Flores'; update perfiles set celular='933333333' where nombre='Jefa Comercial'");
  const mk = async () => { const ctx = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
    await p.addInitScript(cfg => { if (!localStorage.getItem('nube-config')) localStorage.setItem('nube-config', cfg); }, JSON.stringify({url: M, key: 'anon-test-key'}));
    await p.goto(F); await p.waitForTimeout(1200); return p; };
  const login = async (p, m, k) => { await p.evaluate(() => document.querySelector('#nubeBtn').click()); await p.fill('#nubeMail', m); await p.fill('#nubePass', k); await p.click('#nubeGo'); await p.waitForTimeout(3000);
    await p.evaluate(() => { const d = document.getElementById('nubeDlg'); if (d) d.hidden = true; }); };
  const go = async (p, tab) => { await p.evaluate(() => document.getElementById('gestion').scrollIntoView()); await p.click(`#gestion .gs-tabs button[data-t="${tab}"]`); await p.waitForTimeout(800); };
  // asesora
  const ana = await mk(); await login(ana, 'ana@vivaldi.pe', 'clave-ana');
  ok(await ana.evaluate(() => !!document.querySelector('#navMenu a[href="#gestion"]')), 'opción en el menú Análisis');
  await go(ana, 'enl');
  const links = await ana.evaluate(() => [...document.querySelectorAll('#gestion .gs-link code')].map(c => c.textContent));
  ok(links.length >= 7 && links.every(l => /asesor=ana/.test(l) && /n=Ana\+Flores/.test(l)), `enlaces personales de Ana (${links.length})`);
  ok(links.some(l => /proyectos\/planicie\.html/.test(l)) && links.some(l => /extranjeros\.html/.test(l)) && !links.some(l => /zafiro/.test(l)), 'incluye landings disponibles y extranjeros, no el proyecto vendido');
  await go(ana, 'pro'); await ana.fill('#gsPre', '35000'); await ana.click('#gsSave'); await ana.waitForTimeout(800);
  ok(q("select count(*) from proyectos") === '0', 'la asesora no publica (se guarda solo en su equipo)');
  await go(ana, 'msg'); ok(/Los ve la jefatura/.test(await ana.textContent('#gestion [data-p="msg"]')), 'la asesora no ve la cola de mensajes');
  // jefatura
  await fetch(M + '/rest/v1/solicitudes', {method: 'POST', headers: {apikey: 'anon-test-key', 'Content-Type': 'application/json'}, body: JSON.stringify({nombre: 'Rosa Vargas', celular: '981234567', proyecto: 'La Planicie de Asia', asesor_codigo: 'ana'})});
  const jefa = await mk(); await login(jefa, 'jefa@vivaldi.pe', 'clave-jefa'); await go(jefa, 'pro');
  await jefa.fill('#gsPre', '33000'); await jefa.selectOption('#gsEst', 'Últimos lotes'); await jefa.click('#gsAddEt'); await jefa.fill('#gsEtapas .gs-st:last-child input', 'Entrega de títulos');
  await jefa.fill('#gsDoc', 'https://vivaldiinmobiliaria.com/docs/plano-planicie.pdf\nnoesunenlace'); await jefa.click('#gsSave'); await jefa.waitForTimeout(1200);
  const pr = q("select contenido->>'precio'||'|'||(contenido->>'estado')||'|'||jsonb_array_length(contenido->'etapas')||'|'||jsonb_array_length(contenido->'documentos') from proyectos where id='planicie'");
  ok(pr === '33000|Últimos lotes|5|1', 'la jefatura publica precio, estado, etapas y documentos: ' + pr);
  ok(/Publicado/.test(await jefa.textContent('#gsMsg')), 'aviso de publicado');
  await go(jefa, 'msg'); const filas = await jefa.evaluate(() => document.querySelectorAll('#gestion .gs-t tbody tr').length);
  ok(filas === 2, 'la jefatura ve la cola (bienvenida y aviso al asesor): ' + filas);
  await jefa.click('#gestion [data-cancel] >> nth=0'); await jefa.waitForTimeout(1200);
  ok(q("select count(*) from mensajes where estado='cancelado'") === '1', 'cancelar un mensaje pendiente');
  await jefa.fill('#gsNo', '981 234 568'); await jefa.click('#gsNoBtn'); await jefa.waitForTimeout(800);
  ok(q("select count(*) from no_contactar where celular='981234568'") === '1', 'registrar número que no desea mensajes');
  console.log('errores', errs); await b.close(); })();
