# Guion de la reunión con las diapositivas nuevas (videos y ventas por proyecto). Base: guion_base.html (20 diapositivas originales).
import re, base64, io
from PIL import Image
D = '/tmp/claude-0/-home-user-VIVALDI/7bd92c7c-6d6a-5e61-b705-7cd0107bf55e/scratchpad'
s = open(D + '/guion/guion_base.html', encoding='utf-8').read()
parts = re.split(r'(?=<section class="sl">)', s); head, secs = parts[0], parts[1:]
last = secs[-1]; i = last.find('</section>') + len('</section>'); tail = last[i:]; secs[-1] = last[:i]
def thumb(n):
    im = Image.open(f'{D}/deck/av/s{n:02d}.png').convert('RGB').resize((640, 360), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'JPEG', quality=80)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
# después de la diapositiva original k: lista de (etiqueta, título, puntos, tiempo)
NEW = {6: [('Página web funcionando', 'Así la usa el cliente', ['El video corre solo al llegar a esta diapositiva. Para verlo en grande: clic sobre el video o tecla Z.', 'Narrar mientras se ve: filtra proyectos, elige su lote en el plano, calcula su cuota y deja sus datos.', 'Remarcar: no es un diseño en papel, es la web funcionando.'], '1 min'),
           ('Una página para cada proyecto', 'Una página para cada proyecto', ['Cada proyecto tiene su propia página para los anuncios: sus fotos, etapas, cuota, visita y preguntas.', 'Hay una página en inglés y español para peruanos que viven fuera y extranjeros.', 'Cada asesor tiene su enlace: el cliente que entra por él le escribe directo y la solicitud le llega asignada.', 'Precios, estados y etapas los actualiza la gerencia desde la herramienta y se publican solos.'], '1 min')],
       7: [('Herramienta funcionando', 'Así la usan el asesor y la gerencia', ['Mostrar el Tablero de dirección: ventas, cobranza, inventario y equipo en una sola vista.', 'La proforma con cronograma sale en segundos; los clientes del día aparecen ordenados.', 'Si preguntan, abrir la herramienta en vivo (carpeta 5) con “Ver con datos de ejemplo”.'], '1 min')],
       8: [('Base de datos funcionando', 'Lo que registra el asesor, la gerencia lo ve', ['A la izquierda la asesora en su celular; a la derecha la gerencia en la oficina.', 'La clienta nueva aparece en la oficina en segundos; lo que se borra también se actualiza.', 'Mensaje: la información es de Vivaldi y se ve en tiempo real.'], '1 min')],
       9: [('WhatsApp y CRM', 'WhatsApp que trabaja solo', ['El sistema avisa solo: bienvenida al cliente, aviso al asesor, confirmación y recordatorio de visita, recordatorio de cuota.', 'Si un cliente pasa una hora sin atención, la gerencia recibe una alerta.', 'Cada cliente tiene su historial completo: etapas, notas, proformas, visitas y pagos.', 'Se usa la API oficial de WhatsApp: Meta cobra centavos por mensaje (ver el costeo del mantenimiento).'], '1 min')],
       11: [('Simulador 3D funcionando', 'Del pedido del cliente a su casa en 3D', ['El asesor escribe lo que pide el cliente y aparece la casa sobre el lote.', 'Se gira, se ve de día o al atardecer, con rayos X, corte, plano y el entorno del condominio.', 'También sirve para negocios: en el video, una cevichería.'], '1 min')]}
out = []; n = 0
for k, sec in enumerate(secs, 1):
    n += 1; out.append(re.sub(r'Diapositiva \d+ ·', f'Diapositiva {n} ·', sec, count=1))
    for kt, h3, li, tm in NEW.get(k, []):
        n += 1
        out.append(f'<section class="sl"><img src="{thumb(n)}" alt=""><div><div class="k">Diapositiva {n} · {kt}</div><h3>{h3}</h3><ul>' + ''.join(f'<li>{x}</li>' for x in li) + f'</ul><p class="tm">Tiempo: {tm}</p></div></section>')
html = head + ''.join(out) + tail
html = html.replace('Abrir la presentación (carpeta 1) y presionar F.', 'Abrir la presentación (carpeta 1) y presionar F. Tiene 26 diapositivas; cuatro muestran videos reales de la web, la herramienta, la base de datos y el simulador funcionando.', 1)
open(D + '/guion/guion.html', 'w', encoding='utf-8').write(html); print('diapositivas en el guion', n)
