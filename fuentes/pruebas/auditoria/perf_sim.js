const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for(const f of process.argv.slice(2)){const p=await (await b.newContext({viewport:{width:1366,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/^https?:/,r=>r.abort());await p.goto('file://'+f);await p.waitForTimeout(9000);
const info=()=>p.evaluate(()=>{const r=__sim.renderer;r.render(__sim.scene,__sim.cam);let tri=0,meshes=0;__sim.scene.traverse(o=>{if(o.isMesh&&o.visible){meshes++;const g=o.geometry;tri+=(g.index?g.index.count:g.attributes.position.count)/3}});return {calls:r.info.render.calls,tris:Math.round(tri),meshes,geo:r.info.memory.geometries,tex:r.info.memory.textures}});
const a=await info();
for(let i=0;i<20;i++)await p.evaluate(i=>{__sim.state.prog.pisos=1+i%3;__sim.regen(true)},i);
await p.evaluate(()=>{__sim.state.prog.pisos=2;__sim.regen(true)});await p.waitForTimeout(1500);const b2=await info();
for(let i=0;i<20;i++)await p.evaluate(i=>{__sim.state.prog.pisos=1+i%3;__sim.regen(true)},i);
await p.evaluate(()=>{__sim.state.prog.pisos=2;__sim.regen(true)});await p.waitForTimeout(1500);const c2=await info();
const ft=await p.evaluate(async()=>{const t=[];let last=performance.now();for(let i=0;i<40;i++){await new Promise(r=>requestAnimationFrame(r));const n=performance.now();t.push(n-last);last=n}t.sort((a,b)=>a-b);return Math.round(t[20])});
console.log(f.split('/').slice(-2).join('/'),'\n inicial',JSON.stringify(a),'\n tras 20 reconstrucciones',JSON.stringify(b2),'\n tras 40',JSON.stringify(c2),'\n ms por cuadro (mediana, swiftshader sin GPU)',ft,'errores',errs.length)}
await b.close()})();
