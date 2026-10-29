# Simulador 3D de construcción · Vivaldi

Archivo único: `Simulador-3D-Lotes-Vivaldi.html` (≈690 KB, funciona sin internet y se puede enviar por WhatsApp). Diseño y desarrollo: Pedrojose Andrade Paredes.

## Qué hace
- El asesor escribe o dicta lo que quiere el cliente ("familia de 5, casa de playa de 2 pisos, piscina y cochera") y la herramienta diseña la casa que mejor aprovecha el lote.
- Tres opciones por lote: Compacta, Equilibrada y Máximo aprovechamiento, respetando retiro frontal, área libre y pisos máximos (editables).
- Vista 3D: exterior, recorrido en primera persona (se sube por la escalera), corte por piso, rayos X y plano con medidas.
- Instalaciones trazadas: eléctricas (alumbrado, tomacorrientes, fuerza, medidor y tablero), agua fría con tanque elevado, agua caliente desde la therma y desagüe hasta red pública o biodigestor, con metrado referencial.
- Análisis: áreas por ambiente, ocupación, área libre, coeficiente de edificación, costo referencial de construcción (costo por m² editable), recomendaciones técnicas y checklist de compra segura.
- "Ficha cliente": imagen lista para compartir por WhatsApp.

## IA
- Sin configurar nada: interpretación automática del pedido dentro del mismo celular.
- Opcional (⚙): con una clave de API de Anthropic usa Claude (modelo claude-opus-5-5) para entender pedidos libres y explicar el diseño al cliente. La clave queda solo en ese navegador; usar una clave con límite de gasto.

## Importante
Es una simulación referencial para orientar la compra. No reemplaza el proyecto de arquitectura e ingeniería firmado por profesionales colegiados, el estudio de suelos ni la licencia de edificación. Las medidas de cada lote y los parámetros urbanísticos deben confirmarse con el plano y el Certificado de Parámetros de la municipalidad.
