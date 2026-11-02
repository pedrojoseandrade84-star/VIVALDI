const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const f of process.argv.slice(2)){const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();const errs=[],cons=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(['error','warning'].includes(m.type()))cons.push(m.text().slice(0,120))});
await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+f);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
 const ids=qa('[id]').map(e=>e.id),dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
 const anchors=qa('a[href^="#"]').map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1)));
 let ld=[];qa('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);ld.push(j['@type']||(j['@graph']&&'graph'))}catch(e){ld.push('JSON INVALIDO')}});
 const hs=qa('h1,h2,h3,h4,h5,h6').filter(h=>h.offsetParent).map(h=>+h.tagName[1]);let jumps=0;for(let i=1;i<hs.length;i++)if(hs[i]-hs[i-1]>1)jumps++;
 return {title:document.title,titleLen:document.title.length,lang:document.documentElement.lang,desc:(q('meta[name=description]')||{}).content,descLen:((q('meta[name=description]')||{}).content||'').length,
  canonical:(q('link[rel=canonical]')||{}).href,og:qa('meta[property^="og:"]').map(m=>m.getAttribute('property')),twitter:qa('meta[name^="twitter:"]').length,viewport:(q('meta[name=viewport]')||{}).content,
  robots:(q('meta[name=robots]')||{}).content,h1:qa('h1').length,saltosTitulos:jumps,idsDuplicados:dup,anclasRotas:[...new Set(anchors)],ld,
  imgsSinAlt:qa('img:not([alt])').length,extSinNoopener:qa('a[target=_blank]').filter(a=>!/noopener/.test(a.rel)).length,inputsSinLabel:qa('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea').filter(i=>!i.labels?.length&&!i.getAttribute('aria-label')&&!i.getAttribute('aria-labelledby')).map(i=>i.id||i.name).slice(0,10)}});
console.log('==',f.split('/').pop());console.log(JSON.stringify(r,null,1));console.log('errores',errs,'consola',[...new Set(cons)].slice(0,6))}
await b.close()})();
