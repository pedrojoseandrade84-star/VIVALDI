const {chromium}=require('playwright');
const X='"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const errs=[];
 // WEB
 let c=await b.newContext({viewport:{width:1366,height:900}});let p=await c.newPage();p.on('pageerror',e=>errs.push('web: '+e.message));
 await p.route(/^https?:/,r=>r.abort());await p.addInitScript(()=>{try{localStorage.setItem('vv-cookies','min')}catch(e){}; window.open=()=>({})});
 await p.goto('file:///home/user/VIVALDI/entregables/web/Vivaldi-web-whatsapp.html?utm_source='+encodeURIComponent(X)+'&utm_campaign='+encodeURIComponent(X));await p.waitForTimeout(2500);
 // asistente
 const ai=await p.$('#aiQ'); if(ai){await p.evaluate(()=>{const b=document.querySelector('[aria-controls="ai"],#aiOpen,.ai-fab,.ai-btn');b&&b.click()});await p.waitForTimeout(400);
   await p.evaluate(X=>{const i=document.querySelector('#aiQ');i.value=X.slice(0,200);document.querySelector('#aiForm').requestSubmit()},X);await p.waitForTimeout(1200);}
 // formulario
 await p.evaluate(X=>{fName.value='Ana '+X;fPhone.value='987111222';fMsg.value=X;fPriv.checked=true;document.querySelector('#leadForm').requestSubmit()},X);await p.waitForTimeout(800);
 // libro
 await p.evaluate(()=>document.querySelector('[data-dlg="libro"]').click());await p.waitForTimeout(400);
 await p.evaluate(X=>{lbN.value='Ana'+X;lbD.value='45678912';lbE.value='a@b.pe';lbM.value='Detalle '+X;lbP.value=X;document.querySelector('#libroForm').requestSubmit()},X);await p.waitForTimeout(800);
 console.log('web',await p.evaluate(()=>({xss:window.__xss||0,img:document.querySelectorAll('img[src="x"]').length})));await c.close();
 // SIMULADOR
 c=await b.newContext({viewport:{width:1366,height:900}});p=await c.newPage();p.on('pageerror',e=>errs.push('sim: '+e.message));
 await p.route(/^https?:/,r=>r.abort());await p.goto('file:///home/user/VIVALDI/entregables/simulador/Simulador-3D-Lotes-Vivaldi.html');await p.waitForTimeout(7000);
 await p.evaluate(X=>{const t=document.querySelector('#aiText,textarea');t.value='Somos 4 '+X;const g=document.querySelector('#aiGo');g&&g.click()},X);await p.waitForTimeout(3500);
 await p.evaluate(X=>{const n=document.querySelector('#negocio,[id*=negocio]');if(n){n.value=X;n.dispatchEvent(new Event('input'));n.dispatchEvent(new Event('change'))}},X);await p.waitForTimeout(1500);
 const fb=1; if(fb){await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>/Ficha cliente/.test(x.textContent));b&&b.click()});await p.waitForTimeout(1500);
   await p.evaluate(X=>{document.querySelectorAll('#ficha input, dialog input').forEach(i=>{if(i.type==='text'||i.type===''||i.type==='tel'){i.value=X;i.dispatchEvent(new Event('input'))}})},X);await p.waitForTimeout(1500);}
 console.log('sim',await p.evaluate(()=>({xss:window.__xss||0,img:document.querySelectorAll('img[src="x"]').length})));
 console.log('errores',[...new Set(errs)]);await b.close()})();
