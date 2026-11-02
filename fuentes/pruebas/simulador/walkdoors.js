const {chromium} = require("playwright");
const F = "file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html", STEP = +process.argv[2] || 1;
(async () => { const b = await chromium.launch({args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]});
  const p = await (await b.newContext({viewport: {width: 400, height: 300}})).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(6000);
  const res = await p.evaluate(STEP => {
    const S = __sim.state, projs = ["planicie", "terrazas", "esmeralda", "portada", "lirios", "bahia", "otro"], usos = ["playa", "vivienda", "renta", "bodega", "restaurante", "hospedaje", "comercio"];
    const dims = {planicie: [8, 25], terrazas: [8, 25], esmeralda: [10, 25], portada: [6, 15], lirios: [6, 15], bahia: [8, 20], otro: [8, 20]};
    let n = 0, k = 0, doors = 0; const fails = {centro: 0, desviado: 0}, byW = {}, ej = [];
    for (const pr of projs) for (const u of usos) for (const pisos of [1, 2, 3]) for (const opt of ["compacta", "equilibrada", "maxima"]) for (const dorm of [1, 3, 6]) {
      if (k++ % STEP) continue;
      S.proj = pr; [S.W, S.D] = dims[pr]; S.prog.estilo = u; S.prog.pisos = pisos; S.opt = opt; S.prog.dorm = dorm; S.prog.banos = Math.min(4, dorm); S.prog.piscina = dorm !== 1;
      __sim.regen(true); n++; const d = __sim.design, h = S.norm.h;
      for (let lvl = 0; lvl < d.pisos; lvl++) {
        const L = d.rooms.filter(r => r.lvl === lvl), cl = L.filter(r => !r.open);
        cl.filter(r => r.type !== "stair").forEach(r => __sim.roomDoors(r, cl, lvl, d.z0, L).forEach(dd => { doors++;
          const m = (dd.a + dd.b) / 2, w = (dd.b - dd.a).toFixed(2), feet = lvl * h;
          const path = off => { for (let t = -0.6; t <= 0.6; t += 0.05) { const x = dd.o === "h" ? m + off : dd.c + t, z = dd.o === "h" ? dd.c + t : m + off; if (__sim.blocked(x, z, feet)) return false; } return true; };
          if (!path(0)) { fails.centro++; byW[w] = (byW[w] || 0) + 1; if (ej.length < 8) ej.push(`${pr}/${u}/${pisos}p/${opt}/${dorm}d P${lvl + 1} ${r.name} ancho ${w}`); }
          else if (!path(0.1) || !path(-0.1)) fails.desviado++;
        }));
      }
    }
    return {casas: n, puertas: doors, noPasaPorElCentro: fails.centro, noPasaDesviado10cm: fails.desviado, porAncho: byW, ej};
  }, STEP);
  console.log(JSON.stringify(res, null, 1)); console.log("errors", errs.slice(0, 3)); await b.close(); })();
