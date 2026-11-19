# Agrega La Esmeralda de Cerro Azul a la herramienta de ventas (proforma, lotes, clientes, mensajes) y muestra la
# ubicación por zona cuando el kilómetro no está confirmado. Idempotente: se puede ejecutar varias veces.
# Diseño y desarrollo: Pedrojose Andrade Paredes
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = [
 ('  {name:"Lirios del Mar de Asia", km:100.05, m2:90, pen:60000},\n];',
  '  {name:"Lirios del Mar de Asia", km:100.05, m2:90, pen:60000},\n  {name:"La Esmeralda de Cerro Azul", km:null, m2:250, pen:38000, ubi:"Cerro Azul, Cañete"},\n];\n'
  '// ubicación para documentos: kilómetro si está confirmado; si no, la zona\nconst vUbi = v => v.km ? `Km ${v.km} Panamericana Sur` : (v.ubi || "Panamericana Sur");'),
 ('`<option value="${i}">${v.name} · km ${v.km}</option>`', '`<option value="${i}">${v.name} · ${v.km ? "km " + v.km : v.ubi}</option>`'),
 ('<div><span>Ubicación</span><b>Km ${c.v.km} Panamericana Sur</b></div>', '<div><span>Ubicación</span><b>${esc(vUbi(c.v))}</b></div>'),
 ('Proyecto: ${c.v.name} (km ${c.v.km} Panamericana Sur)', 'Proyecto: ${c.v.name} (${vUbi(c.v)})'),
 ('["UBICACIÓN", `Km ${c.v.km}`]', '["UBICACIÓN", c.v.km ? `Km ${c.v.km}` : c.v.ubi]'),
 ('kv("Ubicación", `Km ${c.v.km} Panamericana Sur`)', 'kv("Ubicación", vUbi(c.v))'),
 ('proj: v.name, km: v.km,', 'proj: v.name, km: v.km, ubi: vUbi(v),'),
 ('te confirmo la visita guiada a ${c.proj} (km ${c.km} de la Panamericana Sur)', 'te confirmo la visita guiada a ${c.proj} (${c.ubi})'),
]
for f in ['planicie-herramienta-final.html', 'planicie-herramienta-whatsapp.html']:
    p = os.path.join(ROOT, 'entregables', 'software', f); s = open(p, encoding='utf-8').read()
    for a, b in R:
        if b in s: continue
        n = s.count(a); assert n >= 1, (f, a[:60]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s); print('ok', f)
