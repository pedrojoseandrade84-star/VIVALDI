// Genera el Anexo 2 del manual en PDF. Uso: node capturas_anexo2.js capturas && node anexo2_pdf.js <salida.pdf>
const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + __dirname + '/anexo2.html'); await p.waitForTimeout(800);
  await p.pdf({path: process.argv[2], format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Arial;font-size:7.5px;color:#66757F;padding:0 15mm;display:flex;justify-content:space-between"><span>Anexo 2 del manual · Herramienta de ventas y Mi Vivaldi</span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>',
    margin: {top: '14mm', bottom: '16mm', left: '15mm', right: '15mm'}}); await b.close(); })();
