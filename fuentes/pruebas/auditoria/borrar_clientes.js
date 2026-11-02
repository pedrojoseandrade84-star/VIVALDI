const {chromium,devices}=require('playwright');const D=__dirname;
(async()=>{const b=await chromium.launch();const out=[];
for(const f of ['whatsapp','final']){const t=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();const errs=[];let dialogs=0;t.on('pageerror',e=>errs.push(e.message));t.on('dialog',d=>{dialogs++;d.accept()});await t.route(/^https?:/,r=>r.abort());
await t.goto(`file:///home/user/VIVALDI/entregables/software/planicie-herramienta-${f}.html`);await t.waitForTimeout(1000);await t.click('#demoBtn');await t.waitForLoadState('load');await t.waitForTimeout(1500);
const n=()=>t.evaluate(()=>JSON.parse(localStorage.getItem('vivaldi-clientes-v1')).length);
const n0=await n();
await t.click('#crmFilter button >> text=Todos').catch(()=>{});await t.waitForTimeout(300);
// 1 tarjeta
const first=await t.evaluate(()=>document.querySelector('#crmList .crm-item[data-id] .crm-row b').textContent);
await t.locator('#crmList .crm-item[data-id]').first().locator('button[data-a="del"]').click();await t.waitForTimeout(400);
const n1=await n(),msg=await t.textContent('#delMsg'),barOn=await t.evaluate(()=>document.querySelector('.delbar').classList.contains('on'));
if(f==='whatsapp')await t.screenshot({path:D+'/undo.png'});
await t.click('#delUndo');await t.waitForTimeout(300);const n2=await n();const back=await t.evaluate(nm=>CLIENTS.some(c=>c.name===nm),first);
// 2 formulario
await t.locator('#crmList .crm-item[data-id]').nth(1).locator('button[data-a="edit"]').click();await t.waitForTimeout(400);
const delVis=await t.isVisible('#cDel');await t.click('#cDel');await t.waitForTimeout(300);const n3=await n();const formReset=await t.evaluate(()=>document.getElementById('crmFormTitle').textContent);const delHidden=await t.isHidden('#cDel');
// 3 varios
await t.click('#bulkOn');await t.waitForTimeout(200);
const boxes=t.locator('#crmList .crm-pick input');await boxes.nth(0).check();await boxes.nth(1).check();await boxes.nth(2).check();await t.waitForTimeout(200);
const label=await t.textContent('#bulkGo');if(f==='whatsapp'){await t.evaluate(()=>document.getElementById('crmList').scrollIntoView());await t.screenshot({path:D+'/bulk.png'})}
await t.click('#bulkGo');await t.waitForTimeout(400);const n4=await n();const msg2=await t.textContent('#delMsg');
await t.waitForTimeout(7500);const barGone=await t.evaluate(()=>!document.querySelector('.delbar').classList.contains('on'));
await t.reload();await t.waitForTimeout(1200);const n5=await n();
out.push({f,n0,n1,msg,barOn,n2,back,delVis,n3,formReset,delHidden,label,n4,msg2,barGone,n5,dialogs,errs})}
console.log(JSON.stringify(out,null,1));await b.close()})();
