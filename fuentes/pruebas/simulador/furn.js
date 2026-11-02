const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html", STEP = +process.argv[2] || 1;
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]});
  const p = await (await b.newContext({viewport: {width: 400, height: 300}})).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(6000);
  const res = await p.evaluate(STEP => {
    const S = __sim.state, projs = ["planicie", "terrazas", "esmeralda", "portada", "lirios", "bahia", "otro"], usos = ["playa", "vivienda", "renta", "bodega", "restaurante", "hospedaje", "comercio"];
    const dims = {planicie: [8, 25], terrazas: [8, 25], esmeralda: [10, 25], portada: [6, 15], lirios: [6, 15], bahia: [8, 20], otro: [8, 20]};
    const by = {}, ej = []; let n = 0, k = 0, doorsN = 0; window.__furnLog = true; const t0 = performance.now();
    for (const pr of projs) for (const u of usos) for (const pisos of [1, 2, 3]) for (const opt of ["compacta", "equilibrada", "maxima"]) for (const dorm of [1, 3, 6]) {
      if (k++ % STEP) continue;
      S.proj = pr; [S.W, S.D] = dims[pr]; S.prog.estilo = u; S.prog.pisos = pisos; S.opt = opt; S.prog.dorm = dorm; S.prog.banos = Math.min(4, dorm); S.prog.piscina = dorm !== 1;
      window.__furnLog = true; __sim.regen(true); n++; const F = window.__furnLog, d = __sim.design, h = S.norm.h;
      for (let lvl = 0; lvl < d.pisos; lvl++) {
        const L = d.rooms.filter(r => r.lvl === lvl), closed = L.filter(r => !r.open);
        closed.filter(r => r.type !== "stair").forEach(r => __sim.roomDoors(r, closed, lvl, d.z0, L).forEach(dd => { doorsN++;
          // zona de paso: el vano y 0.75 m a cada lado del muro
          const a = dd.a + 0.08, bb = dd.b - 0.08, z0 = dd.c - 0.75, z1 = dd.c + 0.75, y0 = lvl * h + 0.08, y1 = lvl * h + 1.9;
          const hit = F.find(f => f[4] - f[1] > 0.06 && f[1] < y1 && f[4] > y0 && (dd.o === "h" ? (f[0] < bb && f[3] > a && f[2] < z1 && f[5] > z0) : (f[2] < bb && f[5] > a && f[0] < z1 && f[3] > z0)));
          if (hit) { const key = r.type + (dd.main ? " (principal)" : ""); by[key] = (by[key] || 0) + 1; if (ej.length < 10) ej.push(`${pr}/${u}/${pisos}p/${opt}/${dorm}d piso ${lvl + 1}: ${r.name}`); }
        }));
      }
    }
    window.__furnLog = null;
    return {casas: n, puertas: doorsN, bloqueadas: Object.values(by).reduce((a, b) => a + b, 0), porTipoDeAmbiente: by, ej, seg: Math.round((performance.now() - t0) / 1000)};
  }, STEP);
  console.log(JSON.stringify(res, null, 1)); console.log("errors", errs.slice(0, 3)); await b.close(); })();
