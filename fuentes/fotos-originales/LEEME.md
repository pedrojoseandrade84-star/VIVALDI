# Fotos originales de Vivaldi (opcional)

Las páginas usan hoy las fotos de la web de Vivaldi, que llegan como máximo a 2400 px de ancho (la mayoría a 1400 px). Se incrustan tal cual, sin recomprimir.

Para tener fotos en 4K reales, copia aquí los archivos originales de cámara o dron (JPG, PNG, WebP o TIFF) **con el mismo nombre** que la foto de la web, sin importar la extensión. Por ejemplo, `piscina2-1.jpg` reemplaza a `2025/05/piscina2-1.webp`.

Luego ejecuta `python3 fuentes/regenerar.py`: cada página usa el original, reducido a 3840 px de ancho (4K) si es más grande, en WebP de calidad 90.

No se recomienda agrandar las fotos actuales con programas: no añade detalle real y en fotos de un proyecto puede mostrar cosas que no existen.
