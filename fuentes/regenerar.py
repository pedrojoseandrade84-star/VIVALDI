# Regenera todo lo que se deriva de las fuentes, en el orden correcto. Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 fuentes/regenerar.py
#  1. Páginas por proyecto y página para extranjeros (landings/build.py, toma datos de landings/proyectos.json)
#  2. Portal Mi Vivaldi (portal/build_portal.py)
#  3. Correcciones de contenido y capa de diseño de la web (mejoras_web.py)
#  4. Módulos de la herramienta que se actualizan en su mismo lugar: sincronización (sync.html) y proyectos (gestion.html)
import json, os, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(D)
run = lambda *a: subprocess.run([sys.executable, *a], check=True)
run(D + '/landings/build.py'); run(D + '/portal/build_portal.py'); run(D + '/mejoras_web.py')

data = json.load(open(D + '/landings/proyectos.json', encoding='utf-8')); data.pop('_nota', None)
MODS = {'growth-sync': open(D + '/sync.html', encoding='utf-8').read().strip(),
        'gestion': open(D + '/gestion.html', encoding='utf-8').read().strip().replace('/*PROYECTOS*/null', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))}
for f in ['planicie-herramienta-final.html', 'planicie-herramienta-whatsapp.html']:
    p = ROOT + '/entregables/software/' + f; s = open(p, encoding='utf-8').read()
    for k, G in MODS.items():
        a, b = f'<!--{k}-start-->', f'<!--{k}-end-->'
        assert s.count(a) == 1 and G.startswith(a) and G.endswith(b), (f, k)
        i = s.index(a); j = s.index(b) + len(b); s = s[:i] + G + s[j:]
    open(p, 'w', encoding='utf-8').write(s); print('ok', f)
