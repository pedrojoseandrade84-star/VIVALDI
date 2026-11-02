const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader"]}); const errs = [];
  const p = await (await b.newContext({viewport: {width: 1300, height: 820}})).newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(7000);
  const before = await p.evaluate(() => __sim.controls.target.toArray().map(v => +v.toFixed(1)));
  await p.mouse.dblclick(650, 600); await p.waitForTimeout(3500);
  console.log("objetivo", before, "->", await p.evaluate(() => __sim.controls.target.toArray().map(v => +v.toFixed(1))));
  console.log("errors", errs); await b.close(); })();
