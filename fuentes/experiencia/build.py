# Experiencia guiada por scroll de un proyecto (archivo único, funciona sin internet).
# Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: node capturas_sim.js capturas portada && python3 build.py
import base64, io, json, os, sys
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(D + '/../..')
sys.path.insert(0, ROOT + '/fuentes/landings')
import build as L  # fotos, tipografías, logo, módulo del asesor y datos de la empresa

P = next(p for p in L.PRJ if p['id'] == 'portada'); EMP = L.EMP; E = L.E
CAP = D + '/capturas'
def png(nombre, w=1600, q=78):
    im = Image.open(f'{CAP}/{nombre}.png').convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

precio = P['precio']; cuota = L.soles(precio * .8 / 36); km = format(P['km'], 'g')
MAPA = L.img('2025/09/kmz-portada-actualizado.png', 1400, 82)
CLUB = [('2025/09/PISCINA.png', 'La piscina', 'Para los domingos de verano sin salir del condominio.'),
        ('2025/05/gimnasio-1.webp', 'El gimnasio al aire libre', 'Máquinas al aire libre, dentro del club.'),
        ('2025/09/cancha-de-futbol.png', 'La cancha de fútbol', 'La pichanga de fin de semana, en casa.'),
        ('2025/05/multiusos-BVE-XDz7-1.webp', 'La losa multiusos', 'Vóley, básquet o lo que decida el grupo.'),
        ('2025/05/juegos-1.webp', 'Los juegos para niños', 'Un espacio propio para los más chicos.'),
        ('2025/05/parrilla-hgxjNDTo-1.webp', 'La zona de parrillas', 'Donde termina el día.')]
CASA = [('s2-exterior', 'Casa de playa de 2 pisos', 'Así podría verse tu casa en un lote de 6 × 15 m.'),
        ('s3-atardecer', 'Al atardecer', 'La misma casa, con la luz de la tarde.'),
        ('s4-corte', 'Por dentro', 'Sala, comedor, cocina, escalera y baño de visitas en el primer piso.'),
        ('s6-plano-p1', 'Primer piso', 'Sala, comedor, cocina y baño de visitas.'),
        ('s7-plano-p2', 'Segundo piso', 'Dormitorio principal con baño, estudio y terraza.')]

def capa(src, alt, i, n, ref='', extra=''):
    a, b = i / n, (i + 1) / n
    return f'<figure class="ly" data-a="{a:.4f}" data-b="{b:.4f}"{extra}><img src="{src}" alt="{E(alt)}" decoding="async">{f"<span class=ref>{ref}</span>" if ref else ""}</figure>'
def rotulos(items):
    n = len(items)
    return ''.join(f'<div class="cap" data-a="{k / n:.4f}" data-b="{(k + 1) / n:.4f}"><small>{k + 1:02d} / {n:02d}</small><b>{E(t)}</b><p>{E(d)}</p></div>' for k, (_, t, d) in enumerate(items))

club_ly = ''.join(capa(L.img(f, 1600, 76), f'{P["nombre"]}: {t.lower()}', k, len(CLUB), 'Render referencial') for k, (f, t, _) in enumerate(CLUB))
casa_ly = ''.join(capa(png(f), f'{t}: propuesta referencial del simulador 3D', k, len(CASA), 'Propuesta referencial') for k, (f, t, _) in enumerate(CASA))

CSS = '''
:root{--ink:#16232D;--mu:#5A6872;--ln:#E4DED3;--paper:#FFFDF9;--sand:#F6F1E9;--sun:#E5A53C;--ac:%(color)s;--night:#0C1820}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%%}body{margin:0;font-family:Manrope,system-ui,sans-serif;color:var(--ink);background:var(--night);line-height:1.55}
img{display:block;max-width:100%%}a{color:inherit}h1,h2{font-family:"Instrument Serif",Georgia,serif;font-weight:400;margin:0;line-height:1.02;letter-spacing:-.01em}
.top{position:fixed;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px clamp(16px,3vw,36px);color:#fff;
  background:linear-gradient(180deg,rgba(8,16,22,.6),rgba(8,16,22,0));transition:background-color .3s}
.top.solid{background:var(--night)}
.top img{height:26px}.top nav{display:flex;gap:10px;align-items:center}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:8px;font-weight:700;font-size:.95rem;text-decoration:none;border:0;cursor:pointer;font-family:inherit}
.btn:focus-visible,a:focus-visible{outline:3px solid var(--sun);outline-offset:3px}
.b-light{background:#FFFDF9;color:var(--ink)}.b-wa{background:#17733F;color:#fff}.b-line{box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);color:#fff;background:transparent}
.bar{position:fixed;left:0;top:0;height:3px;background:var(--sun);z-index:31;width:0}
.chap{position:fixed;right:clamp(14px,2.4vw,30px);top:50%%;transform:translateY(-50%%);z-index:25;display:flex;flex-direction:column;gap:12px;list-style:none;margin:0;padding:0}
.chap a{display:flex;align-items:center;gap:10px;justify-content:flex-end;text-decoration:none;color:rgba(255,255,255,.55);font-size:.82rem;font-weight:600}
.chap a i{width:22px;height:2px;background:currentColor;transition:width .3s}.chap a[aria-current=true]{color:#fff}.chap a[aria-current=true] i{width:40px}
.sc{position:relative}.stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;background:var(--night)}
.ly{position:absolute;inset:0;margin:0;opacity:0;will-change:opacity,transform}.ly img{width:100%%;height:100%%;object-fit:cover}
.shade::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(8,16,22,.62) 0%%,rgba(8,16,22,.12) 55%%,rgba(8,16,22,0) 70%%),linear-gradient(0deg,rgba(8,16,22,.55),rgba(8,16,22,0) 40%%)}
.ref{position:absolute;right:14px;bottom:14px;font-size:.72rem;font-weight:600;background:rgba(0,0,0,.5);color:#fff;padding:4px 9px;border-radius:4px}
.txt{position:absolute;z-index:3;left:clamp(18px,6vw,90px);bottom:clamp(90px,14vh,150px);max-width:min(620px,86vw);color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.45)}
.txt .k{display:block;font-size:.92rem;font-weight:600;color:rgba(255,255,255,.85);margin-bottom:10px}
.txt h1{font-size:clamp(3rem,8vw,6.6rem)}.txt h2{font-size:clamp(2.2rem,5vw,4rem)}.txt p{font-size:clamp(1.02rem,1.6vw,1.25rem);margin:14px 0 0;color:rgba(255,255,255,.92)}
.cap{position:absolute;z-index:3;left:clamp(18px,6vw,90px);bottom:clamp(90px,14vh,150px);max-width:min(480px,86vw);color:#fff;opacity:0;transform:translateY(10px);background:rgba(10,20,28,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:18px 22px 20px;border-radius:10px}
.cap small{display:block;font-size:.8rem;font-weight:700;color:rgba(255,255,255,.75)}.cap b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.05;margin:6px 0 8px}
.cap p{margin:0;font-size:clamp(1rem,1.5vw,1.15rem);color:rgba(255,255,255,.9)}
.pin{position:absolute;z-index:3;padding:8px 12px;border-radius:6px;background:rgba(255,253,249,.94);color:var(--ink);font-size:.88rem;font-weight:700;opacity:0;transform:translateY(6px);box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:nowrap}
.pin span{display:block;font-weight:500;color:var(--mu);font-size:.78rem}
.hint{position:absolute;left:50%%;bottom:26px;transform:translateX(-50%%);color:rgba(255,255,255,.8);font-size:.85rem;font-weight:600;z-index:3;text-align:center}
.hint i{display:block;width:1px;height:34px;background:rgba(255,255,255,.7);margin:8px auto 0;animation:baja 1.8s ease-in-out infinite}
@keyframes baja{0%%{transform:scaleY(0);transform-origin:top}50%%{transform:scaleY(1);transform-origin:top}51%%{transform-origin:bottom}100%%{transform:scaleY(0);transform-origin:bottom}}
.fin{background:var(--paper);color:var(--ink);padding:clamp(70px,10vw,120px) 0}
.wrap{max-width:1120px;margin:0 auto;padding:0 clamp(18px,4vw,30px)}
.fin h2{font-size:clamp(2.4rem,5vw,4rem);margin-bottom:16px}.fin .lead{font-size:1.12rem;color:var(--mu);max-width:640px;margin:0}
.nums{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ln);border-bottom:1px solid var(--ln);margin:40px 0}
.nums div{padding:24px 20px 22px 0;margin-right:20px;border-right:1px solid var(--ln)}.nums div:last-child{border:0;margin:0}
.nums span{display:block;font-size:.88rem;font-weight:600;color:var(--mu)}.nums b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:2.3rem;line-height:1.1;margin-top:6px}.nums small{color:var(--mu)}
.cta{display:flex;gap:12px;flex-wrap:wrap}.cta .btn{min-height:52px;padding:0 24px}.b-ink{background:var(--ink);color:#fff}.b-ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px #CFC7B8}
.note{font-size:.84rem;color:var(--mu);margin-top:26px;max-width:760px}
footer{background:#0F1A22;color:#A9B4BC;padding:34px 0 40px;font-size:.86rem}footer a{color:#fff}
@media (max-width:760px){.chap{display:none}.top .b-line{display:none}.txt,.cap{bottom:96px}.cap{padding:14px 16px 16px;left:14px;right:14px;max-width:none}.nums{grid-template-columns:1fr 1fr}.nums div{padding:18px 12px 16px 0}.nums div:nth-child(2n){border-right:0}.nums div:nth-child(-n+2){border-bottom:1px solid var(--ln)}.nums b{font-size:1.8rem}
 .shade::after{background:linear-gradient(0deg,rgba(8,16,22,.78),rgba(8,16,22,.1) 60%%)}.pin{font-size:.78rem;padding:6px 9px}}
@media (prefers-reduced-motion:reduce){.hint i{animation:none}}
'''

JS = r'''
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const top = document.querySelector(".top"), scs = [...document.querySelectorAll(".sc")], bar = document.querySelector(".bar"), chap = [...document.querySelectorAll(".chap a")];
  // opacidad de una capa entre a y b con fundido suave en los bordes (la primera entra visible, la última se queda)
  const fade = (p, a, b, first, last, f = .06) => { const i = first ? 1 : cl((p - a + f) / f), o = last ? 1 : cl((b + f - p) / f); return Math.min(i, o); };
  function frame() {
    const vh = innerHeight, doc = document.documentElement;
    bar.style.width = (100 * scrollY / Math.max(1, doc.scrollHeight - vh)) + "%";
    let cur = 0;
    scs.forEach((s, si) => { const r = s.getBoundingClientRect(), len = s.offsetHeight - vh, p = cl(-r.top / Math.max(1, len));
      if (r.top < vh * .5) cur = si;
      if (r.bottom < -50 || r.top > vh + 50) return;
      const lys = [...s.querySelectorAll(".ly")];
      lys.forEach((l, i) => { const a = +l.dataset.a, b = +l.dataset.b; l.style.opacity = fade(p, a, b, i === 0, i === lys.length - 1);
        if (l.dataset.zoom && !reduce) { const [z0, z1] = l.dataset.zoom.split(",").map(Number); l.style.transform = `scale(${z0 + (z1 - z0) * p})`; }
        else if (!reduce) l.style.transform = `scale(${1.06 - .06 * cl((p - a) / Math.max(.01, b - a))})`; });
      s.querySelectorAll(".cap,.pin,.txt[data-a]").forEach(c => { const a = +c.dataset.a, b = +c.dataset.b, o = Math.min(a <= 0 ? 1 : cl((p - a) / .05), cl((b - p) / .05) + (b >= 1 ? 1 : 0));
        c.style.opacity = o; c.style.transform = `translateY(${(1 - o) * 10}px)`; c.setAttribute("aria-hidden", o < .5 ? "true" : "false"); });
    });
    const fin = document.getElementById("numeros"); top.classList.toggle("solid", fin.getBoundingClientRect().top < 70);
    const s0 = scs[0], h0 = document.querySelector(".hint"); if (h0) h0.style.opacity = 1 - cl(scrollY / Math.max(1, (s0.offsetHeight - vh) * .08));
    const ch = fin.getBoundingClientRect().top < vh * .5 ? "numeros" : scs[cur] && scs[cur].dataset.chap; chap.forEach(a => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + ch)));
  }
  let pend = false; const req = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; frame(); }); } };
  addEventListener("scroll", req, {passive: true}); addEventListener("resize", req); frame();
  // enlaces: en la computadora (archivos) apuntan a las carpetas vecinas; publicados, a las rutas del sitio
  if (location.protocol === "file:") document.querySelectorAll("[data-local]").forEach(a => { a.href = a.dataset.local; });
  const P = __P__;
  window.VV_APLICAR_PROYECTOS = rows => { const r = (rows || []).find(x => x.id === P.id), c = r && r.contenido; if (!c) return;
    if (typeof c.precio === "number" && c.precio > 0) { const s = n => "S/ " + Math.round(n).toLocaleString("es-PE"); document.querySelectorAll('[data-f="precio"]').forEach(e => e.textContent = s(c.precio)); document.querySelectorAll('[data-f="cuota"]').forEach(e => e.textContent = s(c.precio * .8 / 36)); }
    if (c.estado) document.querySelectorAll('[data-f="estado"]').forEach(e => e.textContent = c.estado); };
  const wa = t => `https://wa.me/${EMPRESA}?text=${encodeURIComponent(t)}`;
  document.querySelectorAll("[data-wa]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); const u = wa(`Hola, vi el recorrido de ${P.nombre} y quiero información de los lotes y la visita.`), w = window.open(u, "_blank"); if (w) { try { w.opener = null; } catch (x) {} } else location.href = u; }));
})();
'''

def page():
    t = f"{P['nombre']}: recórrelo | Vivaldi Inmobiliaria"
    d = f"Recorre {P['nombre']} desde la Panamericana Sur hasta tu lote: ubicación en el km {km}, el club y la casa que podrías construir en 90 m²."
    pj = {'id': P['id'], 'nombre': P['nombre']}
    wa_url = f"https://wa.me/{EMP['whatsapp']}?text=" + __import__('urllib.parse').parse.quote(f"Hola, vi el recorrido de {P['nombre']} y quiero información.")
    return f'''<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(t)}</title><meta name="description" content="{E(d)}"><meta name="theme-color" content="#0C1820"><link rel="canonical" href="https://vivaldiinmobiliaria.com/proyectos/recorrido-portada.html">
<meta property="og:title" content="{E(t)}"><meta property="og:description" content="{E(d)}"><meta property="og:type" content="website">
<style>{L.FONTS}{CSS % {'color': P['color']}}</style></head><body>
{L.base_js()}
<div class="bar" aria-hidden="true"></div>
<header class="top"><img src="{L.LOGO}" alt="Vivaldi Inmobiliaria"><nav aria-label="Acciones"><a class="btn b-line" href="/proyectos/portada.html" data-local="../landings/portada.html">El proyecto</a><a class="btn b-light" href="/portal.html?p=portada#lotes" data-local="../web/portal.html?p=portada#lotes">Ver lotes</a></nav></header>
<nav aria-label="Capítulos del recorrido"><ol class="chap"><li><a href="#ubicacion"><span>Ubicación</span><i></i></a></li><li><a href="#ingreso"><span>Ingreso</span><i></i></a></li><li><a href="#club"><span>El club</span><i></i></a></li><li><a href="#casa"><span>Tu casa</span><i></i></a></li><li><a href="#numeros"><span>Números</span><i></i></a></li></ol></nav>
<main>
<section class="sc" id="ubicacion" data-chap="ubicacion" style="height:340vh" aria-label="Ubicación"><div class="stage shade">
  <figure class="ly" data-a="0" data-b=".62" data-zoom="1,1.55" style="transform-origin:17% 62%"><img src="{MAPA}" alt="Mapa oficial de {E(P['nombre'])} en el km {km} de la Panamericana Sur" decoding="async"><span class="ref">Imagen referencial</span></figure>
  <figure class="ly" data-a=".62" data-b="1"><img src="{png('s1-entorno')}" alt="El lote de 6 × 15 m dentro del condominio, junto a la Panamericana Sur" decoding="async"><span class="ref">Vista referencial del simulador 3D</span></figure>
  <div class="txt" data-a="0" data-b=".2"><span class="k">{E(P['estado'])} · Asia · Km {km}</span><h1>{E(P['nombre'])}</h1><p>Recórrela desde la Panamericana hasta tu lote.</p></div>
  <div class="cap" data-a=".22" data-b=".6"><small>Ubicación</small><b>Km {km} de la Panamericana Sur</b><p>Unos {int(P['km'])} km al sur de Lima. En el mismo tramo están Playa Leoncitos, Playa Valdivia y el Boulevard de Asia.</p></div>
  <div class="cap" data-a=".66" data-b="1"><small>Tu lote</small><b>6 × 15 m: 90 m² para construir</b><p>Dentro del condominio, a pasos del ingreso y del club.</p></div>
  <div class="hint" aria-hidden="true">Baja para recorrerla<i></i></div>
</div></section>
<section class="sc" id="ingreso" data-chap="ingreso" style="height:170vh" aria-label="Ingreso"><div class="stage shade">
  <figure class="ly" data-a="0" data-b="1"><img src="{L.img('2025/05/portico-4.webp', 1800, 78)}" alt="Pórtico de ingreso de {E(P['nombre'])}" decoding="async"><span class="ref">Render referencial</span></figure>
  <div class="cap" data-a=".1" data-b="1"><small>El ingreso</small><b>Así se llega a casa</b><p>Un pórtico propio marca la entrada al condominio.</p></div>
</div></section>
<section class="sc" id="club" data-chap="club" style="height:{len(CLUB) * 85 + 40}vh" aria-label="El club"><div class="stage shade">{club_ly}{rotulos(CLUB)}</div></section>
<section class="sc" id="casa" data-chap="casa" style="height:{len(CASA) * 90 + 40}vh" aria-label="Tu casa"><div class="stage shade">{casa_ly}{rotulos(CASA)}</div></section>
<section class="fin" id="numeros" data-chap="numeros"><div class="wrap">
  <p class="lbl" style="font-weight:600;color:var(--mu);margin:0 0 8px">{E(P['nombre'])}</p><h2>Los números de tu lote</h2>
  <p class="lead">Financiamiento directo con Vivaldi, en soles y sin intereses. Pagas una inicial y el resto en cuotas fijas.</p>
  <div class="nums"><div><span>Desde</span><b data-f="precio">{L.soles(precio)}</b><small>lote de 90 m²</small></div><div><span>Cuota</span><b data-f="cuota">{cuota}</b><small>al mes en 36 cuotas*</small></div>
  <div><span>Ubicación</span><b>Km {km}</b><small>Panamericana Sur, Asia</small></div><div><span>Estado</span><b data-f="estado">{E(P['estado'])}</b><small>club en construcción</small></div></div>
  <div class="cta"><a class="btn b-ink" href="/portal.html?p=portada#lotes" data-local="../web/portal.html?p=portada#lotes">Ver lotes disponibles</a>
  <a class="btn b-ghost" href="/proyectos/portada.html#contacto" data-local="../landings/portada.html#contacto">Agendar una visita</a><a class="btn b-wa" href="{wa_url}" data-wa>Escribir por WhatsApp</a></div>
  <p class="note">*Cuota referencial con 20% de inicial; el plan final lo confirma tu asesor. Las imágenes del club y del ingreso son renders del proyecto. La casa es una propuesta referencial del simulador 3D de Vivaldi para un lote de 6 × 15 m (107 m² techados en dos pisos): el diseño, el costo y los permisos dependen de cada propietario y de los parámetros del proyecto.</p>
</div></section></main>
<footer><div class="wrap">{E(EMP['nombre'])} · RUC {EMP['ruc']} · {E(EMP['oficina'])} · {E(EMP['horario'])}<br>Precios referenciales; la disponibilidad y el precio final se confirman al separar. · <a href="https://vivaldiinmobiliaria.com/" rel="noopener">Web de Vivaldi y Libro de Reclamaciones</a></div></footer>
<script>const EMPRESA = "{EMP['whatsapp']}";{JS.replace('__P__', json.dumps(pj, ensure_ascii=False))}</script>
{L.ASESOR}</body></html>'''

if __name__ == '__main__':
    out = ROOT + '/entregables/experiencia'; os.makedirs(out, exist_ok=True)
    s = page(); open(out + '/recorrido-portada.html', 'w', encoding='utf-8').write(s); print('ok', round(len(s) / 1e6, 2), 'MB')
