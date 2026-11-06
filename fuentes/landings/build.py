# Genera una landing por proyecto y la landing para clientes del extranjero (archivos únicos, funcionan sin internet).
# Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 build.py   (lee proyectos.json, toma fotos, logo y tipografías de la web final)
import base64, io, json, os, re, html
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(D + '/../..')
WEB = ROOT + '/entregables/web/Vivaldi-web-final.html'; OUT = ROOT + '/entregables/landings'; os.makedirs(OUT, exist_ok=True)
DATA = json.load(open(D + '/proyectos.json', encoding='utf-8')); EMP = DATA['empresa']; PRJ = DATA['proyectos']
src = open(WEB, encoding='utf-8').read()
FONTS = '\n'.join(re.findall(r'@font-face\s*\{[^}]*\}', src))
i = src.find('var D={'); j = src.find('};', i); IMGMAP = src[i:j]
ASESOR = open(ROOT + '/fuentes/asesor.html', encoding='utf-8').read()
E = lambda s: html.escape(str(s), quote=True)
_cache = {}
def img(key, w=1600, q=74):
    if (key, w) in _cache: return _cache[(key, w)]
    m = re.search(re.escape(key) + r'"\s*:\s*"data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)', IMGMAP)
    if not m: raise SystemExit('falta foto ' + key)
    im = Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); u = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(); _cache[(key, w)] = u; return u
def soles(n): return 'S/ ' + f'{round(n):,}'
TC = EMP['tipo_cambio']

TST = [("Maria Paz", "2025/05/cliente3.webp", "Primera inversión", "La asesoría brindada resolvió todas mis excusas. Es mi primera inversión y siento que ha valido la pena."),
       ("Eddy Cruz", "2025/05/propietario.jpg", "Propietario", "Estoy agradecido de pertenecer a la familia Vivaldi. Desde un inicio los asesores siempre me brindaron buena información y atención."),
       ("Josselyn Fernández", "2025/05/clientes3.png", "Propietaria", "Estoy muy contenta con la atención de todo el personal. Me han apoyado bastante en la adquisición de mi lote y poco a poco me ayudan a cumplir mis metas.")]

CSS = '''
:root{--nv:#0A3856;--deep:#0B2A3F;--ink:#16232D;--mu:#5A6872;--ln:#E4DED3;--bg:#F6F1E9;--sand:#EFE6D8;--sun:#E5A53C;--ok:#2E7D4F;--ac:%(color)s}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%%}body{margin:0;font-family:Manrope,system-ui,sans-serif;color:var(--ink);background:#FFFDF9;line-height:1.6}
img{max-width:100%%;display:block}a{color:inherit}h1,h2,h3{font-family:"Instrument Serif",Georgia,serif;font-weight:400;letter-spacing:-.005em;line-height:1.06;margin:0}
.wrap{max-width:1160px;margin:0 auto;padding:0 24px}.sec{padding:96px 0}
.eb{font-size:.9rem;font-weight:600;color:var(--mu);margin-bottom:10px}
h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin-bottom:20px}h2 em{font-style:normal;color:inherit}.lead{font-size:1.12rem;color:var(--mu);max-width:620px;margin:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 26px;border-radius:6px;font:inherit;font-weight:700;font-size:1rem;text-decoration:none;border:0;cursor:pointer;transition:background-color .2s,color .2s}
.btn:focus-visible{outline:3px solid var(--sun);outline-offset:3px}
.b-wa{background:#17733F;color:#fff}.b-wa:hover{background:#125C32}.b-sun{background:#FFFDF9;color:var(--ink)}.b-sun:hover{background:var(--sand)}
.b-line{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.8)}.b-deep{background:var(--ink);color:#fff}.b-deep:hover{background:#000}
header.top{position:absolute;top:0;left:0;right:0;z-index:5}header.top .wrap{display:flex;align-items:center;justify-content:space-between;height:84px}
header.top img{height:30px}header.top nav{display:flex;gap:26px}header.top nav a{color:#fff;text-decoration:none;font-weight:600;font-size:.95rem;padding:8px 0;border-bottom:1px solid transparent}
header.top nav a:hover{border-color:#fff}
.hero{position:relative;min-height:min(90vh,860px);display:flex;align-items:flex-end;color:#fff;overflow:hidden;background:var(--deep)}
.hero>img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,20,30,.42) 0%%,rgba(8,20,30,0) 62%%),linear-gradient(180deg,rgba(8,20,30,.45) 0%%,rgba(8,20,30,0) 28%%,rgba(8,20,30,.08) 55%%,rgba(8,20,30,.72) 100%%)}
.hero .wrap{position:relative;z-index:2;padding-bottom:72px;width:100%%}
.badge{display:block;font-size:.95rem;font-weight:600;letter-spacing:.02em;color:rgba(255,255,255,.92)}.badge i{display:none}
.hero h1{font-size:clamp(3.2rem,8.4vw,7rem);margin:10px 0 14px;max-width:960px}.hero h1 em{font-style:normal}
.hero .sub{font-size:clamp(1.15rem,2.1vw,1.5rem);max-width:600px;color:#fff;margin:0;line-height:1.4}.hero .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.ref{position:absolute;right:14px;bottom:14px;z-index:3;font-size:.72rem;font-weight:600;background:rgba(0,0,0,.5);color:#fff;padding:4px 9px;border-radius:4px}
.facts{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--ln)}
.facts div{padding:30px 26px 28px 0;margin-right:26px;border-right:1px solid var(--ln)}.facts div:last-child{border:0;margin:0}
.facts span{display:block;font-size:.88rem;font-weight:600;color:var(--mu)}
.facts b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:2.3rem;color:var(--ink);line-height:1.1;margin-top:6px}.facts small{color:var(--mu);font-size:.9rem}
.g2{display:grid;grid-template-columns:1.05fr 1fr;gap:64px;align-items:center}
.intro{display:grid;grid-template-columns:1.55fr 1fr;gap:80px;align-items:start}
.intro .big{font-family:"Instrument Serif",Georgia,serif;font-size:clamp(1.6rem,2.8vw,2.25rem);line-height:1.28;margin:0 0 22px;color:var(--ink)}
.intro p{font-size:1.1rem;color:var(--mu);margin:0}
.inc .lbl{font-weight:600;font-size:.9rem;color:var(--mu);margin:8px 0 10px}
.inc ul{list-style:none;margin:0;padding:0}.inc li{border-top:1px solid var(--ln);padding:13px 0;font-weight:600;font-size:1.05rem;display:flex;justify-content:space-between;gap:12px}
.inc li:last-child{border-bottom:1px solid var(--ln)}.inc li span{color:var(--mu);font-weight:500;font-size:.9rem}
.gal{display:grid;grid-template-columns:repeat(6,1fr);gap:18px 16px;margin-top:34px}
.gal figure{margin:0;grid-column:span var(--s,3)}
.gal button{display:block;width:100%%;padding:0;border:0;border-radius:4px;overflow:hidden;cursor:zoom-in;position:relative;background:var(--bg);height:var(--h,360px)}
.gal img{width:100%%;height:100%%;object-fit:cover;transition:transform .8s ease}.gal button:hover img{transform:scale(1.03)}
.gal figcaption{font-size:.92rem;color:var(--mu);margin-top:9px}.gal figcaption b{color:var(--ink);font-weight:600}
.gal .ref{right:10px;bottom:10px}
.lb{position:fixed;inset:0;z-index:90;background:rgba(10,16,22,.95);display:none;align-items:center;justify-content:center;padding:20px}.lb.on{display:flex}.lb img{max-height:88vh;border-radius:4px}
.lb button{position:absolute;top:16px;right:16px;width:48px;height:48px;border-radius:50%%;border:0;background:#fff;font-size:1.4rem;cursor:pointer}
.ets{list-style:none;margin:36px 0 0;padding:0;display:grid;grid-template-columns:repeat(var(--n),1fr);gap:22px}
.ets li{border-top:3px solid var(--ln);padding-top:16px}.ets li.hecho{border-color:var(--ink)}.ets li.curso{border-color:var(--ac)}
.ets small{display:block;font-size:.85rem;font-weight:700;color:var(--mu)}.ets li.curso small{color:var(--ac)}
.ets b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:1.65rem;line-height:1.15;margin-top:6px}.ets em{display:block;font-style:normal;color:var(--mu);font-size:.88rem;margin-top:6px}
.shot{border-radius:4px;overflow:hidden;position:relative}.shot img{width:100%%;aspect-ratio:4/3;object-fit:cover}.shot+p{font-size:.9rem;color:var(--mu);margin:9px 0 0}
.calc{display:grid;grid-template-columns:1fr 1fr;gap:40px;border-top:1px solid var(--ln);padding-top:34px;margin-top:30px}
.calc label{display:block;font-weight:700;margin:0 0 10px}.calc input[type=range]{width:100%%;accent-color:var(--ink)}.seg{display:flex;gap:8px;flex-wrap:wrap}
.seg button{min-height:46px;padding:0 18px;border-radius:6px;border:1px solid var(--ln);background:#fff;font:inherit;font-weight:700;cursor:pointer}.seg button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.res{background:var(--bg);border-radius:6px;padding:30px}.res p{margin:0;color:var(--mu);font-weight:600}
.res b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:4.4rem;line-height:1;color:var(--ink);margin:6px 0 14px}
.res .row{display:flex;justify-content:space-between;border-top:1px solid var(--ln);padding:10px 0 0;margin-top:10px;font-size:.95rem}
.voz{background:var(--bg)}.voz figure{margin:0}.voz .q1 blockquote{margin:0;font-family:"Instrument Serif",Georgia,serif;font-size:clamp(1.8rem,3.4vw,2.7rem);line-height:1.2;max-width:960px}
.voz figcaption{display:flex;align-items:center;gap:14px;margin-top:24px;font-size:.92rem;color:var(--mu)}.voz figcaption img{width:58px;height:58px;border-radius:50%%;object-fit:cover}.voz figcaption b{display:block;color:var(--ink)}
.voz .q2{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:56px;padding-top:36px;border-top:1px solid var(--ln)}.voz .q2 blockquote{margin:0;font-size:1.08rem;line-height:1.6}
.voz .q2 figcaption{margin-top:14px}.voz .q2 figcaption img{width:44px;height:44px}
.fq{border-bottom:1px solid var(--ln);padding:20px 0}.fq summary{font-weight:700;font-size:1.08rem;cursor:pointer;min-height:28px;list-style:none;display:flex;justify-content:space-between;gap:16px}.fq summary::after{content:"+";font-size:1.4rem;line-height:1;color:var(--mu)}.fq[open] summary::after{content:"−"}.fq summary::-webkit-details-marker{display:none}.fq p{margin:12px 0 0;color:var(--mu);max-width:720px}
.contact{background:var(--sand);color:var(--ink)}.contact h2{color:var(--ink)}.contact .lead{color:var(--mu)}.contact .tel{margin-top:26px;font-weight:700}.contact .tel span{display:block;font-weight:500;color:var(--mu)}
form.card{background:#fff;color:var(--ink);border-radius:8px;padding:30px;display:grid;gap:15px;border:1px solid var(--ln)}
form.card label{display:grid;gap:6px;font-weight:700;font-size:.92rem}form.card input,form.card select{font:inherit;font-size:16px;min-height:50px;padding:0 14px;border:1px solid #D6CFC2;border-radius:6px;background:#FFFDF9;color:var(--ink)}
form.card input:focus,form.card select:focus{outline:2px solid var(--ink);outline-offset:1px}
form.card .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.days{display:flex;gap:8px;flex-wrap:wrap}.days button{min-height:54px;min-width:70px;border-radius:6px;border:1px solid #D6CFC2;background:#fff;font:inherit;font-weight:700;cursor:pointer;line-height:1.1}
.days button small{display:block;font-weight:500;font-size:.75rem;color:var(--mu)}.days button[aria-pressed=true]{border-color:var(--ink);background:var(--ink);color:#fff}.days button[aria-pressed=true] small{color:#DDE3E7}
.chk{display:flex!important;grid-template-columns:none;align-items:flex-start;gap:10px;font-weight:500!important;font-size:.88rem!important;color:var(--mu)}.chk input{min-height:0!important;width:20px;height:20px;margin-top:2px}
.ok-msg{display:none;background:#E7F2EA;color:#14532D;border-radius:6px;padding:12px 14px;font-weight:600}.ok-msg.on{display:block}
.others{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:30px}.others a{display:block;text-decoration:none}
.others img{width:100%%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;transition:opacity .2s}.others a:hover img{opacity:.88}.others div{padding:14px 0 0}
.others b{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:1.6rem;color:var(--ink);display:block;line-height:1.15}.others span{color:var(--mu);font-size:.92rem}
.st .dot{width:40px;height:40px;border-radius:50%%;display:grid;place-items:center;border:1px solid var(--ink);font-weight:700;color:var(--ink);background:#fff}
footer{background:#0F1A22;color:#A9B4BC;padding:44px 0 110px;font-size:.88rem}footer .wrap{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between}footer a{color:#fff}
.sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;display:none;gap:10px}.sticky .btn{flex:1;min-height:52px;box-shadow:0 8px 24px rgba(0,0,0,.22)}.sticky .b-deep{background:var(--ink)}
.reveal{opacity:0;transform:translateY(14px);transition:opacity .9s ease,transform .9s ease}.reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}
@media (max-width:900px){.g2,.calc,.intro{grid-template-columns:1fr;gap:36px}.facts{grid-template-columns:1fr 1fr}.facts div{margin:0;padding:22px 16px 20px 0}.facts div:nth-child(2n){border-right:0;padding-left:16px}.facts div:nth-child(2n+1){padding-right:16px}.facts div:nth-child(-n+2){border-bottom:1px solid var(--ln)}
 .facts b{font-size:1.85rem}.gal{grid-template-columns:1fr 1fr;gap:14px 10px}.gal figure{grid-column:span 1}.gal figure.w{grid-column:span 2}.gal button{height:210px}.gal figure.w button{height:250px}
 .others{grid-template-columns:1fr}.ets{grid-template-columns:1fr;gap:0}.ets li{padding:16px 0 18px}.voz .q2{grid-template-columns:1fr;gap:32px}
 header.top nav{display:none}.sticky{display:flex}.sec{padding:68px 0}.hero .wrap{padding-bottom:48px}}
@media (max-width:520px){form.card .two{grid-template-columns:1fr}.hero .cta{flex-direction:column}.hero .cta .btn{width:100%%}.res b{font-size:3.4rem}.hero h1{font-size:3rem}}
'''

JS_COMMON = r'''
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const SRC = (() => { try { const q = new URLSearchParams(location.search), u = q.get("utm_source"), c = q.get("utm_campaign"); let v = u ? u + (c ? " / " + c : "") : q.get("fbclid") ? "Facebook" : q.get("gclid") ? "Google Ads" : q.get("ttclid") ? "TikTok" : ""; const k = "vv-origen"; if (v) localStorage.setItem(k, v); return v || localStorage.getItem(k) || ""; } catch (e) { return ""; } })();
const wa = (t, num) => `https://wa.me/${num || EMP.whatsapp}?text=${encodeURIComponent(t + (SRC ? "\n\n(Vengo de: " + SRC + ")" : ""))}`;
// sin "noopener" en window.open: con él el navegador devuelve null y la página se iría a WhatsApp
const openWa = t => { const u = wa(t), w = window.open(u, "_blank"); if (w) { try { w.opener = null; } catch (e) {} } else location.href = u; };
const send = (fila) => { const B = window.VV_BASE || {}; if (!B.url || !B.key) return; try { fetch(B.url.replace(/\/$/, "") + "/rest/v1/solicitudes", {method: "POST", keepalive: true, headers: {apikey: B.key, Authorization: "Bearer " + B.key, "Content-Type": "application/json", Prefer: "return=minimal"}, body: JSON.stringify(fila)}).catch(() => {}); } catch (e) {} };
const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold: 0, rootMargin: "0px 0px -8% 0px"}) : null;
$$(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));
const chk = () => $$(".reveal:not(.in)").forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); }); addEventListener("scroll", chk, {passive: true}); addEventListener("load", chk); setTimeout(chk, 300);
if (location.protocol === "file:") $$("[data-portal]").forEach(a => { a.href = "../web/portal.html" + a.dataset.portal; });
if (location.protocol === "file:") $$("[data-local]").forEach(a => { a.href = a.dataset.local; });
// galería ampliada
const lb = $(".lb"); if (lb) { $$(".gal button").forEach(b => b.addEventListener("click", () => { lb.querySelector("img").src = b.querySelector("img").src; lb.querySelector("img").alt = b.querySelector("img").alt; lb.classList.add("on"); lb.querySelector("button").focus(); }));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.closest("button")) lb.classList.remove("on"); }); addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("on"); }); }
// días de visita: los próximos 4 sábados o domingos
const days = $(".days"); let VIS = {day: "", hour: ""};
if (days) { const D = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], M = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]; let d = new Date(); const out = [];
  while (out.length < 4) { d = new Date(d.getTime() + 864e5); if (d.getDay() === 6 || d.getDay() === 0) out.push(new Date(d)); }
  days.innerHTML = out.map(x => `<button type="button" aria-pressed="false" data-d="${D[x.getDay()]} ${x.getDate()} ${M[x.getMonth()]}">${D[x.getDay()]}<small>${x.getDate()} ${M[x.getMonth()]}</small></button>`).join("");
  days.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const on = b.getAttribute("aria-pressed") !== "true"; $$(".days button").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", String(on)); VIS.day = on ? b.dataset.d : ""; }); }
'''

SITIO = 'https://vivaldiinmobiliaria.com/proyectos/'
def head(title, desc, color, lang='es-PE', slug=None, ld=None):
    extra = (f'<link rel="canonical" href="{SITIO}{slug}.html"><meta property="og:url" content="{SITIO}{slug}.html"><meta name="robots" content="index, follow">' if slug else '') + (f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' if ld else '')
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">{extra}
<title>{E(title)}</title><meta name="description" content="{E(desc)}"><meta name="theme-color" content="{color}">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:type" content="website">
<style>{FONTS}{CSS % {'color': color}}</style></head><body>'''

def foot(extra=''):
    return f'''<footer><div class="wrap"><div><b style="color:#fff">{E(EMP['nombre'])}</b><br>RUC {EMP['ruc']} · {E(EMP['oficina'])}<br>{E(EMP['horario'])} · {E(EMP['correo'])}</div>
<div>Precios y cuotas referenciales; la disponibilidad y el precio final se confirman al separar.<br>Las imágenes marcadas como referenciales son renders o planos.<br><a href="https://vivaldiinmobiliaria.com/" rel="noopener">Libro de Reclamaciones y web de Vivaldi</a> · Diseño y desarrollo: Pedrojose Andrade Paredes</div></div></footer>{extra}'''

def base_js():
    return '<script>const BASE = {url: "", key: ""};\nwindow.VV_BASE = BASE;</script>'

RECORRIDOS = {'portada'}   # proyectos con experiencia guiada por scroll (fuentes/experiencia)
LEYENDA = [('kmz', 'Ubicación en el corredor'), ('mapa', 'Ubicación en el corredor'), ('portico', 'El ingreso'), ('cancha-de-tennis', 'La cancha de tenis'),
           ('cancha-de-futbol', 'La cancha de fútbol'), ('cancha', 'La losa deportiva'), ('piscina', 'La piscina'), ('gimnasio', 'El gimnasio al aire libre'), ('gym', 'El gimnasio al aire libre'),
           ('multiusos', 'La losa multiusos'), ('juego', 'Los juegos para niños'), ('parrilla', 'La zona de parrillas'), ('grill', 'La zona de parrillas'), ('camping', 'La zona de camping'),
           ('parque', 'El parque'), ('bicicross', 'La pista de bicicross'), ('minimarket', 'El minimarket'), ('casas-lotes', 'Las casas del proyecto'), ('casa-lote', 'Una casa de referencia en el lote'),
           ('dron', 'Vista aérea del proyecto'), ('escavadora', 'Movimiento de tierras'), ('maquinaria', 'Maquinaria trabajando en el terreno'), ('tizando', 'Trazado de los lotes'),
           ('hombre-con-pala', 'Trabajos en el terreno'), ('lirios-2', 'Vista aérea del club')]
def leyenda(f):
    n = f.split('/')[-1].lower()
    return next((t for k, t in LEYENDA if k in n), 'Vista del proyecto')
ESTADO_ETAPA = {'hecho': 'Terminado', 'en curso': 'En curso', 'próxima': 'Siguiente'}

def landing(p):
    others = [x for x in PRJ if x['id'] != p['id'] and x['estado'] != 'Vendido 100%'][:3]
    refs = set(p.get('fotos_referenciales', [])); fotos = p['fotos']; idx = {f: k for k, f in enumerate(fotos)}
    es_mapa = lambda f: any(k in f.lower() for k in ('kmz', 'mapa'))
    hero_f = p.get('hero', fotos[0]); hero = img(hero_f, 1920, 74); price = p['precio']; sold = p['estado'].startswith('Vendido')
    mapa_f = next((f for f in fotos if es_mapa(f)), None)
    historia = [f for f in fotos if f != hero_f and not es_mapa(f)] or [hero_f]
    cuota36 = soles(price * .8 / 36) if price else None
    facts = [('Desde', soles(price) if price else 'Consultar', f'o {cuota36} al mes*' if cuota36 else 'precio con tu asesor'),
             ('Lote', f"{p['m2']} m²" if p['m2'] else 'Consultar', 'con título independizado' if 'Título independizado' in p['beneficios'] else 'área del lote'),
             ('Ubicación', f"Km {p['km']:g}" if p['km'] else p['zona'], f"Panamericana Sur, {p['zona']}"),
             ('Estado', p['estado'], 'en soles, sin intereses' if price and not sold else 'Vivaldi Inmobiliaria')]
    ref = lambda f: '<span class="ref">Render referencial</span>' if idx[f] in refs else ''
    n = len(p['etapas'])
    ets = ''.join(f'''<li class="{'hecho' if e['estado'] == 'hecho' else 'curso' if e['estado'] == 'en curso' else ''}"><small>{k + 1:02d} · {ESTADO_ETAPA.get(e['estado'], e['estado'])}</small><b>{E(e['nombre'])}</b>{'<em>Fecha por confirmar con tu asesor</em>' if e.get('confirmar') else ''}</li>''' for k, e in enumerate(p['etapas']))
    FILAS = {1: [6], 2: [3, 3], 3: [6, 3, 3], 4: [6, 2, 2, 2], 5: [6, 4, 2, 2, 4], 6: [6, 3, 3, 2, 2, 2], 7: [6, 4, 2, 2, 4, 3, 3]}
    lay = FILAS[min(len(historia), 7)]
    alto = lambda s: 'min(60vw,560px)' if s == 6 else '300px' if s == 2 else '360px'
    movil_ancha = lambda k: k == 0 or (len(historia[:7]) - k == 1 and k % 2 == 1)
    gal = ''.join(f'''<figure{' class="w"' if movil_ancha(k) else ''} style="--s:{lay[k]};--h:{alto(lay[k])}"><button type="button" aria-label="Ampliar: {E(leyenda(f))}"><img src="{img(f, 1600 if k == 0 else 1100, 74)}" alt="{E(p['nombre'])}: {E(leyenda(f).lower())}" loading="lazy">{ref(f)}</button><figcaption><b>{E(leyenda(f))}</b></figcaption></figure>''' for k, f in enumerate(historia[:7]))
    inc = ''.join(f'<li>{E(b)}</li>' for b in p['beneficios'])
    oth = ''.join(f'''<a href="{x['id']}.html"><img src="{img(x.get('hero', x['fotos'][0]), 800, 72)}" alt="{E(x['nombre'])}" loading="lazy"><div><b>{E(x['nombre'])}</b><span>{E(x['estado'])} · {E(x['zona'])}{' · desde ' + soles(x['precio']) if x['precio'] else ''}</span></div></a>''' for x in others)
    import urllib.parse as _u
    mapa = 'https://www.google.com/maps/search/?api=1&query=' + _u.quote(f"{p['nombre']} {'Km ' + format(p['km'], 'g') + ' ' if p['km'] else ''}Panamericana Sur {p['zona']} Cañete")
    km = format(p['km'], 'g') if p['km'] else None
    donde = (f"En el km {km} de la Panamericana Sur, en {E(p['zona'])}, provincia de Cañete: unos {int(p['km'])} km al sur de Lima." if km else f"Sobre la Panamericana Sur, en {E(p['zona'])}, provincia de Cañete, al sur de Lima.")
    lado_f = mapa_f or (historia[-1] if len(historia) > 1 else hero_f)
    ubic = f'''<section class="sec" id="ubicacion"><div class="wrap g2"><div class="reveal"><h2>Dónde está</h2>
<p class="lead">{donde}</p><p class="lead" style="margin-top:14px">{'Las visitas son los fines de semana. Tu asesor te envía la ubicación exacta y el punto de encuentro por WhatsApp.' if not sold else 'Tu asesor te envía la ubicación exacta por WhatsApp.'}</p>
<p style="margin-top:28px"><a class="btn b-deep" href="{mapa}" target="_blank" rel="noopener">Abrir en Google Maps</a></p></div>
<div class="reveal"><div class="shot"><img src="{img(lado_f, 1200, 74)}" alt="{E(p['nombre'])}: {E(leyenda(lado_f).lower())}" loading="lazy">{'<span class="ref">Imagen referencial</span>' if idx[lado_f] in refs or mapa_f else ''}</div><p>{E(leyenda(lado_f))}</p></div></div></section>'''
    fig = lambda q, cls='': f'<figure class="{cls}"><blockquote>{E(q[3])}</blockquote><figcaption><img src="{img(q[1], 160, 70)}" alt="" width="58" height="58" loading="lazy"><span><b>{E(q[0])}</b>{E(q[2])}</span></figcaption></figure>'
    tst = f'''<section class="sec voz" id="opiniones"><div class="wrap reveal"><p class="eb">Propietarios de Vivaldi</p>{fig(TST[0], 'q1')}
<div class="q2">{fig(TST[1])}{fig(TST[2])}</div><p style="font-size:.82rem;color:var(--mu);margin:28px 0 0">Testimonios publicados en vivaldiinmobiliaria.com.</p></div></section>'''
    qs = []
    if 'Título independizado' in p['beneficios']: qs.append(('¿El lote tiene título?', 'Sí. Cada lote cuenta con título independizado inscrito en SUNARP. Antes de firmar te entregamos la partida para que la verifiques.'))
    if price and not sold: qs.append(('¿Cómo funciona el financiamiento?', 'Es directo con Vivaldi y sin intereses: pagas una inicial y el saldo en cuotas fijas en soles. El plazo y la inicial los defines con tu asesor.'))
    qs.append(('¿En qué moneda pago?', 'En soles, así tu cuota no depende del tipo de cambio.'))
    if not sold: qs.append(('¿Puedo visitar el proyecto antes de decidir?', 'Sí. Hay visitas guiadas los fines de semana. Elige el día en el formulario y tu asesor te confirma la hora y el punto de encuentro.'))
    if refs: qs.append(('¿Las imágenes son fotos reales?', 'Las que dicen "Render referencial" son ilustraciones del proyecto terminado. Las demás son fotos. En la visita ves el avance real.'))
    qs.append(('¿Cómo verifico a la empresa?', f"Inmobiliaria & Constructora Vivaldi S.A.C., RUC {EMP['ruc']}. Puedes consultar el RUC en SUNAT y visitarnos en {EMP['oficina']}."))
    faq = '<section class="sec" id="preguntas"><div class="wrap reveal" style="max-width:880px"><h2>Lo que más nos preguntan</h2>' + ''.join(f'<details class="fq"><summary>{E(a)}</summary><p>{E(b)}</p></details>' for a, b in qs) + '</div></section>'
    title = f"{p['nombre']} · {p['lema']} | Vivaldi Inmobiliaria"
    desc = p['resumen']
    calc = '' if not price or sold else f'''<section class="sec" id="cuota" style="background:#fff"><div class="wrap reveal"><h2>Cuánto pagarías al mes</h2>
<p class="lead">Financiamiento directo con Vivaldi: sin bancos y sin intereses. Pagas una inicial y el resto en cuotas fijas en soles.</p>
<div class="calc"><div><label for="ini">Cuota inicial: <span id="iniL">20%</span></label><input id="ini" type="range" min="10" max="60" step="5" value="20" aria-describedby="iniL">
<label style="margin-top:28px">Plazo</label><div class="seg" id="plazo">{''.join(f'<button type="button" data-n="{m}" aria-pressed="{str(m == 36).lower()}">{m} meses</button>' for m in (12, 24, 36))}</div></div>
<div class="res" aria-live="polite"><p>Tu cuota mensual</p><b id="cuotaV">—</b><div class="row"><span>Precio del lote</span><span>{soles(price)}</span></div><div class="row"><span>Inicial</span><span id="iniS">—</span></div><div class="row"><span>Intereses</span><span>S/ 0</span></div>
<button class="btn b-deep" type="button" id="quiero" style="margin-top:20px;width:100%">Quiero esta cuota</button></div></div><p style="font-size:.85rem;color:var(--mu);margin-top:14px">*Cuota referencial. El plan final lo confirma tu asesor.</p></div></section>'''
    form = f'''<section class="sec contact" id="contacto"><div class="wrap g2"><div class="reveal">
<h2>{'Ven a conocerlo un fin de semana' if not sold else '¿Quieres el próximo proyecto?'}</h2>
<p class="lead">{'Elige un día, deja tus datos y un asesor te confirma la hora por WhatsApp. La visita es guiada y sin compromiso.' if not sold else 'Zafiro ya se entregó a sus propietarios. Déjanos tus datos y te avisamos del próximo proyecto, o mira los que están en venta.'}</p>
<p class="tel">WhatsApp {E(EMP['telefono'])}<span>{E(EMP['horario'])}</span></p></div>
<form class="card reveal" id="lead" novalidate><label>Nombre completo<input id="fN" autocomplete="name" required maxlength="120"></label>
<div class="two"><label>Celular<input id="fT" inputmode="tel" autocomplete="tel" placeholder="9XX XXX XXX" required></label>
<label>¿Cuándo piensas comprar?<select id="fPl"><option>Prefiero no indicar</option><option>Este mes</option><option>En 1 a 3 meses</option><option>En más de 3 meses</option></select></label></div>
{'' if sold else '<label>Día de visita (opcional)<div class="days" role="group" aria-label="Día de visita"></div></label>'}
<label>¿Cómo piensas pagar?<select id="fPg"><option>Prefiero no indicar</option><option>Al contado</option><option>Financiado con Vivaldi</option><option>Crédito bancario</option></select></label>
<label class="chk"><input type="checkbox" id="fOk" required> Acepto el tratamiento de mis datos para atender mi solicitud (Ley 29733).</label>
<label class="chk"><input type="checkbox" id="fMk"> Quiero recibir novedades de Vivaldi. Opcional.</label>
<button class="btn b-wa" type="submit">{'Agendar y escribir por WhatsApp' if not sold else 'Avísenme por WhatsApp'}</button><p class="ok-msg" id="okMsg" role="status">Listo. Abrimos WhatsApp con tu mensaje; un asesor te responde en horario de oficina.</p></form></div></section>'''
    js = JS_COMMON + f'''
const P = {json.dumps({'id': p['id'], 'nombre': p['nombre'], 'precio': price}, ensure_ascii=False)};
// precio, estado y resumen actualizados por la jefatura desde la herramienta (tabla proyectos)
window.VV_APLICAR_PROYECTOS = rows => {{ const r = (rows || []).find(x => x.id === P.id), c = r && r.contenido; if (!c) return;
  const set = (k, v) => {{ const el = document.querySelector(`[data-f="${{k}}"]`); if (el && v != null) el.textContent = v; }};
  if (typeof c.precio === "number" && c.precio > 0) {{ P.precio = c.precio; set("Desde", "S/ " + c.precio.toLocaleString("es-PE")); set("Desde-s", "o S/ " + Math.round(c.precio * .8 / 36).toLocaleString("es-PE") + " al mes*"); if ($("#ini")) calc(); }}
  if (c.estado) {{ set("Estado", c.estado); const bd = $(".hero .badge"); if (bd) bd.textContent = bd.textContent.replace(/^[^·]+/, c.estado + " "); }}
  if (c.resumen) set("resumen", c.resumen); }};
let N = 36; const fmt = n => "S/ " + Math.round(n).toLocaleString("es-PE");
const calc = () => {{ const i = +$("#ini").value, ini = P.precio * i / 100; $("#iniL").textContent = i + "%"; $("#iniS").textContent = fmt(ini) + " (" + i + "%)"; $("#cuotaV").textContent = fmt((P.precio - ini) / N); }};
if ($("#ini")) {{ $("#ini").addEventListener("input", calc); $("#plazo").addEventListener("click", e => {{ const b = e.target.closest("button"); if (!b) return; N = +b.dataset.n; $$("#plazo button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); calc(); }}); calc();
  $("#quiero").addEventListener("click", () => {{ $("#contacto").scrollIntoView({{behavior: "smooth"}}); setTimeout(() => $("#fN").focus(), 600); }}); }}
$$("[data-wa]").forEach(a => a.addEventListener("click", e => {{ e.preventDefault(); openWa(`Hola, me interesa ${{P.nombre}}. ¿Me pasan precios, lotes disponibles y horarios de visita?`); }}));
$("#lead").addEventListener("submit", e => {{ e.preventDefault(); const n = $("#fN").value.trim(), t = $("#fT").value.replace(/\\D/g, "").replace(/^(00)?51(?=9\\d{{8}}$)/, "");
  if (n.length < 3) return $("#fN").focus(); if (!/^9\\d{{8}}$/.test(t)) {{ $("#fT").setCustomValidity("Escribe un celular de 9 dígitos que empiece con 9"); $("#fT").reportValidity(); $("#fT").setCustomValidity(""); return; }}
  if (!$("#fOk").checked) return $("#fOk").reportValidity();
  const pl = $("#fPl").value, pg = $("#fPg").value, A = window.VV_ASESOR;
  send({{nombre: n.slice(0, 120), celular: t, proyecto: P.nombre, plazo: pl === "Prefiero no indicar" ? "" : pl, pago: pg === "Prefiero no indicar" ? "" : pg, visita: VIS.day, mensaje: "Desde la página de " + P.nombre, acepta_promos: $("#fMk").checked, origen: ("Landing " + P.nombre).slice(0, 60), campana: SRC.slice(0, 120), asesor_codigo: (A && A.codigo) || undefined}});
  openWa(`Hola${{A && A.nombre ? " " + A.nombre.split(" ")[0] : ""}}, soy ${{n}}. Me interesa ${{P.nombre}}.${{VIS.day ? " Quisiera visitar el " + VIS.day + "." : ""}}${{pl !== "Prefiero no indicar" ? " Pienso comprar: " + pl.toLowerCase() + "." : ""}}${{pg !== "Prefiero no indicar" ? " Forma de pago: " + pg.toLowerCase() + "." : ""}} ¿Me ayudan con la información?`);
  $("#okMsg").classList.add("on"); }});
'''
    ld = {"@context": "https://schema.org", "@type": "Product", "name": p['nombre'], "description": p['resumen'], "brand": {"@type": "Organization", "name": "Vivaldi Inmobiliaria"},
          "category": "Lotes de terreno", "url": SITIO + p['id'] + '.html'}
    if price and not sold: ld["offers"] = {"@type": "Offer", "price": price, "priceCurrency": "PEN", "availability": "https://schema.org/InStock", "seller": {"@type": "Organization", "name": EMP['nombre']}}
    intro1, intro2 = p['intro'][0], p['intro'][1] if len(p['intro']) > 1 else ''
    body = f'''{head(title, desc, p['color'], slug=p['id'], ld=ld)}{base_js()}
<header class="top"><div class="wrap"><img src="{LOGO}" alt="Vivaldi Inmobiliaria"><nav aria-label="Secciones"><a href="#proyecto">El proyecto</a><a href="#fotos">Fotos</a><a href="#ubicacion">Ubicación</a>{'<a href="#cuota">Cuota</a>' if price and not sold else ''}{'<a href="/proyectos/recorrido-' + p['id'] + '.html" data-local="../experiencia/recorrido-' + p['id'] + '.html">Recorrido</a>' if p['id'] in RECORRIDOS else ''}{'' if sold else '<a href="/portal.html?p=' + p['id'] + '#lotes" data-portal="?p=' + p['id'] + '#lotes">Lotes en línea</a>'}<a href="#contacto">{'Visita' if not sold else 'Contacto'}</a></nav></div></header>
<main><section class="hero"><img src="{hero}" alt="{E(p['nombre'])}: {E(leyenda(hero_f).lower())}">{'<span class="ref">Render referencial</span>' if idx[hero_f] in refs else ''}<div class="wrap"><span class="badge">{E(p['estado'])} · {E(p['zona'])}{(' · Km ' + km) if km else ''}</span>
<h1>{E(p['nombre'])}</h1><p class="sub">{E(p['frase'])}</p>
<div class="cta">{'<a class="btn b-sun" href="#contacto">Agendar una visita</a>' if not sold else '<a class="btn b-sun" href="#otros">Ver proyectos en venta</a>'}<a class="btn b-line" href="{wa('Hola, me interesa ' + p['nombre'])}" data-wa>Escribir por WhatsApp</a></div></div></section>
<div class="wrap"><div class="facts">{''.join(f'<div><span>{a}</span><b data-f="{a}">{E(b)}</b><small data-f="{a}-s">{E(c)}</small></div>' for a, b, c in facts)}</div></div>
<section class="sec" id="proyecto"><div class="wrap intro"><div class="reveal"><p class="big" data-f="resumen">{E(intro1)}</p><p>{E(intro2)}</p></div>
<div class="inc reveal"><p class="lbl">{'Incluye' if not sold else 'Tiene'}</p><ul>{inc}</ul>{'' if sold else '<p style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn b-deep" href="/portal.html?p=' + p['id'] + '#lotes" data-portal="?p=' + p['id'] + '#lotes">Ver qué lotes quedan</a>' + ('<a class="btn" style="box-shadow:inset 0 0 0 1px #CFC7B8" href="/proyectos/recorrido-' + p['id'] + '.html" data-local="../experiencia/recorrido-' + p['id'] + '.html">Recórrela de la Panamericana a tu lote</a>' if p['id'] in RECORRIDOS else '') + '</p>'}</div></div></section>
<section class="sec" id="fotos" style="padding-top:0"><div class="wrap reveal"><h2>{E(p['vida'])}</h2><div class="gal">{gal}</div></div></section>
<section class="sec" id="etapas" style="background:var(--bg)"><div class="wrap reveal"><h2>{'En qué etapa está' if not sold else 'Cómo se hizo'}</h2><p class="lead">{'Cada etapa con su estado de hoy. Las fechas te las confirma tu asesor.' if not sold else 'Todas las etapas están terminadas.'}</p><ol class="ets" style="--n:{n}">{ets}</ol></div></section>
{ubic}{tst}{calc}{faq}{form}
<section class="sec" id="otros" style="background:var(--bg)"><div class="wrap reveal"><h2>Otros proyectos de Vivaldi</h2><div class="others">{oth}</div></div></section></main>
<div class="lb" role="dialog" aria-modal="true" aria-label="Foto ampliada"><button type="button" aria-label="Cerrar">×</button><img alt=""></div>
{foot('<nav class="sticky" aria-label="Contacto rápido"><a class="btn b-wa" href="' + wa('Hola, me interesa ' + p['nombre']) + '" data-wa>WhatsApp</a><a class="btn b-deep" href="#contacto">' + ('Agendar visita' if not sold else 'Contacto') + '</a></nav>')}
<script>const EMP = {json.dumps({'whatsapp': EMP['whatsapp']})};{js}</script>
{ASESOR}</body></html>'''
    return body

def wa(t): return f"https://wa.me/{EMP['whatsapp']}?text=" + __import__('urllib.parse').parse.quote(t)

# logo blanco de la web (svg) para el encabezado sobre la foto
m = re.search(r'<img[^>]+src="(data:image/svg\+xml;base64,[^"]+)"[^>]*alt="Vivaldi', src) or re.search(r'(data:image/svg\+xml;base64,[A-Za-z0-9+/=]{2000,})', src)
LOGO = m.group(1)

if __name__ == '__main__':
    for p in PRJ:
        open(f"{OUT}/{p['id']}.html", 'w', encoding='utf-8').write(landing(p)); print('ok', p['id'])
    import extranjeros; open(f'{OUT}/extranjeros.html', 'w', encoding='utf-8').write(extranjeros.page(globals())); print('ok extranjeros')
