# AresRoute · Jezero

Prototipo educativo de planificación **exploratoria** sobre mapas orbitales reales de Marte. Proyecto independiente sin aval de NASA; **no apto para navegación ni seguridad operacional**.

## Ejecutar

Requiere Node.js 22 y npm. `npm ci`, `npm run dev`; para verificar: `npm run test`, `npm run typecheck`, `npm run build`. La salida `dist/` se publica como sitio estático. Demo pública: **aún no desplegada**.

## Recorrido

La entrada muestra un **globo 3D de navegación**, no una superficie topográfica 3D. Giralo arrastrando con clic izquierdo o un dedo; acercá/alejá con rueda, gesto de pellizco o botones. Un toque corto sobre la esfera centra la región y acerca suavemente; arrastrar no selecciona. El marcador interactivo **Jezero Crater** identifica el [centro oficial del cráter](https://planetarynames.wr.usgs.gov/Feature/14300), **18.41°N, 77.69°E**, no el ROI del planificador (**77.35–77.51°E**). Abrí el mapa científico existente con el marcador o **Explorar Jezero**; **Volver al globo 3D** no borra el plan. Hay controles de teclado mediante botones, movimiento reducido y un mapa 2D de respaldo si falla WebGL.

El selector del globo alterna **Relieve MOLA** y **Color de superficie** (mosaico Viking MDIM 2.1 *colorizado*). Conserva cámara y marcador; si Viking no carga, MOLA sigue visible y el botón permite reintentar. En modo MOLA, desplegá **Referencias de elevación** para consultar los colores y la escala aproximada USGS respecto del areoide marciano: el azul no representa agua y el sombreado JPEG **no permite deducir cotas precisas por color**. La leyenda se oculta en modo Viking.

En el mapa 2D de Jezero, usá `+`, `−` y el botón de reencuadre para navegar dentro de la huella publicada del mosaico CTX. La colocación se limita al ROI indicado: elegí **Colocar A**, tocá el mapa y repetí con P (parada de investigación propuesta) y B (destino). **Explorar mapa** no agrega puntos. Podés seleccionar **Mover**, deshacer la última modificación o restablecer el plan. Se muestran los tramos A→P y P→B; su longitud suma segmentos rectos de gran círculo sobre esfera marciana de radio medio **3 389 500 m**, sin relieve ni obstáculos, y no representa un sendero transitable.

Activá CTX, MOLA y THEMIS en **Capas** para comparar imágenes y consultar sus fichas. **Marte global** abre una vista 2D separada con *solo MOLA*, limitada por su escala de origen: es contexto regional, no un planificador global ni un DEM numérico. Al volver a Jezero se conserva el plan y se habilita su edición. La ciencia de Jezero está documentada por [Perseverance / NASA](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/); la ubicación de la parada elegida por el usuario no está verificada como afloramiento.

## Fuentes y límites

- El globo usa una [muestra JPEG global de relieve MOLA de USGS](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m) guardada localmente (`public/data/mars-mola-global-1024.jpg`, 1024×512); MGS/MOLA, NASA/USGS, datos 1999–2001, mapa derivado de sombreado y color, producto original ≈463 m/píxel reducido aquí a ≈21 km/píxel ecuatorial. Proyección cilíndrica simple, latitud planetocéntrica, longitud este −180°…180°. Registro USGS: dominio público, sin restricciones de uso. La esfera **no** deforma su geometría según la altura ni soporta conclusiones de seguridad.
- La [muestra oficial Viking MDIM 2.1 NASA Ames/USGS](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m) se convierte a `public/data/mars-viking-global-1024.webp` (96,6 kB) con `python3 scripts/build_viking_texture.py` (Pillow offline); **no** se incorpora el TIFF de 12 GB. Es un mosaico *colorizado artificialmente*, no color natural exacto. Comparte la convención de longitud este y latitud planetocéntrica; las imágenes globales de 1024×512 no sirven para el análisis local.
- MRO CTX controlado Jezero, MGS MOLA sombreado visual y Mars Odyssey THEMIS IR diurno desde [NASA Mars Trek WMTS](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars); se parsea GetCapabilities, sin asumir esquema XYZ. Cada fuente se obtiene una sola vez por sesión del mapa y las capas se pueden alternar. La huella nominal CTX limita la navegación local, **no demuestra cobertura píxel a píxel**; una sola tesela CTX original incluida localmente funciona como respaldo estático **solo** dentro de su huella. El [producto original USGS](https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-context-camera-orthorectified-image-mosaic) se publicó bajo CC0 1.0; ver matices en `docs/DATA_SOURCES.md`.
- CRS de representación `urn:ogc:def:crs:EPSG::104905`, coordenadas angulares orientales; el cálculo de km usa Marte y no WGS84 terrestre. La latitud exacta del producto y la alineación visual de fuentes aún requieren validación.
- No hay DEM numérico validado: MOLA sombreado no da cotas. No se calculan pendientes ni se declara una ruta segura. Sin datos locales de rocas, clima o radiación; THEMIS no proporciona temperatura en tiempo real.

Consultar [fuentes y pruebas](docs/DATA_SOURCES.md), [alineación y límites](docs/ALIGNMENT.md), [decisiones](docs/DECISIONS.md), [validación](docs/VALIDATION.md) y [despliegue Vercel](docs/DEPLOYMENT.md). Demo pública: **aún no desplegada**.
