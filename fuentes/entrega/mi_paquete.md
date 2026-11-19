# Mi paquete completo · Sistema comercial Vivaldi

Este es tu paquete personal: tiene todo el proyecto. **No lo envíes a Vivaldi.** Para los gerentes está `Vivaldi-Demo-Gerencia.zip`.

## Qué enviar a quién

| Paquete | Para quién | Qué tiene |
|---|---|---|
| `Vivaldi-Demo-Gerencia.zip` | Gerentes de Vivaldi (WeTransfer) | Demostración: se abre con `ABRIR-AQUI.html`. Web, Mi Vivaldi, páginas por proyecto, explorador 3D, herramienta de ventas con datos de ejemplo, simulador, cotización, guía para la gerencia y manual. |
| `Vivaldi-Sistema-Comercial.zip` | Vivaldi, cuando contrate | Paquete de entrega completo (incluye base de datos, contrato, costeo y demás documentos). Se arma con `python3 fuentes/entrega/build_paquete.py <carpeta>`. |
| Este paquete | Solo tú | Todo lo anterior, más fuentes, pruebas, presentaciones y documentos internos. |

**Privado:** `entregables/propuesta/investigacion-mercado-y-diagnostico.md` y las presentaciones son de uso interno. Los armadores de paquetes los bloquean automáticamente.

## Estructura
- `entregables/`: todo lo que se entrega, listo para abrir.
- `fuentes/`: de dónde sale cada entregable (generadores, módulos de la herramienta y pruebas). Ver `fuentes/LEEME.md`.
- `fuentes/pruebas/`: pruebas automáticas (`bash fuentes/pruebas/todas.sh`, requiere PostgreSQL 16 y el servidor de prueba `node fuentes/pruebas/base-de-datos/mock.js`).

## Regenerar todo
1. `python3 fuentes/regenerar.py`: páginas por proyecto, portal, correcciones de la web, parches y módulos de la herramienta.
2. Explorador 3D en 4K (lento, unos 12 minutos por proyecto): `node fuentes/experiencia/capturas_explorador.js fuentes/experiencia/capturas/<proyecto> <proyecto>` y `python3 fuentes/experiencia/explorador.py <proyecto>`.
3. Paquetes: `node fuentes/entrega/capturas_demo.js fuentes/entrega/capturas` y `python3 fuentes/entrega/build_demo.py <carpeta>`.

## Demostración: accesos
- Herramienta: se abre con datos de ejemplo (`?demo=1`). El botón «Quitar» del aviso borra los datos de ejemplo.
- Mi Vivaldi, comprador: cualquier correo y el código `123456`.
- Mi Vivaldi, asesor: cualquier correo y una contraseña de 4 caracteres o más.

## Por confirmar con Vivaldi antes de publicar
- Precios, cuotas y disponibilidad oficiales de cada proyecto (los actuales son referenciales).
- Kilómetro de La Esmeralda y Diamante; precio y área de Diamante; fechas de etapas.
- Número de WhatsApp comercial para Meta y datos de la base de datos (Supabase).
- Fotos originales de cámara o dron: van en `fuentes/fotos-originales/` para tener fotos en 4K reales.
