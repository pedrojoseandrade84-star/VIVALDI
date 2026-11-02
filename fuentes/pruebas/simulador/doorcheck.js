const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]});
  const p = await (await b.newContext({viewport: {width: 1300, height: 850}})).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(3000);
  const res = await p.evaluate(() => {
    const S = __sim.state, projs = ["planicie", "terrazas", "esmeralda", "portada", "lirios", "bahia", "otro"], usos = ["playa", "vivienda", "renta", "bodega", "restaurante", "hospedaje", "comercio"];
    const dims = {planicie: [8, 25], terrazas: [8, 25], esmeralda: [10, 25], portada: [6, 15], lirios: [6, 15], bahia: [8, 20], otro: [8, 20]};
    const issues = {}, add = (k, v) => { (issues[k] = issues[k] || []).push(v); }; let n = 0, doorsN = 0; const anchos = {}; const sinPuerta = [];
    for (const pr of projs) for (const u of usos) for (const pisos of [1, 2, 3]) for (const opt of ["compacta", "equilibrada", "maxima"]) for (const dorm of [1, 3, 6]) {
      S.proj = pr; [S.W, S.D] = dims[pr]; S.prog.estilo = u; S.prog.pisos = pisos; S.opt = opt; S.prog.dorm = dorm; S.prog.banos = Math.min(4, dorm); S.prog.piscina = dorm !== 1;
      const d = __sim.generate(); n++; const tag = `${pr}/${u}/${pisos}p/${opt}/${dorm}d`;
      const fz0 = d.z0;
      for (let lvl = 0; lvl < d.pisos; lvl++) {
        const rooms = d.rooms.filter(r => r.lvl === lvl), closed = rooms.filter(r => !r.open);
        closed.forEach(r => {
          if (r.type === "stair") return;
          const ds = __sim.roomDoors(r, closed, lvl, fz0, rooms);
          if (!ds.length && !(Math.abs(r.z - fz0) < 0.01 && r.x === 0 && lvl === 0)) add("ambiente sin puerta", tag + " " + r.name);
          ds.forEach(dd => { doorsN++; anchos[(dd.b - dd.a).toFixed(2)] = (anchos[(dd.b - dd.a).toFixed(2)] || 0) + 1;
            const L = dd.b - dd.a - 0.1, wd = dd.b - dd.a, t = dd.main ? 0.2 : 0.13;
            // 1) la hoja abierta queda dentro de su ambiente
            if (dd.o === "h") { const z0 = dd.s > 0 ? dd.c + t / 2 : dd.c - t / 2 - L, z1 = z0 + L, x = dd.a + 0.05;
              if (x < r.x + 0.06 || x > r.x + r.w - 0.06 || z0 < r.z - 0.01 || z1 > r.z + r.d + 0.01) add("hoja fuera de su ambiente", tag + " " + r.name); }
            else { const x0 = dd.s > 0 ? dd.c + t / 2 : dd.c - t / 2 - L, x1 = x0 + L, z = dd.a + 0.05;
              if (x0 < r.x - 0.01 || x1 > r.x + r.w + 0.01 || z < r.z + 0.06 || z > r.z + r.d - 0.06) add("hoja fuera de su ambiente", tag + " " + r.name); }
            // 2) el vano no cae sobre el encuentro con otro muro
            rooms.forEach(q => { if (q === r) return;
              const edges = dd.o === "h" ? [q.x, q.x + q.w] : [q.z, q.z + q.d];
              const span = dd.o === "h" ? [q.z, q.z + q.d] : [q.x, q.x + q.w];
              edges.forEach(e => { if (e > dd.a + 0.03 && e < dd.b - 0.03 && span[0] < dd.c + 0.02 && span[1] > dd.c - 0.02 && !q.open) add("vano cruza un muro", tag + " " + r.name + "/" + q.name); });
            });
            // 3) el vano queda dentro del muro del ambiente
            if (dd.o === "h" ? (dd.a < r.x - 0.01 || dd.b > r.x + r.w + 0.01) : (dd.a < r.z - 0.01 || dd.b > r.z + r.d + 0.01)) add("vano más ancho que el muro", tag + " " + r.name);
            // 4) del otro lado hay un ambiente o el exterior (no el vacío)
          });
        });
      }
    }
    return {n, doorsN, anchos, issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, {total: v.length, ej: [...new Set(v)].slice(0, 6)}]))};
  });
  console.log(JSON.stringify(res, null, 1)); console.log("errors", errs); await b.close(); })();
