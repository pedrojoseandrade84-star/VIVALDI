const {chromium, devices} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader"]}); const errs = [];
  const ctx = await b.newContext({...devices["iPhone 14"]}); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(3000);
  await p.tap(".tabs button[data-t=conf]");
  const cases = [{W: "4", D: "8"}, {W: "40", D: "80"}, {W: "", D: ""}, {W: "-5", D: "0"}, {W: "6", D: "15", n_maxP: "1", pisos: "3"}, {n_al: "80"}, {n_rf: "0", n_rp: "5"}, {n_h: "3.5", n_al: "0"}, {n_rf: "12"}];
  for (const c of cases) {
    for (const [k, v] of Object.entries(c)) { if (k === "pisos") await p.selectOption("#pisos", v); else { await p.fill("#" + k, v); await p.dispatchEvent("#" + k, "change"); } }
    await p.waitForTimeout(400);
    for (const u of ["playa", "restaurante", "hospedaje"]) { await p.selectOption("#estilo", u); await p.waitForTimeout(250); }
    const t = await p.evaluate(() => document.querySelector("#analysis").innerText + document.querySelector("#optTitle").innerText);
    const bad = /NaN|undefined|Infinity|null/.test(t);
    const d = await p.evaluate(() => ({W: __sim.state.W, D: __sim.state.D, pisos: __sim.design.pisos, rooms: __sim.design.rooms.length, maxP: __sim.state.norm.maxP, ok: __sim.design.rooms.every(r => r.w > 0.5 && r.d > 0.5)}));
    console.log(JSON.stringify(c), JSON.stringify(d), bad ? "TEXTO MALO: " + t.match(/.{0,40}(NaN|undefined|Infinity|null).{0,20}/)[0] : "");
    await p.fill("#W", "8"); await p.dispatchEvent("#W", "change"); await p.fill("#D", "25"); await p.dispatchEvent("#D", "change");
    for (const [k, v] of Object.entries({n_rf: "3", n_rp: "0", n_al: "30", n_maxP: "3", n_h: "2.7"})) { await p.fill("#" + k, v); await p.dispatchEvent("#" + k, "change"); }
  }
  console.log("errors", errs); await b.close(); })();
