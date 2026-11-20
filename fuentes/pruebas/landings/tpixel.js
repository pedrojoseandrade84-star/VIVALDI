// Prueba de la medición de anuncios en las páginas de proyecto (Meta Pixel, Google Analytics 4 / Google Ads y TikTok Pixel):
// sin identificadores no carga nada; con identificadores, nada hasta que el visitante acepta; los eventos Lead y Contacto llegan a las tres.
const {chromium} = require('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = 'file:///home/user/VIVALDI/entregables/landings/planicie.html';
const EXT = /connect\.facebook\.net|googletagmanager\.com|analytics\.tiktok\.com/;
(async () => { const b = await chromium.launch(); const errs = [];
  const abrir = async (cfg, guardado) => { const c = await b.newContext({viewport: {width: 1366, height: 900}}); const p = await c.newPage(); p.reqs = [];
    p.on('pageerror', e => errs.push(e.message)); c.on('page', q => q.close()); await c.route(/^https?:/, r => { if (EXT.test(r.request().url())) p.reqs.push(r.request().url()); r.abort(); });
    await p.addInitScript(([cfg, g]) => { if (cfg) window.VV_MKT_PRUEBA = cfg; if (g) localStorage.setItem('vv-medicion', g); }, [cfg, guardado]);
    await p.goto(F); await p.waitForTimeout(2200); return p; };
  // sin identificadores
  let p = await abrir(null); ok(!(await p.$('.vv-cons')) && p.reqs.length === 0, 'sin identificadores configurados no aparece aviso ni se carga nada');
  // con identificadores: aviso y nada cargado antes de aceptar
  const CFG = {meta_pixel: '123456789012345', ga4: 'G-ABC123XYZ', google_ads: 'AW-987654321', tiktok_pixel: 'C1ABCDEF2345GHIJ'};
  p = await abrir(CFG); ok(!!(await p.$('.vv-cons')) && p.reqs.length === 0, 'con identificadores: pide permiso y no carga nada antes');
  await p.click('.vv-cons [data-c="si"]'); await p.waitForTimeout(500);
  ok(p.reqs.some(u => /fbevents\.js/.test(u)) && p.reqs.some(u => /gtag\/js\?id=G-ABC123XYZ/.test(u)) && p.reqs.some(u => /sdkid=C1ABCDEF2345GHIJ/.test(u)), 'al aceptar carga Meta, Google y TikTok: ' + p.reqs.length + ' pedidos');
  ok(await p.evaluate(() => fbq.queue.some(a => a[0] === 'init' && a[1] === '123456789012345') && dataLayer.some(a => a[0] === 'config' && a[1] === 'AW-987654321')), 'inicia el píxel de Meta y la conversión de Google Ads');
  // formulario: Lead
  await p.evaluate(() => document.getElementById('contacto').scrollIntoView()); await p.fill('#fN', 'Prueba Medición'); await p.fill('#fT', '987654321'); await p.check('#fOk');
  await p.click('#lead button[type=submit]'); await p.waitForTimeout(600);
  const ev = await p.evaluate(() => ({meta: fbq.queue.filter(a => a[0] === 'track').map(a => a[1]), ga: dataLayer.filter(a => a[0] === 'event').map(a => a[1]), tt: ttq.filter(a => a[0] === 'track').map(a => a[1])}));
  ok(ev.meta.includes('Lead') && ev.ga.includes('generate_lead') && ev.tt.includes('SubmitForm'), 'el formulario registra Lead en las tres plataformas: ' + JSON.stringify(ev));
  ok(ev.meta.includes('Contact') && ev.ga.includes('contact') && ev.tt.includes('Contact'), 'abrir WhatsApp registra Contacto');
  // recargar: recuerda la decisión
  await p.reload(); await p.waitForTimeout(2200); ok(!(await p.$('.vv-cons')), 'recuerda que aceptó (no vuelve a preguntar)');
  // rechazar
  p = await abrir(CFG); await p.click('.vv-cons [data-c="no"]'); await p.waitForTimeout(300); const n0 = p.reqs.length;
  await p.reload(); await p.waitForTimeout(2200); ok(n0 === 0 && p.reqs.length === 0 && !(await p.$('.vv-cons')), 'si no acepta, no se carga nada y no se insiste');
  // la página del extranjero también mide
  const c2 = await b.newContext(); const q = await c2.newPage(); const r2 = []; await c2.route(/^https?:/, r => { if (EXT.test(r.request().url())) r2.push(r.request().url()); r.abort(); });
  await q.addInitScript(cfg => { window.VV_MKT_PRUEBA = cfg; localStorage.setItem('vv-medicion', 'si'); }, CFG); await q.goto('file:///home/user/VIVALDI/entregables/landings/extranjeros.html'); await q.waitForTimeout(1500);
  ok(r2.length >= 3, 'la página para clientes del extranjero también mide');
  ok(!errs.length, 'sin errores ' + JSON.stringify(errs)); await b.close(); })();
