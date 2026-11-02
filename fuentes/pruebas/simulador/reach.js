const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html";
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]});
  const p = await (await b.newContext({viewport: {width: 1300, height: 850}})).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(3000);
  const res = await p.evaluate(() => {
    const S = __sim.state, projs = ["planicie", "terrazas", "esmeralda", "portada", "lirios", "bahia", "otro"], usos = ["playa", "vivienda", "renta", "bodega", "restaurante", "hospedaje", "comercio"];
    const dims = {planicie: [8, 25], terrazas: [8, 25], esmeralda: [10, 25], portada: [6, 15], lirios: [6, 15], bahia: [8, 20], otro: [8, 20]};
    const bad = []; let n = 0, roomsN = 0;
    for (const pr of projs) for (const u of usos) for (const pisos of [1, 2, 3]) for (const opt of ["compacta", "equilibrada", "maxima"]) for (const dorm of [1, 3, 6]) {
      S.proj = pr; [S.W, S.D] = dims[pr]; S.prog.estilo = u; S.prog.pisos = pisos; S.opt = opt; S.prog.dorm = dorm; S.prog.banos = Math.min(4, dorm); S.prog.piscina = dorm !== 1;
      const d = __sim.generate(); n++; const rooms = d.rooms, id = new Map(rooms.map((r, i) => [r, i])), adj = rooms.map(() => new Set());
      const link = (a, b) => { adj[a].add(b); adj[b].add(a); };
      const at = (lvl, x, z) => rooms.findIndex(r => r.lvl === lvl && x > r.x + 0.01 && x < r.x + r.w - 0.01 && z > r.z + 0.01 && z < r.z + r.d - 0.01);
      const OUT = rooms.length; adj.push(new Set());   // nodo "exterior"
      const touch = (a, b) => a.lvl === b.lvl && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.abs((a.z + a.d) - b.z) < 0.02 || a.lvl === b.lvl && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.abs((b.z + b.d) - a.z) < 0.02
        || a.lvl === b.lvl && Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) > 0.5 && (Math.abs((a.x + a.w) - b.x) < 0.02 || Math.abs((b.x + b.w) - a.x) < 0.02);
      // ambientes abiertos (sin muros) se conectan con sus vecinos abiertos o escalera
      rooms.forEach((a, i) => rooms.forEach((c, j) => { if (j > i && touch(a, c) && (a.open && c.open)) link(i, j); }));
      for (let lvl = 0; lvl < d.pisos; lvl++) {
        const closed = rooms.filter(r => r.lvl === lvl && !r.open);
        closed.forEach(r => {
          const i = id.get(r);
          if (r.type === "stair") {   // abierta adelante y atrás; conecta con el piso de arriba
            [[r.x + r.w / 2, r.z - 0.2], [r.x + r.w / 2, r.z + r.d + 0.2]].forEach(([x, z]) => { const j = at(lvl, x, z); if (j >= 0) link(i, j); });
            const up = rooms.findIndex(q => q.type === "stair" && q.lvl === lvl + 1); if (up >= 0) link(i, up);
            const upAny = rooms.findIndex(q => q.lvl === lvl + 1 && r.x + r.w / 2 > q.x && r.x + r.w / 2 < q.x + q.w && r.z + r.d / 2 > q.z && r.z + r.d / 2 < q.z + q.d); if (upAny >= 0) link(i, upAny);
            return;
          }
          __sim.roomDoors(r, closed, lvl, d.z0, d.rooms.filter(q => q.lvl === lvl)).forEach(dd => {
            const m = (dd.a + dd.b) / 2, x = dd.o === "h" ? m : dd.c - dd.s * 0.2, z = dd.o === "h" ? dd.c - dd.s * 0.2 : m;
            if (dd.main) { link(i, OUT); return; }
            const j = at(lvl, x, z); if (j >= 0) link(i, j); else if (lvl === 0) link(i, OUT);
          });
        });
        // ambientes abiertos de planta baja dan al exterior (jardín/terraza)
        if (lvl === 0) rooms.forEach((r, i) => { if (r.lvl === 0 && r.open) link(i, OUT); });
      }
      const seen = new Set([OUT]), st = [OUT]; while (st.length) { const k = st.pop(); adj[k].forEach(j => { if (!seen.has(j)) { seen.add(j); st.push(j); } }); }
      rooms.forEach((r, i) => { roomsN++; if (!seen.has(i)) bad.push(`${pr}/${u}/${pisos}p/${opt}/${dorm}d: ${r.name} (piso ${r.lvl + 1})`); });
    }
    const by = {}; bad.forEach(x => { const k = x.split(": ")[1].replace(/ \d+/, " N").replace(/\(piso \d\)/, ""); by[k] = (by[k] || 0) + 1; }); return {n, roomsN, inaccesibles: bad.length, porTipo: by, ej: bad.filter(x => !/Terraza/.test(x)).slice(0, 12)};
  });
  console.log(JSON.stringify(res, null, 1)); console.log("errors", errs); await b.close(); })();
