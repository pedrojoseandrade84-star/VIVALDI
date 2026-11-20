// Auditoría en dispositivos: cada página en celular pequeño, celular grande, tablet vertical/horizontal y laptop.
// Revisa desborde horizontal, errores de JavaScript, texto demasiado pequeño y botones demasiado chicos para el dedo.
const {chromium, devices} = require('playwright');
const E = '/home/user/VIVALDI/entregables/';
const PAGINAS = ['web/Vivaldi-web-final.html', 'web/portal.html', 'landings/planicie.html', 'landings/lirios.html', 'landings/extranjeros.html',
  'experiencia/explorar-planicie.html', 'software/planicie-herramienta-final.html?demo=1', 'simulador/Simulador-3D-Lotes-Vivaldi.html', 'experiencia/showroom.html?ligero'];
const DISP = [['iPhone SE', {viewport: {width: 320, height: 568}, isMobile: true, hasTouch: true, deviceScaleFactor: 1}], ['Galaxy S21', {viewport: {width: 360, height: 800}, isMobile: true, hasTouch: true, deviceScaleFactor: 1}],
  ['iPhone 15', {viewport: {width: 393, height: 852}, isMobile: true, hasTouch: true, deviceScaleFactor: 1}], ['iPad vertical', {viewport: {width: 768, height: 1024}, isMobile: true, hasTouch: true, deviceScaleFactor: 1}],
  ['iPad horizontal', {viewport: {width: 1024, height: 768}, isMobile: true, hasTouch: true, deviceScaleFactor: 1}], ['Laptop', {viewport: {width: 1366, height: 768}, deviceScaleFactor: 1}]];
const solo = process.argv[2];
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}); let fallas = 0;
  for (const pag of PAGINAS.filter(p => !solo || p.includes(solo))) for (const [n, o] of DISP) {
    const c = await b.newContext(o); await c.route(/^https?:/, r => r.abort()); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    try { await p.goto('file://' + E + pag, {timeout: 120000}); } catch (e) { errs.push('carga: ' + e.message.slice(0, 80)); }
    if (pag.includes('showroom')) await p.waitForFunction(() => document.body.dataset.listo === '1', null, {timeout: 300000}).catch(() => errs.push('showroom no terminó de cargar')); else await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const W = innerWidth; const fuera = [];
      for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue; const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
        let x = el.parentElement, clip = false; while (x && x !== document.body) { const o = getComputedStyle(x); if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) { clip = true; break; } x = x.parentElement; }
        if (!clip && b.right > W + 2) fuera.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' ' + Math.round(b.right)); }
      scrollTo(9999, 0); const sx = scrollX; scrollTo(0, 0);
      const chicos = [...document.querySelectorAll('button, a[href], input, select, [role=button]')].filter(e => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width && b.height && cs.visibility !== 'hidden' && (b.width < 24 || b.height < 24) && !e.closest('p, li, td, small, label') ; }).length;
      const letra = [...document.querySelectorAll('p, li, span, a, button, label, td')].filter(e => { const b = e.getBoundingClientRect(); return b.width && e.textContent.trim().length > 3 && parseFloat(getComputedStyle(e).fontSize) < 11; }).length;
      return {sx, fuera: [...new Set(fuera)].slice(0, 4), chicos, letra}; });
    const malo = r.sx > 0 || errs.length; if (malo) fallas++;
    console.log(`${malo ? 'FAIL' : 'OK  '} ${pag.padEnd(48)} ${n.padEnd(16)} desborde:${r.sx} ${r.fuera.join(', ')} | botones<24px:${r.chicos} letra<11px:${r.letra}${errs.length ? ' | ERRORES: ' + errs.join(' ; ') : ''}`);
    await c.close(); }
  console.log('fallas', fallas); await b.close(); })();
