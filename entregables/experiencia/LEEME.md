# Explorador 3D de lotes

Diseño y desarrollo: Pedrojose Andrade Paredes

Un explorador por proyecto, que funciona como las webs inmobiliarias de "elige tu unidad", con lotes en lugar de pisos:

| Archivo | Proyecto | Lote | Casa de referencia |
|---|---|---|---|
| `explorar-portada.html` | La Portada del Sol | 6 × 15 m (90 m²) | 107 m² techados |
| `explorar-planicie.html` | La Planicie de Asia | 8 × 25 m (200 m²) | con piscina en el patio |
| `explorar-terrazas.html` | Las Terrazas de Cerro Azul | 8 × 25 m (200 m²) | con piscina en el patio |
| `explorar-esmeralda.html` | La Esmeralda de Cerro Azul | 10 × 25 m (250 m²) | 212 m² techados |
| `explorar-lirios.html` | Lirios del Mar de Asia | 6 × 15 m (90 m²) | 107 m² techados |

Cada uno tiene tres pasos:

1. **Elige tu lote.** La fila de casas del condominio vista desde la calle. Al pasar el mouse (o tocar, en celular) por cada casa se ilumina su lote, un marcador dorado lo señala y aparece su tarjeta: número de lote, área y medidas, estado y precio desde. Sin tocar nada, el marcador recorre los lotes solo. Botones Día y Atardecer.
2. **Explorar el lote.** La cámara se acerca a esa casa y pasa al corte en 3D de la casa, con su panel: estado, m² de lote, m² techados, baños, ambientes de cada piso (Piso 1 / Piso 2), y los botones Entrar a la casa, Separar este lote (Mi Vivaldi) y WhatsApp.
3. **Entrar a la casa.** Sala, comedor y cocina, dormitorio principal y terraza, cada uno con su nombre; pasan solos o con las flechas. Desde ahí se vuelve a la casa completa o al condominio.

**Guardar y comparar.** En la tarjeta de cada lote disponible (y en la vista de la casa) está **+ Guardar**. Los lotes guardados aparecen en **Mis lotes** (abajo a la derecha), donde se comparan lado a lado: estado, área, medidas, precio desde, inicial de 20% y cuota referencial a 36 meses. Desde ahí el cliente envía su selección al asesor por WhatsApp o va a separar en línea. La selección se guarda solo en el navegador del cliente (hasta 4 lotes).

Funciona sin internet, en computadora y en celular (en celular la cámara se centra en el lote elegido y se cambia de lote con flechas o deslizando). Se maneja con teclado (flechas, Enter y Escape). Lleva el módulo del asesor: con `?asesor=código&n=Nombre&t=celular` los WhatsApp van al asesor.

## Disponibilidad
Sin conexión a la base de datos muestra **disponibilidad de ejemplo**, con un aviso visible arriba. Al escribir la URL y la clave pública en `const BASE = {url: "", key: ""};`, toma número, manzana, área, estado y precio de los lotes de ese proyecto en el inventario (los mismos que ve Mi Vivaldi) y quita el aviso. La posición de cada lote en la vista es referencial: el plano oficial lo muestra el asesor.

## Transparencia
Las vistas del condominio, de la casa y de sus ambientes son referenciales, generadas con el simulador 3D de Vivaldi con las medidas típicas de cada proyecto; cada pantalla lo indica. El diseño, el costo y los permisos de cada casa dependen de su propietario.

## Publicarlo
Subir cada uno como `/proyectos/explorar-<proyecto>.html`. La página de cada proyecto ya lo enlaza ("Explorar en 3D" en el menú y "Elige tu lote en 3D"); el enlace aparece solo si el explorador existe.

## Regenerarlo
Para cada proyecto: `node fuentes/experiencia/capturas_explorador.js fuentes/experiencia/capturas/<proyecto> <proyecto>` toma las vistas del simulador (las cámaras se calculan con las medidas del lote y los ambientes del diseño, y se calcula la posición de cada lote en pantalla) y `python3 fuentes/experiencia/explorador.py <proyecto>` genera la página. Diamante y Zafiro no están en el simulador.

## Resolución

Las vistas del condominio, los cortes y los ambientes están renderizadas por el simulador en 4K (3840 × 2160 px), con detalle real, no ampliadas. Por eso cada explorador pesa entre 5 y 8 MB.

## Showroom virtual (showroom.html)

Recorrido en 3D de una casa modelo de referencia sobre el lote real de cada proyecto (6 × 15, 10 × 20 o 10 × 25 m), en un entorno basado en fotos reales de Asia y Cerro Azul: lotes sobre arena, cerco de concreto, lomas, playa y mar de Humboldt.

- **Motor:** three.js actual con cielos HDR reales de tarde, atardecer y noche, materiales PBR, muebles 3D escaneados, oclusión ambiental, pasto 3D con viento y corrección de color.
- **RTX:** trazado de rayos en vivo. Al detener la cámara, la luz, las sombras y los reflejos se calculan como en la realidad.
- **Foto realista:** imagen por trazado de rayos, que se puede descargar.
- **Recorrido guiado** de 8 paradas, modo **Caminar** (con choques contra los muros) y vista del **Lote** en planta.
- **Tu casa:** estilo Mediterráneo, Contemporáneo o Tropical, con el botón «Enviar mi casa al asesor» por WhatsApp.
- **Realidad virtual:** con Meta Quest, abriendo la página en el navegador del visor. Se apunta al piso y se presiona el gatillo para moverse, la palanca sirve para girar y el botón lateral lleva a la siguiente parada.

Funciona sin internet (un solo archivo de unos 27 MB). Para equipos modestos se puede abrir con `?ligero` al final de la dirección. Se puede abrir directo en un proyecto con `?proyecto=lirios`. La casa y el entorno son ilustrativos: Vivaldi vende lotes y la construcción es libre.

Texturas, cielos y muebles: Poly Haven, con licencia CC0 (uso comercial libre). Para regenerarlo: `python3 fuentes/showroom/build.py`.
