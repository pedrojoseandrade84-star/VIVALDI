# Explorador 3D · La Portada del Sol

Diseño y desarrollo: Pedrojose Andrade Paredes

`explorar-portada.html` funciona como las webs inmobiliarias de "elige tu unidad", con lotes en lugar de pisos:

1. **Elige tu lote.** La fila de casas del condominio vista desde la calle. Al pasar el mouse (o tocar, en celular) por cada casa se ilumina su lote, un marcador dorado lo señala y aparece su tarjeta: número de lote, 90 m² (6 × 15 m), estado y precio desde. Sin tocar nada, el marcador recorre los lotes solo. Botones Día y Atardecer.
2. **Explorar el lote.** La cámara se acerca a esa casa y pasa al corte en 3D de la casa, con su panel: estado, 90 m² de lote, 107 m² techados, 2 baños, ambientes de cada piso (Piso 1 / Piso 2), y los botones Entrar a la casa, Separar este lote (Mi Vivaldi) y WhatsApp.
3. **Entrar a la casa.** Sala, comedor y cocina, dormitorio principal y terraza, cada uno con su nombre; pasan solos o con las flechas. Desde ahí se vuelve a la casa completa o al condominio.

Funciona sin internet, en computadora y en celular (en celular la cámara se centra en el lote elegido y se cambia de lote con flechas o deslizando). Se maneja con teclado (flechas, Enter y Escape). Lleva el módulo del asesor: con `?asesor=código&n=Nombre&t=celular` los WhatsApp van al asesor.

## Disponibilidad
Sin conexión a la base de datos muestra **disponibilidad de ejemplo**, con un aviso visible arriba. Al escribir la URL y la clave pública en `const BASE = {url: "", key: ""};`, toma número, manzana, área, estado y precio de los lotes de La Portada del Sol del inventario (los mismos que ve Mi Vivaldi) y quita el aviso. La posición de cada lote en la vista es referencial: el plano oficial lo muestra el asesor.

## Transparencia
Las vistas del condominio, de la casa y de sus ambientes son referenciales, generadas con el simulador 3D de Vivaldi para un lote de 6 × 15 m; cada pantalla lo indica. El diseño, el costo y los permisos de cada casa dependen de su propietario.

## Publicarlo
Subirlo como `/proyectos/explorar-portada.html`. La página de La Portada del Sol ya lo enlaza ("Explorar en 3D" en el menú y "Elige tu lote en 3D").

## Regenerarlo
`node fuentes/experiencia/capturas_explorador.js fuentes/experiencia/capturas portada` toma las vistas del simulador (y calcula la posición de cada lote en pantalla) y `python3 fuentes/experiencia/explorador.py` genera la página.
