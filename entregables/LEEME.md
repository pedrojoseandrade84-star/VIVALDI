# Entregables · Vivaldi Inmobiliaria

Diseño y desarrollo: Pedrojose Andrade Paredes. Versión final, noviembre 2026.

| Carpeta | Archivo | Uso |
|---|---|---|
| web/ | Vivaldi-web-whatsapp.html (≈9 MB) | Versión liviana para enviar por WhatsApp |
| web/ | Vivaldi-web-final.html (≈22 MB) | Máxima calidad, para publicar o presentar en computadora |
| web/ | portal.html (Mi Vivaldi) | Venta en línea: el cliente elige su lote y pide la separación; el comprador entra con su correo y ve sus cuotas; el asesor entra con su usuario, separa lotes y da acceso a sus compradores. Sin conexión a la base funciona en modo demostración |
| software/ | planicie-herramienta-whatsapp.html (≈1.7 MB) | Herramienta comercial para los asesores, versión liviana |
| software/ | planicie-herramienta-final.html (≈2.8 MB) | Herramienta comercial, máxima calidad |
| base-de-datos/ | esquema-supabase.sql y LEEME.md | Base de datos de la empresa: instalación, usuarios, seguridad, enlaces de asesor, proyectos y mensajes automáticos |
| base-de-datos/ | funciones/enviar-whatsapp, activar-envios.sql, plantillas-whatsapp.md | Envío automático por WhatsApp (API oficial de Meta): función, activación y las 8 plantillas para aprobar |
| landings/ | 7 landings por proyecto y extranjeros.html | Una página por proyecto con sus etapas, galería, cuota y visita; página bilingüe para clientes del extranjero. Ver LEEME |
| mantenimiento/ | Costeo-Mantenimiento-Vivaldi.xlsx y LEEME.md | Costo mensual del sistema (servicios de terceros y soporte) y hoja de ruta del CRM |
| software/ejemplos-excel/ | Archivos .xlsx | Muestra de cada Excel que genera la herramienta (datos de ejemplo) |
| simulador/ | Simulador-3D-Lotes-Vivaldi.html (≈1.6 MB) | Simulación 3D de construcción en el lote, para asesores |
| crecimiento/ | Plan-Crecimiento-Comercial-Vivaldi.pdf | Plan de crecimiento comercial para la Gerencia |
| crecimiento/ | Plan-Contenidos-Redes-Vivaldi.pdf | Plan de contenidos de 30 días para redes sociales |
| auditoria/ | Informe-Auditoria-Tecnica-Vivaldi.pdf | Auditoría técnica de simulador, herramienta, web e integración: hallazgos, correcciones, pruebas y pendientes |
| automatizacion/ | Plan-Automatizacion-Vivaldi.pdf | Plan de automatización de procesos comerciales y de cobranza, por fases |
| cotizacion/ | Cotizacion-Vivaldi-COT-2026-002.pdf | Cotización mensual: S/ 2,000 al mes (negociable) con todo incluido, sin instalación; el sistema pasa a Vivaldi a las 18 mensualidades; mantenimiento desde S/ 490 |
| propuesta/ | Propuesta-Vivaldi-PV-2026-001.pdf | Versión anterior, reemplazada por la cotización COT-2026-002. No se envía |
| propuesta/ | Asesoria-Comercial-Vivaldi.pdf | Asesoría comercial: diagnóstico, redes sociales, riesgos y plan de mejora |
| presentacion/ | Presentacion-Vivaldi-TV.html | Presentación para proyectar en televisor (26 diapositivas, con 4 videos reales del funcionamiento). Abrir en el navegador, tecla F para pantalla completa, flechas o toque para avanzar. Funciona sin internet |
| presentacion/ | Presentacion-Propuesta-Integral-Vivaldi.pdf | La misma presentación en PDF, para enviar o imprimir |
| presentacion/ | Presentacion-Vivaldi-video.mp4 e imagenes-para-tv/ | Para reproducir directo en el televisor, sin computadora |
| presentacion/ | Guion-Reunion-Vivaldi.pdf | Guion para quien presenta: qué decir, tiempos, cómo hablar de dinero y cerrar (no se entrega) |
| presentacion/ | LEEME-PRESENTACION.txt | Cómo ponerla en el televisor: Mac con HDMI, AirPlay, Chromecast o USB |
| manual/ | Manual-Herramienta-Ventas-Vivaldi.pdf | Manual de uso de la herramienta comercial |
| manual/ | Anexo-Manual-Funciones-Crecimiento-Vivaldi.pdf | Anexo: prioridad de contacto, seguimiento, registro desde la web, embudo y pronóstico |
| manual/ | Anexo-2-Manual-Funciones-Nuevas-Mi-Vivaldi.pdf | Anexo 2: borrar clientes, historial del cliente, enlaces de venta, proyectos, mensajes automáticos, Tablero de dirección y Mi Vivaldi (asesores y clientes) |
| contrato/ | Contrato-Locacion-Servicios-Vivaldi.pdf y contrato-editable.html | Modelo de contrato de servicio mensual con referencia a la cotización COT-2026-002; revisar con un abogado antes de firmar |
| rotulado/ | PDF de diseños y archivos para imprenta | Rotulado de la flota: camionetas, van y sedanes |

## Web
- Proyectos con fotos reales; los renders están marcados como referenciales.
- Plano interactivo de lotes, simulador de cuotas, buscador "¿Qué lote me alcanza?" y comparador de proyectos.
- Formulario que se envía por WhatsApp con el origen del cliente, agenda de visitas, Asistente Vivaldi y Libro de Reclamaciones.
- Capa de crecimiento:
  - medición del embudo con consentimiento de cookies;
  - WhatsApp con el proyecto que vio el cliente;
  - recuperación de visitantes que se retiran sin escribir;
  - preguntas de calificación (plazo de compra y forma de pago);
  - información al consumidor (Leyes 29203 y 30534) y lista de compra segura;
  - cuota mensual referencial en cada proyecto;
  - referidos y lista de espera;
  - prueba A/B del botón de WhatsApp.
- Accesibilidad verificada con axe-core: sin violaciones.

## Herramienta comercial
- Agenda del día, visitas, inventario de lotes, proforma, separación, cobranza, panel y reporte gerencial, clientes, mensajes, objeciones y respaldo de datos.
- Gestión del crecimiento:
  - origen de cada cliente;
  - embudo con su conversión;
  - ventas por canal;
  - prioridad de contacto;
  - reactivación de clientes sin avance;
  - tiempo de primera respuesta;
  - pronóstico ponderado;
  - registro de clientes desde el mensaje de la web;
  - secuencia de seguimiento de 6 contactos y meta diaria de actividad;
  - calificación por plazo de compra y forma de pago;
  - exportación de indicadores a Excel.
- Base de datos de la empresa (opcional, ver `base-de-datos/LEEME.md`): cada asesor entra con su usuario, todo se guarda en el servidor de Vivaldi, funciona sin internet y se sincroniza al volver la señal; la jefatura ve todo y queda un historial de cambios.

## Simulador 3D
Entorno de cada proyecto y plano de su maqueta, casas y negocios, día y atardecer, recorrido interior, corte, rayos X y plano, presentación automática, ficha para WhatsApp y asistente de diseño en línea gratuito.

## Notas
- En iPhone, la vista previa de WhatsApp no ejecuta las páginas: ábralas desde un enlace publicado o en el navegador.
- `propuesta/investigacion-mercado-y-diagnostico.md` es un documento interno de trabajo; no se envía al cliente.
- Precios, cuotas y disponibilidad son referenciales y se confirman con la jefatura comercial.
