# Videos de demostración y presentación

Grabaciones reales de la web, la herramienta, la base de datos y el simulador, y su inserción en la presentación.

- `lib.js`: grabación cuadro a cuadro de Chromium (CDP screencast) con cursor visible; arma el MP4 con ffmpeg.
- `web.js`, `tool.js`: recorrido de la web y de la herramienta (con datos de ejemplo).
- `db.js`: asesora y gerencia lado a lado contra el servidor de prueba (`pruebas/base-de-datos/mock.js` y PostgreSQL).
- `simcap.js` + `simcomp.py`: el simulador se captura cuadro a cuadro (fotos de la página y giros de cámara renderizados directamente) porque en un servidor sin tarjeta gráfica el 3D va a 2 cuadros por segundo; `simcomp.py` dibuja el cursor y arma el video a 30 cuadros por segundo.
- `build_demo.py`: inserta las diapositivas "Así funciona" en la presentación TV. Los videos van dentro del archivo y se cargan solo al llegar a su diapositiva.
- `autovideo.js`: video que avanza solo y capturas de cada diapositiva (también usadas para el PDF).

Las rutas de los scripts apuntan a la carpeta de trabajo donde se generaron; ajustarlas antes de volver a ejecutarlos.
