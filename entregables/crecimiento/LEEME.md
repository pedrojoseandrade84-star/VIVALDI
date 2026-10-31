# Plan de crecimiento de ventas · Vivaldi

Diseño y desarrollo: Pedrojose Andrade Paredes.

## 1. Lo que ya está funcionando en la web
- **Medición del embudo**: cada paso del cliente queda registrado: vio un proyecto, usó el simulador de cuotas, eligió una visita, abrió WhatsApp, envió el formulario, compartió con un referido o se unió a la lista de espera.
- **WhatsApp con contexto**: el botón de WhatsApp ya dice qué proyecto miró el cliente y de dónde llegó (Facebook, Google, TikTok, referido o el enlace de un asesor).
- **Oferta antes de irse**: a quien sale sin escribir se le ofrece recibir por WhatsApp los lotes disponibles, su cuota y los horarios de visita. Aparece una vez por semana y nunca a quien ya escribió.
- **Formulario que no se pierde**: si el cliente sale a medias, al volver encuentra sus datos.
- **Cuota mensual en cada proyecto**: "o S/ X al mes" (referencial: 20 % de inicial y 36 cuotas sin intereses).
- **Referidos**: después de cotizar, se invita a compartir con la familia y los amigos.
- **Lista de espera**: en los proyectos agotados, botón "Avísame del próximo proyecto".
- **Prueba A/B**: la mitad de los visitantes ve el botón "WhatsApp" y la otra mitad "Ver precios". Se mide cuál genera más contactos.

## 2. Para activar la medición publicitaria (una sola vez)
En el archivo de la web, dentro del bloque `growth`, completar:
`CFG = {ga4: "G-XXXX", metaPixel: "123…", tiktokPixel: "C…"}`.
Los píxeles solo se cargan si el visitante acepta todas las cookies, como lo pide la Ley 29733.

Eventos clave para optimizar los anuncios:
- `lead_submit`: es la conversión principal.
- `whatsapp_click`
- `visit_selected`
- `simulator_used`
- `referral_share`
- `waitlist_join`

## 3. En la herramienta de ventas (Mis clientes)
- **Origen** de cada cliente: así se sabe qué canal trae ventas.
- **Embudo de ventas**: muestra el porcentaje de clientes que pasa de etapa a etapa.
- **Ventas por canal**: indica dónde conviene invertir el presupuesto de publicidad.
- **A quién llamar primero**: cada cliente aparece como caliente, tibio o frío, con la acción recomendada y el mensaje de WhatsApp listo para enviar.
- **Reactivar clientes fríos**: lista a los que llevan más de 3 semanas sin avanzar, con un mensaje para retomar el contacto.
- **Mi enlace de la web**: cada asesor comparte su propio enlace y los mensajes que llegan indican quién trajo al cliente.
- **Resumen de la semana**: envía a la gerencia por WhatsApp los nuevos interesados, visitas, separaciones, ventas y su origen.

## 4. Rutina semanal recomendada
1. **Lunes:** cada asesor envía su resumen semanal. La gerencia compara el cierre por canal y mueve presupuesto al canal que más vende.
2. **Todos los días:** atender primero la lista "A quién llamar primero". Los interesados que llegaron hoy se llaman en los primeros minutos.
3. **Miércoles:** reactivar a los clientes fríos con fotos del avance de obra.
4. **Viernes:** invitar a los tibios a la visita guiada del fin de semana.
5. **Cada mes:** revisar la prueba A/B y quedarse con el texto que gane.

Todo es referencial: precios, cuotas y disponibilidad se confirman con la jefatura comercial.
