// Firma digital de la constancia de separación: firmar con el dedo, guardar y verla en la constancia.
const {chromium} = require('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1280, height: 860}, hasTouch: true}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await c.route(/^https?:/, r => r.abort());
  await p.goto('file:///home/user/VIVALDI/entregables/software/planicie-herramienta-final.html?demo=1#cobranza'); await p.waitForTimeout(2500);
  ok(await p.isVisible('#sepFirma'), 'botón «Firma del cliente» junto a la constancia');
  const pf = await p.$$eval('#sepPf option', o => o.map(x => x.value).filter(Boolean)); if (pf.length) await p.selectOption('#sepPf', pf[0]);
  await p.click('#sepFirma'); ok(await p.isVisible('.fm canvas'), 'se abre el recuadro para firmar');
  const r = await p.locator('#fmC').boundingBox(); await p.mouse.move(r.x + 40, r.y + 120); await p.mouse.down(); for (let i = 1; i <= 20; i++) await p.mouse.move(r.x + 40 + i * 15, r.y + 120 + Math.sin(i / 2) * 30); await p.mouse.up();
  await p.click('#fmOk'); await p.waitForTimeout(300);
  ok(await p.$eval('#sepDoc .firma-cli img', e => e.src.startsWith('data:image/png') && e.naturalWidth > 0).catch(() => false) && /Firmado digitalmente el/.test(await p.textContent('#sepDoc')), 'la firma aparece en la constancia con fecha y hora');
  ok(await p.textContent('#sepFirma') === 'Volver a firmar', 'se puede volver a firmar');
  await p.goto('file:///home/user/VIVALDI/entregables/software/planicie-herramienta-final.html?demo=1#proforma'); await p.waitForTimeout(2500);
  ok(/showroom\.html\?proyecto=/.test(await p.evaluate(() => (document.querySelector('#pfDoc .doc-3d') || {dataset: {}}).dataset.u || '')), 'la proforma trae un QR para recorrer la casa en 3D');
  ok(errs.length === 0, 'sin errores: ' + errs.join(' | ')); await b.close(); })();
