const {chromium,devices}=require('playwright');const E='/home/user/VIVALDI/entregables/';
const F={web:E+'web/Vivaldi-web-whatsapp.html',herramienta:E+'software/planicie-herramienta-whatsapp.html',simulador:E+'simulador/Simulador-3D-Lotes-Vivaldi.html',presentacion:E+'presentacion/Presentacion-Vivaldi-TV.html'};
const V=[['iPhone SE (320)',{viewport:{width:320,height:568},isMobile:true,hasTouch:true,deviceScaleFactor:2}],['iPhone 13',devices['iPhone 13']],['Pixel 7',devices['Pixel 7']],['iPad',devices['iPad (gen 7)']],['Laptop 1366',{viewport:{width:1366,height:768}}],['Full HD',{viewport:{width:1920,height:1080}}],['4K',{viewport:{width:3840,height:2160}}]];
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for(const [k,f] of Object.entries(F))for(const [vn,opt] of V){const c=await b.newContext(opt);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/^https?:/,r=>r.abort());await p.addInitScript(()=>{try{localStorage.setItem('vv-cookies','min')}catch(e){}});
 try{await p.goto('file://'+f,{waitUntil:'domcontentloaded',timeout:90000});await p.waitForTimeout(k==='simulador'?7000:2500);
 const r=await p.evaluate(()=>{const W=innerWidth;const over=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);if(s.position==='fixed'||e.closest('[hidden],dialog:not([open])'))return false;const q=e.getBoundingClientRect();return q.width>0&&q.right>W+2&&!e.closest('.tbl,nav.top,.scroller,[style*="overflow"]')&&getComputedStyle(e.parentElement).overflowX==='visible'}).slice(0,3).map(e=>(e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0])+':'+Math.round(e.getBoundingClientRect().right));return {sw:document.documentElement.scrollWidth,W,over}});
 const ok=r.sw<=r.W+1&&!errs.length;console.log((ok?'OK  ':'REV ')+k.padEnd(13),vn.padEnd(16),'ancho',r.sw+'/'+r.W,r.over.length?'desborda: '+r.over.join(' '):'',errs.length?'errores: '+errs.slice(0,2):'')}catch(e){console.log('FALLA',k,vn,e.message.slice(0,80))}
 await c.close()}
await b.close()})();
