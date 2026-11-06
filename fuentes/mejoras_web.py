# Correcciones de contenido y capa de diseño de la web principal (versión final y versión WhatsApp).
# Idempotente: se puede ejecutar varias veces. Diseño y desarrollo: Pedrojose Andrade Paredes
# Uso: python3 fuentes/mejoras_web.py
import os, re
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(D)
WEBS = [ROOT + '/entregables/web/Vivaldi-web-final.html', ROOT + '/entregables/web/Vivaldi-web-whatsapp.html']
ESTILO = open(D + '/estilo-web.html', encoding='utf-8').read().strip()

# (antes, después, cuántas veces debe aparecer "antes" la primera vez)
TEXTOS = [
    # promesas sin respaldo o datos inexactos
    ('Sin bancos, sin letra chica.', 'Sin bancos de por medio.', 1),
    ('Frente al mar <em>·</em>', 'Cerca del mar <em>·</em>', 2),
    ('aria-label="En soles, sin intereses, con título, frente al mar"', 'aria-label="En soles, sin intereses, con título, cerca del mar"', 1),
    ('Km 100 a 131', 'Km 100 a 118', None),
    ('<b class="num">2</b><span>proyectos ya entregados</span>', '<b class="num">3</b><span>proyectos con su club ya construido</span>', 1),
    ('<h2 class="h-xl">Listo para<br><em>construir.</em></h2>', '<h2 class="h-xl">Con vista<br><em>al mar.</em></h2>', 1),
    ('Lo mismo que otros venden en dólares, aquí cuesta una fracción', 'Más metros por tu dinero, y en soles', 1),
    ('Separa tu lote hoy', 'Separa tu lote', 1),
    ('Proyectos que nos enorgullecen', 'Nuestros proyectos', 2),
    # La Portada del Sol: km 115.2 según su mapa oficial (antes figuraba 111.5, el kilómetro de La Planicie)
    ('"name": "La Portada del Sol", "description": "Lotes de 90 m² en el km 111.5', '"name": "La Portada del Sol", "description": "Lotes de 90 m² en el km 115.2', 1),
    ('<h3 class="h-md">La Portada del Sol</h3><p class="feat">Km 111.5', '<h3 class="h-md">La Portada del Sol</h3><p class="feat">Km 115.2', 1),
    ('{id:"portada", name:"La Portada del Sol", zone:"asia", zoneL:"Asia", km:111.5,', '{id:"portada", name:"La Portada del Sol", zone:"asia", zoneL:"Asia", km:115.2,', 1),
    ('{proj:"lirios"}, {proj:"zafiro"}, {proj:"planicie", also:"portada"}, {proj:"terrazas"},', '{proj:"lirios"}, {proj:"zafiro"}, {proj:"planicie"}, {proj:"portada"}, {proj:"terrazas"},', 1),
    # un solo trato: tú
    ('¿Cuándo piensa comprar?', '¿Cuándo piensas comprar?', 1),
    ('¿Cómo piensa pagar?', '¿Cómo piensas pagar?', 1),
    ('Su asesor se los muestra antes de separar.', 'Tu asesor te los muestra antes de separar.', 2),
    ('Antes de separar un lote, verifique', 'Antes de separar un lote, verifica', 1),
    ('Puede consultar los antecedentes', 'Puedes consultar los antecedentes', 1),
    ('Puede revisar los antecedentes', 'Puedes revisar los antecedentes', 2),
]

for f in WEBS:
    s = open(f, encoding='utf-8').read()
    # versión publicada: sin la franja de "prototipo"
    s = re.sub(r'<div class="ribbon" role="region" aria-label="Aviso de prototipo">.*?</div>\n*', '', s, count=1, flags=re.S)
    for a, b, n in TEXTOS:
        if a in s:
            if n is not None: assert s.count(a) == n, (os.path.basename(f), a, s.count(a))
            s = s.replace(a, b)
        else:
            assert b in s, (os.path.basename(f), 'no encontrado', a)
    s = re.sub(r'<!--vv-estilo-start-->.*?<!--vv-estilo-end-->\n?', '', s, flags=re.S)
    i = s.index('</head>'); s = s[:i] + ESTILO + '\n' + s[i:]
    assert 'Aviso de prototipo' not in s
    open(f, 'w', encoding='utf-8').write(s); print('ok', os.path.basename(f))
