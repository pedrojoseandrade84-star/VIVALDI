# Plantillas de WhatsApp para aprobar en Meta

Diseño y desarrollo: Pedrojose Andrade Paredes

Los mensajes automáticos salen por la API oficial de WhatsApp (WhatsApp Business Platform de Meta). Meta exige que cada mensaje que inicia la empresa use una **plantilla aprobada**. Registrar estas 8 plantillas en **WhatsApp Manager → Plantillas de mensajes → Crear plantilla** con:

- **Categoría:** Utilidad
- **Idioma:** Español (código `es`)
- **Nombre:** exactamente el indicado (en minúsculas y con guion bajo; la herramienta lo usa tal cual)
- Las variables `{{1}}`, `{{2}}`… van en el cuerpo. Meta pide un ejemplo para cada una al registrar: usar los de la columna de ejemplo.

Meta revisa cada plantilla (normalmente en minutos u horas). Si rechaza alguna, ajustar la redacción sin cambiar el nombre ni el orden de las variables.

| Nombre | Texto del cuerpo | Variables (ejemplo) |
|---|---|---|
| `bienvenida_cliente` | Hola {{1}}, gracias por tu interés en {{2}}. {{3}} de Vivaldi Inmobiliaria te escribirá en breve con precios, cuotas y horarios de visita. | 1 nombre (Rosa) · 2 proyecto (La Planicie de Asia) · 3 asesor (Ana Flores) |
| `aviso_asesor` | {{1}}, tienes un cliente nuevo de la web: {{2}} ({{3}}), interesado en {{4}}. Visita: {{5}}. Escríbele en los próximos minutos. | 1 asesor · 2 cliente · 3 celular · 4 proyecto · 5 visita (sáb 7 nov) |
| `confirmacion_visita` | Hola {{1}}, tu visita a {{2}} quedó agendada para el {{3}} a las {{4}} ({{5}}). Te esperamos. Si necesitas cambiar la hora, responde a este mensaje. | 1 nombre · 2 proyecto · 3 fecha (sábado 7 de noviembre) · 4 hora (10:00) · 5 punto de encuentro (En el proyecto) |
| `recordatorio_visita` | Hola {{1}}, te recordamos tu visita de mañana a {{2}} a las {{3}} ({{4}}). ¿Nos confirmas tu asistencia? | 1 nombre · 2 proyecto · 3 hora · 4 punto de encuentro |
| `recordatorio_cuota` | Hola {{1}}, te recordamos que tu cuota {{2}} de {{3}} vence el {{4}} ({{5}}). Si ya la pagaste, no consideres este mensaje. Gracias por confiar en Vivaldi. | 1 nombre · 2 número de cuota (5) · 3 monto (S/ 967) · 4 fecha · 5 proyecto |
| `cuota_vencida` | Hola {{1}}, tu cuota {{2}} de {{3}} venció el {{4}}. Si ya pagaste, envíanos el comprobante por aquí; si necesitas ayuda, tu asesor te contactará. | 1 nombre · 2 número de cuota · 3 monto · 4 fecha |
| `alerta_jefatura` | Cliente sin atender por más de una hora: {{1}} ({{2}}), interesado en {{3}}. Asesor asignado: {{4}}. | 1 cliente · 2 celular · 3 proyecto · 4 asesor |
| `resumen_asesor` | Buenos días, {{1}}. Hoy tienes {{2}} clientes por contactar y {{3}} visitas. Revísalos en la herramienta de ventas. | 1 asesor · 2 número de clientes · 3 número de visitas |

## Cuándo sale cada mensaje

| Mensaje | Cuándo | Lo genera |
|---|---|---|
| Bienvenida y aviso al asesor | Apenas el cliente deja sus datos en la web o en una landing | Base de datos (al registrar la solicitud) |
| Confirmación de visita | Al guardar la visita en la herramienta (si todavía hay tiempo antes de la visita) | Base de datos (al sincronizar la visita) |
| Recordatorio de visita | El día anterior a las 10:00 (no se envía si ya no llega con una hora de anticipación) | Base de datos |
| Recordatorio de cuota | 3 días antes del vencimiento, a las 10:00; se cancela solo si la cuota se registra como pagada | Base de datos |
| Cuota vencida | Al día siguiente del vencimiento, una sola vez | Tarea de cada 5 minutos |
| Alerta a la jefatura | Cliente de la web con más de una hora sin ser recibido por su asesor | Tarea de cada 5 minutos |
| Resumen del asesor | Días con pendientes, a las 8:30 | Tarea de cada 5 minutos |

Todo mensaje se envía entre las 8:00 y las 20:00 (hora de Lima); lo que se genera fuera de ese horario sale a las 8:30 siguientes. Si un cliente pide no recibir mensajes, la jefatura lo registra en la herramienta (**Análisis → Proyectos y automatización → Mensajes automáticos → No contactar**) y no se le envía nada más.
