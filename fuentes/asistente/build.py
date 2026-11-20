# Escribe la base de conocimiento del asistente 24/7 (funciones/asistente/index.ts) desde los datos de cada proyecto.
# Diseño y desarrollo: Pedrojose Andrade Paredes
import json, os, re
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(D))
data = json.load(open(os.path.join(ROOT, 'fuentes', 'landings', 'proyectos.json'), encoding='utf-8'))
SITIO = 'https://vivaldiinmobiliaria.com/proyectos/'
emp = {k: data['empresa'].get(k, '') for k in ('nombre', 'whatsapp', 'telefono', 'correo', 'oficina', 'horario')}
proy = []
for p in data['proyectos']:
    if p.get('estado') == 'Vendido 100%': continue
    proy.append({'nombre': p['nombre'], 'zona': p.get('zona', ''), 'km': p.get('km'), 'm2': p.get('m2'), 'precio': p.get('precio'), 'estado': p.get('estado', ''),
                 'resumen': p.get('resumen', ''), 'beneficios': p.get('beneficios', []), 'etapas': p.get('etapas', []), 'pagina': SITIO + p['id'] + '.html',
                 'explorador': SITIO + 'explorar-' + p['id'] + '.html' if os.path.exists(os.path.join(ROOT, 'entregables', 'experiencia', 'explorar-' + p['id'] + '.html')) else ''})
K = json.dumps({'empresa': emp, 'proyectos': proy, 'precios_zona': data.get('precios_zona', {})}, ensure_ascii=False)
f = os.path.join(ROOT, 'entregables', 'base-de-datos', 'funciones', 'asistente', 'index.ts'); s = open(f, encoding='utf-8').read()
s2 = re.sub(r'/\*CONOCIMIENTO\*/.*?/\*FIN-CONOCIMIENTO\*/', lambda m: '/*CONOCIMIENTO*/' + K + '/*FIN-CONOCIMIENTO*/', s, count=1, flags=re.S)
assert '/*CONOCIMIENTO*/' + K in s2
open(f, 'w', encoding='utf-8').write(s2); print('ok asistente', len(proy), 'proyectos')

# chat de la web conectado al asesor virtual (si la base está configurada)
VIVO = open(os.path.join(D, 'web-vivo.html'), encoding='utf-8').read().strip()
for w in ('Vivaldi-web-final.html', 'Vivaldi-web-whatsapp.html'):
    f = os.path.join(ROOT, 'entregables', 'web', w); s = open(f, encoding='utf-8').read()
    s = re.sub(r'<!--asistente-vivo-start-->.*?<!--asistente-vivo-end-->\n?', '', s, flags=re.S)
    i = s.rindex('</body>'); s = s[:i] + VIVO + '\n' + s[i:]; open(f, 'w', encoding='utf-8').write(s); print('ok asistente web', w)
