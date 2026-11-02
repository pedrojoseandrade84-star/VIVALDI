# builds app.js (v2) from the v1 engine + the new parts, then applies small, checked replacements
import os, json
D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
v1 = open('app_v1.js', encoding='utf-8').read()
def cut(a, b): i = v1.index(a); j = v1.index(b, i); return v1[i:j]
P = lambda f: open(f, encoding='utf-8').read()
head = v1[:v1.index('/* ---------------- datos ---------------- */')]
motor = cut('/* ---------------- motor de distribución ---------------- */', '/* ---------------- Three.js: escena ---------------- */')
walls = cut('function buildWalls(', 'function buildFurniture(')
inst = cut('/* ---------------- instalaciones ---------------- */', '/* ---------------- capas y modos ---------------- */')
rest = v1[v1.index('/* ---------------- capas y modos ---------------- */'):]
s = head + P('part_data.js') + P('part_maq.js') + motor + P('part_scene.js') + P('part_build.js') + walls + inst + rest
for f in sorted(x for x in os.listdir('.') if x.startswith('repl_') and x.endswith('.json')):
    for a, b in json.load(open(f, encoding='utf-8')):
        assert a in s, (f, a[:70]); s = s.replace(a, b)
for f in sorted(x for x in os.listdir('.') if x.startswith('swap_') and x.endswith('.js')):   # reemplaza un bloque entero entre dos marcadores
    t = P(f); start, end = t.split('\n', 2)[0][3:], t.split('\n', 2)[1][3:]; body = t.split('\n', 2)[2]
    i = s.index(start); j = s.index(end, i); s = s[:i] + body + s[j:]
for f in sorted(x for x in os.listdir('.') if x.startswith('post_') and x.endswith('.json')):   # parches finales sobre el código ya completo
    for a, b in json.load(open(f, encoding='utf-8')):
        assert s.count(a) == 1, (f, s.count(a), a[:70]); s = s.replace(a, b)
open('app.js', 'w', encoding='utf-8').write(s); print('lines', len(s.splitlines()))
