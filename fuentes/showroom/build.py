# Arma el showroom virtual (un solo archivo, funciona sin internet): three.js, cielo, controles, fuentes y datos de los proyectos.
# Diseño y desarrollo: Pedrojose Andrade Paredes
import json, os, re
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(D)); V = os.path.join(ROOT, 'fuentes', 'simulador', 'vendor')
s = open(os.path.join(D, 'showroom.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(ROOT, 'fuentes', 'landings', 'proyectos.json'), encoding='utf-8'))
datos = {'empresa': data['empresa'], 'proyectos': [{k: p.get(k) for k in ('id', 'nombre', 'lema', 'frase', 'zona', 'km', 'm2', 'precio', 'estado', 'color')} for p in data['proyectos']]}
exp = open(os.path.join(ROOT, 'entregables', 'experiencia', 'explorar-planicie.html'), encoding='utf-8').read()
fuentes = '\n'.join(m for m in re.findall(r'@font-face\s*\{.*?\}', exp, flags=re.S) if re.search(r"Manrope|Instrument Serif", m))
rep = {'/*FUENTES*/': fuentes, '/*THREE*/': open(os.path.join(V, 'three.min.js'), encoding='utf-8').read(), '/*SKY*/': open(os.path.join(V, 'Sky.js'), encoding='utf-8').read(),
       '/*ORBIT*/': open(os.path.join(V, 'OrbitControls.js'), encoding='utf-8').read(), '/*DATOS*/null': json.dumps(datos, ensure_ascii=False).replace('</', '<\\/')}
for k, v in rep.items():
    assert s.count(k) == 1, k
    s = s.replace(k, v.replace('</script', '<\\/script'))
out = os.path.join(ROOT, 'entregables', 'experiencia', 'showroom.html'); open(out, 'w', encoding='utf-8').write(s)
print('ok showroom', round(len(s) / 1024), 'KB')
