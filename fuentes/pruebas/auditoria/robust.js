const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+process.argv[2]);await p.waitForTimeout(2500);
const out=[];
for(const v of ['','-1','0','abc','1e9','0.5','999999999']){
 const r=await p.evaluate(v=>{const ins=[...document.querySelectorAll('main input[type=number], main input[type=range], main input:not([type])')].filter(i=>!i.closest('#datos,#nubeDlg')&&i.offsetParent);
  ins.forEach(i=>{try{i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}});
  const txt=document.querySelector('main').innerText;const bad=[...new Set((txt.match(/[^\n]{0,40}(NaN|Infinity|undefined|null%|S\/ -\d)[^\n]{0,30}/g)||[]))];
  return {n:ins.length,bad:bad.slice(0,8)}},v);
 out.push([v,r.n,r.bad]);}
out.forEach(o=>console.log(JSON.stringify(o)));console.log('errores',[...new Set(errs)].slice(0,8));await b.close()})();
