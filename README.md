# Golfito La Huerta

Simulador de golf en 3D del Golfito La Huerta (Golf & Hotel La Huerta, Puebla, 2158 m). Funciona en el navegador
del celular y la computadora, se instala como app (PWA) y se puede jugar sin señal.

- `index.html`: el juego completo (Three.js r128 incluido en `three.min.js`).
- `sw.js`: guarda el juego para jugar sin conexión. Al publicar cambios, sube `VERSION`.
- `manifest.webmanifest` e íconos: instalación en la pantalla de inicio.

Despliegue: Netlify importando este repositorio, sin comando de build y publicando la raíz.

## Jugar con amigos (en línea)

La carpeta `netlify/functions/api.mjs` es una función de Netlify que guarda las partidas
y el ranking compartido en Netlify Blobs (incluido en Netlify, no hay que configurar nada).
Uno crea la partida desde la pantalla de inicio y los demás entran con el código de 4 letras;
todos juegan con las mismas salidas y el mismo viento y ven la tarjeta de los demás en vivo.
Fuera de Netlify (por ejemplo, abriendo el archivo directo) el juego funciona igual, sin la parte en línea.
