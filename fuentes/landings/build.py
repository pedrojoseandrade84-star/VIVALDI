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
:root{--nv:#0A3856;--deep:#062B44;--ink:#0B2236;--mu:#4E6478;--ln:#DCE5EC;--bg:#F3F7FA;--sun:#E8A93A;--ok:#1F8A4C;--ac:%(color)s}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%%}body{margin:0;font-family:Manrope,system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.55}
img{max-width:100%%;display:block}a{color:inherit}h1,h2,h3{font-family:"Instrument Serif",Georgia,serif;font-weight:400;letter-spacing:-.01em;line-height:1.05;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 22px}.sec{padding:84px 0}.eb{font-size:.74rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ac);margin-bottom:12px}
h2{font-size:clamp(2.1rem,4.4vw,3.4rem);margin-bottom:18px}h2 em{color:var(--ac);font-style:italic}.lead{font-size:1.12rem;color:var(--mu);max-width:640px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 24px;border-radius:999px;font:inherit;font-weight:800;font-size:1rem;text-decoration:none;border:0;cursor:pointer;transition:transform .15s,filter .15s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.05)}.btn:focus-visible{outline:3px solid var(--sun);outline-offset:3px}
.b-wa{background:#17733F;color:#fff}.b-sun{background:var(--sun);color:#1F1604}.b-line{background:transparent;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.75)}.b-deep{background:var(--nv);color:#fff}
header.top{position:absolute;top:0;left:0;right:0;z-index:5}header.top .wrap{display:flex;align-items:center;justify-content:space-between;height:78px}
header.top img{height:30px}header.top nav{display:flex;gap:6px}header.top nav a{color:#fff;text-decoration:none;font-weight:700;font-size:.9rem;padding:10px 12px;border-radius:999px}
header.top nav a:hover{background:rgba(255,255,255,.14)}
.hero{position:relative;min-height:min(92vh,860px);display:flex;align-items:flex-end;color:#fff;overflow:hidden;background:var(--deep)}
.hero>img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;transform:scale(1.04);animation:kb 18s ease-out both}
@keyframes kb{to{transform:scale(1)}}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,43,68,.55) 0%%,rgba(6,43,68,.15) 35%%,rgba(6,43,68,.88) 100%%)}
.hero .wrap{position:relative;z-index:2;padding-bottom:64px;width:100%%}.badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:7px 14px;font-weight:800;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase}
.badge i{width:9px;height:9px;border-radius:50%%;background:var(--sun)}.hero h1{font-size:clamp(3rem,8vw,6.4rem);margin:16px 0 10px;max-width:900px}.hero h1 em{color:var(--sun)}
.hero .sub{font-size:clamp(1.05rem,2vw,1.35rem);max-width:640px;color:#E3EEF6}.hero .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.ref{position:absolute;right:16px;bottom:16px;z-index:3;font-size:.72rem;font-weight:700;background:rgba(0,0,0,.45);color:#fff;padding:5px 10px;border-radius:999px}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#fff;border-radius:22px;box-shadow:0 18px 50px rgba(6,43,68,.14);transform:translateY(-44px);position:relative;z-index:3;overflow:hidden}
.facts div{padding:22px 24px;border-right:1px solid var(--ln)}.facts div:last-child{border:0}.facts span{display:block;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mu)}
.facts b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:2rem;color:var(--nv);line-height:1.1;margin-top:4px}.facts small{color:var(--mu);font-size:.85rem}
.g2{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center}
.bens{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.bens div{display:flex;align-items:center;gap:12px;background:var(--bg);border-radius:14px;padding:14px 16px;font-weight:700}
.bens i{flex:none;width:30px;height:30px;border-radius:9px;background:var(--ac);display:grid;place-items:center}.bens i::after{content:"";width:12px;height:7px;border:solid #fff;border-width:0 0 3px 3px;transform:rotate(-45deg) translate(1px,-1px)}
.shot{border-radius:22px;overflow:hidden;box-shadow:0 26px 60px rgba(6,43,68,.22);position:relative}.shot img{width:100%%;aspect-ratio:4/3;object-fit:cover}
.stages{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:0;margin-top:34px;position:relative}
.stages::before{content:"";position:absolute;left:0;right:0;top:21px;height:4px;background:var(--ln);border-radius:4px}
.st{position:relative;padding-right:16px}.st .dot{width:46px;height:46px;border-radius:50%%;display:grid;place-items:center;background:#fff;border:4px solid var(--ln);position:relative;z-index:1;font-weight:800;color:var(--mu)}
.st.hecho .dot{background:var(--ok);border-color:var(--ok);color:#fff}.st.curso .dot{background:var(--sun);border-color:var(--sun);color:#1F1604;box-shadow:0 0 0 8px rgba(232,169,58,.2)}
.st b{display:block;margin-top:14px;font-size:1.05rem}.st span{font-size:.85rem;color:var(--mu);font-weight:700;text-transform:uppercase;letter-spacing:.08em}.st small{display:block;color:var(--mu);font-size:.78rem;margin-top:2px}
.gal{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:220px;gap:12px;margin-top:30px}.gal button{padding:0;border:0;border-radius:16px;overflow:hidden;cursor:zoom-in;position:relative;background:var(--bg)}
.gal button:first-child{grid-column:span 2;grid-row:span 2}.gal img{width:100%%;height:100%%;object-fit:cover;transition:transform .5s}.gal button:hover img{transform:scale(1.05)}
.gal .ref{right:10px;bottom:10px}
.lb{position:fixed;inset:0;z-index:90;background:rgba(4,20,32,.94);display:none;align-items:center;justify-content:center;padding:20px}.lb.on{display:flex}.lb img{max-height:88vh;border-radius:12px}
.lb button{position:absolute;top:16px;right:16px;width:48px;height:48px;border-radius:50%%;border:0;background:#fff;font-size:1.4rem;cursor:pointer}
.calc{display:grid;grid-template-columns:1fr 1fr;gap:28px;background:var(--bg);border-radius:24px;padding:30px;margin-top:28px}
.calc label{display:block;font-weight:800;margin:0 0 8px}.calc input[type=range]{width:100%%;accent-color:var(--ac)}.seg{display:flex;gap:8px;flex-wrap:wrap}
.seg button{min-height:44px;padding:0 18px;border-radius:999px;border:2px solid var(--ln);background:#fff;font:inherit;font-weight:800;cursor:pointer}.seg button[aria-pressed=true]{background:var(--nv);border-color:var(--nv);color:#fff}
.res{background:linear-gradient(135deg,var(--deep),var(--nv));color:#fff;border-radius:20px;padding:26px}.res b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:3.6rem;line-height:1;color:var(--sun)}
.res p{margin:6px 0 0;color:#CFE3F4}.res .row{display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.15);padding-top:10px;margin-top:10px;font-size:.92rem}
.contact{background:linear-gradient(135deg,var(--deep),#0E4C72);color:#fff}.contact h2{color:#fff}.contact h2 em{color:var(--sun)}.contact .lead{color:#CFE3F4}
form.card{background:#fff;color:var(--ink);border-radius:22px;padding:28px;display:grid;gap:14px;box-shadow:0 30px 70px rgba(0,0,0,.25)}
form.card label{display:grid;gap:6px;font-weight:800;font-size:.9rem}form.card input,form.card select{font:inherit;font-size:16px;min-height:48px;padding:0 14px;border:1px solid var(--ln);border-radius:12px;background:var(--bg)}
form.card .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.days{display:flex;gap:8px;flex-wrap:wrap}.days button{min-height:52px;min-width:66px;border-radius:12px;border:2px solid var(--ln);background:#fff;font:inherit;font-weight:800;cursor:pointer;line-height:1.1}
.days button small{display:block;font-weight:600;font-size:.72rem;color:var(--mu)}.days button[aria-pressed=true]{border-color:var(--ac);background:#EEF5FB}
.chk{display:flex!important;grid-template-columns:none;align-items:flex-start;gap:10px;font-weight:600!important;font-size:.85rem!important;color:var(--mu)}.chk input{min-height:0!important;width:20px;height:20px;margin-top:2px}
.ok-msg{display:none;background:#E6F4EC;color:#14532D;border-radius:12px;padding:12px 14px;font-weight:700}.ok-msg.on{display:block}
.tsts{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}.tsts figure{margin:0;background:#fff;border-radius:18px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;gap:18px;box-shadow:0 8px 24px rgba(6,43,68,.07)}
.tsts blockquote{margin:0;font-family:"Instrument Serif",Georgia,serif;font-size:1.35rem;line-height:1.3;color:var(--nv)}.tsts blockquote::before{content:"“"}.tsts blockquote::after{content:"”"}
.tsts figcaption{display:flex;align-items:center;gap:12px;font-size:.84rem;color:var(--mu)}.tsts figcaption img{width:52px;height:52px;border-radius:50%%;object-fit:cover}.tsts figcaption b{display:block;color:var(--ink);font-size:.95rem}
.fq{border-bottom:1px solid var(--ln);padding:16px 0}.fq summary{font-weight:800;cursor:pointer;min-height:28px;list-style:none;display:flex;justify-content:space-between;gap:16px}.fq summary::after{content:"+";color:var(--ac);font-size:1.3rem;line-height:1}.fq[open] summary::after{content:"−"}.fq summary::-webkit-details-marker{display:none}.fq p{margin:10px 0 0;color:var(--mu)}
.others{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}.others a{display:block;text-decoration:none;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(6,43,68,.1);transition:transform .2s}
.others a:hover{transform:translateY(-3px)}.others img{width:100%%;aspect-ratio:16/10;object-fit:cover}.others div{padding:14px 16px}.others b{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:1.45rem;color:var(--nv);display:block}.others span{color:var(--mu);font-size:.88rem}
footer{background:#041F33;color:#9FB9CC;padding:40px 0 110px;font-size:.88rem}footer .wrap{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between}footer a{color:#fff}
.sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;display:none;gap:10px}.sticky .btn{flex:1;min-height:52px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .7s,transform .7s}.reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}.hero>img{animation:none}}
@media (max-width:900px){.tsts{grid-template-columns:1fr}.g2,.calc{grid-template-columns:1fr}.facts{grid-template-columns:1fr 1fr}.facts div:nth-child(2){border-right:0}.facts div{border-bottom:1px solid var(--ln)}
 .gal{grid-template-columns:1fr 1fr;grid-auto-rows:160px}.others{grid-template-columns:1fr}.stages{grid-template-columns:1fr;gap:18px}.stages::before{left:21px;right:auto;top:0;bottom:0;width:4px;height:auto}
 .st{display:grid;grid-template-columns:46px 1fr;gap:14px;align-items:center}.st b{margin:0}header.top nav{display:none}.sticky{display:flex}.sec{padding:64px 0}}
@media (max-width:520px){.bens{grid-template-columns:1fr}form.card .two{grid-template-columns:1fr}.hero .cta .btn{flex:1}}
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

def landing(p):
    others = [x for x in PRJ if x['id'] != p['id'] and x['estado'] != 'Vendido 100%'][:3]
    refs = set(p.get('fotos_referenciales', [])); fotos = p['fotos']
    hero = img(fotos[0], 1920, 72); price = p['precio']; sold = p['estado'].startswith('Vendido')
    cuota36 = soles(price * .8 / 36) if price else None
    facts = [('Desde', soles(price) if price else 'Consultar', f'o {cuota36} al mes*' if cuota36 else 'precio con tu asesor'),
             ('Lote', f"{p['m2']} m²" if p['m2'] else 'Consultar', 'título independizado' if 'Título independizado' in p['beneficios'] else 'área del lote'),
             ('Ubicación', f"Km {p['km']:g}" if p['km'] else p['zona'], f"Panamericana Sur · {p['zona']}"),
             ('Estado', p['estado'], 'en soles, sin intereses' if price else 'Vivaldi Inmobiliaria')]
    n = len(p['etapas']); stg = ''.join(f'''<div class="st {'hecho' if e['estado'] == 'hecho' else 'curso' if e['estado'] == 'en curso' else ''}"><div class="dot">{'✓' if e['estado'] == 'hecho' else k + 1}</div><div><b>{E(e['nombre'])}</b><span>{E(e['estado'])}</span>{'<small>Fecha por confirmar con tu asesor</small>' if e.get('confirmar') else ''}</div></div>''' for k, e in enumerate(p['etapas']))
    gal = ''.join(f'''<button type="button" aria-label="Ampliar foto {k + 1}"><img src="{img(f, 1200, 72)}" alt="{E(p['nombre'])}, foto {k + 1}" loading="lazy">{'<span class="ref">Referencial</span>' if k in refs else ''}</button>''' for k, f in enumerate(fotos[:8]))
    bens = ''.join(f'<div><i></i>{E(b)}</div>' for b in p['beneficios'])
    oth = ''.join(f'''<a href="{x['id']}.html"><img src="{img(x['fotos'][0], 700, 70)}" alt="{E(x['nombre'])}" loading="lazy"><div><b>{E(x['nombre'])}</b><span>{E(x['estado'])}{' · desde ' + soles(x['precio']) if x['precio'] else ''}</span></div></a>''' for x in others)
    import urllib.parse as _u
    mapa = 'https://www.google.com/maps/search/?api=1&query=' + _u.quote(f"{p['nombre']} {'Km ' + format(p['km'], 'g') + ' ' if p['km'] else ''}Panamericana Sur {p['zona']} Cañete")
    ubic = f'''<section class="sec" id="ubicacion"><div class="wrap g2"><div class="reveal"><div class="eb">Ubicación</div><h2>Cómo <em>llegar</em></h2>
<p class="lead">{E(p['nombre'])} está {('en el km ' + format(p['km'], 'g') + ' de la Panamericana Sur') if p['km'] else 'sobre la Panamericana Sur'}, en {E(p['zona'])}, provincia de Cañete. Tu asesor te envía la ubicación exacta y el punto de encuentro por WhatsApp.</p>
<div class="bens" style="grid-template-columns:1fr"><div><i></i>Visitas guiadas los fines de semana, con punto de encuentro coordinado con tu asesor</div><div><i></i>{'Referencia: Km ' + format(p['km'], 'g') + ' de la Panamericana Sur' if p['km'] else 'Ubicación exacta por WhatsApp'}</div></div>
<p style="margin-top:20px"><a class="btn b-deep" href="{mapa}" target="_blank" rel="noopener">Abrir en Google Maps</a></p></div>
<div class="shot reveal"><img src="{img(fotos[-1] if len(fotos) > 2 else fotos[0], 1200, 72)}" alt="{E(p['nombre'])}, vista del proyecto" loading="lazy">{'<span class="ref">Referencial</span>' if (len(fotos) - 1 if len(fotos) > 2 else 0) in refs else ''}</div></div></section>'''
    tsts = TST[:3]
    tst = f'''<section class="sec" id="opiniones" style="background:var(--bg)"><div class="wrap reveal"><div class="eb">Propietarios Vivaldi</div><h2>Lo que dicen <em>quienes ya compraron</em></h2>
<div class="tsts">{''.join(f'<figure><blockquote>{E(q)}</blockquote><figcaption><img src="{img(ph, 160, 70)}" alt="" width="52" height="52" loading="lazy"><span><b>{E(n)}</b>{E(r)} · Vivaldi Inmobiliaria</span></figcaption></figure>' for n, ph, r, q in tsts)}</div>
<p style="font-size:.8rem;color:var(--mu);margin-top:12px">Testimonios publicados en vivaldiinmobiliaria.com.</p></div></section>'''
    qs = []
    if 'Título independizado' in p['beneficios']: qs.append(('¿El lote tiene título?', 'Sí. Cada lote cuenta con título independizado inscrito en SUNARP. Antes de firmar te entregamos la partida para que la verifiques.'))
    if price and not sold: qs.append(('¿Cómo funciona el financiamiento?', 'Es directo con Vivaldi y sin intereses: pagas una inicial y el saldo en cuotas fijas en soles. El plazo y la inicial los defines con tu asesor.'))
    qs.append(('¿En qué moneda pago?', 'En soles, así tu cuota no depende del tipo de cambio.'))
    if not sold: qs.append(('¿Puedo visitar el proyecto antes de decidir?', 'Sí. Hay visitas guiadas los fines de semana. Elige el día en el formulario y tu asesor te confirma la hora y el punto de encuentro.'))
    qs.append(('¿Cómo verifico a la empresa?', f"Inmobiliaria & Constructora Vivaldi S.A.C., RUC {EMP['ruc']}. Puedes consultar el RUC en SUNAT y visitarnos en {EMP['oficina']}."))
    faq = '<section class="sec" id="preguntas"><div class="wrap reveal" style="max-width:860px"><div class="eb">Preguntas frecuentes</div><h2>Antes de <em>decidir</em></h2>' + ''.join(f'<details class="fq"><summary>{E(a)}</summary><p>{E(b)}</p></details>' for a, b in qs) + '</div></section>'
    title = f"{p['nombre']} · {p['lema']} | Vivaldi Inmobiliaria"
    desc = p['resumen']
    calc = '' if not price or sold else f'''<section class="sec" id="cuota" style="background:#fff"><div class="wrap reveal"><div class="eb">Financiamiento directo</div><h2>Calcula tu <em>cuota</em></h2>
<p class="lead">Sin bancos y sin intereses: pagas una inicial y el saldo en cuotas fijas en soles.</p>
<div class="calc"><div><label for="ini">Cuota inicial: <span id="iniL">20%</span></label><input id="ini" type="range" min="10" max="60" step="5" value="20" aria-describedby="iniL">
<label style="margin-top:22px">Plazo</label><div class="seg" id="plazo">{''.join(f'<button type="button" data-n="{m}" aria-pressed="{str(m == 36).lower()}">{m} meses</button>' for m in (12, 24, 36))}</div></div>
<div class="res" aria-live="polite"><p>Tu cuota mensual</p><b id="cuotaV">—</b><div class="row"><span>Precio del lote</span><span>{soles(price)}</span></div><div class="row"><span>Inicial</span><span id="iniS">—</span></div><div class="row"><span>Intereses</span><span>S/ 0</span></div>
<button class="btn b-sun" type="button" id="quiero" style="margin-top:16px;width:100%">Quiero esta cuota</button></div></div><p style="font-size:.82rem;color:var(--mu);margin-top:12px">*Cuota referencial. El plan final lo confirma tu asesor.</p></div></section>'''
    form = f'''<section class="sec contact" id="contacto"><div class="wrap g2"><div class="reveal"><div class="eb" style="color:var(--sun)">{'Agenda tu visita' if not sold else 'Próximos proyectos'}</div>
<h2>{'Conoce ' + E(p['nombre']) + ' <em>en persona</em>' if not sold else '¿Te gustaría un proyecto <em>como este</em>?'}</h2>
<p class="lead">{'Elige un día, deja tus datos y un asesor te confirma por WhatsApp. Visitas guiadas los fines de semana.' if not sold else 'Zafiro ya se entregó a sus propietarios. Déjanos tus datos y te avisamos del próximo proyecto, o mira los que están en venta.'}</p>
<p style="margin-top:22px;font-weight:700">WhatsApp {E(EMP['telefono'])}<br><span style="font-weight:500;color:#CFE3F4">{E(EMP['horario'])}</span></p></div>
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
  if (c.estado) {{ set("Estado", c.estado); const bd = $(".hero .badge"); if (bd) bd.lastChild.textContent = bd.lastChild.textContent.replace(/^[^·]+/, c.estado + " "); }}
  if (c.resumen) {{ const sb = $(".hero .sub"); if (sb) sb.textContent = (c.lema || "") + (c.lema ? ". " : "") + c.resumen; }} }};
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
    body = f'''{head(title, desc, p['color'], slug=p['id'], ld=ld)}{base_js()}
<header class="top"><div class="wrap"><img src="{LOGO}" alt="Vivaldi Inmobiliaria"><nav aria-label="Secciones"><a href="#porque">El proyecto</a><a href="#etapas">Etapas</a><a href="#galeria">Fotos</a><a href="#ubicacion">Ubicación</a>{'<a href="#cuota">Cuota</a>' if price and not sold else ''}<a href="#contacto">{'Visita' if not sold else 'Contacto'}</a></nav></div></header>
<main><section class="hero"><img src="{hero}" alt="{E(p['nombre'])}">{'<span class="ref">Imagen referencial</span>' if 0 in refs else ''}<div class="wrap"><span class="badge"><i></i>{E(p['estado'])} · {E(p['zona'])}{(' · Km ' + format(p['km'], 'g')) if p['km'] else ''}</span>
<h1>{E(p['nombre'])}</h1><p class="sub">{E(p['lema'])}.</p>
<div class="cta">{'<a class="btn b-sun" href="#contacto">Agendar visita</a>' if not sold else '<a class="btn b-sun" href="#otros">Ver proyectos en venta</a>'}<a class="btn b-wa" href="{wa('Hola, me interesa ' + p['nombre'])}" data-wa>Escribir por WhatsApp</a></div></div></section>
<div class="wrap"><div class="facts">{''.join(f'<div><span>{a}</span><b data-f="{a}">{E(b)}</b><small data-f="{a}-s">{E(c)}</small></div>' for a, b, c in facts)}</div></div>
<section class="sec" id="porque" style="padding-top:30px"><div class="wrap g2"><div class="reveal"><div class="eb">El proyecto</div><h2>Lo que encuentras en <em>{E(p['nombre'])}</em></h2><p class="lead">{E(p['resumen'])}</p><div class="bens">{bens}</div></div>
<div class="shot reveal"><img src="{img(fotos[1] if len(fotos) > 1 else fotos[0], 1400, 72)}" alt="{E(p['nombre'])}" loading="lazy">{'<span class="ref">Referencial</span>' if (1 if len(fotos) > 1 else 0) in refs else ''}</div></div></section>
<section class="sec" id="etapas" style="background:var(--bg)"><div class="wrap reveal"><div class="eb">Etapas</div><h2>Cómo avanza <em>el proyecto</em></h2><p class="lead">Estado actual de cada etapa. Tu asesor te confirma las fechas.</p><div class="stages" style="--n:{n}">{stg}</div></div></section>
<section class="sec" id="galeria"><div class="wrap reveal"><div class="eb">Galería</div><h2>Fotos <em>del proyecto</em></h2><div class="gal">{gal}</div></div></section>
{ubic}{tst}{calc}{faq}{form}
<section class="sec" id="otros" style="background:var(--bg)"><div class="wrap reveal"><div class="eb">Más proyectos</div><h2>Otros proyectos <em>de Vivaldi</em></h2><div class="others">{oth}</div></div></section></main>
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
