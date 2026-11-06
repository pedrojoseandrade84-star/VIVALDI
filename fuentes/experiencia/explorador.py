# Explorador de lotes estilo "elige tu unidad": fachada del condominio → lote → corte de la casa → ambientes.
# Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: node capturas_explorador.js capturas/<proyecto> <proyecto> && python3 explorador.py <proyecto>   (sin argumento: todos los que tengan capturas)
import base64, io, json, os, sys, urllib.parse
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(D + '/../..')
sys.path.insert(0, ROOT + '/fuentes/landings')
import build as L

PID = sys.argv[1] if len(sys.argv) > 1 else 'portada'
P = next(p for p in L.PRJ if p['id'] == PID); EMP = L.EMP; E = L.E
CAP = D + '/capturas/' + PID
LOTES = json.load(open(CAP + '/lotes.json')); CASA = json.load(open(CAP + '/casa.json'))
def png(n, w=1920, q=80):
    im = Image.open(f'{CAP}/{n}.png').convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

km = format(P['km'], 'g') if P['km'] else ''; precio = P['precio']; UBI = E(P['zona']) + (' · Km ' + km if km else '')
techada = round(CASA['m']['techada']); banos = CASA['m']['banos']
amb1 = [r['n'] for r in CASA['rooms'] if r['lvl'] == 0 and r['n'] not in ('Escalera', 'Hall')]
amb2 = [r['n'] for r in CASA['rooms'] if r['lvl'] == 1 and r['n'] not in ('Escalera', 'Hall')]
LW, LD = CASA['W'], CASA['D']; AREA = round(LW * LD); MED = f"{format(LW, 'g')} × {format(LD, 'g')} m"
PISO = lambda lvl: 'Primer piso' if lvl == 0 else 'Segundo piso' if lvl == 1 else f'Piso {lvl + 1}'
DET = {'e4-sala': 'frente a la calle', 'e5-comedor-cocina': 'hacia el patio', 'e7-terraza': 'al aire libre',
       'e6-dormitorio': 'con baño propio' if any(r['n'] == 'Baño principal' for r in CASA['rooms']) else ''}
INTER = [(a['k'], a['n'], PISO(a['lvl']) + (' · ' + DET[a['k']] if DET.get(a['k']) else '')) for a in CASA['amb']]
# lotes visibles en la fachada, de izquierda a derecha; la casa del centro es la casa de referencia
VIS = sorted(LOTES, key=lambda q: q['l'])
DEMO_ESTADOS = ['Vendido', 'Disponible', 'Separado', 'Disponible', 'Vendido', 'Disponible', 'Disponible']
HOT = [{'l': q['l'], 'r': q['r'], 't': q['t'], 'b': q['b'], 'n': i + 1, 'st': DEMO_ESTADOS[i % len(DEMO_ESTADOS)], 'ref': q['k'] == 0} for i, q in enumerate(VIS)]
# zonas sin superposición: el borde entre dos lotes vecinos queda a mitad de camino; nada fuera de la imagen
for i in range(len(HOT) - 1):
    m = (HOT[i]['r'] + HOT[i + 1]['l']) / 2; HOT[i]['r'] = m; HOT[i + 1]['l'] = m
for h in HOT: h['l'] = max(0.0, h['l']); h['r'] = min(1.0, h['r'])

IMG = {'fachada': png('e1-fachada'), 'tarde': png('e1-fachada-tarde'), 'p1': png('e2-corte-p1'), 'p2': png('e3-corte-p2'), **{k: png(k) for k, _, _ in INTER}}

CSS = '''
:root{--ink:#16232D;--night:#0B151C;--paper:#FFFDF9;--gold:#D9A441;--gold2:#F2C66A;--mu:#5A6872;--ok:#7BD88F;--sep:#F2C66A;--sold:#E58A7B}
*{box-sizing:border-box}html,body{height:100%%}body{margin:0;background:var(--night);color:#fff;font-family:Manrope,system-ui,sans-serif;overflow:hidden;-webkit-text-size-adjust:100%%}
h1,h2,h3{font-family:"Instrument Serif",Georgia,serif;font-weight:400;margin:0;letter-spacing:-.005em}
button{font:inherit;color:inherit}a{color:inherit}
.top{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:18px clamp(16px,3vw,40px);background:linear-gradient(180deg,rgba(8,14,20,.55),rgba(8,14,20,0));pointer-events:none}
.top>*{pointer-events:auto}.brand{display:flex;align-items:center;gap:14px;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85)}
.brand img{height:22px}.brand i{width:1px;height:18px;background:rgba(255,255,255,.4)}
.top nav{display:flex;align-items:center;gap:22px;font-size:.76rem;letter-spacing:.14em;text-transform:uppercase}
.top nav a{text-decoration:none;color:rgba(255,255,255,.85)}.top nav a:hover{color:#fff}
.tour{background:var(--gold);color:#1A1306!important;padding:9px 16px;border-radius:2px;font-weight:700}
.view{position:fixed;inset:0;opacity:0;visibility:hidden;transition:opacity .9s ease,visibility 0s .9s}.view.on{opacity:1;visibility:visible;transition:opacity .9s ease}
.box{position:absolute;left:50%%;top:50%%;width:max(100vw,177.78vh);height:max(56.25vw,100vh);transform:translate(-50%%,-50%%)}
.cam{position:absolute;inset:0;transform-origin:50%% 50%%;transition:transform 1.4s cubic-bezier(.65,0,.25,1)}
.cam img{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;user-select:none;-webkit-user-drag:none}
.cam .tarde{opacity:0;transition:opacity 1.2s}.night .cam .tarde{opacity:1}
.hot{position:absolute;border:0;background:transparent;cursor:pointer;padding:0}
.hot::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(242,198,106,.22),rgba(242,198,106,.06));box-shadow:inset 0 0 0 1.5px rgba(242,198,106,.85);opacity:0;transition:opacity .25s}
.hot.on::after,.hot:focus-visible::after{opacity:1}.hot:focus-visible{outline:none}
.dot{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%%;background:var(--gold2);box-shadow:0 0 0 6px rgba(242,198,106,.25),0 0 22px rgba(242,198,106,.8);transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1),opacity .3s;pointer-events:none;z-index:5}
.lnk{position:absolute;height:1px;background:rgba(255,255,255,.75);transform-origin:0 0;pointer-events:none;z-index:5;transition:all .45s cubic-bezier(.4,0,.2,1)}
.card{position:absolute;z-index:6;min-width:250px;background:rgba(10,18,24,.92);border:1px solid rgba(255,255,255,.14);padding:14px 16px 14px 14px;display:flex;gap:14px;align-items:flex-start;transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1),opacity .3s;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.card .n{font-family:"Instrument Serif",Georgia,serif;font-size:2.9rem;line-height:.9;min-width:52px}.card .n small{display:block;font-family:Manrope,sans-serif;font-size:.58rem;letter-spacing:.16em;color:rgba(255,255,255,.6);margin-bottom:6px}
.card h3{font-size:1.45rem;line-height:1.1}.card p{margin:4px 0 8px;font-size:.78rem;color:rgba(255,255,255,.75)}
.st{display:inline-block;font-size:.62rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:4px 8px;border:1px solid currentColor}
.st.Disponible{color:var(--ok)}.st.Separado{color:var(--sep)}.st.Vendido{color:var(--sold)}
.card .go{display:block;margin-top:10px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold2);font-weight:800;background:none;border:0;padding:0;cursor:pointer}
.intro{position:absolute;left:clamp(18px,4vw,56px);bottom:clamp(22px,5vh,52px);z-index:7;max-width:520px;text-shadow:0 2px 16px rgba(0,0,0,.5)}
.intro small{font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.85)}.intro h1{font-size:clamp(2.6rem,5.4vw,4.6rem);line-height:1;margin:8px 0}
.intro p{margin:0;font-size:.98rem;color:rgba(255,255,255,.9)}
.legend{display:flex;gap:16px;margin-top:14px;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}.legend span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%%;background:currentColor;margin-right:7px;vertical-align:1px}
.legend .a{color:var(--ok)}.legend .s{color:var(--sep)}.legend .v{color:var(--sold)}
.tools{position:absolute;right:clamp(18px,3vw,40px);bottom:clamp(22px,5vh,52px);z-index:7;display:flex;gap:8px}
.chip{background:rgba(10,18,24,.7);border:1px solid rgba(255,255,255,.25);padding:9px 14px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.chip[aria-pressed=true]{background:#fff;color:var(--ink)}
.ly{position:absolute;inset:0;width:100%%;height:100%%;object-fit:cover;opacity:0;transition:opacity 1s ease,transform 9s linear;transform:scale(1.06)}.ly.on{opacity:1;transform:scale(1)}
.panel{position:absolute;right:clamp(18px,3vw,44px);top:50%%;transform:translateY(-50%%);z-index:7;width:min(330px,86vw);background:rgba(10,18,24,.9);border:1px solid rgba(255,255,255,.14);padding:22px 22px 20px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.panel small{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65)}.panel h2{font-size:2.3rem;line-height:1;margin:6px 0 4px}
.panel .meta{display:flex;gap:22px;margin:14px 0;border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14);padding:12px 0}
.panel .meta b{display:block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:1.6rem;line-height:1}.panel .meta span{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.panel p{font-size:.84rem;color:rgba(255,255,255,.8);margin:0 0 12px;line-height:1.5}
.seg{display:flex;gap:6px;margin-bottom:14px}.acts{display:grid;gap:8px}
.btn{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;font-weight:800;text-decoration:none;border:0;cursor:pointer}
.b-gold{background:var(--gold);color:#1A1306}.b-line{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}.b-wa{background:#17733F;color:#fff}
.back{position:absolute;left:clamp(18px,3vw,40px);top:84px;z-index:8;background:rgba(10,18,24,.7);border:1px solid rgba(255,255,255,.25);padding:9px 14px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.room{position:absolute;left:clamp(18px,4vw,56px);bottom:clamp(26px,6vh,60px);z-index:7;text-shadow:0 2px 18px rgba(0,0,0,.55)}
.room small{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.85)}.room h2{font-size:clamp(2.4rem,5vw,4.2rem);line-height:1;margin-top:6px}
.nav2{position:absolute;right:clamp(18px,3vw,40px);bottom:clamp(26px,6vh,60px);z-index:7;display:flex;gap:8px;align-items:center}
.nav2 button{width:46px;height:46px;border-radius:50%%;background:rgba(10,18,24,.7);border:1px solid rgba(255,255,255,.3);cursor:pointer;font-size:1.1rem}
.nav2 .ct{font-size:.74rem;letter-spacing:.14em;margin-right:6px}
.tag{position:absolute;right:14px;top:84px;z-index:7;font-size:.66rem;letter-spacing:.08em;background:rgba(0,0,0,.5);padding:4px 9px;color:rgba(255,255,255,.85)}
.demo{position:fixed;left:50%%;top:70px;transform:translateX(-50%%);z-index:41;font-size:.7rem;letter-spacing:.06em;background:rgba(242,198,106,.95);color:#2A1D04;padding:5px 12px;font-weight:700;white-space:nowrap}
:focus-visible{outline:2px solid var(--gold2);outline-offset:3px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.lotnav{display:none}
@media (max-width:760px){.tag{display:none}.back{top:96px}.lotnav{display:flex;position:absolute;right:12px;bottom:18px;z-index:7;gap:8px}.lotnav button{width:46px;height:46px;border-radius:50%;background:rgba(10,18,24,.75);border:1px solid rgba(255,255,255,.35);font-size:1.4rem;cursor:pointer}
 .top nav a:not(.tour){display:none}.brand span{display:none}.intro{bottom:auto;top:110px}.intro h1{font-size:2.3rem}.intro p{font-size:.85rem}
 .card{left:12px!important;right:12px;top:auto!important;bottom:82px;min-width:0}.lnk{display:none}.tools{left:12px;right:auto;bottom:18px}
 .panel{top:auto;bottom:14px;transform:none;right:12px;left:12px;width:auto;padding:16px}.panel h2{font-size:1.8rem}.panel .meta{margin:10px 0;padding:8px 0}.panel p{display:none}.demo{top:62px;font-size:.62rem}}
@media (prefers-reduced-motion:reduce){.cam,.ly,.dot,.card,.lnk{transition:opacity .3s!important}.ly{transform:none!important}}
'''

JS = r'''
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const HOT = __HOT__, P = __P__, INTER = __INTER__;
  const soles = n => "S/ " + Math.round(n).toLocaleString("es-PE");
  const vF = $("#vFachada"), vC = $("#vCorte"), vI = $("#vInter"), cam = $("#cam"), dot = $("#dot"), card = $("#card"), lnk = $("#lnk");
  let cur = -1, auto = true, sel = null;
  // lotes: con la base de datos, estado y precio vienen del inventario (lotes_publicos); sin ella, disponibilidad de ejemplo
  const B = window.VV_BASE || {}; let precio = P.precio;
  if (B.url && B.key) fetch(B.url.replace(/\/$/, "") + "/rest/v1/rpc/lotes_publicos", {method: "POST", headers: {apikey: B.key, Authorization: "Bearer " + B.key, "Content-Type": "application/json"}, body: "{}"})
    .then(r => r.ok ? r.json() : []).then(rows => { const mine = rows.filter(r => r.proyecto === P.nombre); if (!mine.length) return;
      HOT.forEach((h, i) => { const r = mine[i]; if (!r) return; h.mz = r.mz; h.lt = r.lt; h.st = r.disponible ? "Disponible" : "No disponible"; h.area = r.area; h.precio = r.precio; }); $(".demo") && $(".demo").remove(); pintar(); if (cur >= 0) show(cur); }).catch(() => {});
  else $(".demo").hidden = false;
  const box = $("#boxF");
  function pintar() { $$("#boxF .hot").forEach((b, i) => { const h = HOT[i]; b.setAttribute("aria-label", `Lote ${h.lt || h.n}, ${h.st}`); }); }
  HOT.forEach((h, i) => { const b = document.createElement("button"); b.className = "hot"; b.type = "button";
    Object.assign(b.style, {left: h.l * 100 + "%", top: h.t * 100 + "%", width: (h.r - h.l) * 100 + "%", height: (h.b - h.t) * 100 + "%"});
    b.addEventListener("mouseenter", () => { auto = false; show(i); }); b.addEventListener("focus", () => { auto = false; show(i); });
    b.addEventListener("click", () => { auto = false; if (cur !== i) show(i); if (matchMedia("(hover: hover)").matches || card.dataset.i == i && card.dataset.tap) explorar(i); else card.dataset.tap = "1"; });
    box.appendChild(b); }); pintar();
  const movil = () => innerWidth / innerHeight < 1; let camDx = 0;
  function centrar(i) { if (!movil()) { if (!cam.style.transform.includes("scale")) cam.style.transform = ""; return; } const h = HOT[i], W = box.offsetWidth, vw = innerWidth;
    const lim = (W - vw) / 2, dx = Math.max(-lim, Math.min(lim, (.5 - (h.l + h.r) / 2) * W)); camDx = dx; cam.style.transform = `translateX(${dx}px)`; }
  function show(i) { cur = i; centrar(i); const h = HOT[i], R = box.getBoundingClientRect();
    $$("#boxF .hot").forEach((b, k) => b.classList.toggle("on", k === i));
    const cx = R.left + (h.l + h.r) / 2 * R.width, cy = R.top + (h.t + (h.b - h.t) * .38) * R.height;
    if (movil()) { const W = box.offsetWidth; const L0 = (innerWidth - W) / 2 + camDx; dot.style.left = (L0 + (h.l + h.r) / 2 * W) + "px"; } else dot.style.left = cx + "px";
    dot.style.top = cy + "px"; dot.style.opacity = 1;
    card.dataset.i = i; delete card.dataset.tap;
    card.innerHTML = `<div class="n"><small>LOTE</small>${String(h.lt || h.n).padStart(2, "0")}</div><div><h3>${h.mz ? "Manzana " + h.mz : "Lote de " + (h.area || P.area) + " m²"}</h3><p>${P.med}${h.ref ? " · con la casa de referencia" : " · frente a la calle interna"}</p>
      <span class="st ${h.st}">${h.st}${h.st === "Disponible" ? " · desde " + soles(h.precio || precio) : ""}</span><button class="go" type="button" data-go="${i}">Explorar el lote →</button></div>`;
    const cw = card.offsetWidth, chh = card.offsetHeight, right = cx + 120 + cw < innerWidth - 20, x = right ? cx + 110 : cx - 110 - cw, y = Math.min(Math.max(90, cy - chh / 2 - 40), innerHeight - chh - 120);
    card.style.left = x + "px"; card.style.top = y + "px"; card.style.opacity = 1;
    const x1 = cx + (right ? 12 : -12), x2 = right ? x : x + cw, y2 = y + chh / 2, len = Math.hypot(x2 - x1, y2 - cy), ang = Math.atan2(y2 - cy, x2 - x1);
    Object.assign(lnk.style, {left: x1 + "px", top: cy + "px", width: len + "px", transform: `rotate(${ang}rad)`, opacity: 1}); }
  card.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) explorar(+g.dataset.go); });
  // recorrido automático del marcador hasta que la persona interactúe
  const C = Math.max(0, HOT.findIndex(h => h.ref)), orden = [0, -1, -2, -1, 0, 1, 2, 1].map(d => Math.min(HOT.length - 1, Math.max(0, C + d))); let oi = 0; show(C);
  $("#lPrev").addEventListener("click", () => { auto = false; show(Math.max(0, cur - 1)); }); $("#lNext").addEventListener("click", () => { auto = false; show(Math.min(HOT.length - 1, cur + 1)); });
  let tx = null; vF.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive: true});
  vF.addEventListener("touchend", e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(d) > 45) { auto = false; show(Math.max(0, Math.min(HOT.length - 1, cur + (d < 0 ? 1 : -1)))); } }, {passive: true});
  const timer = setInterval(() => { if (!auto || movil() || vF.classList.contains("on") === false) return; oi = (oi + 1) % orden.length; show(orden[oi]); }, 1700);
  addEventListener("resize", () => { if (cur >= 0 && vF.classList.contains("on")) show(cur); });
  addEventListener("keydown", e => { if (!vF.classList.contains("on")) { if (e.key === "Escape") volver(); if (vI.classList.contains("on") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) paso(e.key === "ArrowRight" ? 1 : -1); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { auto = false; show(Math.min(HOT.length - 1, Math.max(0, (cur < 0 ? C : cur) + (e.key === "ArrowRight" ? 1 : -1)))); $$("#boxF .hot")[cur].focus(); }
    if (e.key === "Enter" && cur >= 0) explorar(cur); });
  $("#dia").addEventListener("click", () => { document.body.classList.remove("night"); $("#dia").setAttribute("aria-pressed", "true"); $("#tarde").setAttribute("aria-pressed", "false"); });
  $("#tarde").addEventListener("click", () => { document.body.classList.add("night"); $("#tarde").setAttribute("aria-pressed", "true"); $("#dia").setAttribute("aria-pressed", "false"); });
  // 1) acercamiento al lote  2) corte de la casa
  function explorar(i) { sel = HOT[i]; auto = false; const h = sel, cx = (h.l + h.r) / 2, cy = (h.t + h.b) / 2, z = Math.min(4, .62 / (h.r - h.l));
    dot.style.opacity = 0; card.style.opacity = 0; lnk.style.opacity = 0;
    cam.style.transform = `translate(${(.5 - cx) * 100 * z}%, ${(.5 - cy) * 100 * z}%) scale(${z})`;
    setTimeout(() => { $("#pTitle").textContent = h.mz ? `Manzana ${h.mz}, lote ${h.lt}` : `Lote ${String(h.n).padStart(2, "0")}`;
      $("#pSt").className = "st " + h.st; $("#pSt").textContent = h.st + (h.st === "Disponible" ? " · desde " + soles(h.precio || precio) : "");
      piso(1); vF.classList.remove("on"); vC.classList.add("on"); $("#vCorte .panel").focus({preventScroll: true}); }, 1250); }
  function piso(n) { $$("#vCorte .ly").forEach(l => l.classList.toggle("on", l.dataset.p == n)); $$("#vCorte [data-piso]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.piso == n)));
    $("#pAmb").textContent = n === 1 ? P.amb1 : P.amb2; }
  $$("#vCorte [data-piso]").forEach(b => b.addEventListener("click", () => piso(+b.dataset.piso)));
  // 3) ambientes
  let ri = 0, rt = null;
  function ambiente(k) { ri = (k + INTER.length) % INTER.length; $$("#vInter .ly").forEach((l, j) => l.classList.toggle("on", j === ri));
    $("#rSub").textContent = INTER[ri][2]; $("#rName").textContent = INTER[ri][1]; $("#rCt").textContent = `${String(ri + 1).padStart(2, "0")} / ${String(INTER.length).padStart(2, "0")}`;
    clearTimeout(rt); rt = setTimeout(() => { if (vI.classList.contains("on")) ambiente(ri + 1); }, 4200); }
  const paso = d => ambiente(ri + d);
  $("#entrar").addEventListener("click", () => { vC.classList.remove("on"); vI.classList.add("on"); ambiente(0); });
  $("#prev").addEventListener("click", () => paso(-1)); $("#next").addEventListener("click", () => paso(1));
  $("#aCorte").addEventListener("click", () => { clearTimeout(rt); vI.classList.remove("on"); vC.classList.add("on"); });
  function volver() { clearTimeout(rt); vC.classList.remove("on"); vI.classList.remove("on"); vF.classList.add("on"); cam.style.transform = ""; if (cur >= 0) centrar(cur); setTimeout(() => cur >= 0 && show(cur), 900); }
  $$("[data-volver]").forEach(b => b.addEventListener("click", volver));
  if (location.protocol === "file:") $$("[data-local]").forEach(a => { a.href = a.dataset.local; });
  $$("[data-wa]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); const h = sel || HOT[cur] || {}; const t = `Hola, vi el explorador de ${P.nombre} y me interesa ${h.mz ? "la manzana " + h.mz + ", lote " + h.lt : "un lote"}. ¿Me dan información y horarios de visita?`;
    const u = `https://wa.me/${P.wa}?text=${encodeURIComponent(t)}`, w = window.open(u, "_blank"); if (w) { try { w.opener = null; } catch (x) {} } else location.href = u; }));
})();
'''

def page():
    t = f"{P['nombre']}: elige tu lote | Vivaldi Inmobiliaria"
    d = f"Explora {P['nombre']}: elige tu lote en el condominio, mira la casa que podrías construir en {MED} y recorre sus ambientes."
    pj = {'id': P['id'], 'nombre': P['nombre'], 'precio': precio, 'wa': EMP['whatsapp'], 'amb1': ', '.join(amb1), 'amb2': ', '.join(amb2), 'area': AREA, 'med': MED}
    inter_ly = ''.join(f'<img class="ly" src="{IMG[k]}" alt="{E(n)} de la casa de referencia (vista del simulador 3D)" decoding="async">' for k, n, _ in INTER)
    return f'''<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(t)}</title><meta name="description" content="{E(d)}"><meta name="theme-color" content="#0B151C"><link rel="canonical" href="https://vivaldiinmobiliaria.com/proyectos/explorar-{PID}.html">
<meta property="og:title" content="{E(t)}"><meta property="og:description" content="{E(d)}"><meta property="og:type" content="website">
<style>{L.FONTS}{CSS.replace("%%", "%")}</style></head><body>
{L.base_js()}
<header class="top"><div class="brand"><img src="{L.LOGO}" alt="Vivaldi Inmobiliaria"><i></i><span>{E(P['nombre'])} · {UBI}</span></div>
<nav aria-label="Principal"><a href="/proyectos/{PID}.html" data-local="../landings/{PID}.html">El proyecto</a><a href="/portal.html?p={PID}#lotes" data-local="../web/portal.html?p={PID}#lotes">Lotes</a><a class="tour" href="/proyectos/{PID}.html#contacto" data-local="../landings/{PID}.html#contacto">Agendar visita</a></nav></header>
<main><p class="demo" hidden>Disponibilidad de ejemplo · se actualiza al conectar el inventario</p>
<section class="view on" id="vFachada" aria-label="Elige tu lote"><div class="box" id="boxWrap"><div class="cam" id="cam"><img src="{IMG['fachada']}" alt="Fila de casas del condominio {E(P['nombre'])} vista desde la calle (vista referencial del simulador 3D)"><img class="tarde" src="{IMG['tarde']}" alt=""><div class="box" id="boxF" style="width:100%;height:100%;left:0;top:0;transform:none"></div></div></div>
  <div class="dot" id="dot" aria-hidden="true"></div><div class="lnk" id="lnk" aria-hidden="true"></div><div class="card" id="card" aria-live="polite"></div>
  <div class="intro"><small>Condominio · {E(P['estado'])}</small><h1>Elige tu lote</h1><p>Pasa el mouse o toca una casa para ver su lote. Lotes de {AREA} m² desde {L.soles(precio)}, en soles y sin intereses.</p>
  <div class="legend" aria-hidden="true"><span class="a">Disponible</span><span class="s">Separado</span><span class="v">Vendido</span></div></div>
  <div class="lotnav" role="group" aria-label="Cambiar de lote"><button type="button" id="lPrev" aria-label="Lote anterior">‹</button><button type="button" id="lNext" aria-label="Lote siguiente">›</button></div>
  <div class="tools" role="group" aria-label="Luz"><button class="chip" id="dia" type="button" aria-pressed="true">Día</button><button class="chip" id="tarde" type="button" aria-pressed="false">Atardecer</button></div>
  <span class="tag" style="top:auto;bottom:6px;right:50%;transform:translateX(50%)">Vista referencial del condominio construido · simulador 3D Vivaldi</span>
</section>
<section class="view" id="vCorte" aria-label="La casa en el lote">
  <img class="ly" data-p="1" src="{IMG['p1']}" alt="Corte de la casa de referencia, primer piso" decoding="async"><img class="ly" data-p="2" src="{IMG['p2']}" alt="Corte de la casa de referencia, segundo piso" decoding="async">
  <button class="back" type="button" data-volver>← Volver al condominio</button><span class="tag">Propuesta referencial · simulador 3D</span>
  <div class="panel" tabindex="-1"><small>{E(P['nombre'])}</small><h2 id="pTitle">Lote</h2><span class="st" id="pSt"></span>
    <div class="meta"><div><b>{AREA}</b><span>m² de lote</span></div><div><b>{techada}</b><span>m² techados</span></div><div><b>{banos}</b><span>baños</span></div></div>
    <div class="seg" role="group" aria-label="Piso"><button class="chip" type="button" data-piso="1" aria-pressed="true">Piso 1</button><button class="chip" type="button" data-piso="2" aria-pressed="false">Piso 2</button></div>
    <p><b>Ambientes:</b> <span id="pAmb"></span>. Casa de playa de {CASA["pisos"]} pisos sobre el lote de {MED}.</p>
    <div class="acts"><button class="btn b-gold" id="entrar" type="button">Entrar a la casa</button><a class="btn b-line" href="/portal.html?p={PID}#lotes" data-local="../web/portal.html?p={PID}#lotes">Separar este lote</a><a class="btn b-wa" href="https://wa.me/{EMP['whatsapp']}" data-wa>WhatsApp</a></div></div>
</section>
<section class="view" id="vInter" aria-label="Ambientes">{inter_ly}
  <button class="back" type="button" id="aCorte">← Ver la casa completa</button><span class="tag">Vista referencial · simulador 3D</span>
  <div class="room" aria-live="polite"><small id="rSub"></small><h2 id="rName"></h2></div>
  <div class="nav2"><span class="ct" id="rCt"></span><button type="button" id="prev" aria-label="Ambiente anterior">←</button><button type="button" id="next" aria-label="Ambiente siguiente">→</button><button type="button" data-volver aria-label="Volver al condominio" style="width:auto;border-radius:0;padding:0 14px;font-size:.7rem;letter-spacing:.12em">CONDOMINIO</button></div>
</section>
<p class="sr">Las vistas del condominio y de la casa son referenciales, generadas con el simulador 3D de Vivaldi para un lote de {MED} ({techada} m² techados). El diseño final, el costo y los permisos dependen de cada propietario.</p></main>
<script>{JS.replace('__HOT__', json.dumps(HOT)).replace('__P__', json.dumps(pj, ensure_ascii=False)).replace('__INTER__', json.dumps(INTER, ensure_ascii=False))}</script>
{L.ASESOR}</body></html>'''

if __name__ == '__main__':
    out = ROOT + '/entregables/experiencia'; os.makedirs(out, exist_ok=True)
    s = page(); open(out + f'/explorar-{PID}.html', 'w', encoding='utf-8').write(s); print('ok', PID, round(len(s) / 1e6, 2), 'MB')
