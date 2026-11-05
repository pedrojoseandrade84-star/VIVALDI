const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + __dirname + '/cotizacion.html'); await p.waitForTimeout(500);
  await p.pdf({path: process.argv[2], format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Arial;font-size:7.5px;color:#66757F;padding:0 15mm;display:flex;justify-content:space-between"><span>Cotización COT-2026-002 · Pedrojose Andrade Paredes</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
    margin: {top: '16mm', bottom: '18mm', left: '15mm', right: '15mm'}}); await b.close(); })();
