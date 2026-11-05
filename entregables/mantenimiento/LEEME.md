# Mantenimiento y hoja de ruta

Diseño y desarrollo: Pedrojose Andrade Paredes

## Costeo del mantenimiento

`Costeo-Mantenimiento-Vivaldi.xlsx` calcula cuánto cuesta mantener el sistema funcionando cada mes:

- **Supuestos** (celdas amarillas): tipo de cambio, clientes nuevos por mes, visitas, ventas con cuotas, asesores, horas de soporte y la tarifa por hora. Al cambiarlos, todo se recalcula.
- **Costeo mensual:** base de datos (Supabase Pro), publicación de la web y las landings, dominio, cada tipo de mensaje automático de WhatsApp y el soporte. Totales mensual y anual, en dólares y en soles.
- **Qué incluye:** las tareas mensuales de mantenimiento y sus horas.
- **Fuentes:** de dónde salió cada precio y la fecha.

Con los supuestos de ejemplo (80 clientes nuevos, 30 visitas y 40 ventas con cuotas al mes, 4 asesores), los servicios de terceros suman **alrededor de US$ 36 al mes**. La tarifa del soporte queda en blanco hasta acordarla.

**Importante:** los precios de terceros salen de fuentes públicas de noviembre de 2026 y cambian. Confirmarlos en supabase.com/pricing y en la tabla de precios de WhatsApp Business Platform de Meta antes de contratar. Montos sin IGV.

## Hoja de ruta del CRM

Lo que ya funciona:

- Clientes con etapa, próximo contacto, origen, presupuesto y notas; prioridad de a quién llamar; WhatsApp con mensaje listo.
- **Historial de cada cliente** (botón Historial): llegada y origen, tiempo de primera respuesta, cambios de etapa, WhatsApp enviados, notas, proformas, separación, visitas, venta y pagos.
- Asignación automática de los clientes de la web (por turno o por el enlace del asesor), alerta si no se atienden en una hora.
- Tablero de dirección, ranking por asesor, reportes en Excel.
- Mensajes automáticos de WhatsApp (bienvenida, visitas, cuotas, alertas, resumen del asesor).

Lo que sigue, en orden de impacto:

1. **Respuestas de los clientes dentro de la herramienta:** recibir en la herramienta lo que el cliente responde al WhatsApp automático (webhook de Meta) y mostrarlo en su historial.
2. **Embudo por campaña:** costo por cliente y por venta de cada anuncio (conectando el gasto de Meta Ads y Google Ads).
3. **Seguimiento automático de clientes fríos:** mensaje de seguimiento a los 3 y 7 días sin respuesta (plantilla de marketing, con permiso del cliente).
4. **Contrato y firma digital** a partir de la separación.
5. **Pagos en línea** de cuotas (enlace de pago) con conciliación automática en Cobranza.
6. **Aplicación instalable** en el celular del asesor (funciona como app, con avisos).
