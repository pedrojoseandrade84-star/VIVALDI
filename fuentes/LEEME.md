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
