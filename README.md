# Golfito La Huerta

Simulador de golf en 3D del Golfito La Huerta (Golf & Hotel La Huerta, Puebla, 2158 m). Funciona en el navegador
del celular y la computadora, se instala como app (PWA) y se puede jugar sin señal.

- `index.html`: el juego completo (Three.js r128 incluido en `three.min.js`).
- `sw.js`: guarda el juego para jugar sin conexión. Al publicar cambios, sube `VERSION`.
- `manifest.webmanifest` e íconos: instalación en la pantalla de inicio.

Despliegue: Netlify importando este repositorio, sin comando de build y publicando la raíz.
