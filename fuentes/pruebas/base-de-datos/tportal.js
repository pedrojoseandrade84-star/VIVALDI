// Portal Mi Vivaldi contra el servidor de prueba (PostgreSQL real con RLS): lotes en línea, separación, comprador y asesor
const {chromium} = require('playwright'); const fs = require('fs'); const M = 'http://127.0.0.1:54321', D = __dirname;
const {execSync} = require('child_process'); const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -At -d vv -c "${s}"`, {encoding: 'utf8'}).trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ANA = '00000000-0000-0000-0000-00000000000a';
const H = {apikey: 'anon-test-key', 'Content-Type': 'application/json'};
const req = async (path, {method = 'GET', body, tok} = {}) => { const r = await fetch(M + path, {method, headers: {...H, Authorization: 'Bearer ' + (tok || 'anon-test-key')}, body: body ? JSON.stringify(body) : undefined}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return {s: r.status, j}; };
(async () => {
  // datos: 3 lotes de Planicie y una venta con cronograma, de Ana
  q("update perfiles set codigo='ana', celular='911111111' where nombre='Ana Flores'; update perfiles set codigo='beto', celular='922222222' where nombre='Beto Ruiz'");
  q(`delete from accesos_comprador; delete from solicitudes where celular in ('987222444','987333555'); delete from registros where id like 'lotes:tp-%' or id like 'cobranza:tp-%'`);
  q(`insert into registros (id, coleccion, asesor, contenido) values
    ('lotes:tp-a1', 'lotes', '${ANA}', '{\\"proj\\":\\"La Planicie de Asia\\",\\"mz\\":\\"A\\",\\"lt\\":\\"1\\",\\"area\\":200,\\"price\\":29000,\\"loc\\":\\"Interior\\",\\"st\\":\\"Disponible\\",\\"client\\":\\"\\"}'),
    ('lotes:tp-a2', 'lotes', '${ANA}', '{\\"proj\\":\\"La Planicie de Asia\\",\\"mz\\":\\"A\\",\\"lt\\":\\"2\\",\\"area\\":200,\\"price\\":29000,\\"loc\\":\\"Interior\\",\\"st\\":\\"Vendido\\",\\"client\\":\\"Cliente Privado\\"}'),
    ('lotes:tp-a3', 'lotes', '${ANA}', '{\\"proj\\":\\"La Planicie de Asia\\",\\"mz\\":\\"A\\",\\"lt\\":\\"3\\",\\"area\\":200,\\"price\\":31500,\\"loc\\":\\"Frente al parque\\",\\"st\\":\\"Bloqueado\\"}'),
    ('cobranza:tp-1', 'cobranza', '${ANA}', '{\\"name\\":\\"Rocío Vargas\\",\\"phone\\":\\"987000111\\",\\"projName\\":\\"La Planicie de Asia\\",\\"lot\\":\\"Mz A Lt 2\\",\\"at\\":\\"2026-06-01\\",\\"sched\\":[{\\"i\\":0,\\"d\\":\\"2026-06-01\\",\\"amt\\":5800},{\\"i\\":1,\\"d\\":\\"2026-07-01\\",\\"amt\\":644.44},{\\"i\\":2,\\"d\\":\\"2099-01-01\\",\\"amt\\":644.44}],\\"paid\\":{\\"0\\":\\"2026-06-01\\",\\"1\\":\\"2026-07-02\\"}}')`);
  // 1) visitante: lotes públicos sin nombres de clientes y sin bloqueados
  const lp = await req('/rest/v1/rpc/lotes_publicos', {method: 'POST', body: {}}); const mine = (lp.j || []).filter(l => /^lotes:tp-/.test(l.id));
  ok(mine.length === 2 && mine.find(l => l.id === 'lotes:tp-a1').disponible === true && mine.find(l => l.id === 'lotes:tp-a2').disponible === false, 'visitante ve lotes libres y ocupados, sin los bloqueados');
  ok(!JSON.stringify(lp.j).includes('Cliente Privado'), 'visitante no ve nombres de clientes');
  const anonReg = await req('/rest/v1/registros?select=id&coleccion=eq.lotes'); ok(Array.isArray(anonReg.j) ? anonReg.j.length === 0 : anonReg.s >= 400, 'visitante no lee la tabla de registros');

  const b = await chromium.launch(); const errs = [];
  const page = async (opt = {}) => { const ctx = await b.newContext({viewport: {width: 1280, height: 860}, ...opt}); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort()); return {ctx, p}; };
  const src = fs.readFileSync('/home/user/VIVALDI/entregables/web/portal.html', 'utf8'); fs.writeFileSync(D + '/portal_db.html', src.replace('const BASE = {url: "", key: ""};', `const BASE = {url: "${M}", key: "anon-test-key"};`));
  const URL = `file://${D}/portal_db.html`;
  // 2) cliente pide separar desde el enlace de Beto
  let {ctx, p} = await page(); const pops = []; ctx.on('request', r => pops.push(r.url()));
  await p.goto(URL + '?asesor=beto&n=Beto%20Ruiz&t=922222222#lotes'); await p.waitForTimeout(1200);
  ok(!(await p.isVisible('#demoBar')), 'con base de datos no muestra el aviso de demostración');
  await p.click('.lt.disp[data-id="lotes:tp-a1"]'); await p.fill('#sN', 'Gabriela Soto Ramos'); await p.fill('#sD', '41234567'); await p.fill('#sT', '987222444'); await p.fill('#sC', 'Gabriela.Soto@Gmail.com'); await p.check('#sOk');
  await p.click('#fSep button[type=submit]'); await p.waitForTimeout(1200);
  const s1 = q(`select s.tipo||'|'||s.lote||'|'||s.dni||'|'||s.correo||'|'||p.nombre||'|'||s.origen from solicitudes s join perfiles p on p.id=s.asesor where s.celular='987222444'`);
  ok(s1 === 'separacion|lotes:tp-a1|41234567|gabriela.soto@gmail.com|Beto Ruiz|Portal Mi Vivaldi', 'pedido de separación guardado y asignado al asesor del enlace: ' + s1);
  await p.click('#sWa'); await p.waitForTimeout(500); ok(pops.some(u => /wa\.me\/51922222222/.test(u)), 'el aviso por WhatsApp va al celular del asesor');
  await ctx.close();
  // 3) Beto separa el lote desde su solicitud; luego Ana ya no puede separarlo
  ({ctx, p} = await page()); await p.goto(URL + '#asesor'); await p.fill('#aM', 'beto@vivaldi.pe'); await p.fill('#aP', 'clave-beto'); await p.click('#fA button'); await p.waitForTimeout(1500);
  ok(/Gabriela Soto Ramos/.test(await p.textContent('#aBody')), 'el asesor ve la solicitud de separación');
  await p.click('.card:has-text("Gabriela Soto Ramos") [data-sep]'); await p.waitForTimeout(300); await p.click('#fDs button[type=submit]'); await p.waitForTimeout(1200);
  ok(/Lote separado/.test(await p.textContent('#dMsg')), 'asesor separa el lote');
  ok(q(`select contenido->>'st'||'|'||(contenido->>'client') from registros where id='lotes:tp-a1'`) === 'Separado|Gabriela Soto Ramos', 'lote queda separado en el inventario compartido');
  ok(q(`select estado from solicitudes where celular='987222444'`) === 'en herramienta', 'la solicitud queda atendida');
  ok(q(`select count(*) from historial where registro='lotes:tp-a1'`) !== '0', 'el cambio queda en el historial');
  await ctx.close();
  const ana = (await req('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: 'ana@vivaldi.pe', password: 'clave-ana'}})).j.access_token;
  const dup = await req('/rest/v1/rpc/separar_lote', {method: 'POST', tok: ana, body: {p_lote: 'lotes:tp-a1', p_cliente: 'Otro Cliente', p_celular: '987999888', p_solicitud: null}});
  ok(dup.s === 200 && (dup.j === false || (Array.isArray(dup.j) && (dup.j[0] === false || (dup.j[0] && dup.j[0].separar_lote === false)))), 'otro asesor no puede separar el mismo lote: ' + JSON.stringify(dup.j));
  // 4) comprador sin acceso todavía
  ({ctx, p} = await page()); await p.goto(URL + '#comprador'); await p.fill('#cM', 'rocio.vargas@gmail.com'); await p.click('#fMail button'); await p.waitForTimeout(800);
  await p.fill('#cC', '000000'); await p.click('#fCode button[type=submit]'); await p.waitForTimeout(800); ok(/no es correcto/.test(await p.textContent('#cMsg')), 'código incorrecto rechazado');
  await p.click('#cOtro'); await p.click('#fMail button'); await p.waitForTimeout(800); await p.fill('#cC', '246810'); await p.click('#fCode button[type=submit]'); await p.waitForTimeout(1200);
  ok(/Todavía no hay compras/.test(await p.textContent('#compras')), 'comprador sin acceso no ve compras');
  const buyer = JSON.parse(await p.evaluate(() => localStorage.getItem('vv-portal'))).access;
  const br = await req('/rest/v1/registros?select=id', {tok: buyer}); ok(Array.isArray(br.j) && br.j.length === 0, 'comprador no lee la tabla de registros');
  const bp = await req('/rest/v1/rpc/separar_lote', {method: 'POST', tok: buyer, body: {p_lote: 'lotes:tp-a1', p_cliente: 'Hacker', p_celular: '987999888', p_solicitud: null}}); ok(bp.s >= 400, 'comprador no puede separar lotes');
  const bs = await req('/rest/v1/solicitudes?select=id', {tok: buyer}); ok(Array.isArray(bs.j) && bs.j.length === 0, 'comprador no ve solicitudes de otros');
  // 5) Beto no puede dar acceso a una venta de Ana; Ana sí, desde Mis ventas
  const beto = (await req('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: 'beto@vivaldi.pe', password: 'clave-beto'}})).j.access_token;
  const ba = await req('/rest/v1/accesos_comprador', {method: 'POST', tok: beto, body: {correo: 'rocio.vargas@gmail.com', registro: 'cobranza:tp-1'}}); ok(ba.s >= 400, 'un asesor no puede dar acceso a la venta de otro');
  const {ctx: c2, p: p2} = await page(); await p2.goto(URL + '#asesor'); await p2.fill('#aM', 'ana@vivaldi.pe'); await p2.fill('#aP', 'clave-ana'); await p2.click('#fA button'); await p2.waitForTimeout(1200);
  await p2.click('[data-t="ven"]'); await p2.waitForTimeout(1200);
  await p2.fill('form.inline[data-r="cobranza:tp-1"] input', 'Rocio.Vargas@gmail.com'); await p2.click('form.inline[data-r="cobranza:tp-1"] button'); await p2.waitForTimeout(1200);
  ok(q(`select correo from accesos_comprador where registro='cobranza:tp-1'`) === 'rocio.vargas@gmail.com', 'asesora da acceso al comprador');
  await c2.close();
  // 6) el comprador ve su compra y su cronograma
  await p.reload(); await p.waitForTimeout(1500);
  const t = (await p.textContent('#compras')).replace(/\s+/g, ' ');
  ok(/La Planicie de Asia/.test(t) && /Mz A Lt 2/.test(t) && /S\/ 6,444/.test(t) && /1 de 2/.test(t) && /Ana/.test(t), 'comprador ve su compra, lo pagado y su asesora: ' + t.slice(0, 160));
  const otra = q(`select count(*) from accesos_comprador where correo='gabriela.soto@gmail.com'`); ok(otra === '0', 'nadie más tiene acceso');
  await ctx.close(); await b.close();
  ok(!errs.length, 'sin errores en la página ' + JSON.stringify(errs));
})();
