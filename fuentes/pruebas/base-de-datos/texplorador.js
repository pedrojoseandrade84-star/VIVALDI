// Explorador 3D conectado al inventario: toma manzana, lote, estado y precio de lotes_publicos y quita el aviso de ejemplo
const {chromium} = require('playwright'); const fs = require('fs'); const M = 'http://127.0.0.1:54321', D = __dirname;
const {execSync} = require('child_process'); const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -At -d vv -c "${s}"`, {encoding: 'utf8'}).trim();
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ANA = '00000000-0000-0000-0000-00000000000a';
(async () => {
  q(`delete from registros where id like 'lotes:tx-%'`);
  const fila = (lt, st, price) => `('lotes:tx-${lt}', 'lotes', '${ANA}', '{\\"proj\\":\\"La Portada del Sol\\",\\"mz\\":\\"D\\",\\"lt\\":\\"${lt}\\",\\"area\\":90,\\"price\\":${price},\\"loc\\":\\"Interior\\",\\"st\\":\\"${st}\\",\\"client\\":\\"Cliente Privado\\"}')`;
  q(`insert into registros (id, coleccion, asesor, contenido) values ${[fila(1, 'Vendido', 37900), fila(2, 'Disponible', 38900), fila(3, 'Disponible', 37900), fila(4, 'Disponible', 39500), fila(5, 'Separado', 37900), fila(6, 'Disponible', 37900), fila(7, 'Disponible', 37900)].join(',')}`);
  const s = fs.readFileSync('/home/user/VIVALDI/entregables/experiencia/explorar-portada.html', 'utf8');
  fs.writeFileSync(D + '/explorar_db.html', s.replace('const BASE = {url: "", key: ""};', `const BASE = {url: "${M}", key: "anon-test-key"};`));
  const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1440, height: 810}}); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  await p.goto('file://' + D + '/explorar_db.html'); await p.waitForTimeout(1500);
  ok(!(await p.$('.demo')), 'con inventario conectado no muestra el aviso de disponibilidad de ejemplo');
  const hs = await p.$$('#boxF .hot'); await hs[3].hover(); await p.waitForTimeout(600);
  const t = (await p.textContent('#card')).replace(/\s+/g, ' ');
  ok(/Manzana D/.test(t) && /04/.test(t) && /S\/ 39,500/.test(t) && /Disponible/.test(t), 'la tarjeta muestra manzana, lote, estado y precio del inventario: ' + t);
  await hs[0].hover(); await p.waitForTimeout(600); ok(/No disponible/.test(await p.textContent('#card')), 'un lote vendido se muestra como no disponible');
  ok(!(await p.content()).includes('Cliente Privado'), 'no se muestran nombres de clientes');
  ok(!errs.length, 'sin errores ' + JSON.stringify(errs)); await b.close(); q(`delete from registros where id like 'lotes:tx-%'`); })();
