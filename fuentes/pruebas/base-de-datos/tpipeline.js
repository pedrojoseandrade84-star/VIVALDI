// CRM de Vivaldi: tablero de ventas (arrastrar y soltar, teclado), ficha 360 y bandeja de conversaciones del asesor virtual.
const {chromium} = require('playwright'); const fs = require('fs');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const T = 'file:///home/user/VIVALDI/entregables/software/planicie-herramienta-final.html?demo=1#pipeline';
const AXE = '/tmp/claude-0/-home-user-VIVALDI/7bd92c7c-6d6a-5e61-b705-7cd0107bf55e/scratchpad/npmdl/axe/package/axe.min.js';
(async () => { const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1440, height: 900}}); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); await c.route(/^https?:/, r => r.abort());
  await p.goto(T); await p.waitForTimeout(2500);
  const cols = await p.$$eval('#plB .pl-col', a => a.map(x => x.dataset.st));
  ok(cols.join('|') === 'Nuevo|Contactado|Visita agendada|Separado|Vendido', 'cinco columnas por etapa: ' + cols.join(', '));
  const n = await p.$$eval('#plB .pl-card', a => a.length), nCli = await p.evaluate(() => CLIENTS.filter(c => c.stage !== 'Descartado').length);
  ok(n > 0 && n === nCli, `todas las oportunidades en el tablero (${n})`);
  const k = await p.$$eval('#plK .pl-k b', a => a.map(x => x.textContent)); ok(/S\/ [\d,.]+/.test(k[1]) && /S\/ [\d,.]+/.test(k[2]), 'indicadores: cartera y pronóstico ponderado: ' + k.join(' | '));
  // arrastrar y soltar
  const id = await p.$eval('#plB .pl-col[data-st="Nuevo"] .pl-card', e => e.dataset.id).catch(() => null);
  ok(!!id, 'hay una oportunidad en «Nuevo»');
  await p.evaluate(() => document.getElementById('plB').scrollIntoView()); await p.waitForTimeout(300);
  const sb = await p.locator(`.pl-card[data-id="${id}"]`).boundingBox(), db = await p.locator('#plB .pl-col[data-st="Visita agendada"]').boundingBox();
  await p.mouse.move(sb.x + 40, sb.y + 20); await p.mouse.down(); await p.mouse.move(sb.x + 60, sb.y + 40, {steps: 4}); await p.mouse.move(db.x + 50, db.y + 60, {steps: 10}); await p.mouse.up(); await p.waitForTimeout(300);
  const st = await p.evaluate(i => CLIENTS.find(c => c.id === i).stage, id); ok(st === 'Visita agendada', 'arrastrar la tarjeta cambia la etapa: ' + st);
  const guard = await p.evaluate(i => JSON.parse(localStorage.getItem('vivaldi-clientes-v1')).find(c => c.id === i), id);
  ok(guard && guard.stage === 'Visita agendada' && guard.stageAt, 'el cambio queda guardado con su fecha');
  ok(await p.$eval(`#plB .pl-col[data-st="Visita agendada"] .pl-card[data-id="${id}"]`, () => true).catch(() => false), 'la tarjeta aparece en su nueva columna');
  // teclado
  await p.focus(`.pl-card[data-id="${id}"]`); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  ok(await p.evaluate(i => CLIENTS.find(c => c.id === i).stage, id) === 'Separado' && await p.evaluate(i => document.activeElement.dataset.id === i, id), 'flecha → mueve a «Separado» y el foco sigue en la tarjeta');
  ok(/→ Separado/.test(await p.textContent('#plLive')), 'el cambio se anuncia a lectores de pantalla');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150);
  // ficha 360
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await p.isVisible('.p360') && (await p.textContent('#p3T')).length > 2, 'Enter abre la ficha 360');
  const facts = await p.$$eval('.p360 .facts span', a => a.map(x => x.textContent)); ok(['Celular', 'Valor', 'Origen', 'Asesor', 'Próximo contacto'].every(f => facts.includes(f)), 'la ficha muestra celular, valor, origen, asesor y próximo contacto');
  await p.click('.p360 .steps button[data-st="Contactado"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(i => CLIENTS.find(c => c.id === i).stage, id) === 'Contactado' && await p.getAttribute('.p360 .steps button[data-st="Contactado"]', 'aria-pressed') === 'true', 'desde la ficha se cambia la etapa');
  await p.fill('#p3Nota', 'Pidió plano de la manzana B'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok(/Pidió plano de la manzana B/.test(await p.textContent('.p360 ol')), 'la nota entra al historial');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok(!(await p.isVisible('.p360')) && await p.evaluate(i => document.activeElement.dataset.id === i, id), 'Escape cierra y devuelve el foco a la tarjeta');
  // seguimiento automático
  const seg = await p.$$eval('#plSeg li', a => a.length); ok(seg > 0 && /A quién escribir hoy/.test(await p.textContent('#plSeg')), 'seguimiento: lista a quién escribir hoy (' + seg + ')');
  const sid = await p.$eval('#plSeg li', e => e.dataset.id); await p.click(`#plSeg li[data-id="${sid}"] [data-s="ok"]`); await p.waitForTimeout(200);
  ok(await p.evaluate(i => { const c = CLIENTS.find(x => x.id === i); return c.next > new Date().toISOString().slice(0, 10); }, sid), '«Hecho» reprograma el próximo contacto');
  // filtros
  await p.fill('#plQ', 'zzzz-no-existe'); await p.waitForTimeout(100); ok(await p.$$eval('#plB .pl-card', a => a.length) === 0, 'la búsqueda filtra el tablero'); await p.fill('#plQ', '');
  // lista de clientes → ficha 360
  ok(await p.$$eval('#crmList [data-p360]', a => a.length) > 0, 'la lista de clientes tiene «Ficha 360»');
  // bandeja
  await p.evaluate(() => document.getElementById('conversaciones').scrollIntoView());
  ok(/Ejemplo/.test(await p.textContent('#cvT')) && await p.$$eval('#cvL .cv-it', a => a.length) === 1, 'bandeja de ejemplo: una conversación espera a un asesor');
  await p.click('#cvTabs [data-f="todas"]'); ok(await p.$$eval('#cvL .cv-it', a => a.length) === 2, 'filtro «Todas» muestra las dos');
  await p.click('#cvL .cv-it >> nth=0'); ok(await p.$$eval('#cvM .cv-b', a => a.length) === 4, 'se ve el hilo completo (cliente, asesor virtual)');
  await p.fill('#cvTx', 'Hola Carmen, soy tu asesora. Te llamo en 5 minutos.'); await p.click('#cvF button'); await p.waitForTimeout(200);
  ok(await p.$eval('#cvM .cv-b:last-child', e => e.className.includes('asesor') && e.textContent.includes('Te llamo')), 'la respuesta del asesor aparece en el hilo');
  await p.click('[data-y="devolver"]'); await p.waitForTimeout(150); ok(await p.evaluate(() => vvCRM.conversaciones[0].estado) === 'asistente', 'se puede devolver al asesor virtual');
  // barra lateral
  const nav = await p.evaluate(() => [...document.querySelectorAll('a[href="#pipeline"], a[href="#conversaciones"]')].length); ok(nav >= 2, 'la barra lateral tiene el grupo CRM');
  // accesibilidad
  await p.addScriptTag({content: fs.readFileSync(AXE, 'utf8')});
  const ax = await p.evaluate(async () => (await axe.run({include: [['#pipeline'], ['#conversaciones']]}, {runOnly: ['wcag2a', 'wcag2aa']})).violations.map(v => v.id + ':' + v.nodes.length));
  ok(ax.length === 0, 'accesibilidad (axe, WCAG AA): ' + (ax.join(', ') || 'sin problemas'));
  await p.click('#plB .pl-card >> nth=0'); await p.waitForTimeout(200);
  const ax2 = await p.evaluate(async () => (await axe.run({include: [['.p360']]}, {runOnly: ['wcag2a', 'wcag2aa']})).violations.map(v => v.id + ':' + v.nodes.length)); ok(ax2.length === 0, 'accesibilidad de la ficha 360: ' + (ax2.join(', ') || 'sin problemas'));
  await p.keyboard.press('Escape');
  // celular
  await p.setViewportSize({width: 390, height: 844}); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 390, 'en celular la página no se desborda (el tablero se desliza dentro): ' + sw);
  ok(errs.length === 0, 'sin errores: ' + errs.join(' | '));
  await p.setViewportSize({width: 1440, height: 900}); await p.evaluate(() => document.getElementById('pipeline').scrollIntoView()); await p.waitForTimeout(300);
  await p.screenshot({path: '/tmp/claude-0/-home-user-VIVALDI/7bd92c7c-6d6a-5e61-b705-7cd0107bf55e/scratchpad/pipeline.png'});
  await b.close(); })();
