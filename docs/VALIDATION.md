# VALIDATION — 14/11/2026

- Entorno: Node v22.22.1, npm 9.2.0; repo inicial solo con `AGENTS.md`, `README_INICIO.md` y `docs/` sin seguimiento en Git.
- HTTP: catálogo Mars Trek, GetCapabilities de CTX Jezero/MOLA/THEMIS, tesela auténtica de cada una: 200; cabecera CORS `*`; comprobación de píxel central y tipo de imagen con Pillow. Ver `DATA_SOURCES.md`.
- `npm run test`: **6 pruebas OK** (distancia, radio, meridiano, coordenadas inválidas, suma de tramos, ROI).
- `npm run build`: **OK**, incluye `tsc --noEmit` y Vite; aviso de bundle de 566 kB sin comprimir (171 kB gzip).
- Chrome headless local: GetCapabilities CTX/MOLA/THEMIS **HTTP 200**; capas activadas y teselas WMTS reales HTTP 200; estado `visible` en las tres. Fondo CTX local también se mostró. Tres clics espaciados registraron A/P/B y distancia 2.78 km para puntos seleccionados por la prueba (no son ruta científica). Capturas en sesión local `/tmp/opencode/aresroute.png` y `/tmp/opencode/aresroute-three-layers.png` (no incluidas en repositorio).
- Alineación con hitos georreferenciados independientes, licencia de redistribución del respaldo local, publicación y pruebas en URL desplegada: **NO VERIFICADOS**.
- Al no disponer de DEM numérico en el ROI: perfil, pendiente, obstáculos, condiciones operativas y 3D **NO IMPLEMENTADOS**.

## Revisión de `feature/juan` — 14/11/2026

- `npm install -D jsdom@26`: completado; se eligió v26 porque la v31 indicó requisito Node `^22.22.2`, superior al Node `22.22.1` disponible. Instalación de dependencias: `0 vulnerabilities` informado por npm.
- `npm run typecheck`: OK.
- `npm run test`: **4 archivos / 16 pruebas OK**: distancia (6), parser WMTS + HTTP/XML/CRS/aborto y matriz decimal (4), gestor de fuentes + cache/reintento/error de teselas/desmontaje (4), interacción A/P/B + mover/restablecer + fallo de capa y ROI (2). Los tests usan dobles locales, sin depender de Mars Trek en cada corrida.
- `npm run build`: **OK** (`tsc --noEmit` + Vite). Advertencia conocida: bundle JS ~566.96 kB (~171.45 kB gzip), sin regresión de build; optimización posterior opcional.
- `python3 scripts/check_wmts_alignment.py`: **OK con endpoints vivos**; CRS igual, bbox incluye el sector, cuadrículas z0–z7 idénticas para CTX/MOLA/THEMIS. Inspección visual guardada en `docs/evidence/jezero-visual-comparison.jpg`; [método, referencias y limitaciones](ALIGNMENT.md). Precisión absoluta a partir de puntos de control: **pendiente**.
- Chrome headless local (Vite): al activar CTX/MOLA/THEMIS y volver a alternar MOLA, GetCapabilities se pidió **una sola vez por producto** (`ctx:1`, `mola:1`, `themis:1`); se solicitaron teselas de las tres fuentes. En otra corrida A/P/B se marcaron, P se movió y la UI mostró una longitud de **2.67 km** para posiciones elegidas en la prueba; ruta ficticia de interacción, no planificación validada. CTX quedó `visible`.
- Chrome headless con `vite preview` sobre `dist/`: la página compilada mostró CTX `visible` sin excepción. En una segunda carga se bloqueó `*trek.nasa.gov*` desde DevTools: UI intacta, CTX `error`, el canvas y el respaldo local CTX cargados, y los tres slots de ruta disponibles. **Son pruebas locales del artefacto, no de la URL Vercel pública**.
- USGS [publicación del CTX ortorrectificado](https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-context-camera-orthorectified-image-mosaic): **CC0 1.0** para el producto original, identificado en Astropedia con el ID de la capa. Se conserva respaldo CTX con créditos; posibles condiciones adicionales del servicio de teselas Mars Trek: **no identificadas**.
- `vercel.json` y [guía de despliegue](DEPLOYMENT.md): preparados. **No se ejecutó despliegue** (CLI Vercel no disponible en el entorno), no existe URL pública aportada para verificar, ni se modificó la rama o se hizo commit/push.
