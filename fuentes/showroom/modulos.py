# Empaqueta los módulos ES del showroom (three.js, complementos, trazado de rayos y la app) en un JSON que la página carga
# con su propio cargador (URL blob por módulo): un solo archivo HTML que funciona sin internet. Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 modulos.py <carpeta node_modules con three, three-mesh-bvh y three-gpu-pathtracer>  → vendor/modulos.json
import json, os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
NM = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, 'node_modules')
APP = os.path.join(D, 'app.js')
STUB = {'xatlas-web': 'export default function XAtlas(){ throw new Error("xatlas no incluido"); }'}
PAT = re.compile(r'''(\bimport\s*(?:[\w*$\s{},]+?\s*from\s*)?|\bexport\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*)(['"])([^'"\n]+)\2''')

def resolver(spec, desde):
    if spec in STUB: return 'stub:' + spec
    if spec == 'three': return os.path.join(NM, 'three/build/three.module.js')
    for pre in ('three/addons/', 'three/examples/jsm/'):
        if spec.startswith(pre): return os.path.join(NM, 'three/examples/jsm', spec[len(pre):])
    if spec == 'three-mesh-bvh': return os.path.join(NM, 'three-mesh-bvh/src/index.js')
    if spec.startswith('three-gpu-pathtracer/'): return os.path.join(NM, spec)
    if spec.startswith('.'): return os.path.normpath(os.path.join(os.path.dirname(desde), spec))
    raise SystemExit(f'no sé resolver {spec} (desde {desde})')

ids, fuentes, orden, visit = {}, {}, [], set()
def mid(p):
    if p not in ids: ids[p] = str(len(ids))
    return ids[p]
def cargar(p, pila=()):
    if p in visit: return
    visit.add(p); src = STUB[p[5:]] if p.startswith('stub:') else open(p, encoding='utf-8').read()
    if 'import(' in re.sub(r'//.*', '', src) and not p.startswith('stub:'):
        assert 'import.meta' not in src or 'xatlas' in p, p
    deps = []
    def sub(m):
        q = resolver(m.group(3), p); deps.append(q); return f'{m.group(1)}{m.group(2)}@@VV{mid(q)}@@{m.group(2)}'
    out = PAT.sub(sub, src)
    for q in deps: cargar(q, pila + (p,))
    fuentes[mid(p)] = out; orden.append(mid(p))

cargar(APP)
os.makedirs(os.path.join(D, 'vendor'), exist_ok=True)
json.dump({'orden': orden, 'mods': fuentes, 'entrada': mid(APP), 'rutas': {v: os.path.relpath(k, NM) if not k.startswith('stub:') else k for k, v in ids.items()}},
          open(os.path.join(D, 'vendor', 'modulos.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('ok módulos', len(orden), round(sum(len(s) for s in fuentes.values()) / 1024), 'KB')
