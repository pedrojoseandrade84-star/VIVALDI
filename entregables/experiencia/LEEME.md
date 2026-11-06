# Recorrido guiado por scroll · La Portada del Sol

Diseño y desarrollo: Pedrojose Andrade Paredes

`recorrido-portada.html` cuenta el proyecto mientras el cliente baja por la página, como un video que él controla:

1. **Ubicación:** el mapa oficial se acerca al km 115.2 de la Panamericana Sur y pasa al lote de 6 × 15 m dentro del condominio.
2. **Ingreso:** el pórtico del proyecto.
3. **El club:** piscina, gimnasio, cancha de fútbol, losa multiusos, juegos y parrillas, cada uno con su nombre.
4. **Tu casa:** una casa de playa de dos pisos sobre el lote (exterior, atardecer, corte y planos de cada piso), tomada del simulador 3D de Vivaldi.
5. **Números y acción:** precio, cuota sin intereses, ver lotes disponibles en Mi Vivaldi, agendar visita o escribir por WhatsApp.

Funciona sin internet, en computadora y celular, sin librerías externas. Respeta el ajuste "reducir movimiento" del sistema (sin acercamientos). Lleva el módulo del asesor: con `?asesor=código&n=Nombre&t=celular` los WhatsApp van al asesor.

## Publicarlo
Subirlo como `/proyectos/recorrido-portada.html`, junto a las páginas por proyecto. La página de La Portada del Sol ya lo enlaza ("Recorrido" en el menú y "Recórrela de la Panamericana a tu lote"). Si se conecta a la base de datos (`const BASE = {url: "", key: ""};`), precio, cuota y estado se toman de lo que publica la jefatura.

## Transparencia
Las imágenes del ingreso y del club son renders del proyecto y están marcadas. La casa es una propuesta referencial del simulador para un lote de 6 × 15 m (107 m² techados): el texto final lo aclara.

## Regenerarlo
`node fuentes/experiencia/capturas_sim.js fuentes/experiencia/capturas portada` toma las vistas del simulador y `python3 fuentes/experiencia/build.py` genera la página.
