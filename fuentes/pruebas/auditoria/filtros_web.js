// Comprueba que cada filtro de "Todos los proyectos" deja tarjetas visibles en la web.
// Uso: node filtros_web.js ruta/Vivaldi-web-whatsapp.html
const {chromium} = require('playwright');
const ESPERADO = {all: 7, pre: 2, obra: 1, ok: 2, asia: 5, cerro: 2};
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport: {width: 1366, height: 820}})).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500); let fallos = 0;
  for (const [k, n] of Object.entries(ESPERADO)) { await p.locator(`#filters button[data-f="${k}"]`).click(); await p.waitForTimeout(800);
    const vis = await p.evaluate(() => [...document.querySelectorAll('#projGrid > article')].filter(c => c.offsetHeight > 50 && getComputedStyle(c).display !== 'none').length);
    const ok = vis === n; if (!ok) fallos++; console.log((ok ? 'OK   ' : 'FAIL ') + k + ': ' + vis + ' de ' + n); }
  console.log('fallos', fallos, 'errores', errs); if (fallos || errs.length) process.exitCode = 1; await b.close(); })();
