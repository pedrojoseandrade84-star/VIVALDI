const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader"]}); const errs = [];
  const p = await (await b.newContext({viewport: {width: 500, height: 350}})).newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(2500);
  await p.evaluate(() => { __sim.state.prog.pisos = 3; __sim.regen(); __sim.state.mode = "walk"; __sim.state.floor = 0; __sim.applyMode(true); });
  for (let lvl = 0; lvl < 2; lvl++) {
    await p.evaluate(lvl => { const s = __sim.stairs.find(x => x.lvl === lvl), w = __sim.walk, h = __sim.state.norm.h; w.x = (s.x0 + s.x1) / 2; w.z = s.up ? s.z1 - 0.5 : s.z0 + 0.5; w.y = lvl * h + h * (1 - 0.5 / (s.z1 - s.z0)); w.yaw = s.up ? Math.PI : 0; }, lvl);
    await p.keyboard.down("w"); await p.waitForTimeout(6000); await p.keyboard.up("w");
    console.log("tramo", lvl, await p.evaluate(() => JSON.stringify({floor: __sim.state.floor, y: +__sim.walk.y.toFixed(2), z: +__sim.walk.z.toFixed(2)})));
  }
  // bajar
  await p.evaluate(() => { const s = __sim.stairs.find(x => x.lvl === 1), w = __sim.walk, h = __sim.state.norm.h; w.x = (s.x0 + s.x1) / 2; w.z = s.up ? s.z1 + 0.3 : s.z0 - 0.3; w.y = 2 * h; w.yaw = s.up ? 0 : Math.PI; });
  await p.keyboard.down("w"); await p.waitForTimeout(12000); await p.keyboard.up("w");
  console.log("bajando", await p.evaluate(() => JSON.stringify({floor: __sim.state.floor, y: +__sim.walk.y.toFixed(2), z: +__sim.walk.z.toFixed(2)})));
  console.log("errors", errs); await b.close(); })();
