const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch();const c=await b.newContext(devices['iPhone 13']);const p=await c.newPage();
await p.goto('file:///home/user/VIVALDI/entregables/presentacion/Presentacion-Vivaldi-TV.html#15');await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{const r=document.querySelector('.s.on').getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),iw:innerWidth}}));await p.screenshot({path:__dirname+'/tvphone.png'});await b.close()})();
