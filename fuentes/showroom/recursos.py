# Descarga los recursos fotorrealistas del showroom desde Poly Haven (licencia CC0: uso comercial libre, sin atribución obligatoria)
# y los deja listos en fuentes/showroom/recursos/: cielos HDR, texturas PBR (color, relieve, rugosidad) y muebles 3D en GLB.
# Diseño y desarrollo: Pedrojose Andrade Paredes. Uso: python3 recursos.py   (solo hace falta una vez; el resultado queda en el repositorio)
import io, json, os, struct, sys, urllib.request
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'recursos'); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'vivaldi-showroom-build/1.0'}
def get(url): return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
def files(a): return json.loads(get('https://api.polyhaven.com/files/' + a))

HDRI = {'tarde': ('qwantani_late_afternoon_puresky', '1k'), 'atardecer': ('qwantani_sunset_puresky', '1k'), 'noche': ('qwantani_night_puresky', '1k')}
TEX = {'piso': 'laminate_floor_02', 'deck': 'wood_floor_deck', 'revest': 'brown_planks_05', 'muro': 'painted_plaster_wall', 'pasto': 'leafy_grass',
       'arena': 'coast_sand_01', 'asfalto': 'asphalt_02', 'vereda': 'rectangular_paving', 'marmol': 'marble_01', 'tela': 'rough_linen', 'piedra': 'concrete_floor_02'}
MOD = ['sofa_03', 'modern_coffee_table_01', 'dining_chair_02', 'round_wooden_table_01', 'mid_century_lounge_chair', 'potted_plant_02',
       'modern_ceiling_lamp_01', 'outdoor_table_chair_set_01', 'side_table_01', 'shrub_02', 'throw_pillows_01']

def jpg(data, q=82, size=None):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    if size and im.width > size: im = im.resize((size, size * im.height // im.width), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True, progressive=True); return b.getvalue()

def glb(gltf_url, include):
    js = json.loads(get(gltf_url)); base = gltf_url.rsplit('/', 1)[0] + '/'
    blobs = {k: get(v['url']) for k, v in include.items()}
    out = bytearray(); views = []
    def add(data, target=None):
        while len(out) % 4: out.append(0)
        views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}); out.extend(data); return len(views) - 1
    # búferes originales → vistas reubicadas
    remap = []
    for b in js.get('buffers', []):
        data = blobs.get(b['uri']) or get(base + b['uri']); remap.append(len(out) + ((4 - len(out) % 4) % 4)); add(data)
    nv = []
    for v in js.get('bufferViews', []):
        v = dict(v); v['byteOffset'] = remap[v['buffer']] + v.get('byteOffset', 0); v['buffer'] = 0; nv.append(v)
    views.clear(); views.extend(nv)
    for im in js.get('images', []):
        data = blobs.get(im['uri']) or get(base + im['uri']); data = jpg(data, 80, 1024) if not im['uri'].lower().endswith('.png') else data
        im['bufferView'] = add(data); im['mimeType'] = 'image/png' if im['uri'].lower().endswith('.png') else 'image/jpeg'; del im['uri']
    js['buffers'] = [{'byteLength': len(out)}]; js['bufferViews'] = views
    while len(out) % 4: out.append(0)
    j = json.dumps(js, separators=(',', ':')).encode()
    while len(j) % 4: j += b' '
    return struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(out)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(out), 0x004E4942) + bytes(out)

if __name__ == '__main__':
    for k, (a, r) in HDRI.items():
        f = os.path.join(OUT, f'cielo-{k}.hdr')
        if not os.path.exists(f): open(f, 'wb').write(get(files(a)['hdri'][r]['hdr']['url'])); print('cielo', k, os.path.getsize(f) // 1024, 'KB')
    for k, a in TEX.items():
        fs = files(a)
        for mapa, clave in (('color', 'Diffuse'), ('normal', 'nor_gl'), ('rugosidad', 'Rough')):
            f = os.path.join(OUT, f'tex-{k}-{mapa}.jpg')
            if os.path.exists(f) or clave not in fs: continue
            open(f, 'wb').write(jpg(get(fs[clave]['1k']['jpg']['url']), 84 if mapa == 'color' else 78)); print('textura', k, mapa, os.path.getsize(f) // 1024, 'KB')
    for a in MOD:
        f = os.path.join(OUT, f'mueble-{a}.glb')
        if os.path.exists(f): continue
        g = files(a)['gltf']['1k']['gltf']; open(f, 'wb').write(glb(g['url'], g.get('include', {}))); print('mueble', a, os.path.getsize(f) // 1024, 'KB')
    # césped de jardín: se conserva el detalle real de la textura y se lleva a un verde de pasto cuidado
    f = os.path.join(OUT, 'tex-pasto-color.jpg'); o = os.path.join(OUT, '.pasto-original.jpg')
    if not os.path.exists(o): os.replace(f, o)
    im = Image.open(o).convert('HSV'); h, sat, v = im.split()
    h = h.point(lambda x: 64); sat = sat.point(lambda x: min(255, 85 + x // 4)); v = v.point(lambda x: min(255, int(x * .8)))
    b2 = io.BytesIO(); Image.merge('HSV', (h, sat, v)).convert('RGB').save(f, 'JPEG', quality=84, optimize=True, progressive=True)
    json.dump({'fuente': 'Poly Haven (polyhaven.com), licencia CC0', 'cielos': HDRI, 'texturas': TEX, 'muebles': MOD}, open(os.path.join(OUT, 'CREDITOS.json'), 'w'), indent=1, ensure_ascii=False)
