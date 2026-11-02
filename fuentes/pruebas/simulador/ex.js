const {chromium, devices} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader"]}); const errs = [];
  const p = await (await b.newContext({...devices["Pixel 7"]})).newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.route(/pollinations|groq|googleapis/, r => r.abort());   // sin internet: solo lectura local
  await p.goto(F); await p.waitForTimeout(3500); await p.tap(".tabs button[data-t=conf]");
  for (const i of [1, 2, 3, 4]) { await p.tap(`#examples button:nth-of-type(${i})`); await p.tap("#aiGo"); await p.waitForTimeout(2500);
    console.log(await p.evaluate(() => { const g = __sim.state.prog; return JSON.stringify({u: g.estilo, n: g.negocio, p: g.pisos, d: g.dorm, amb: Object.keys(g.amb || {})}); })); await p.tap(".tabs button[data-t=conf]"); }
  await p.screenshot({path: "ex.png"});
  console.log("errors", errs); await b.close(); })();
