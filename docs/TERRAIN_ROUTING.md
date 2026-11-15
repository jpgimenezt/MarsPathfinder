# Rutas asistidas por DEM CTX — prototipo exploratorio

**No apto para uso operacional.** Las rutas no acreditan seguridad ni detectan rocas, escalones, regolith, clima o radiación. No se extraen alturas de CTX óptico, Viking, MOLA sombreado ni THEMIS.

## Fuente y validación de entrada

- [USGS Astrogeology, *Mars 2020 Science Investigation CTX DEM Mosaic*](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic), Fred Calef / PDS, publicado 2021-10-14. [GeoTIFF original](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif) y [etiqueta PDS4](https://astrogeology.usgs.gov/ckan/dataset/f8ef46b8-d512-4c46-b825-fe9633c38e1c/resource/5691ea08-1db4-4018-a341-e415e716add7/download/m20_jezerocrater_ctxdem_20m.xml). Uso: dominio público, citar autores. **No se distribuye el TIFF original**.
- Descarga 90 345 300 bytes; SHA-256 `ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2`. GeoTIFF float32 4456×5067; 20×20 m/píxel; origen proyectado `(4329000, 1143420)` m; `NoData = −3.4028234663852886e+38`. La etiqueta PDS4 confirma latitud **planetocéntrica**, longitud **este**, dominio −180…180°, equirectangular con paralelo estándar **18,4663°**, meridiano central 0° y radio **3 396 190 m**. Es radio de *proyección del raster*, diferente del radio medio **3 389 500 m** usado para distancias marcianas aproximadas.
- Proyección de cada centro de píxel: `x = R cos(18,4663°) lonRad`, `y = R latRad`; columna `(x−4329000)/20−0,5`, fila `(1143420−y)/20−0,5`. Se usan límites positivos este sin pasar por WGS84 terrestre. Se verificó el origen, tamaño y NoData contra tags GeoTIFF y la etiqueta PDS4. **Datum vertical:** la ficha indica metros y que los DEM añadidos fueron ajustados verticalmente a MOLA; **no aporta un datum único exacto, errores por componente ni validación independiente de continuidad**. Se omiten cotas absolutas en la UI. Las diferencias de altura y pendientes se presentan solo como *proxies* exploratorios; los cambios en costuras del mosaico podrían sesgarlos.
- ROI del derivado: centros `[77.200558,18.001273,78.118338,18.819160]`, 646×607 celdas a **80 m** (conserva 392 122 bloques con muestras finitas en el recorte). No cubre toda la región manual editable: puntos fuera producen `outside-dem` y no se extrapolan. La imagen CTX WMTS auditada es **otro producto** y su alineación física con este DEM no ha sido contrastada mediante puntos de control; no se confunden ambas huellas.

## Reproducción offline y formato

```bash
curl -fL -o /tmp/opencode/M20_JezeroCrater_CTXDEM_20m.tif \
  'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif'
python3 -m pip install Pillow
python3 scripts/build_jezero_dem.py /tmp/opencode/M20_JezeroCrater_CTXDEM_20m.tif
```

El script **rechaza hashes, dimensiones, origen, resolución y NoData inesperados**. De cada bloque 4×4 original de 20 m obtiene promedio de 16 elevaciones, o **NaN** si alguna muestra es inválida. Calcula el máximo de `atan(|Δz|/20m)` entre píxeles vecinos del bloque y hacia bordes derecho/inferior de bloques vecinos; este máximo es un proxy conservador, no una pendiente geométrica exacta de todos los puntos del área. Guarda `public/data/jezero-dem-80m.bin` (3 136 976 bytes; intercalado float32 little-endian `elevación, pendiente`) y metadatos en `.json`. El worker descarga y verifica ambos assets; si faltan o no coinciden con su cabecera, no ofrece análisis. No se almacena ciencia sintética en producción.

## Criterios y límites de cálculo

- `terrainPathfinder.ts`: A* sobre ocho vecinos; bloquea celdas NoData y pendientes locales sobre el máximo configurado y verifica el gradiente de cada arista `atan(|Δz|/distancia horizontal)`. Una diagonal requiere que ambas celdas ortogonales también sean pasables. Un fracaso en A→P o P→B **anula la distancia asistida total**; los tramos sin solución conservan la **línea manual recta negra discontinua con contorno**, no se presentan como ruta asistida.
- `terrainAlternatives.ts`: **más corta** (umbral ilustrativo 25°, penalización 0), **equilibrada** (20°, pendientes 6, ascenso 4), **menor exposición estimada** (15°, pendientes 18, ascenso 8). Estas categorías son *supuestos de comparación modificables en código*, **no límites NASA** ni estimaciones calibradas del peligro real. Cuando los caminos coinciden, se indica y no se inventa una alternativa diferente. Costes relativos carecen de interpretación energética. La trayectoria visualizada corresponde a centros de celdas, con extremos de usuario; desplazamiento subcelda y resolución 80 m limitan su precisión.
- Distancias por segmentos con Haversine marciano (radio medio 3 389 500 m), sumando longitud 3D aproximada de centros a partir de diferencias de altura DEM; tiempo = distancia / velocidad hipotética configurable, sin pausas ni ritmo EVA validado. La clasificación visual por pendiente local (<5° verde, 5–10° amarillo, ≥10° rojo inicialmente) es configurable en el panel. **Verde ≠ seguro**. La cobertura 100 % significa exclusivamente muestras numéricas de celdas atravesadas por una ruta computada; no evalúa riesgos submétricos ni precisión del DEM.
- Los cálculos de seis tramos/alternativas se ejecutan fuera del hilo principal en `terrainWorker.ts`. Cuando cambian los puntos, resultados antiguos se ignoran; el plan manual, su deshacer, el globo y las capas ópticas permanecen independientes. La máscara NoData y el umbral son filtros para prototipo, no un mapa certificado de terreno transitable.

**Pendiente de validación:** errores horizontales/verticales en puntos de control físicos, costuras y estimación de incertidumbre DEM, cobertura DEM fuera del recorte, pruebas en teléfono físico y decisiones EVA. Hasta entonces, ningún trazado ni umbral permite concluir que un trayecto sea seguro.
