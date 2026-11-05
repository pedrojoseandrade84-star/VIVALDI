const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const q of ['', '?asesor=rosa-quispe&n=Rosa%20Quispe&t=987654321']) { const p = await (await b.newContext({viewport: {width: 1366, height: 900}})).newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/^https?:/, r => r.abort());
    await p.goto('file:///home/user/VIVALDI/entregables/web/Vivaldi-web-whatsapp.html' + q); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelector('#projGrid').scrollIntoView()); await p.waitForTimeout(600);
    await p.click('#projGrid [data-sheet="terrazas"]'); await p.waitForTimeout(800);
    const h = await p.evaluate(() => { const l = document.querySelector('#sheetBody .vv-land'); return l ? l.getAttribute('href') : null; });
    console.log((h && /landings\/terrazas\.html/.test(h) && (!q || /asesor=rosa-quispe/.test(h)) ? 'OK   ' : 'FAIL ') + 'ficha → página del proyecto: ' + h);
    await p.close(); }
  console.log('errores', errs); await b.close(); })();
