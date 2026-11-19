// Prueba de punta a punta de la pestaña "CRM o base de datos" de la herramienta: la jefatura configura, prueba y guarda un conector;
// la función conector real (llamada desde el navegador) lee un CRM simulado y los clientes aparecen en la herramienta.
import http from 'node:http'; import {createRequire} from 'node:module'; import {readFileSync} from 'node:fs';
const {chromium} = createRequire(import.meta.url)('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const M = 'http://127.0.0.1:54321', W = 'http://127.0.0.1:54404';
const HERR = process.argv[2] && process.argv[2].endsWith('.html') ? process.argv[2] : '/home/user/VIVALDI/entregables/software/planicie-herramienta-final.html';
const crm = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json');
  if (req.headers.authorization !== 'Bearer token-crm') { res.statusCode = 401; return res.end('{}'); }
  res.end(JSON.stringify({data: [{codigo: 'C-1', nombres: 'Elena Campos', telefono: '977 111 222', estado: 'Interesado', vendedor: 'Ana Flores', proyecto: 'Portada'},
    {codigo: 'C-2', nombres: 'Mario Ruiz', telefono: '966 333 444', estado: 'Visita programada', vendedor: 'Beto Ruiz', proyecto: 'Lirios del Mar'}]})); }).listen(54403);
// la herramienta se sirve por http (como en producción)
const web = http.createServer((req, res) => { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); res.end(readFileSync(HERR)); }).listen(54404);
Object.assign(process.env, {SUPABASE_URL: M, SUPABASE_ANON_KEY: 'anon-test-key', SUPABASE_SERVICE_ROLE_KEY: 'service-test-key', CONECTOR_CLAVE: 'clave-conector', CRM_TOKEN: 'token-crm'});
const {atender} = await import('./conector.mts');
const b = await chromium.launch(); const errs = [];
async function dev(mail, pass) { const c = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialogo: ' + d.message()); d.accept(); });
  await p.route(/^https?:/, async r => { const u = r.request().url();
    if (u.startsWith(M + '/functions/v1/conector')) { const q = r.request(); const resp = await atender(new Request(u, {method: q.method(), headers: q.headers(), body: q.method() === 'POST' ? q.postData() : undefined}));
      return r.fulfill({status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text()}); }
    if (u.startsWith(M) || u.startsWith(W)) return r.continue(); return r.abort(); });
  await p.addInitScript(cfg => { if (!localStorage.getItem('nube-config')) localStorage.setItem('nube-config', cfg); }, JSON.stringify({url: M, key: 'anon-test-key'}));
  await p.goto(W + '/herramienta.html'); await p.waitForTimeout(1500);
  if (mail) { await p.evaluate(() => document.querySelector('#nubeBtn').click()); await p.fill('#nubeMail', mail); await p.fill('#nubePass', pass); await p.click('#nubeGo'); await p.waitForTimeout(2500); await p.click('#nubeX').catch(() => {}); }
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('conectar').scrollIntoView(); }); await p.click('#conectar [data-t="crm"]'); await p.waitForTimeout(800); return p; }

// asesora: ve la explicación, no el formulario
const ana = await dev('ana@vivaldi.pe', 'clave-ana');
ok(/configura la jefatura/.test(await ana.textContent('#cnCrm')) && !(await ana.$('#cnProbar')), 'una asesora ve la explicación, sin poder configurar');
// jefatura: configura, prueba y guarda
const jefa = await dev('jefa@vivaldi.pe', 'clave-jefa');
ok(!!(await jefa.$('#cnProbar')), 'la jefatura ve el formulario del conector');
await jefa.selectOption('#cnTipo', 'api'); await jefa.waitForTimeout(200);
await jefa.fill('#cnTf [data-k="url"]', 'http://127.0.0.1:54403/clientes'); await jefa.fill('#cnTf [data-k="lista"]', 'data'); await jefa.fill('#cnTf [data-k="secreto"]', 'CRM_TOKEN');
await jefa.fill('#cnNm', 'CRM de Vivaldi'); await jefa.click('#cnProbar'); await jefa.waitForTimeout(1500);
const pr = await jefa.textContent('#cnPr'); ok(/Conexión correcta: 2 registros/.test(pr), 'probar conexión lee el CRM: ' + pr.slice(0, 80));
ok(/Elena Campos/.test(pr) && /La Portada del Sol/.test(pr) && /977111222/.test(pr), 'vista previa con nombre, celular y proyecto entendidos');
ok(await jefa.$eval('#cnPr select[data-cm="adv"]', s => s.value) === 'vendedor', 'reconoce «vendedor» como asesor');
await jefa.click('#cnGuardarC'); await jefa.waitForTimeout(3500);
const lista = await jefa.textContent('#cnCL'); ok(/CRM de Vivaldi/.test(lista) && /2 nuevos/.test(lista), 'el conector queda guardado y ya sincronizó: ' + lista.replace(/\s+/g, ' ').slice(0, 160));
// Ana recibe a Elena (su cliente en el CRM) en su herramienta
await ana.evaluate(() => vivaldiNube.sync()); await ana.waitForTimeout(2500);
const cl = await ana.evaluate(() => CLIENTS.map(c => c.name + '|' + c.stage + '|' + c.proj));
ok(cl.includes('Elena Campos|Nuevo|La Portada del Sol') && !cl.some(x => x.startsWith('Mario Ruiz')), 'Ana ve a Elena en Mis clientes (y no a Mario, que es de Beto): ' + cl.join(', '));
// botones de la lista
await jefa.click('#cnCL [data-cp]'); await jefa.waitForTimeout(800); ok(/en pausa/.test(await jefa.textContent('#cnCL')), 'se puede pausar');
await jefa.click('#cnCL [data-cs]'); await jefa.waitForTimeout(1500); ok(/0 nuevos/.test(await jefa.textContent('#cnCL')), '«Sincronizar ahora» funciona y no duplica');
const AX = '/tmp/claude-0/-home-user-VIVALDI/7bd92c7c-6d6a-5e61-b705-7cd0107bf55e/scratchpad/npmdl/axe/package/axe.min.js';
try { await jefa.addScriptTag({path: AX}); const v = await jefa.evaluate(async () => (await axe.run('#conectar')).violations.map(x => x.id + ':' + x.nodes.length)); ok(!v.length, 'accesibilidad de la pestaña: ' + JSON.stringify(v)); } catch (e) {}
// demostración sin base de datos: ejemplo rotulado
const c3 = await b.newContext({viewport: {width: 1366, height: 900}}); const d = await c3.newPage(); await d.route(/^https?:/, r => r.request().url().startsWith(W) ? r.continue() : r.abort());
await d.goto(W + '/herramienta.html?demo=1'); await d.waitForTimeout(2500); await d.evaluate(() => document.getElementById('conectar').scrollIntoView()); await d.click('#conectar [data-t="crm"]'); await d.waitForTimeout(400);
ok((await d.$$('#cnCrm .cn-ej')).length === 2, 'en la demostración se ve un ejemplo rotulado como «Ejemplo»');
ok(!errs.length, 'sin errores ' + JSON.stringify(errs));
await b.close(); crm.close(); web.close();
