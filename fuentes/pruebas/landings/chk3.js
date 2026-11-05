const {chromium, devices} = require('playwright');
(async () => { const b = await chromium.launch(); const out = [];
  for (const id of ['planicie', 'terrazas', 'zafiro', 'extranjeros']) { const p = await (await b.newContext(devices['iPhone 13'])).newPage(); await p.route(/^https?:/, r => r.abort());
    await p.goto('file:///home/user/VIVALDI/entregables/landings/' + id + '.html'); await p.waitForTimeout(600);
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ocultas: document.querySelectorAll('.reveal:not(.in)').length, total: document.querySelectorAll('.reveal').length, otros: document.querySelectorAll('.others a').length}));
    if (id === 'extranjeros') { await p.click('#lang button[data-l="en"]'); r.en = await p.evaluate(() => document.querySelector('[data-i="w1s"]').textContent); }
    out.push(id + ' ' + JSON.stringify(r)); await p.close(); }
  console.log(out.join('\n')); await b.close(); })();
