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

Funciona sin internet, en computadora y en celular (en celular la cámara se centra en el lote elegido y se cambia de lote con flechas o deslizando). Se maneja con teclado (flechas, Enter y Escape). Lleva el módulo del asesor: con `?asesor=código&n=Nombre&t=celular` los WhatsApp van al asesor.

## Disponibilidad
Sin conexión a la base de datos muestra **disponibilidad de ejemplo**, con un aviso visible arriba. Al escribir la URL y la clave pública en `const BASE = {url: "", key: ""};`, toma número, manzana, área, estado y precio de los lotes de ese proyecto en el inventario (los mismos que ve Mi Vivaldi) y quita el aviso. La posición de cada lote en la vista es referencial: el plano oficial lo muestra el asesor.

## Transparencia
Las vistas del condominio, de la casa y de sus ambientes son referenciales, generadas con el simulador 3D de Vivaldi con las medidas típicas de cada proyecto; cada pantalla lo indica. El diseño, el costo y los permisos de cada casa dependen de su propietario.

## Publicarlo
Subir cada uno como `/proyectos/explorar-<proyecto>.html`. La página de cada proyecto ya lo enlaza ("Explorar en 3D" en el menú y "Elige tu lote en 3D"); el enlace aparece solo si el explorador existe.

## Regenerarlo
Para cada proyecto: `node fuentes/experiencia/capturas_explorador.js fuentes/experiencia/capturas/<proyecto> <proyecto>` toma las vistas del simulador (las cámaras se calculan con las medidas del lote y los ambientes del diseño, y se calcula la posición de cada lote en pantalla) y `python3 fuentes/experiencia/explorador.py <proyecto>` genera la página. Diamante y Zafiro no están en el simulador.
