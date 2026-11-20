const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file:///home/user/VIVALDI/fuentes/presentacion/guia_reunion.html'); await p.waitForTimeout(500);
  await p.pdf({path: process.argv[2], format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Arial;font-size:7.5px;color:#66757F;padding:0 14mm;display:flex;justify-content:space-between"><span>Guía para la reunión · uso personal</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
    margin: {top: '13mm', bottom: '15mm', left: '14mm', right: '14mm'}}); await b.close(); })();
