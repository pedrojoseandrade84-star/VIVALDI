// Chat de la web: sin servidor responde con los datos de la página; con la base configurada conversa con el asesor virtual 24/7.
const {chromium} = require('playwright');
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const F = 'file:///home/user/VIVALDI/entregables/web/Vivaldi-web-final.html';
(async () => { const b = await chromium.launch(); const errs = [];
  const abrir = async (conBase) => { const c = await b.newContext({viewport: {width: 1280, height: 860}}); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    const pedidos = [];
    await c.route(/^https?:/, async r => { const u = r.request().url();
      if (u.includes('/functions/v1/asistente')) { const j = JSON.parse(r.request().postData()); pedidos.push({j, h: r.request().headers()});
        return r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({respuesta: 'En *La Planicie* quedan 2 lotes:\n- Mz A lote 1 · S/ 35,000\n- Mz A lote 2 · S/ 37,000\nMira: https://vivaldiinmobiliaria.com/proyectos/planicie.html <img src=x onerror=alert(1)>', estado: pedidos.length > 1 ? 'asesor' : 'asistente'})}); }
      return r.abort(); });
    await p.goto(F); if (conBase) await p.evaluate(() => { VV_BASE.url = 'https://demo.supabase.co'; VV_BASE.key = 'anon-pub'; });
    await p.evaluate(() => document.getElementById('aiBar').click()); await p.waitForTimeout(200); return {c, p, pedidos}; };
  // 1. sin servidor
  let {c, p, pedidos} = await abrir(false);
  await p.fill('#aiQ', '¿cuánto cuesta?'); await p.press('#aiQ', 'Enter'); await p.waitForTimeout(1400);
  ok(pedidos.length === 0 && /m² desde/.test(await p.locator('#aiLog .ai-m.bot').last().innerHTML()), 'sin servidor: responde con los datos de la página'); await c.close();
  // 2. con servidor
  ({c, p, pedidos} = await abrir(true));
  await p.fill('#aiQ', '¿Qué lotes quedan en La Planicie?'); await p.press('#aiQ', 'Enter'); await p.waitForTimeout(600);
  const h = await p.locator('#aiLog .ai-m.bot').last().innerHTML();
  ok(pedidos.length === 1 && /^web:[a-z0-9]{8,}/.test(pedidos[0].j.conversacion) && pedidos[0].h.apikey === 'anon-pub', 'con servidor: llama al asesor virtual con la clave pública y un id de conversación');
  ok(/<b>La Planicie<\/b>/.test(h) && /<ul><li>Mz A lote 1/.test(h) && /<a href="https:\/\/vivaldiinmobiliaria.com\/proyectos\/planicie.html"/.test(h), 'da formato: negritas, lista y enlace');
  ok(!/<img/.test(h) && (await p.locator('#aiLog img').count()) === 0, 'no ejecuta HTML que venga en la respuesta');
  await p.click('#aiChips button >> nth=1'); await p.waitForTimeout(600);
  ok(pedidos.length === 2 && pedidos[1].j.conversacion === pedidos[0].j.conversacion && /Seguir por WhatsApp/.test(await p.locator('#aiLog .ai-m.bot').last().innerHTML()), 'los botones rápidos también van al servidor, misma conversación; al pasar a un asesor ofrece WhatsApp');
  ok((await p.locator('#aiLog .ai-m.me').count()) === 2, 'no responde dos veces (el chat local queda en pausa)');
  await c.close(); ok(errs.length === 0, 'sin errores: ' + errs.join(' | ')); await b.close(); })();
