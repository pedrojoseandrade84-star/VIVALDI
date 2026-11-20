// Showroom virtual: carga sin errores, recorrido, caminar (con choques contra muros), cambio de proyecto, hora del día,
// realidad virtual (WebXR simulado: pide la sesión correcta y mueve al visitante) y accesibilidad de la interfaz.
const {chromium} = require('playwright'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = 'file:///home/user/VIVALDI/entregables/experiencia/showroom.html';
const AXE = '/tmp/claude-0/-home-user-VIVALDI/7bd92c7c-6d6a-5e61-b705-7cd0107bf55e/scratchpad/npmdl/axe/package/axe.min.js';
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}); const errs = [];
  const c = await b.newContext({viewport: {width: 1280, height: 800}}); await c.route(/^https?:/, r => r.abort());
  // WebXR simulado: el navegador dice que soporta VR y registra el pedido de sesión
  await c.addInitScript(() => { window.__xr = []; Object.defineProperty(navigator, 'xr', {value: {isSessionSupported: async m => m === 'immersive-vr', requestSession: async (m, o) => { window.__xr.push({m, o}); throw new Error('simulado'); }, addEventListener() {}}}); });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.goto(F); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => document.getElementById('load').classList.contains('out')), 'carga y quita la pantalla de espera');
  ok(await p.evaluate(() => VVS.renderer.info.render.triangles > 20000 && VVS.renderer.shadowMap.enabled && VVS.renderer.xr.enabled), 'escena completa con sombras y realidad virtual activada: ' + await p.evaluate(() => VVS.renderer.info.render.triangles) + ' triángulos');
  ok(await p.textContent('#pName') === 'La Planicie de Asia' && /200 m²/.test(await p.textContent('#pLote')) && /S\/ 29,000/.test(await p.textContent('#pPrecio')), 'ficha con datos reales del proyecto (lote, precio)');
  ok(await p.textContent('#pCuota') === 'S/ 644/mes', 'cuota referencial: 80 % en 36 cuotas sin intereses');
  // recorrido
  await p.click('.dock [data-m="tour"]'); await p.waitForTimeout(400);
  ok(await p.isVisible('#cap') && /Parada 1 de 8/.test(await p.textContent('#capN')), 'el recorrido guiado muestra la parada 1 de 8');
  await p.click('#cNext'); await p.waitForTimeout(3200); ok(/Parada 2 de 8/.test(await p.textContent('#capN')) && await p.textContent('#capT') === 'Fachada', 'avanza a la parada siguiente');
  await p.keyboard.press('3'); await p.waitForTimeout(3200);
  const dentro = await p.evaluate(() => { const g = VVS.G, c = VVS.camera.position; return c.x > g.x0 && c.x < g.x1 && c.z < g.z1 && c.z > g.z2 && c.y < g.y1; }); ok(dentro, 'la tecla 3 lleva a la sala, dentro de la casa');
  // caminar con choques
  await p.click('.dock [data-m="walk"]'); await p.waitForTimeout(500);
  ok(await p.isVisible('#hint') && await p.evaluate(() => VVS.modo) === 'walk', 'modo caminar con instrucciones');
  const y0 = await p.evaluate(() => VVS.camera.position.y); ok(Math.abs(y0 - 1.6) < .15, 'la cámara queda a la altura de los ojos (' + y0.toFixed(2) + ' m)');
  await p.focus('#c'); await p.keyboard.down('w'); await p.waitForTimeout(4500); await p.keyboard.up('w');
  const z = await p.evaluate(() => [VVS.camera.position.z, VVS.G.z1]); ok(z[0] > z[1] + .2, 'al caminar hacia la casa, el muro de la fachada detiene al visitante (no lo atraviesa)');
  // cambio de proyecto
  await p.click('#proj [data-p="lirios"]'); await p.waitForTimeout(1500);
  ok(await p.textContent('#pName') === 'Lirios del Mar de Asia' && await p.evaluate(() => VVS.G.W === 6 && VVS.G.D === 15) && /proyecto=lirios/.test(p.url()), 'cambia a Lirios: lote de 6 × 15 m y la dirección se puede compartir');
  // hora del día
  await p.evaluate(() => { const r = document.getElementById('hora'); r.value = 20; r.dispatchEvent(new Event('input')); }); await p.waitForTimeout(300);
  ok(await p.textContent('#horaV') === '20:00' && await p.evaluate(() => VVS.renderer.toneMappingExposure > .9), 'de noche se encienden las luces y cambia la exposición');
  // realidad virtual
  await p.click('#bVR'); await p.waitForTimeout(300);
  const xr = await p.evaluate(() => window.__xr); ok(xr.length === 1 && xr[0].m === 'immersive-vr' && xr[0].o.optionalFeatures.includes('local-floor'), 'el botón pide una sesión de realidad virtual (WebXR) con piso local');
  ok(await p.isVisible('#dVR'), 'si el visor no abre la sesión, explica cómo entrar con Meta Quest'); await p.click('#dVR button');
  await p.evaluate(() => VVS.vrParada(3)); ok(await p.evaluate(() => Math.abs(VVS.dolly.position.y - VVS.G.y1) < .01), 'en VR, las paradas llevan al visitante al segundo piso');
  await p.evaluate(() => VVS.dolly.position.set(0, 0, 0));
  // accesibilidad y celular
  await p.addScriptTag({content: fs.readFileSync(AXE, 'utf8')});
  const ax = await p.evaluate(async () => (await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']})).violations.map(v => v.id + ':' + v.nodes.length));
  ok(ax.length === 0, 'accesibilidad (axe, WCAG AA): ' + (ax.join(', ') || 'sin problemas'));
  await p.setViewportSize({width: 390, height: 844}); await p.waitForTimeout(500);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 390, 'en celular no se desborda: ' + sw);
  const sinVR = await b.newPage(); await sinVR.goto(F); await sinVR.waitForTimeout(2500); await sinVR.click('#bVR'); ok(await sinVR.isVisible('#dVR'), 'sin visor: muestra las instrucciones para Meta Quest'); await sinVR.close();
  ok(errs.length === 0, 'sin errores: ' + errs.join(' | '));
  await b.close(); })();
