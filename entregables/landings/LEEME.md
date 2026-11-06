# Landings por proyecto y para clientes del extranjero

Diseño y desarrollo: Pedrojose Andrade Paredes

Una página por proyecto para enamorar al cliente de ese proyecto en particular, y una página bilingüe (español e inglés) para peruanos que viven fuera y extranjeros. Cada archivo funciona solo: fotos, tipografías y todo el código van dentro.

| Archivo | Proyecto | Qué muestra |
|---|---|---|
| `planicie.html` | La Planicie de Asia | Preventa, etapas de obra, cuota, visita |
| `terrazas.html` | Las Terrazas de Cerro Azul | Preventa, renders referenciales, cuota, visita |
| `portada.html` | La Portada del Sol | En construcción, club, cuota, visita |
| `lirios.html` | Lirios del Mar de Asia | Entrega inmediata, últimos lotes |
| `esmeralda.html` | La Esmeralda de Cerro Azul | Entrega inmediata, club privado |
| `diamante.html` | Diamante de Asia | Consulta de disponibilidad |
| `zafiro.html` | Zafiro de Asia | Proyecto entregado: prueba de que Vivaldi entrega; capta interesados para el próximo |
| `extranjeros.html` | Todos los disponibles | Inglés y español, precios con referencia en dólares, compra a distancia en 5 pasos, videollamada, celular internacional |

Cada landing tiene: portada con su foto y su color, datos clave (precio, lote, ubicación, estado), lo que incluye el proyecto, **etapas del proyecto** (hecha, en curso, próxima), galería ampliable, cómo llegar (con Google Maps), testimonios de propietarios publicados por Vivaldi, calculadora de cuota sin intereses, preguntas frecuentes, agenda de visita de fin de semana, formulario que guarda al cliente y abre WhatsApp, y enlaces a los otros proyectos. Desde el menú y la sección del proyecto, **Lotes en línea** lleva al portal Mi Vivaldi con ese proyecto elegido, para ver qué lotes quedan y pedir la separación.

Para buscadores: cada página tiene su dirección canónica (https://vivaldiinmobiliaria.com/proyectos/…) y datos estructurados (schema.org) con el nombre, la descripción y el precio, para que Google muestre el proyecto con su precio. En la web principal, la ficha de cada proyecto tiene el botón **Página completa del proyecto**.

## Publicarlas

1. Subir los 8 archivos a la web de Vivaldi en la carpeta `/proyectos/` (por ejemplo `https://vivaldiinmobiliaria.com/proyectos/planicie.html`). Si se publican en otra ruta, cambiar `LANDINGS` al inicio del módulo de la herramienta (`fuentes/gestion.html`) para que los enlaces de los asesores apunten bien.
2. Conectar con la base de datos: en cada archivo, buscar `const BASE = {url: "", key: ""};` y escribir la misma URL y clave pública que la web. Así cada solicitud queda guardada, asignada y con su bienvenida automática, y los precios y estados que publique la jefatura se ven al instante.
3. Para anuncios, usar la landing del proyecto con sus parámetros de campaña, por ejemplo `planicie.html?utm_source=facebook&utm_campaign=planicie-nov`. El origen queda registrado en cada solicitud.

## Enlace del asesor

`planicie.html?asesor=rosa-quispe&n=Rosa%20Quispe&t=987654321` muestra "Te atiende Rosa Quispe", lleva los WhatsApp a su celular y asigna la solicitud a ella. Los asesores no tienen que armarlo: la herramienta lo genera en **Proyectos y automatización → Mis enlaces de venta**. El asesor se recuerda por 30 días en ese navegador.

## Cambiar textos, fotos o etapas

- **Precio, estado, resumen y etapas:** desde la herramienta (jefatura), sin tocar los archivos.
- **Fotos, colores o textos fijos:** se cambian en `proyectos.json` de los archivos fuente (se entregan con el código del sistema) y se vuelven a generar las 8 páginas con `build.py`.

## A confirmar por Vivaldi antes de publicar

- Las etapas marcadas como "Fecha por confirmar con tu asesor" (Terrazas, Portada, Diamante) no tienen fecha publicada.
- Km de La Esmeralda y de Diamante, precio y área de Diamante.
- Landing para extranjeros: el paso de firma a distancia está redactado de forma general ("mediante un apoderado en el Perú u otra vía que el área legal indique"); revisarlo con el asesor legal. La referencia en dólares usa el tipo de cambio de `proyectos.json`.

## Cómo se probó

En computadora y celular (Chromium): sin errores, sin desplazamiento lateral y sin problemas de accesibilidad (axe-core). Formularios de punta a punta contra el servidor de prueba: solicitud guardada con proyecto, visita, plazo, origen y asesor; WhatsApp al asesor del enlace; bienvenida automática encolada; cliente del extranjero con celular internacional y país; cambio de idioma; precio y estado tomados de la base de datos.
