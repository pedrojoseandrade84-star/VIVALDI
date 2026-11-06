# Genera entregables/web/portal.html (Mi Vivaldi): lotes en línea, compradores y asesores. Archivo único.
# Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 build_portal.py
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(D + '/../..')
sys.path.insert(0, ROOT + '/fuentes/landings')
import build as L   # reutiliza fotos, tipografías y logo de la web final

DATA = json.load(open(ROOT + '/fuentes/landings/proyectos.json', encoding='utf-8'))
def corto(n):
    for x in ('La ', 'Las ', 'Los '):
        if n.startswith(x): n = n[len(x):]
    return n.split(' de ')[0].split(' del ')[0]
PROY = {p['nombre']: {'id': p['id'], 'nombre': p['nombre'], 'corto': corto(p['nombre']), 'img': L.img(p.get('hero', p['fotos'][0]), 520, 70),
                      'estado': p['estado'], 'zona': p['zona'], 'km': format(p['km'], 'g') if p['km'] else '', 'url': L.SITIO + p['id'] + '.html'}
        for p in DATA['proyectos']}

if __name__ == '__main__':
    s = open(D + '/portal.html', encoding='utf-8').read()
    for a, b in (('/*FONTS*/', L.FONTS), ('{{LOGO}}', L.LOGO), ('/*PROY*/', json.dumps(PROY, ensure_ascii=False)), ('{{ASESOR}}', L.ASESOR)):
        assert s.count(a) == 1, a
        s = s.replace(a, b)
    out = ROOT + '/entregables/web/portal.html'
    open(out, 'w', encoding='utf-8').write(s)
    print('ok', out, round(len(s) / 1e6, 2), 'MB')
