# Arma el showroom virtual en un solo archivo que funciona sin internet: módulos (three.js, trazado de rayos y app),
# cielos HDR, texturas PBR, muebles 3D, fuentes y datos de los proyectos. Diseño y desarrollo: Pedrojose Andrade Paredes
# Antes: python3 modulos.py <node_modules>  (solo si cambia app.js o la versión de three.js) y python3 recursos.py (una vez)
import base64, json, os, re, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(D)); R = os.path.join(D, 'recursos')
s = open(os.path.join(D, 'showroom.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(ROOT, 'fuentes', 'landings', 'proyectos.json'), encoding='utf-8'))
datos = {'empresa': data['empresa'], 'proyectos': [{k: p.get(k) for k in ('id', 'nombre', 'lema', 'frase', 'zona', 'km', 'm2', 'precio', 'estado', 'color', 'beneficios')} for p in data['proyectos']]}
exp = open(os.path.join(ROOT, 'entregables', 'experiencia', 'explorar-planicie.html'), encoding='utf-8').read()
fuentes = '\n'.join(m for m in re.findall(r'@font-face\s*\{.*?\}', exp, flags=re.S) if re.search(r"Manrope|Instrument Serif", m))
mods = json.load(open(os.path.join(D, 'vendor', 'modulos.json'), encoding='utf-8'))
# la app se vuelve a tomar de app.js (sus importaciones ya están resueltas en modulos.json)
rec = {f: base64.b64encode(open(os.path.join(R, f), 'rb').read()).decode() for f in sorted(os.listdir(R)) if f.endswith(('.hdr', '.jpg', '.glb'))}
js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
motor = open(os.path.join(D, 'vendor', 'motor.js'), encoding='utf-8').read().replace('</script', '<\\/script')
qr = open(os.path.join(D, 'vendor', 'qrcode.js'), encoding='utf-8').read()
rep = {'/*QR*/': qr, '/*FUENTES*/': fuentes, '/*DATOS*/null': js(datos), '/*REC*/null': js(rec), '/*MOTOR*/': motor}
for k, v in rep.items():
    assert s.count(k) == 1, k
    s = s.replace(k, v)
out = os.path.join(ROOT, 'entregables', 'experiencia', 'showroom.html'); open(out, 'w', encoding='utf-8').write(s)
print('ok showroom', round(len(s) / 1048576, 1), 'MB')
