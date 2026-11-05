const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + __dirname + '/indice.html'); await p.waitForTimeout(300);
  await p.pdf({path: process.argv[2], format: 'A4', printBackground: true, margin: {top: '13mm', bottom: '14mm', left: '15mm', right: '15mm'}}); await b.close(); })();
