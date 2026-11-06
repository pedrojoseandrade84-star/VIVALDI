const {chromium, devices} = require("playwright"); const M = "http://127.0.0.1:54321", D = __dirname;
const {execSync} = require("child_process"); const q = s => execSync(`psql -h /var/tmp/vvpg -p 5544 -U postgres -X -q -At -d vv -c "${s}"`, {encoding: "utf8"}).trim();
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const errs = [];
  q("update perfiles set codigo='ana', celular='911111111' where nombre='Ana Flores'; update perfiles set codigo='beto', celular='922222222' where nombre='Beto Ruiz'");
  const ctx = await b.newContext(devices["iPhone 13"]); const w = await ctx.newPage(); w.on("pageerror", e => errs.push(e.message));
  await w.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  const pops = []; ctx.on("page", p => pops.push(p.url()));
  await w.goto("file://" + D + "/web_db.html?asesor=beto&n=Beto%20Ruiz&t=922222222", {timeout: 180000}); await w.waitForTimeout(2500);
  const bar = await w.evaluate(() => (document.querySelector(".vv-asesor") || {}).textContent || ""); ok(/Te atiende Beto Ruiz/.test(bar), "barra del asesor: " + bar.slice(0, 60));
  const href = await w.evaluate(() => { const a = document.querySelector('a[href*="wa.me/51922549723"]'); a.addEventListener("click", e => e.preventDefault(), {once: true}); a.click(); return a.href; });
  ok(/wa\.me\/51922222222/.test(href), "WhatsApp de la página va al celular del asesor");
  // formulario
  await w.evaluate(() => document.getElementById("contacto").scrollIntoView()); await w.waitForTimeout(500);
  await w.fill("#fName", "Cliente De Beto"); await w.fill("#fPhone", "987000111"); await w.check("#fPriv");
  await w.evaluate(() => document.getElementById("leadForm").requestSubmit()); await w.waitForTimeout(2500);
  const row = q("select p.nombre||'|'||coalesce(s.asesor_codigo,'') from solicitudes s join perfiles p on p.id=s.asesor where s.celular='987000111'");
  ok(row === "Beto Ruiz|beto", "la solicitud queda asignada a Beto: " + row);
  ok(/(wa\.me\/|phone=)51922222222/.test(pops.join(" ")), "el WhatsApp del formulario abre el del asesor: " + pops.join(" ").slice(0, 80));
  // solo con código: nombre y celular desde la base de datos
  const ctx2 = await b.newContext(); const w2 = await ctx2.newPage(); await w2.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  await w2.goto("file://" + D + "/web_db.html?asesor=ana", {timeout: 180000}); await w2.waitForTimeout(2500);
  ok(/Ana Flores/.test(await w2.evaluate(() => (document.querySelector(".vv-asesor") || {}).textContent || "")), "solo con el código, el nombre llega de la base de datos");
  await w2.goto("file://" + D + "/web_db.html"); await w2.waitForTimeout(1500);
  ok(/Ana Flores/.test(await w2.evaluate(() => (document.querySelector(".vv-asesor") || {}).textContent || "")), "el asesor se recuerda al volver a entrar");
  // precio actualizado por la jefatura
  q("insert into proyectos (id, contenido) values ('planicie', jsonb_build_object('precio', 31000, 'estado', 'Preventa')) on conflict (id) do update set contenido = excluded.contenido");
  const w3 = await (await b.newContext()).newPage(); await w3.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  await w3.goto("file://" + D + "/web_db.html"); await w3.waitForTimeout(2500);
  const card = await w3.evaluate(() => [...document.querySelectorAll("#projGrid .proj")].map(c => c.textContent).find(t => /Planicie/.test(t)) || "");
  ok(/31,000/.test(card), "la web muestra el precio actualizado por la jefatura");
  ok(!(await w3.evaluate(() => !!document.querySelector(".vv-asesor"))), "sin enlace de asesor no aparece la barra");
  console.log("errores", errs); await b.close(); })();
