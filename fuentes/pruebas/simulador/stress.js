const {chromium, devices} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]}); const errs = [];
  const p = await (await b.newContext({viewport: {width: 1300, height: 850}})).newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text()); });
  await p.goto(F); await p.waitForTimeout(3000);
  const res = await p.evaluate(() => {
    const S = __sim.state, out = [], projs = ["planicie", "terrazas", "esmeralda", "portada", "lirios", "bahia", "otro"], usos = ["playa", "vivienda", "renta", "bodega", "restaurante", "hospedaje", "comercio"];
    const dims = {planicie: [8, 25], terrazas: [8, 25], esmeralda: [10, 25], portada: [6, 15], lirios: [6, 15], bahia: [8, 20], otro: [8, 20]};
    let n = 0;
    for (const pr of projs) for (const u of usos) for (const pisos of [1, 2, 3]) for (const opt of ["compacta", "equilibrada", "maxima"]) for (const dorm of [1, 3, 6]) {
      S.proj = pr; [S.W, S.D] = dims[pr]; S.prog.estilo = u; S.prog.pisos = pisos; S.opt = opt; S.prog.dorm = dorm; S.prog.banos = Math.min(4, dorm); S.prog.piscina = dorm !== 1;
      let d; try { d = __sim.generate(); } catch (e) { out.push(`${pr}/${u}/${pisos}/${opt}/${dorm}: EXC ${e.message}`); continue; } n++;
      const bad = [];
      d.rooms.forEach(r => { if (![r.x, r.z, r.w, r.d].every(Number.isFinite)) bad.push("nan " + r.name); if (r.x < -0.01 || r.z < -0.01 || r.x + r.w > d.W + 0.01 || r.z + r.d > d.D + 0.01) bad.push("fuera " + r.name); if (r.w < 0.9 || r.d < 0.9) bad.push(`diminuto ${r.name} ${r.w.toFixed(2)}x${r.d.toFixed(2)}`); });
      for (let i = 0; i < d.rooms.length; i++) for (let j = i + 1; j < d.rooms.length; j++) { const a = d.rooms[i], c = d.rooms[j]; if (a.lvl !== c.lvl) continue; const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oz = Math.min(a.z + a.d, c.z + c.d) - Math.max(a.z, c.z); if (ox > 0.05 && oz > 0.05) bad.push(`solape ${a.name}/${c.name}`); }
      if (d.pool) { const q = d.pool; d.rooms.filter(r => r.lvl === 0).forEach(r => { const ox = Math.min(q.x + q.w, r.x + r.w) - Math.max(q.x, r.x), oz = Math.min(q.z + q.d, r.z + r.d) - Math.max(q.z, r.z); if (ox > 0.05 && oz > 0.05) bad.push("piscina sobre " + r.name); }); }

      if (bad.length) out.push(`${pr}/${u}/${pisos}p/${opt}/${dorm}d: ${[...new Set(bad)].slice(0, 4).join(", ")}`);
    }
    return {n, out};
  });
  console.log("combos", res.n, "con problemas", res.out.length); res.out.slice(0, 40).forEach(x => console.log(" ", x));
  // fuga de memoria: 15 reconstrucciones
  const m0 = await p.evaluate(() => { __sim.state.proj = "planicie"; __sim.state.W = 8; __sim.state.D = 25; __sim.regen(); return JSON.stringify(__sim.renderer.info.memory); });
  for (let i = 0; i < 15; i++) await p.evaluate(i => { __sim.state.prog.pisos = 1 + i % 3; __sim.regen(true); }, i);
  await p.evaluate(() => { __sim.state.prog.pisos = 2; __sim.regen(true); }); await p.waitForTimeout(500);
  console.log("memoria antes", m0, "después", await p.evaluate(() => JSON.stringify(__sim.renderer.info.memory)));
  // cámara: ¿salta al cambiar un campo?
  await p.evaluate(() => { __sim.state.mode = "ext"; __sim.applyMode(false); __sim.cam.position.set(30, 20, -30); });
  await p.selectOption("#pisos", "1"); await p.waitForTimeout(300);
  console.log("cámara tras cambiar pisos", await p.evaluate(() => __sim.cam.position.toArray().map(v => v.toFixed(1)).join(",")));
  console.log("errors", [...new Set(errs)].slice(0, 15)); await b.close(); })();
