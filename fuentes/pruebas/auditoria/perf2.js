const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for(const round of [1,2])for(const f of process.argv.slice(2)){const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();
await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+f);await p.waitForTimeout(9000);
const ms=await p.evaluate(()=>{const r=__sim.renderer,gl=r.getContext();const t=[];for(let i=0;i<12;i++){const a=performance.now();r.render(__sim.scene,__sim.cam);gl.finish();t.push(performance.now()-a)}t.sort((x,y)=>x-y);return {med:Math.round(t[6]),calls:r.info.render.calls}});
console.log('ronda',round,f.split('/').pop(),JSON.stringify(ms));await p.close()}
await b.close()})();
