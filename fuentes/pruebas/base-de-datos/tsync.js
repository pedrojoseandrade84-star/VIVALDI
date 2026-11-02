const {chromium} = require("playwright"); const F = "file://" + process.argv[2]; const M = "http://127.0.0.1:54321";
const ctl = c => fetch(M + "/__ctl?c=" + c).then(r => r.json());
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
async function dev(b, name, seed) {
  const ctx = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await ctx.newPage(); p.errs = [];
  p.on("pageerror", e => p.errs.push(e.message)); p.on("dialog", d => d.accept());
  await p.route(/^https?:/, r => r.request().url().startsWith(M) ? r.continue() : r.abort());
  await p.addInitScript(([cfg, seed]) => { if (!localStorage.getItem("nube-config")) { localStorage.setItem("nube-config", cfg); for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, JSON.stringify(v)); } }, [JSON.stringify({url: M, key: "anon-test-key"}), seed]);
  await p.goto(F + "#clientes"); await p.waitForTimeout(1200); p.label = name; return p;
}
const login = async (p, mail, pass) => { await p.evaluate(() => document.querySelector("#nubeBtn").click()); await p.fill("#nubeMail", mail); await p.fill("#nubePass", pass); await p.click("#nubeGo"); await p.waitForTimeout(2500); return p.evaluate(() => ({btn: document.querySelector("#nubeBtn").innerText, msg: document.querySelector("#nubeMsg").innerText})); };
const sync = p => p.evaluate(() => vivaldiNube.sync());
const names = p => p.evaluate(() => CLIENTS.map(c => c.name).sort().join(","));
(async () => {
  const b = await chromium.launch();
  const ana = await dev(b, "ana", {"vivaldi-clientes-v1": [{id: "a1", created: "2026-10-01", name: "Lucía Torres", phone: "987111222", proj: "La Planicie de Asia", stage: "Nuevo"}, {id: "a2", created: "2026-10-02", name: "Jorge Ramos", phone: "987333444", proj: "La Planicie de Asia", stage: "Contactado"}],
    "vivaldi-lotes-v1": [{id: "L1", mz: "A", lt: "1", st: "Disponible", area: 200, price: 50000}]});
  ok((await ana.evaluate(() => document.querySelector("#nubeBtn").innerText)) === "Sin conectar", "estado inicial sin conectar");
  let r = await login(ana, "ana@vivaldi.pe", "mala"); ok(/incorrectos/.test(r.msg), "contraseña errada: " + r.msg);
  r = await login(ana, "ana@vivaldi.pe", "clave-ana"); ok(r.btn === "Sincronizado", "Ana conectada: " + r.btn + " | " + r.msg);
  ok((await ana.evaluate(() => document.querySelector("#nubePass").value)) === "", "contraseña no queda en el campo");
  const sesKeys = await ana.evaluate(() => Object.keys(localStorage).filter(k => /^nube-/.test(k)).join(","));
  ok(!/^(vivaldi-|vv-)/.test(sesKeys), "sesión fuera del respaldo: " + sesKeys);

  const jefa = await dev(b, "jefa", {}); r = await login(jefa, "jefa@vivaldi.pe", "clave-jefa"); ok(r.btn === "Sincronizado", "Jefa conectada");
  ok((await names(jefa)) === "Jorge Ramos,Lucía Torres", "Jefa ve clientes de Ana: " + await names(jefa));
  ok((await jefa.evaluate(() => INV.length)) === 1, "Jefa ve inventario");
  ok(await jefa.evaluate(() => /Jorge Ramos/.test(document.body.innerText)), "pantalla de Jefa actualizada");

  // la jefa edita un cliente de Ana desde la herramienta (guardado normal)
  await jefa.evaluate(() => { CLIENTS.find(c => c.id === "a2").stage = "Visita agendada"; localStorage.setItem("vivaldi-clientes-v1", JSON.stringify(CLIENTS)); });
  await jefa.waitForTimeout(4000); await sync(ana);
  ok((await ana.evaluate(() => CLIENTS.find(c => c.id === "a2").stage)) === "Visita agendada", "cambio de Jefa llega a Ana");
  ok((await ana.evaluate(() => JSON.parse(localStorage.getItem("vivaldi-clientes-v1")).find(c => c.id === "a2").stage)) === "Visita agendada", "y queda guardado en el equipo de Ana");

  // Ana borra un cliente
  await ana.evaluate(() => { CLIENTS = CLIENTS.filter(c => c.id !== "a1"); localStorage.setItem("vivaldi-clientes-v1", JSON.stringify(CLIENTS)); });
  await ana.waitForTimeout(4000); await sync(jefa);
  ok((await names(jefa)) === "Jorge Ramos", "borrado llega a Jefa: " + await names(jefa));

  // Beto no ve clientes de Ana, sí los lotes
  const beto = await dev(b, "beto", {}); r = await login(beto, "beto@vivaldi.pe", "clave-beto");
  ok((await beto.evaluate(() => CLIENTS.length)) === 0 && (await beto.evaluate(() => INV.length)) === 1, "Beto: 0 clientes ajenos, 1 lote");
  // Beto separa el lote: llega a todos
  await beto.evaluate(() => { INV[0].st = "Separado"; localStorage.setItem("vivaldi-lotes-v1", JSON.stringify(INV)); }); await beto.waitForTimeout(4000); await sync(ana);
  ok((await ana.evaluate(() => INV[0].st)) === "Separado", "lote separado por Beto llega a Ana");

  // usuario dado de baja
  const baja = await dev(b, "baja", {}); r = await login(baja, "baja@vivaldi.pe", "clave-baja"); ok(/no está habilitado/.test(r.msg), "usuario de baja bloqueado: " + r.msg);

  // sin señal
  await ctl("down");
  await ana.evaluate(() => { CLIENTS.unshift({id: "a9", created: "2026-11-01", name: "Carmen Sin Señal", phone: "999", proj: "La Planicie de Asia", stage: "Nuevo"}); localStorage.setItem("vivaldi-clientes-v1", JSON.stringify(CLIENTS)); });
  await ana.waitForTimeout(4500);
  r = await ana.evaluate(() => document.querySelector("#nubeBtn").innerText); ok(/Sin señal/.test(r), "sin señal: " + r);
  ok(await ana.evaluate(() => CLIENTS.some(c => c.id === "a9")), "cliente queda en el equipo");
  await ctl("up"); await sync(ana); await sync(jefa);
  ok(/Carmen Sin Señal/.test(await names(jefa)), "al volver la señal se sube: " + await names(jefa));

  // token vencido
  await ctl("expire"); await ana.evaluate(() => { CLIENTS[0].notes = "renovado"; localStorage.setItem("vivaldi-clientes-v1", JSON.stringify(CLIENTS)); }); await ana.waitForTimeout(4000);
  r = await ana.evaluate(() => document.querySelector("#nubeBtn").innerText); ok(r === "Sincronizado", "sesión renovada sola: " + r);

  // recarga: la sesión se mantiene y no duplica
  await ana.reload(); await ana.waitForFunction(() => window.vivaldiNube && document.querySelector("#nubeBtn").innerText === "Sincronizado", null, {timeout: 20000}).catch(() => {});
  ok((await ana.evaluate(() => document.querySelector("#nubeBtn").innerText)) === "Sincronizado", "tras recargar sigue conectada");
  ok((await ana.evaluate(() => CLIENTS.length)) === 2, "sin duplicados: " + await names(ana));

  // otro usuario entra en el mismo equipo de Ana: no sube los datos de Ana como suyos
  await ana.evaluate(() => { vivaldiNube; }); await ana.evaluate(() => document.querySelector("#nubeBtn").click()); await ana.click("#nubeOut"); await ana.waitForTimeout(300);
  const log0 = (await ctl("log")).length;
  r = await login(ana, "beto@vivaldi.pe", "clave-beto");
  const posts = (await ctl("log")).slice(log0).filter(x => x.startsWith("POST /rest")).length;
  ok(r.btn === "Sincronizado" && posts === 0, "Beto en el equipo de Ana no sube datos de Ana (posts " + posts + ")");
  ok((await ana.evaluate(() => CLIENTS.length)) === 0 && (await ana.evaluate(() => INV.length)) === 1, "Beto en equipo de Ana: solo ve lotes");
  await sync(jefa); ok((await names(jefa)) === "Carmen Sin Señal,Jorge Ramos", "Jefa conserva todo: " + await names(jefa));

  for (const p of [ana, jefa, beto, baja]) ok(!p.errs.length, p.label + " sin errores de página " + p.errs.join(";"));
  await b.close();
})();
