const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+process.argv[2]);await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{const set=(id,v)=>{document.getElementById('pf'+id).value=v};
 const terms=[...document.getElementById('pfTerm').options].map(o=>o.value);const fails=[];let n=0;
 const prices=['29000','25000','60000','37900','0','1','100','999','12345.67','1e7','','-500','abc'];
 const discs=['0','500','28999','29000','40000','-10','','12.5'];const inis=['0','5','20','33.3','90','95','100','','-5','abc'];
 for(const pr of prices)for(const di of discs)for(const ini of inis)for(const tm of terms){
  set('Price',pr);set('Disc',di);set('Ini',ini);set('Term',tm);const c=pfCalc();n++;
  const bad=[];const sum=c.sched.reduce((a,s)=>a+s.amt,0);
  if(![c.price,c.disc,c.net,c.down,c.fin,c.q,c.last].every(Number.isFinite))bad.push('NaN');
  if(c.net!==c.price-c.disc)bad.push('net');if(c.net<0)bad.push('net<0');if(c.disc>c.price)bad.push('disc>price');
  if(c.down+c.fin!==c.net)bad.push('down+fin');if(c.term&&sum!==c.fin)bad.push('suma cuotas '+sum+'≠'+c.fin);
  if(c.sched.some(s=>s.amt<0))bad.push('cuota negativa '+c.last);if(c.sched.length&&c.sched[c.sched.length-1].bal!==0)bad.push('saldo final '+c.sched[c.sched.length-1].bal);
  if(c.sched.some(s=>s.bal<0))bad.push('saldo negativo');if(c.iniP<0||c.iniP>100)bad.push('ini%');
  if(!c.term&&(c.down!==c.net||c.fin!==0))bad.push('contado');
  const pl=pfPlans().find(x=>String(x.term)===String(c.term));if(pl&&(pl.q!==c.q||pl.down!==c.down||pl.last!==c.last))bad.push('planes≠proforma');
  if(bad.length)fails.push(`precio=${pr} desc=${di} ini=${ini} plazo=${tm}: ${[...new Set(bad)].join(', ')}`);}
 return {n,terms,fails:fails.length,ej:fails.slice(0,12)};});
console.log(JSON.stringify(r,null,1));console.log('errores',errs);await b.close()})();
