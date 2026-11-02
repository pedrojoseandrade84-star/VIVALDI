// Captura del simulador: fotos de la página en momentos clave + giros de cámara renderizados directamente. Escribe timeline.json.
const {chromium} = require('playwright'); const fs = require('fs'); const D = __dirname + '/sc'; fs.rmSync(D, {recursive: true, force: true}); fs.mkdirSync(D);
(async () => { const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']}); const p = await (await b.newContext({viewport: {width: 1280, height: 720}})).newPage();
  await p.route(/^https?:/, r => r.abort()); const errs = []; p.on('pageerror', e => errs.push(e.message)); const T0 = Date.now();
  await p.goto('file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html'); await p.waitForTimeout(6000);
  const TL = []; let n = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fixScroll = () => p.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollLeft) e.scrollLeft = 0; }); });
  const shot = async () => { await fixScroll(); const f = `${D}/p${String(n++).padStart(3, '0')}.jpg`; await p.screenshot({path: f, type: 'jpeg', quality: 92}); return f; };
  const center = async sel => { const bb = await p.locator(sel).first().boundingBox(); return [Math.round(bb.x + bb.width / 2), Math.round(bb.y + bb.height / 2)]; };
  const still = async (dur, cur) => TL.push({t: 'still', img: await shot(), dur, cur});
  const click = async (sel, wait, hold) => { const c = await center(sel); TL.push({t: 'move', to: c}); TL.push({t: 'click', at: c}); await p.locator(sel).first().click(); await sleep(wait); TL.push({t: 'still', img: await shot(), dur: hold, cur: c}); return c; };
  const orbit = async (deg, frames, cur) => { const rect = await p.evaluate(() => { const r = __sim.renderer.domElement.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }); const imgs = [];
    await p.evaluate(() => { __sim.controls.enableDamping = false; }); await sleep(1500);
    const st0 = await p.evaluate(() => { const c = __sim.cam.position, t = __sim.controls.target; return {x: c.x - t.x, y: c.y - t.y, z: c.z - t.z}; }); const d = Math.max(30, Math.hypot(st0.x, st0.y, st0.z)), el = 27 * Math.PI / 180;
    const r = d * Math.cos(el), st = {y: d * Math.sin(el)}, a0 = Math.atan2(st0.z, st0.x);
    await p.evaluate(([r, y, a]) => { const tg = __sim.controls.target; __sim.cam.position.set(tg.x + r * Math.cos(a), tg.y + y, tg.z + r * Math.sin(a)); __sim.controls.update(); }, [r, st.y, a0]); await sleep(1200); const base = await shot();
    for (let i = 1; i <= frames; i += 10) { const batch = await p.evaluate(([i0, frames, deg, r, a0, y]) => { const s = __sim, cv = s.renderer.domElement, out = [];
        for (let i = i0; i < Math.min(i0 + 10, frames + 1); i++) { const t = i / frames, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, a = a0 + deg * Math.PI / 180 * e, tg = s.controls.target;
          s.cam.position.set(tg.x + r * Math.cos(a), tg.y + y, tg.z + r * Math.sin(a)); s.controls.update(); s.renderer.render(s.scene, s.cam); out.push(cv.toDataURL('image/jpeg', .92)); } return out; }, [i, frames, deg, r, a0, st.y]);
      batch.forEach(u => { const f = `${D}/o${String(n++).padStart(4, '0')}.jpg`; fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); imgs.push(f); }); }
    TL.push({t: 'orbit', base, rect, imgs, cur}); };
  await still(1.6, [900, 420]);
  const txt = 'Somos una familia de 5 con tres hijos y un perro, queremos una casa de playa de 2 pisos con piscina, parrilla y cochera.'; const tc = await center('#aiText');
  TL.push({t: 'move', to: tc}); TL.push({t: 'click', at: tc}); await p.locator('#aiText').click();
  for (let k = 1; k <= 6; k++) { await p.fill('#aiText', txt.slice(0, Math.round(txt.length * k / 6))); await still(.45, tc); }
  let c = await click('#aiGo', 5000, 1.4);
  await orbit(70, 90, c);
  c = await click('button[data-t="tarde"]', 1500, .6); await orbit(35, 50, c);
  c = await click('#modes button[data-m="xray"]', 2000, 2.0);
  c = await click('#modes button[data-m="cut"]', 2000, 2.0);
  c = await click('#modes button[data-m="plan"]', 2000, 2.2);
  c = await click('button[data-t="dia"]', 800, .3);
  c = await click('#modes button[data-m="site"]', 3500, 1.0); await orbit(40, 60, c);
  c = await click('#examples button >> nth=1', 600, .6); c = await click('#aiGo', 4000, .4); c = await click('#modes button[data-m="ext"]', 5000, 1.0); await orbit(-60, 80, c); await still(1.6, c);
  fs.writeFileSync(__dirname + '/timeline.json', JSON.stringify(TL)); console.log('pasos', TL.length, 'tiempo', ((Date.now() - T0) / 1000).toFixed(0), 's', errs); await b.close(); })();
