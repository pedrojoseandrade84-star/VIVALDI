const {chromium} = require('playwright'); const fs = require('fs'); const M = 'http://127.0.0.1:54321', D = __dirname;
const {execSync} = require('child_process'); const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -At -d vv -c "${s}"`, {encoding: 'utf8'}).trim();
const s = fs.readFileSync('/home/user/VIVALDI/entregables/landings/planicie.html', 'utf8'); fs.writeFileSync(D + '/planicie_db.html', s.replace('const BASE = {url: "", key: ""};', `const BASE = {url: "${M}", key: "anon-test-key"};`));
(async () => { const b = await chromium.launch(); const errs = [];
  q("insert into proyectos (id, contenido) values ('planicie', jsonb_build_object('precio', 31500, 'estado', 'Últimos lotes')) on conflict (id) do update set contenido = excluded.contenido");
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  await p.goto('file://' + D + '/planicie_db.html'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => [document.querySelector('[data-f="Desde"]').textContent, document.querySelector('[data-f="Estado"]').textContent, document.querySelector('#cuotaV').textContent, document.querySelector('.hero .badge').textContent]);
  console.log(r, errs); console.log(/31,500/.test(r[0]) && r[1] === 'Últimos lotes' && /700/.test(r[2]) ? 'OK   la landing toma precio y estado de la base de datos' : 'FAIL'); await b.close(); })();
