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

# ---------- versión clásica (sin módulos): funciona al abrir el archivo en Safari/iPhone y en cualquier navegador ----------
def clasico(src, deps_tok):
    getters, pre = [], []
    tok = lambda s: re.sub(r'@@VV(\d+)@@', r'\1', s)
    def imp(m):
        cl, spec = m.group(1).strip(), tok(m.group(3))
        if not cl: return f'__r({spec});'
        out = []; cl = cl.strip()
        mns = re.match(r'\*\s*as\s+([\w$]+)$', cl)
        if mns: return f'const {mns.group(1)} = __r({spec});'
        md = re.match(r'([\w$]+)\s*(?:,\s*(.*))?$', cl, re.S)
        if md and not cl.startswith('{'):
            out.append(f'const {md.group(1)} = __r({spec}).default;'); cl = (md.group(2) or '').strip()
            if cl.startswith('* as'): out.append(f'const {cl[4:].strip()} = __r({spec});'); cl = ''
        if cl.startswith('{'):
            items = [x.strip() for x in cl.strip('{} \n').split(',') if x.strip()]
            for it in items:
                a, _, b = it.partition(' as '); b = (b or a).strip(); a = a.strip()
                out.append(f'const {b} = __r({spec}).{a};' if a != 'default' else f'const {b} = __r({spec}).default;')
        return ' '.join(out)
    src = re.sub(r'''^[ \t]*import\s*((?:[\w$*{}\s,]|\bas\b)*?)\s*(from\s*)?(['"])@@VV\d+@@\3\s*;?''', lambda m: imp(re.match(r'''^[ \t]*import\s*(.*?)\s*(from\s*)?['"](@@VV\d+@@)['"]''', m.group(0), re.S)), src, flags=re.M | re.S)
    def reexp(m):
        cl, spec = m.group(1).strip(), tok(m.group(2))
        if cl.startswith('*'):
            mm = re.match(r'\*\s*as\s+([\w$]+)', cl)
            if mm: getters.append(f'"{mm.group(1)}": () => __r({spec})'); return ''
            pre.append(f'__star(__e, {spec});'); return ''
        for it in [x.strip() for x in cl.strip('{} \n').split(',') if x.strip()]:
            a, _, b = it.partition(' as '); b = (b or a).strip(); a = a.strip(); getters.append(f'"{b}": () => __r({spec}).{a}')
        return ''
    src = re.sub(r'''^[ \t]*export\s*(\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"](@@VV\d+@@)['"]\s*;?''', reexp, src, flags=re.M)
    def lista(m):
        for it in [x.strip() for x in m.group(1).split(',') if x.strip()]:
            a, _, b = it.partition(' as '); b = (b or a).strip(); a = a.strip(); getters.append(f'"{b}": () => {a}')
        return ''
    src = re.sub(r'^[ \t]*export\s*\{([^}]*)\}\s*;?', lista, src, flags=re.M)
    def decl(m):
        kw, name = m.group(1), m.group(2)
        getters.append(f'"{name}": () => {name}')
        return m.group(0)[m.group(0).index(kw):]
    src = re.sub(r'^[ \t]*export\s+(const|let|var|function\*?|async\s+function|class)\s+([\w$]+)(.?)', decl, src, flags=re.M)
    src = re.sub(r'^[ \t]*export\s+default\s+(function\*?|class)\s+([\w$]+)', lambda m: (getters.append(f'"default": () => {m.group(2)}') or '') + f'{m.group(1)} {m.group(2)}', src, flags=re.M)
    src = re.sub(r'^[ \t]*export\s+default\s+', '__e.default = ', src, flags=re.M)
    cab = ('__def(__e, {' + ', '.join(getters) + '});') if getters else ''
    return cab + ' '.join(pre) + '\n' + src

cl = ['(function(){"use strict"; const __m = {}, __c = {};',
      'function __def(e, g){ for (const k in g) Object.defineProperty(e, k, {get: g[k], enumerable: true, configurable: true}); }',
      'function __star(e, id){ const s = __r(id); for (const k of Object.keys(s)) if (k !== "default" && !(k in e)) Object.defineProperty(e, k, {get: () => s[k], enumerable: true, configurable: true}); }',
      'function __r(id){ if (__c[id]) return __c[id]; const e = __c[id] = {}; __m[id](e); return e; }']
for i in orden:
    cl.append(f'__m[{i}] = function(__e){{ "use strict";\n{clasico(fuentes[i], None)}\n}};')
cl.append(f'__r({mid(APP)}); }})();')
open(os.path.join(D, 'vendor', 'motor.js'), 'w', encoding='utf-8').write('\n'.join(cl))
print('ok motor clásico', round(sum(len(x) for x in cl) / 1024), 'KB')
