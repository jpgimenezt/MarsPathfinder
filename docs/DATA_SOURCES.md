# DATA_SOURCES.md — registro inicial para validar en el proyecto

**Estado al 14/11/2026:** catálogo oficial consultado; GetCapabilities XML y teselas reales comprobados por HTTP y en navegador. La [comparación de cuadrícula y encuadre](ALIGNMENT.md) confirma superposición geométrica publicada, **no** exactitud física de píxeles. Sin despliegue remoto verificado. `Partial` significa que aún falta contraste con puntos de control físicos.

| Fuente / misión | Tipo | Uso | URL de referencia | Estado inicial | Riesgo |
|---|---|---|---|---|---|
| Mars Trek MRO CTX | Óptico, imagen orbital | Fondo real del área | https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml | UNVERIFIED | CORS, tile grid, cobertura y escala |
| Mars Trek MGS MOLA | Topografía visual | Relieve regional | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars | UNVERIFIED | Hillshade NO equivale a altitud numérica |
| Mars Trek Mars Odyssey THEMIS | Infrarrojo térmico | Capa de contexto térmico | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars | UNVERIFIED | Elegir producto correcto: no confundir mosaico IR con temperatura en vivo |
| NASA Perseverance | Imágenes superficiales | Contexto de ciencia | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | UNVERIFIED | Geolocalización de foto no garantizada |
| USGS geología marciana | Geología | Contexto de unidades | https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars | UNVERIFIED | Escala global puede ser insuficiente en EVA |
| HiRISE DTM PDS | DEM/DTM numérico (si existe cobertura) | Altura local y posible 3D | https://hirise-pds.lpl.arizona.edu/PDS/ | UNVERIFIED | Descarga grande, reproyección, solapamiento limitado |
| MRO CRISM | Mineralogía/espectros | Elegir ciencia | https://ode.rsl.wustl.edu/mars/ | UNVERIFIED | Conversión espectral/interpretación complejas |

## Comprobaciones reales y recorte

Fuente del catálogo: [Mars Trek WMTS](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars); se consultó `config/config.json` y `TrekServices/ws/index/eq/searchItems`. Endpoint final de cada producto: `getLayerServices?uuid=…`. Fecha de prueba: 14/11/2026. Los tres GetCapabilities publican `urn:ogc:def:crs:EPSG::104905`, `default028mm`, origen `-180 90`, matrices de 256×256 píxeles, estilo `default`, CORS `Access-Control-Allow-Origin: *` en teselas. Longitud oriental expresada en −180…180°; latitud numérica 18°N. La definición exacta de latitud (planetocéntrica frente a planetográfica) **no fue confirmada con documentación del producto**: no usar para geodesia precisa.

| Producto / misión | Servicio y formato | Extensión publicada | Tesela HTTP de Jezero y resultado | Estado |
|---|---|---|---|---|
| [MRO CTX controlado Jezero](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml) · NASA/JPL-Caltech/USGS; ≈6 m/píxel de origen | WMTS PNG, z0–13 | 77.1604655–77.6991776°E; 18.2110274–18.7211945°N | z12/1628/5857 PNG 41990 bytes, píxel central opaco y múltiples grises; z10/407/1464 PNG local | Partial: HTTP y ubicación numérica sí, alineación visual no |
| [MGS MOLA color hillshade](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml) · NASA/JPL-Caltech; ≈463 m/píxel | WMTS JPEG, z0–7 | Global | z7/50/183 JPEG 63039 bytes, píxel central RGB (62,197,92) | Partial: imagen **no** es DEM numérico |
| [Mars Odyssey THEMIS IR diurno](https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml) · NASA/JPL-Caltech/ASU; ≈100 m/píxel | WMTS PNG, z0–9 | ~65°S–65°N | z9/203/732 PNG 38738 bytes, píxel central opaco | Partial: mosaico histórico, **no** temperatura |

El CTX global beta01 también devuelve GetCapabilities, pero su descripción especifica *uncontrolled* y concede uso libre con crédito `NASA/JPL/MSSS/The Caltech Murray Lab/Esri`; se prefiere el producto Jezero controlado. **Derecho del respaldo local verificado para el producto original:** la [publicación USGS del mismo ortomosaico CTX Jezero (DOI 10.5066/P9GV1ND3)](https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-context-camera-orthorectified-image-mosaic) indica expresamente **CC0 1.0 Universal**; su [registro Astropedia](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_context_camera_orthorectified_image_mosaic) identifica el archivo `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` usado por el WMTS. Se preserva el crédito NASA/JPL-Caltech/USGS/Mars Trek en la UI y no se usa marca o logotipo. La tesela es una imagen derivada servida por Mars Trek de ese producto; condiciones adicionales del **servicio de teselas** no fueron localizadas; si aparecieran, retirar el respaldo del paquete. Las condiciones detalladas de MOLA/THEMIS **no se comprobaron**: se consumen en vivo y se atribuyen, no se redistribuyen como archivos.

El respaldo local es **una tesela CTX auténtica** bajo `public/data/ctx-jezero-tile-z10.png`, extensión precisa `[77.34375,18.28125,77.51953125,18.45703125]`; no se inventó cobertura fuera de ella.

**Incidencia de interoperabilidad detectada en Chrome:** Mars Trek serializa `MatrixWidth`/`MatrixHeight` como `4096.0`, etc., aunque el parser de OpenLayers exige enteros XML. Antes de pasar GetCapabilities a OpenLayers, la app convierte **solo** valores `entero.0...` en enteros sin cambiar el valor. Sin este ajuste, el fondo local aparece pero los WMTS nunca solicitan teselas. Tras el ajuste, Chrome pidió 4 teselas CTX de z11 y una tesela visible de MOLA z7 y THEMIS z9, todas HTTP 200 y UI `visible`. La **alineación de hitos entre capas todavía no se contrastó con puntos de control**.

El ROI demostrativo `[77.35,18.30,77.51,18.45]` queda dentro de los bbox declarados y del respaldo; no es un área de EVA evaluada ni una verificación píxel a píxel de las tres capas. No hay puntos científicos georreferenciados aprobados: la parada que coloca el usuario es una **propuesta de investigación en Jezero** y la explicación científica describe la región, no un afloramiento identificado en la posición elegida. [NASA describe el delta y los objetivos de la misión](https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/).

No hay DEM numérico validado, `nodata` ni datum vertical documentados para este ROI. Perfil, pendientes, rutas automáticas y 3D quedan bloqueados. El catálogo consigna fechas de registro de producto (CTX 2020-08-03) y versión de mosaico THEMIS (octubre 2018), **no** fechas de cada observación local.

## Contrato de metadatos para cualquier capa

Guardar: `id, title, provider, mission, instrument, productId, sourceUrl, acquisitionDate, dataKind, provenanceType, latitudeConvention, longitudeConvention, crs, extent, resolution, nodata, verticalDatum, attribution, licensingNotes, limitations, accessStatus, verifiedAt`.

No completar campos desconocidos con datos inventados. Mantener `null` o `unknown` y explicar consecuencias en UI.

## Primeras verificaciones

- [x] Descargar y parsear WMTS GetCapabilities de CTX, MOLA y THEMIS mediante XML; la app usa parser OpenLayers en ejecución.
- [x] Ver CTX en Chrome con ROI dentro de bbox; cuadrículas CTX/MOLA/THEMIS coinciden en z0–z7 y comparación visual de rasgos CTX/THEMIS (véase `ALIGNMENT.md`). Exactitud de hitos pendiente de control independiente.
- [x] Repetir con MOLA y THEMIS; confirmar mismo CRS y bbox declarados con punto dentro de Jezero.
- [x] Confirmar interés científico **regional** de Jezero en NASA; posición exacta de parada aún NO verificada.
- [ ] Revisar la existencia de DEM numérico del mismo ROI para perfil/3D.
- [ ] Probar endpoint bajo entorno de deployment; Chrome local y respaldo estático ya probados.
