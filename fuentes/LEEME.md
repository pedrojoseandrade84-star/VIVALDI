# Fuentes y pruebas automatizadas

Diseño y desarrollo: Pedrojose Andrade Paredes

Esta carpeta no se entrega al cliente final: es el material técnico para mantener y volver a verificar el proyecto.

## Simulador 3D (`simulador/`)

El archivo entregado (`entregables/simulador/Simulador-3D-Lotes-Vivaldi.html`) se construye a partir de estas fuentes:

1. `assemble.py` arma `app.js` con el motor base (`app_v1.js`), las partes (`part_*.js`) y los parches en orden: `repl_*.json` (reemplazos), `swap_*.js` (bloques) y `post_*.json` (parches finales sobre el código completo).
2. `build.py` incluye Three.js r128, OrbitControls y Sky (`vendor/`) y genera el HTML único, que funciona sin internet.

```
python3 assemble.py && python3 build.py
```

`post_90_puertas.json` contiene la corrección de puertas, accesos, rótulos y muebles de la auditoría de noviembre de 2026.

## Pruebas (`pruebas/`)

Se ejecutan con Node y Playwright (Chromium). Las rutas apuntan a la carpeta del proyecto.

| Carpeta | Qué prueba |
|---|---|
| `simulador/` | 1,323 combinaciones de diseño (`stress`), puertas (`doorcheck`), acceso a cada ambiente (`reach`), muebles en el paso de las puertas (`furn`), celular, táctil, escaleras y casos límite |
| `auditoria/` | Inyección de código (XSS) en herramienta, web y simulador; cálculos de la proforma (`calc`); valores inválidos (`robust`); responsive; SEO; rendimiento del simulador |
| `base-de-datos/` | Reglas de seguridad en PostgreSQL (`test.sql`, `test2.sql`), servidor de prueba con la misma interfaz que Supabase (`mock.js`), sincronización entre equipos (`tsync`) y solicitudes de la web (`tlead`) |

`sync.html` y `webdb.html` son los módulos de base de datos que se insertan en la herramienta y en la web con `inject_sync.py` e `inject_db.py`.

`demo.html` es el modo "Ver con datos de ejemplo" de la herramienta (para demostraciones); se inserta con `inject_demo.py`. Los registros de ejemplo llevan `demo: true`, se pueden quitar con un botón y la sincronización nunca los sube a la base de datos.

`navmenu.html` agrupa en el menú "Análisis" las secciones de comparación con la competencia y los ajustes, para que el menú quepa en pantalla; se inserta con `inject_navmenu.py`.

`direccion.html` es el Tablero de dirección de la herramienta (indicadores del mes, cotizado y vendido por mes, inventario, embudo, cartera por antigüedad, origen de clientes, equipo y alertas); se inserta con `inject_direccion.py` después de `navmenu.html`.

`borrar.html` agrega el borrado de clientes: botón Eliminar de un toque con Deshacer, botón Borrar cliente en el formulario y Borrar varios; se inserta con `inject_borrar.py`. Pruebas: `auditoria/borrar_clientes.js` y `base-de-datos/tborrar.js` (el borrado llega al servidor y Deshacer lo recupera).

## Ventas desde la web, proyectos y automatización

- `asesor.html` (web y landings): enlace personal del asesor (`?asesor=código`) y precios y estados en vivo desde la tabla `proyectos`. Se inserta con `inject_asesor.py`.
- `gestion.html` (herramienta): Mis enlaces de venta, editor de Proyectos (jefatura) y Mensajes automáticos (jefatura). Se inserta con `inject_gestion.py`, que incluye `landings/proyectos.json`.
- `crm.html` (herramienta): historial de cada cliente. Se inserta con `inject_crm.py`.
- `landings/`: `proyectos.json` (datos de cada proyecto), `build.py` y `extranjeros.py` generan las 8 landings en `entregables/landings/`.
- `costeo/build_costeo.py`: genera el Excel de costeo del mantenimiento.
- Pruebas: `pruebas/base-de-datos/test7.sql` (reglas nuevas en PostgreSQL), `tasesor.js` (enlace del asesor en la web), `tgestion.js` (herramienta), `tcrm.js` (historial), `twhatsapp.mjs` (función de envío contra una API de Meta simulada) y `pruebas/landings/` (formularios, datos en vivo y visibilidad).
