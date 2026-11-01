# Base de datos de la herramienta comercial Vivaldi

Diseño y desarrollo: Pedrojose Andrade Paredes

## Qué resuelve

Hoy cada asesor guarda sus clientes, proformas, separaciones, cobranzas, visitas y el inventario de lotes solo en su celular o computadora. Si cambia de equipo, borra el navegador o deja la empresa, esa información se pierde o se va con él.

Con la base de datos:

- Todo queda guardado en un servidor de la empresa, no solo en el equipo del asesor.
- La herramienta sigue funcionando sin internet. Lo que se registra sin señal se sube solo cuando vuelve la conexión.
- Cada asesor entra con su correo y contraseña y solo ve sus propios clientes.
- La jefatura ve la información de todos los asesores.
- El inventario de lotes es uno solo para todo el equipo: si un asesor separa un lote, los demás lo ven.
- Nada se borra de verdad. Lo que un asesor elimina queda marcado como eliminado y se conserva en el historial.
- Cada cambio queda en un historial con usuario, fecha y contenido. Solo la jefatura puede consultarlo.
- Si un asesor deja la empresa, se le desactiva el acceso y sus datos quedan en la base.

## Cómo está protegida

- Las reglas de acceso están en la propia base de datos (seguridad por fila de PostgreSQL), no en la herramienta. Aunque alguien modifique el archivo HTML, el servidor no le entrega datos de otro asesor.
- Un usuario sin perfil activo no puede leer ni escribir nada, aunque tenga cuenta.
- La fecha de cada cambio y el dueño de cada registro los pone el servidor; no se pueden alterar desde el equipo.
- La contraseña no se guarda en el equipo. Solo queda la sesión, que vence y se renueva sola.
- El respaldo en archivo que ya tenía la herramienta no incluye la sesión ni datos de acceso.
- Si un equipo compartido cambia de usuario, la herramienta quita de ese equipo los datos del usuario anterior (siguen en la base) para que no se mezclen.

## Instalación (una sola vez, la hace la empresa)

La cuenta debe quedar a nombre de Vivaldi, con un correo de la empresa, no personal.

1. Crear una cuenta en https://supabase.com con el correo de la empresa.
2. Crear un proyecto nuevo:
   - Nombre: `vivaldi-ventas`
   - Región: **South America (São Paulo)**, la más cercana a Lima.
   - Contraseña de la base: generarla y guardarla en un lugar seguro de la empresa.
3. Ir a **SQL Editor → New query**, pegar todo el contenido de `esquema-supabase.sql` y presionar **Run**.
4. Ir a **Authentication → Sign In / Providers → Email** y **desactivar "Allow new users to sign up"**. Así nadie puede crearse una cuenta por su cuenta; solo la empresa crea usuarios.
5. Ir a **Project Settings → API** y copiar:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key**
   La clave `service_role` **no** se usa en la herramienta ni se comparte.

## Crear usuarios

Por cada asesor y cada persona de jefatura:

1. **Authentication → Users → Add user → Create new user**: correo y contraseña inicial. Marcar "Auto Confirm User".
2. En **SQL Editor**, registrar su perfil (cambiar correo, nombre y rol):

```sql
insert into public.perfiles (id, nombre, rol)
select id, 'Rosa Quispe', 'asesor' from auth.users where email = 'rosa@vivaldi.pe';

-- para jefatura:
insert into public.perfiles (id, nombre, rol)
select id, 'Nombre Gerente', 'jefatura' from auth.users where email = 'gerencia@vivaldi.pe';
```

Para dar de baja a un asesor (sus datos se conservan):

```sql
update public.perfiles set activo = false
where id = (select id from auth.users where email = 'rosa@vivaldi.pe');
```

## Conectar la herramienta

Hay dos formas:

- **Recomendada:** antes de repartir el archivo, abrir `planicie-herramienta-whatsapp.html` (y la versión final) con un editor de texto, buscar la línea
  `const SERVIDOR = {url: "", key: ""};`
  y escribir la URL y la clave pública entre las comillas. Así el asesor solo pone su correo y contraseña.
- **Por equipo:** en la herramienta, botón **"Sin conectar"** (esquina inferior izquierda) → **Servidor (solo administrador)** → pegar URL y clave → **Guardar servidor**.

Después, cada asesor presiona el botón, escribe su correo y contraseña y entra. Lo que ya tenía guardado en su equipo se sube a la base la primera vez.

El botón muestra el estado:

- **Sincronizado** (verde): todo está en la base.
- **Sincronizando…** (amarillo): subiendo o bajando cambios.
- **Sin señal: guardado en el equipo** (gris): se subirá al volver la conexión.
- **Error al sincronizar** (rojo): al abrir el botón se ve el motivo.

La herramienta sincroniza sola al guardar algo, cada minuto mientras está abierta, al volver la señal y al volver a la pestaña.

## Automatización: clientes de la web y Libro de Reclamaciones

Con la base de datos activa, la web y la herramienta trabajan solas en estos puntos:

1. **Cada solicitud de cotización de la web queda guardada**, aunque el cliente no llegue a enviar el WhatsApp. Se guarda nombre, celular, proyecto, plazo de compra, forma de pago, visita solicitada, si autorizó promociones y de qué anuncio o campaña vino.
2. **Se asigna sola a un asesor, por turno**, entre los asesores activos. Si el mismo celular escribe dos veces en 24 horas, no se duplica.
3. **Aparece en "Mis clientes" del asesor** la próxima vez que abre la herramienta (o en menos de un minuto si ya la tiene abierta), con aviso en pantalla y la nota de lo que pidió.
4. **La jefatura recibe una alerta** si un cliente de la web lleva más de una hora sin que su asesor lo haya recibido.
5. **Cada hoja del Libro de Reclamaciones queda registrada** con el mismo número que vio el cliente y con su fecha límite de respuesta (15 días hábiles). La jefatura ve en la herramienta cuántos reclamos están sin responder y cuál vence primero. El cálculo no descuenta feriados; revisarlo cuando haya feriados de por medio y confirmar el plazo vigente con el asesor legal.

### Cómo activarlo

- Ejecutar otra vez `esquema-supabase.sql` completo (se puede ejecutar varias veces sin perder datos).
- En los dos archivos de la web (`Vivaldi-web-whatsapp.html` y `Vivaldi-web-final.html`), buscar
  `const BASE = {url: "", key: ""};`
  y escribir la misma URL y clave pública de la herramienta. Mientras esté vacío, la web funciona igual que antes.
- Para que un asesor deje de recibir clientes nuevos (vacaciones, por ejemplo):

```sql
update public.perfiles set recibe_clientes = false
where id = (select id from auth.users where email = 'rosa@vivaldi.pe');
```

- Para responder un reclamo: en Supabase, **Table Editor → reclamos**, escribir la respuesta y cambiar `estado` a `respondido`. La fecha de respuesta se guarda sola.

### Protección

- Desde la web solo se puede **registrar**; nadie puede leer las solicitudes ni los reclamos con la clave pública.
- Cada asesor ve solo las solicitudes que le tocaron; la jefatura ve todas y es la única que ve los reclamos.
- Hay un tope de envíos por hora para frenar ataques de envío masivo.

## Consultar y descargar la información

- En Supabase, **Table Editor → registros** muestra todos los registros; se puede filtrar por `coleccion` (clientes, proformas, separaciones, cobranza, visitas, lotes) y exportar a CSV.
- **Table Editor → historial** muestra quién cambió qué y cuándo.
- El botón de respaldo de la herramienta sigue funcionando igual.

## Puntos a tener en cuenta

- **Plan de Supabase.** El plan gratuito sirve para empezar y probar, pero pausa el proyecto tras una semana sin uso y no incluye copias de seguridad que se puedan descargar. Para el uso diario con clientes reales conviene el plan de pago, que incluye copias diarias. Revisar el precio vigente en https://supabase.com/pricing.
- **Protección de datos personales (Ley 29733 y su reglamento).** La base guarda nombres, DNI y teléfonos de clientes, por lo que Vivaldi, como titular, debe inscribir el banco de datos personales ante la Autoridad Nacional de Protección de Datos Personales. Como el servidor está fuera del Perú (São Paulo), hay que declarar el flujo transfronterizo de datos. Conviene que el formulario de contacto de la web y la proforma informen al cliente cómo se usan sus datos. **Revisar estos pasos con el asesor legal de la empresa.**
- **Conflictos.** Si dos personas modifican el mismo cliente a la vez, queda el último cambio que llega al servidor. La versión anterior queda en el historial.
- **Contraseñas.** Pedir a cada asesor que cambie la contraseña inicial y no la comparta. Si se pierde un celular, desactivar al usuario y crearle una contraseña nueva.

## Cómo se probó

- Las reglas de seguridad se probaron en PostgreSQL 16 con las mismas funciones de usuario que usa Supabase: un asesor no puede ver, modificar ni hacerse pasar por otro; un usuario dado de baja no ve nada; sin sesión no se ve nada; la jefatura ve todo y su edición conserva al dueño del registro; el historial registra cada cambio.
- La sincronización se probó con varios navegadores a la vez (asesora, asesor, jefatura y usuario dado de baja) contra un servidor de prueba con la misma interfaz que Supabase: alta, edición, borrado, inventario compartido, trabajo sin señal, sesión vencida, recarga y cambio de usuario en un mismo equipo.
- La automatización se probó de punta a punta: formularios llenados en la web desde un celular, reparto entre asesores, llegada a la herramienta de cada asesor, alerta a la jefatura y registro del reclamo con su plazo.
- **Falta probarlo con el proyecto real de Supabase de Vivaldi**, que debe crear la empresa. Una vez creado, la primera prueba es entrar con un asesor y la jefatura y revisar que cada uno vea lo que le corresponde.
