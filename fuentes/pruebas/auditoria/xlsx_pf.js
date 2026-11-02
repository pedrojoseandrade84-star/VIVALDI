const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({acceptDownloads:true,viewport:{width:1366,height:900}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/^https?:/,r=>r.abort());await p.goto('file:///home/user/VIVALDI/entregables/software/planicie-herramienta-whatsapp.html#proforma');await p.waitForTimeout(2500);
const cases=[['29000','0','20','24'],['37900','2500','10','48'],['25000','0','0','12'],['60000','7350','35','36']];
for(const [i,[pr,di,ini,tm]] of cases.entries()){
 await p.evaluate(([pr,di,ini,tm])=>{const s=(id,v)=>{const e=document.getElementById('pf'+id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
  s('Name','Cliente Prueba');s('Price',pr);s('Disc',di);s('Ini',ini);s('Term',tm)},[pr,di,ini,tm]);await p.waitForTimeout(400);
 const exp=await p.evaluate(()=>{const c=pfCalc();return {net:c.net,down:c.down,fin:c.fin,q:c.q,last:c.last,term:c.term}});
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:15000}),p.click('#pfXlsx')]);const f=__dirname+`/xls/pf${i}.xlsx`;await dl.saveAs(f);
 console.log(JSON.stringify({caso:[pr,di,ini,tm],esperado:exp,archivo:f}));}
console.log('errores',errs);await b.close()})();
