const {chromium}=require('playwright');
const X='"><img src=x onerror="window.__xss=(window.__xss||0)+1">\'<svg onload="window.__xss=(window.__xss||0)+1">';
(async()=>{const b=await chromium.launch();const errs=[];
for(const f of process.argv.slice(2)){
 const c=await b.newContext({viewport:{width:1366,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
 await p.route(/^https?:/,r=>r.abort());
 await p.addInitScript(X=>{const d=n=>{const x=new Date(Date.now()+n*864e5);return x.toISOString().slice(0,10)};
  localStorage.setItem('vivaldi-asesor','Asesor'+X);
  localStorage.setItem('vivaldi-clientes-v1',JSON.stringify([{id:'a1"'+X,created:d(0),ts:Date.now()-7e6,name:'Ana'+X,phone:'987111222',proj:'La Planicie de Asia'+X,stage:'Nuevo',next:d(0),budget:0,notes:'nota'+X,src:'Facebook'+X,plazo:'Este mes'+X,pago:X,adv:'Asesor'+X},
   {id:'a2',created:d(-3),name:'Beto'+X,phone:'987333444',proj:X,stage:'Visita agendada',next:d(-1),budget:5000,notes:X,src:X}]));
  localStorage.setItem('vivaldi-proformas-v1',JSON.stringify([{no:'PF-2026-0001'+X,at:d(0),name:'Ana'+X,dni:'12345678'+X,phone:'987111222',proj:0,projName:'La Planicie de Asia'+X,mz:'A'+X,lt:'1'+X,area:200,price:29000,net:29000,adv:'Asesor'+X}]));
  localStorage.setItem('vivaldi-separaciones-v1',JSON.stringify([{no:'SEP-2026-0001'+X,pf:'PF-2026-0001'+X,at:d(-3),amt:1000,pay:'Yape'+X,op:X,lim:d(1),name:'Ana'+X,adv:X}]));
  localStorage.setItem('vivaldi-cobranza-v1',JSON.stringify([{id:'k1'+X,at:d(-10),pf:'PF'+X,sep:'SEP'+X,adv:X,name:'Ana'+X,phone:'912345678',projName:'Planicie'+X,lot:'Mz B'+X,sched:[{i:1,d:d(-4),amt:1200},{i:2,d:d(2),amt:1200}],paid:{}}]));
  localStorage.setItem('vivaldi-visitas-v1',JSON.stringify([{id:'v1'+X,name:'Ana'+X,phone:'912345678',proj:'Planicie'+X,date:d(0),time:'10:00'+X,meet:'Oficina'+X,people:2,notes:X,st:'prog',adv:X,at:d(0)}]));
  localStorage.setItem('vivaldi-lotes-v1',JSON.stringify([{id:'L1'+X,proj:'La Planicie de Asia',mz:'A'+X,lt:'1'+X,area:200,price:29000,st:'Disponible',client:X,loc:'Parque'+X}]));
 },X);
 await p.goto('file://'+f);await p.waitForTimeout(2500);
 const secs=await p.evaluate(()=>[...document.querySelectorAll('nav.top a')].map(a=>a.getAttribute('href')));
 for(const s of secs){await p.evaluate(s=>{location.hash=s;const e=document.querySelector(s);e&&e.scrollIntoView()},s);await p.waitForTimeout(250)}
 // abrir todos los details, pulsar botones de "ver" que no navegan fuera
 await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>d.open=true)});
 for(const sel of ['#crmF button','.crm-acts [data-a=edit]','[data-h=go]','#visF button','.inv-counts button']){const n=await p.locator(sel).count();for(let i=0;i<Math.min(n,6);i++){try{await p.locator(sel).nth(i).click({timeout:1500})}catch(e){} await p.waitForTimeout(150)}}
 await p.waitForTimeout(800);
 const r=await p.evaluate(()=>({xss:window.__xss||0,img:document.querySelectorAll('img[src="x"]').length,svg:[...document.querySelectorAll('svg[onload]')].length}));
 console.log(f.split('/').pop(),JSON.stringify(r),'secciones',secs.length);await c.close()}
console.log('errores',[...new Set(errs)].slice(0,10));await b.close()})();
