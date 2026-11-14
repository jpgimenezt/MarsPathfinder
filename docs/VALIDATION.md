# VALIDATION — 14/11/2026

- Entorno: Node v22.22.1, npm 9.2.0; repo inicial solo con `AGENTS.md`, `README_INICIO.md` y `docs/` sin seguimiento en Git.
- HTTP: catálogo Mars Trek, GetCapabilities de CTX Jezero/MOLA/THEMIS, tesela auténtica de cada una: 200; cabecera CORS `*`; comprobación de píxel central y tipo de imagen con Pillow. Ver `DATA_SOURCES.md`.
- `npm run test`: **6 pruebas OK** (distancia, radio, meridiano, coordenadas inválidas, suma de tramos, ROI).
- `npm run build`: **OK**, incluye `tsc --noEmit` y Vite; aviso de bundle de 566 kB sin comprimir (171 kB gzip).
- Chrome headless local: GetCapabilities CTX/MOLA/THEMIS **HTTP 200**; capas activadas y teselas WMTS reales HTTP 200; estado `visible` en las tres. Fondo CTX local también se mostró. Tres clics espaciados registraron A/P/B y distancia 2.78 km para puntos seleccionados por la prueba (no son ruta científica). Capturas en sesión local `/tmp/opencode/aresroute.png` y `/tmp/opencode/aresroute-three-layers.png` (no incluidas en repositorio).
- Alineación con hitos georreferenciados independientes, licencia de redistribución del respaldo local, publicación y pruebas en URL desplegada: **NO VERIFICADOS**.
- Al no disponer de DEM numérico en el ROI: perfil, pendiente, obstáculos, condiciones operativas y 3D **NO IMPLEMENTADOS**.
