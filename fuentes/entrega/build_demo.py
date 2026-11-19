"""Arma los dos paquetes finales.
  1) Vivaldi-Demo-Gerencia.zip: la demostración para los gerentes (para enviar por WeTransfer). Se abre con ABRIR-AQUI.html.
  2) Vivaldi-Completo-Pedrojose.zip: el paquete personal con todo (entregables, fuentes, pruebas y documentos internos).
Uso: node capturas_demo.js capturas && python3 build_demo.py <carpeta_destino>
Diseño y desarrollo: Pedrojose Andrade Paredes"""
import base64, html, io, json, os, shutil, subprocess, sys, zipfile
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(AQUI, '..', '..')); ENT = os.path.join(ROOT, 'entregables')
sys.path.insert(0, os.path.join(ROOT, 'fuentes', 'landings'))
import build as L   # tipografías y logo de la web
E = lambda s: html.escape(str(s), quote=True)
dest = os.path.abspath(sys.argv[1]); os.makedirs(dest, exist_ok=True)
DEMO = 'Vivaldi-Demo-Gerencia'; raiz = os.path.join(dest, DEMO)
shutil.rmtree(raiz, ignore_errors=True); os.makedirs(raiz)

def cp(src, dst):
    os.makedirs(os.path.dirname(os.path.join(raiz, dst)), exist_ok=True); shutil.copy2(os.path.join(ENT, src), os.path.join(raiz, dst))
cp('web/Vivaldi-web-final.html', 'web/Vivaldi-web-final.html'); cp('web/portal.html', 'web/portal.html')
for f in sorted(os.listdir(os.path.join(ENT, 'landings'))):
    if f.endswith('.html'): cp('landings/' + f, 'landings/' + f)
EXP = sorted(f for f in os.listdir(os.path.join(ENT, 'experiencia')) if f.startswith('explorar-') and f.endswith('.html'))
for f in EXP: cp('experiencia/' + f, 'experiencia/' + f)
cp('simulador/Simulador-3D-Lotes-Vivaldi.html', 'simulador/Simulador-3D-Lotes-Vivaldi.html')
cp('cotizacion/Cotizacion-Vivaldi-COT-2026-002.pdf', 'documentos/Cotizacion-Vivaldi-COT-2026-002.pdf')
cp('manual/Anexo-3-Guia-para-la-Gerencia.pdf', 'documentos/Guia-para-la-Gerencia.pdf')
cp('manual/Manual-Herramienta-Ventas-Vivaldi.pdf', 'documentos/Manual-Herramienta-Ventas-Vivaldi.pdf')
# la herramienta de la demostración abre siempre con datos de ejemplo (si el equipo aún no tiene datos propios)
t = open(os.path.join(ENT, 'software', 'planicie-herramienta-final.html'), encoding='utf-8').read()
FORZAR = '<script>(function(){try{var s=location.search,c=localStorage.getItem("vivaldi-clientes-v1");if(!/[?&]demo=1/.test(s)&&!localStorage.getItem("vivaldi-demo")&&(!c||c==="[]"))location.replace(location.pathname+"?demo=1"+location.hash);}catch(e){}})();</script>'
assert t.count('<meta charset="utf-8">') >= 1
t = t.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + FORZAR, 1)
os.makedirs(os.path.join(raiz, 'software'), exist_ok=True)
open(os.path.join(raiz, 'software', 'Herramienta-de-ventas-Vivaldi.html'), 'w', encoding='utf-8').write(t)
HERR = 'software/Herramienta-de-ventas-Vivaldi.html?demo=1'

# ---------- portada de la demostración ----------
CAP = os.path.join(AQUI, 'capturas')
def foto(n, w=1040):
    im = Image.open(os.path.join(CAP, n + '.png')).convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=84, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
PRJ = {p['id']: p for p in L.PRJ}
nomb = lambda pid: PRJ[pid]['nombre'] if pid in PRJ else pid.capitalize()
EXPL = [(f[9:-5], nomb(f[9:-5])) for f in EXP]
LAND = [(f[:-5], nomb(f[:-5]) if f[:-5] in PRJ else 'Clientes del extranjero (ES / EN)') for f in sorted(os.listdir(os.path.join(raiz, 'landings')))]
chips = lambda items, pre: ''.join(f'<a class="chip" href="{pre}{a}.html">{E(b)}</a>' for a, b in items)
CARDS = [
 ('herramienta', 'Herramienta de ventas y Tablero de dirección', 'Para la gerencia y los asesores',
  'La foto del mes en un minuto: ventas, meta, cobranza, equipo e inventario, con un resumen en palabras que se envía al directorio por WhatsApp. Debajo, todo lo que un asesor necesita para vender: proforma, lotes, clientes, visitas y cobranza.',
  ['Leer el <b>Resumen del mes</b> y tocar <b>Enviar por WhatsApp</b>', 'Probar <b>Presentar en pantalla</b> para una reunión', 'Tocar una alerta de <b>Atención de la gerencia</b>: lleva a resolverla'],
  [(HERR + '#direccion', 'Abrir el tablero')], ''),
 ('buscador', 'Buscador universal', 'Todo a un atajo: Ctrl + K (⌘ + K en Mac)',
  'Desde cualquier parte de la herramienta se encuentra un cliente por nombre o celular, un lote por su código (B-4), cualquier sección o una acción como «Nueva proforma». Más rápido que los CRM habituales.',
  ['Abrir la herramienta y presionar <b>Ctrl + K</b>', 'Escribir <b>lu</b> o <b>b-3</b> y presionar Enter', 'En celular: el botón redondo de la lupa'],
  [(HERR, 'Probar el buscador')], ''),
 ('conectar', 'Conectar datos', 'Lo que Vivaldi ya tiene entra solo',
  'Clientes y lotes de cualquier Excel o CSV (de otro CRM, de Google Sheets o de cualquier sistema). Reconoce las columnas solo, muestra la vista previa, no duplica y se puede deshacer. Una hoja de Google Sheets puede quedar sincronizándose sola, y formularios de Facebook, Google o TikTok pueden enviar cada interesado directo.',
  ['Arrastrar un Excel propio de clientes o de lotes', 'Revisar cómo entendió cada columna', 'Importar y luego <b>Deshacer</b>'],
  [(HERR + '#conectar', 'Abrir Conectar datos')], ''),
 ('portal', 'Mi Vivaldi: venta en línea', 'El cliente separa su lote sin salir de casa',
  'Lotes disponibles por proyecto con su precio y cuota; el cliente elige uno, deja sus datos y pide la separación, que le llega al asesor. Quien ya compró entra con su correo a ver sus cuotas y pagos. Desde cada lote se puede ver en 3D la casa que se podría construir.',
  ['Elegir un lote verde y tocar <b>Mira la casa… en 3D</b>', 'Comprador: cualquier correo y el código <b>123456</b>', 'Asesor: cualquier correo y una contraseña de 4 caracteres'],
  [('web/portal.html#lotes', 'Abrir Mi Vivaldi')], ''),
 ('explorador', 'Explorador 3D de lotes', 'Elige tu lote, entra a la casa y recórrela',
  'Al estilo de las grandes inmobiliarias: la fila de casas del condominio, el lote que el cliente elige, el corte de la casa por piso y cada ambiente. El cliente guarda lotes, los compara y se los envía a su asesor. Vistas en 4K.',
  ['Pasar el mouse por las casas y tocar <b>Explorar el lote</b>', 'Tocar <b>+ Guardar</b> en dos lotes y abrir <b>Mis lotes</b>', 'Probar <b>Atardecer</b>'],
  [], chips(EXPL, 'experiencia/explorar-')),
 ('landing', 'Una página por proyecto', 'Pensadas para enamorar y para anuncios',
  'Cada proyecto con su identidad, fotos a pantalla completa, avance de obra, ubicación, simulador de cuota y formulario que agenda la visita por WhatsApp. Incluye una página en español e inglés para clientes del extranjero.',
  ['Tocar una foto: se abre la galería a pantalla completa', 'Mover la inicial en <b>Cuánto pagarías al mes</b>', 'Elegir un día de visita en el formulario'],
  [], chips(LAND, 'landings/')),
 ('web', 'Web comercial', 'La puerta de entrada',
  'La web de Vivaldi rediseñada: proyectos, financiamiento, asistente, calendario de visitas y acceso a Mi Vivaldi y a la página completa de cada proyecto.',
  ['Recorrer los proyectos y abrir uno', 'Entrar a <b>Mi Vivaldi</b> desde el menú'],
  [('web/Vivaldi-web-final.html', 'Abrir la web')], ''),
 ('simulador', 'Simulador 3D de construcción', 'Para la conversación con el cliente',
  'El asesor diseña con el cliente la casa que puede construir en su lote: ambientes, pisos, piscina, normativa y costo estimado, en 3D y con recorrido.',
  ['Describir lo que quiere el cliente y ver la propuesta', 'Probar <b>Recorrer</b> y <b>Corte</b>'],
  [('simulador/Simulador-3D-Lotes-Vivaldi.html', 'Abrir el simulador')], ''),
]
RUTA = [('Tablero de dirección', HERR + '#direccion'), ('Buscador Ctrl + K', HERR), ('Página de un proyecto', 'landings/lirios.html'),
        ('Explorador 3D', 'experiencia/explorar-portada.html'), ('Separar un lote en línea', 'web/portal.html#lotes'), ('Conectar sus datos', HERR + '#conectar')]
DOCS = [('documentos/Cotizacion-Vivaldi-COT-2026-002.pdf', 'Cotización', 'Servicio mensual y planes de mantenimiento'),
        ('documentos/Guia-para-la-Gerencia.pdf', 'Guía para la gerencia', 'El tablero, la meta, las alertas y una rutina sugerida'),
        ('documentos/Manual-Herramienta-Ventas-Vivaldi.pdf', 'Manual de la herramienta', 'Paso a paso, con capturas')]
cards = ''
for i, (img, t, sub, txt, prueba, botones, extra) in enumerate(CARDS):
    wide = i == 0 or i == len(CARDS) - 1
    im = f'<img src="{foto(img, 1280 if wide else 1040)}" alt="">'
    cards += f'''<article class="card{' wide' if wide else ''}">{f'<a class="shot" href="{botones[0][0]}" aria-label="{E(botones[0][1])}: {E(t)}">{im}</a>' if botones else f'<div class="shot">{im}</div>'}
<div class="txt"><p class="k">{E(sub)}</p><h2>{E(t)}</h2><p>{E(txt)}</p><h3>Qué probar</h3><ul>{''.join(f'<li>{x}</li>' for x in prueba)}</ul>
<div class="acts">{''.join(f'<a class="btn" href="{u}">{E(l)} →</a>' for u, l in botones)}{f'<div class="chips">{extra}</div>' if extra else ''}</div></div></article>'''
HUB = f'''<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sistema comercial Vivaldi · Demostración</title><meta name="theme-color" content="#0C1F2C">
<style>{L.FONTS}
:root{{--ink:#122130;--mu:#55636D;--bg:#F5F2EC;--line:#E2DCD1;--deep:#0C1F2C;--gold:#D49A2E;--gold2:#E9B44C;--sea:#0E5F73}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--bg);color:var(--ink);font-family:Manrope,system-ui,sans-serif;font-size:16px;line-height:1.55}}
a{{color:inherit}}h1,h2{{font-family:"Instrument Serif",Georgia,serif;font-weight:400;line-height:1.05;margin:0}}
.wrap{{width:min(1220px,calc(100% - 40px));margin:0 auto}}
header{{background:radial-gradient(1200px 500px at 85% -10%,rgba(233,180,76,.18),transparent 60%),linear-gradient(160deg,#0C1F2C,#0A2638 60%,#0C1F2C);color:#fff;padding:34px 0 120px}}
.top{{display:flex;justify-content:space-between;align-items:center;gap:16px}}.top img{{height:30px}}.top span{{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold2);font-weight:800}}
header h1{{font-size:clamp(2.8rem,7vw,5.6rem);margin:70px 0 18px;max-width:900px}}header h1 em{{font-style:italic;color:var(--gold2)}}
header .lead{{font-size:clamp(1.05rem,1.8vw,1.25rem);max-width:760px;color:rgba(255,255,255,.85);margin:0}}
.ruta{{margin-top:-78px;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(12,31,44,.18);padding:22px 24px}}
.ruta h2{{font-size:1.6rem;margin-bottom:12px}}.ruta ol{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:10px;counter-reset:r}}
.ruta li{{counter-increment:r}}.ruta a{{display:flex;flex-direction:column;gap:6px;height:100%;padding:12px 14px;border-radius:12px;background:var(--bg);text-decoration:none;font-weight:700;font-size:.92rem;transition:background .2s,transform .2s}}
.ruta a::before{{content:counter(r,decimal-leading-zero);font-family:"Instrument Serif",Georgia,serif;font-size:1.7rem;font-weight:400;color:var(--gold)}}.ruta a:hover{{background:#EFE7D8;transform:translateY(-2px)}}
.ruta p{{margin:12px 0 0;font-size:.86rem;color:var(--mu)}}
.grid{{padding:46px 0 30px;display:grid;grid-template-columns:1fr 1fr;gap:26px}}
.card{{background:#fff;border-radius:18px;overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column;box-shadow:0 2px 0 rgba(12,31,44,.03)}}
.card.wide{{grid-column:1/-1;display:grid;grid-template-columns:1.35fr 1fr}}
.shot{{display:block;overflow:hidden;background:#0C1F2C;aspect-ratio:16/10}}.card.wide .shot{{aspect-ratio:auto}}
.shot img{{width:100%;height:100%;object-fit:cover;object-position:top;display:block;transition:transform 1s cubic-bezier(.2,.7,.2,1)}}.card:hover .shot img{{transform:scale(1.03)}}
.txt{{padding:24px 26px 26px;display:flex;flex-direction:column;flex:1}}
.k{{margin:0;font-size:.74rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--sea)}}
.card h2{{font-size:2.1rem;margin:6px 0 10px}}.txt>p{{margin:0;color:#3A4852}}
h3{{font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mu);margin:18px 0 8px}}
ul{{margin:0;padding:0;list-style:none;display:grid;gap:6px}}li{{padding-left:22px;position:relative;font-size:.94rem}}li::before{{content:"";position:absolute;left:2px;top:.62em;width:8px;height:8px;border-radius:50%;background:var(--gold)}}
.acts{{margin-top:auto;padding-top:20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}}
.btn{{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:999px;background:var(--deep);color:#fff;text-decoration:none;font-weight:700;font-size:.92rem;transition:background .2s}}.btn:hover{{background:var(--sea)}}
.chips{{display:flex;flex-wrap:wrap;gap:8px}}.chip{{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);text-decoration:none;font-weight:600;font-size:.86rem;background:var(--bg)}}.chip:hover{{border-color:var(--ink)}}
.docs{{padding:10px 0 40px}}.docs h2{{font-size:2.2rem;margin-bottom:14px}}.dg{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}
.doc{{display:flex;gap:14px;align-items:center;padding:18px;border-radius:14px;background:#fff;border:1px solid var(--line);text-decoration:none}}.doc:hover{{border-color:var(--ink)}}
.doc i{{flex:none;width:44px;height:54px;border-radius:6px;background:#B4382B;color:#fff;font-style:normal;font-size:.7rem;font-weight:800;display:grid;place-items:center}}.doc b{{display:block}}.doc span{{font-size:.86rem;color:var(--mu)}}
.nota{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;font-size:.9rem;color:#3A4852;margin-bottom:30px}}.nota b{{color:var(--ink)}}
footer{{background:var(--deep);color:#A9B8C3;padding:28px 0;font-size:.85rem}}footer .wrap{{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}}
a:focus-visible{{outline:3px solid var(--gold2);outline-offset:3px}}
@media (max-width:980px){{.grid{{grid-template-columns:1fr}}.card.wide{{display:flex}}.ruta ol{{grid-template-columns:repeat(3,1fr)}}.dg{{grid-template-columns:1fr}}}}
@media (max-width:560px){{.ruta ol{{grid-template-columns:1fr 1fr}}header{{padding-bottom:100px}}.txt{{padding:20px}}.card h2{{font-size:1.8rem}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important}}html{{scroll-behavior:auto}}}}
</style></head><body>
<header><div class="wrap"><div class="top"><img src="{L.LOGO}" alt="Vivaldi Inmobiliaria"><span>Demostración para la gerencia</span></div>
<h1>Un sistema para vender <em>más rápido</em>, de la primera visita a la última cuota.</h1>
<p class="lead">Todo funciona en esta computadora, sin instalar nada y sin internet. Las cifras, clientes y lotes son de ejemplo; con la base de datos de Vivaldi se llenan con los datos reales del equipo.</p></div></header>
<main><div class="wrap"><section class="ruta" aria-labelledby="rt"><h2 id="rt">Recorrido sugerido de 10 minutos</h2><ol>{''.join(f'<li><a href="{u}">{E(t)}</a></li>' for t, u in RUTA)}</ol>
<p>Se recomienda abrir los archivos en Chrome, Edge o Safari de computadora. En iPhone, la vista previa de WhatsApp o de correo no ejecuta las páginas: hay que abrirlas en el navegador.</p></section></div>
<div class="wrap grid">{cards}</div>
<section class="wrap docs" aria-labelledby="dc"><h2 id="dc">Documentos</h2><div class="dg">{''.join(f'<a class="doc" href="{u}"><i>PDF</i><span><b>{E(t)}</b>{E(s)}</span></a>' for u, t, s in DOCS)}</div></section>
<div class="wrap"><p class="nota"><b>Sobre los datos:</b> precios, cuotas y disponibilidad son referenciales; las imágenes marcadas como referenciales son renders o vistas del simulador. Las vistas 3D muestran una propuesta de casa; el diseño final, el costo y los permisos dependen de cada propietario.</p></div></main>
<footer><div class="wrap"><span>Sistema comercial para Inmobiliaria &amp; Constructora Vivaldi S.A.C.</span><span>Diseño y desarrollo: Pedrojose Andrade Paredes · {E(L.EMP.get('ciudad', 'Lima'))}, noviembre de 2026</span></div></footer>
</body></html>'''
open(os.path.join(raiz, 'ABRIR-AQUI.html'), 'w', encoding='utf-8').write(HUB)
open(os.path.join(raiz, 'LEEME.txt'), 'w', encoding='utf-8').write(
    'SISTEMA COMERCIAL VIVALDI - DEMOSTRACIÓN\r\n\r\n1. Descomprimir la carpeta completa (no abrir los archivos desde dentro del ZIP).\r\n'
    '2. Abrir ABRIR-AQUI.html con Chrome, Edge o Safari de computadora.\r\n3. Desde ahí se abre cada herramienta. Todo funciona sin internet.\r\n\r\n'
    'Los datos son de ejemplo. Diseño y desarrollo: Pedrojose Andrade Paredes.\r\n')

PROHIBIDO = ('investigacion', 'presentacion', 'guion', 'propuesta-vivaldi-pv', 'fuente-editable', '.ds_store', 'esquema-supabase', 'costeo')
def zipdir(src, zpath, base, check=None):
    if os.path.exists(zpath): os.remove(zpath)
    n = 0
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for d, _, fs in os.walk(src):
            for f in sorted(fs):
                full = os.path.join(d, f); rel = os.path.relpath(full, base)
                if check: assert not any(x in rel.lower() for x in check), rel
                z.write(full, rel); n += 1
    print(zpath, n, 'archivos', round(os.path.getsize(zpath) / 1e6, 1), 'MB')
zipdir(raiz, os.path.join(dest, DEMO + '.zip'), dest, PROHIBIDO)

# ---------- paquete personal: todo lo versionado (entregables, fuentes, pruebas y documentos internos) ----------
PER = 'Vivaldi-Completo-Pedrojose'; zp = os.path.join(dest, PER + '.zip')
files = subprocess.run(['git', '-C', ROOT, 'ls-files', '-z'], capture_output=True, check=True).stdout.decode().split('\0')
if os.path.exists(zp): os.remove(zp)
n = 0
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(x for x in files if x):
        full = os.path.join(ROOT, f)
        if os.path.isfile(full): z.write(full, os.path.join(PER, f)); n += 1
    z.writestr(os.path.join(PER, 'MI-PAQUETE-LEEME.md'), open(os.path.join(AQUI, 'mi_paquete.md'), encoding='utf-8').read()); n += 1
print(zp, n, 'archivos', round(os.path.getsize(zp) / 1e6, 1), 'MB')
