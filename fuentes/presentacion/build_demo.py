# Inserta diapositivas "Así funciona" con video real y fotos en la presentación TV. Base: orig_tv.html (sin tocar).
import base64, os, re, subprocess, sys, json
D = os.path.dirname(os.path.abspath(__file__)); R = D + '/../rec'; O = D + '/demo'; os.makedirs(O, exist_ok=True)
def run(*a): subprocess.run(a, check=True)
def embed(name):  # versión liviana para incrustar (1280x720)
    out = f'{O}/{name}_720.mp4'
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(f'{R}/{name}.mp4'):
        run('ffmpeg', '-y', '-loglevel', 'error', '-i', f'{R}/{name}.mp4', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out)
    return base64.b64encode(open(out, 'rb').read()).decode()
def photo(name, t, w=720, q=4):
    out = f'{O}/{name}_{t}_{w}.jpg'; run('ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', f'{R}/{name}.mp4', '-frames:v', '1', '-vf', f'scale={w}:-2:flags=lanczos', '-q:v', str(q), out)
    return 'data:image/jpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
VIDS = []
DEMOS = [  # (después de la diapositiva n, video, etiqueta, título, pasos, foto principal, fotos)
  (6, 'web', '4 · Página web · funcionando', 'Así la usa el <em>cliente</em>', ['Filtra los proyectos por estado y por zona', 'Elige su lote en el plano y ve precio y cuota', 'Calcula su cuota y deja sus datos para el asesor'], 31, [12, 21, 46]),
  (7, 'tool', '4 · Herramienta · funcionando', 'Así la usan el <em>asesor</em> y la gerencia', ['Tablero de dirección: ventas, cobranza, inventario y equipo', 'Proforma con cronograma en segundos', 'Clientes del día; borrar con opción de deshacer'], 6, [9, 31, 47]),
  (8, 'db', '5 · Base de datos · funcionando', 'Lo que registra el asesor, la <em>gerencia</em> lo ve', ['La asesora registra un cliente en su celular', 'En segundos aparece en la pantalla de la oficina', 'Lo que se borra se actualiza y queda en el historial'], 13, [5, 13, 26]),
  (11, 'sim', '7 · Simulador 3D · funcionando', 'Del pedido del cliente a su <em>casa en 3D</em>', ['El asesor escribe lo que pide el cliente', 'Aparece la casa sobre el lote y se gira en vivo', 'Rayos X, corte, plano, entorno y negocios'], None, None),
]
CSS = '''<style id="demo-css">
.demo{padding:56px 72px 64px}.demo .dg{display:grid;grid-template-columns:350px 1fr;gap:34px;align-items:start}
.demo h2{font-size:44px;margin-bottom:22px}.demo ol{list-style:none;margin:0;padding:0;display:grid;gap:16px;counter-reset:d}
.demo ol li{counter-increment:d;display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:start;font-size:19px;line-height:1.38;color:var(--gr)}
.demo ol li::before{content:counter(d);width:40px;height:40px;border-radius:12px;background:var(--nv);color:#fff;font-weight:800;display:grid;place-items:center;font-size:18px}
.demo .live{display:inline-flex;align-items:center;gap:8px;margin-top:22px;font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#B3261E}
.demo .live i{width:10px;height:10px;border-radius:50%;background:#D93025;box-shadow:0 0 0 4px rgba(217,48,37,.18)}
.demo .vid{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 22px 50px rgba(10,56,86,.25);border:1px solid var(--ln);background:#0B2236;aspect-ratio:16/9;cursor:zoom-in}
.demo .vid video,.demo .vid img{display:block;width:100%;height:100%;object-fit:cover}
.demo .vid img.pst{display:none}
.demo .ph3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
.demo .ph3 img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--ln);display:block}
.demo .hint{font-size:13px;color:var(--mu);margin-top:16px}
.demo.zoom .vid{position:absolute;inset:0;border-radius:0;z-index:5;cursor:zoom-out;aspect-ratio:auto;border:0}
@media print{.demo .vid video{display:none}.demo .vid img.pst{display:block}.demo .hint{display:none}}
</style>'''
JS = '''<script id="demo-js">(()=>{const S=[...document.querySelectorAll('.s')];
const load=v=>{if(v.src)return;const el=document.getElementById(v.dataset.src);if(!el)return;const b=atob(el.textContent.trim()),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);v.src=URL.createObjectURL(new Blob([u],{type:'video/mp4'}))};
const sync=()=>S.forEach((s,j)=>{const v=s.querySelector('video');if(!v)return;const on=s.classList.contains('on');if(on||[...S].findIndex(x=>x.classList.contains('on'))===j-1)load(v);if(on){if(v.paused){try{v.currentTime=0}catch(e){}v.play().catch(()=>{})}}else{if(!v.paused)v.pause();if(s.classList.contains('zoom'))s.classList.remove('zoom')}});
let cur=-1;const tick=()=>{const k=S.findIndex(x=>x.classList.contains('on'));if(k!==cur){cur=k;sync()}};new MutationObserver(tick).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});tick();
document.querySelectorAll('.demo .vid').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();b.closest('.s').classList.toggle('zoom')}));
addEventListener('keydown',e=>{if(e.key==='z'||e.key==='Z'){const s=document.querySelector('.s.on');if(s&&s.classList.contains('demo'))s.classList.toggle('zoom')}});})();</script>'''
def slide(name, k, h2, steps, pt, pts):
    have = os.path.exists(f'{R}/{name}.mp4')
    if not have: return None
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{R}/{name}.mp4']).decode())
    if pt is None: pt = round(dur * .35, 1)
    if pts is None: pts = [round(dur * x, 1) for x in (.12, .5, .9)]
    v = embed(name); poster = photo(name, pt, 1280, 3); ph = ''.join(f'<img src="{photo(name, t, 480, 4)}" alt="">' for t in pts)
    li = ''.join(f'<li><span>{x}</span></li>' for x in steps)
    VIDS.append(f'<script type="application/octet-stream" id="vid-{name}">{v}</script>')
    return (f'<section class="s demo"><div class="k">{k}</div><div class="dg"><div><h2>{h2}</h2><ol>{li}</ol><div class="live"><i></i>Grabación real de la herramienta</div>'
            f'<p class="hint">Clic en el video o tecla Z para verlo en grande.</p></div><div><div class="vid"><video data-name="{name}" data-src="vid-{name}" muted loop playsinline preload="none" poster="{poster}"></video><img class="pst" src="{poster}" alt=""></div><div class="ph3">{ph}</div></div></div>'
            f'<div class="foot"><span>Vivaldi Inmobiliaria · Propuesta integral</span><span>0</span></div><div class="bar"></div></section>')
src = open(D + '/orig_tv.html', encoding='utf-8').read()
parts = re.split(r'(?=<section class="s)', src); head, secs = parts[0], parts[1:]
last = secs[-1]; tail_i = last.find('</section>') + len('</section>'); tail = last[tail_i:]; secs[-1] = last[:tail_i]
out = []; added = []
for i, s in enumerate(secs, 1):
    out.append(s)
    for d in DEMOS:
        if d[0] == i:
            sl = slide(d[1], *d[2:])
            if sl: out.append(sl + '\n'); added.append(d[1])
# renumerar el pie de cada diapositiva
for i in range(len(out)):
    out[i] = re.sub(r'(<div class="foot"><span>[^<]*</span><span>)\d+(</span></div>)', lambda m: f'{m.group(1)}{i + 1}{m.group(2)}', out[i], count=1)
html = head.replace('</head>', CSS + '</head>', 1) + ''.join(out) + tail.replace('</body>', ''.join(VIDS) + JS + '</body>', 1)
open(D + '/tv_demo.html', 'w', encoding='utf-8').write(html)
print('diapositivas', len(out), 'videos', added, 'MB', round(len(html) / 1e6, 1))
