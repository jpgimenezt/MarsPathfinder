# DECISIONS.md — decisiones de arquitectura inicial

## ADR-001 — 2D antes que 3D
**Decisión:** OpenLayers 2D es el producto base; Three.js 3D regional condicionado al DEM real y al MVP terminado.
**Justificación:** El problema es de integración y planificación científica; el 3D global ofrece visualización costosa y poco rigor sobre riesgos EVA. Riesgo de retrasar demo.
**Revisar cuando:** esté funcional el mapa, ruta, fuentes, riesgos y despliegue, y exista DEM validado.

## ADR-002 — Despliegue estático sin backend
**Decisión:** React+Vite+TypeScript, fuentes WMTS y datos pequeños preprocesados.
**Justificación:** menor complejidad, mantenimiento y despliegue durante hackatón. Solo incorporar backend si hay una dependencia real verificada.

## ADR-003 — Jezero como región candidata
**Decisión:** concentración en zona con legado de rover Perseverance, imágenes orbitales y objetivos científicos (antiguo delta), sujeto a disponibilidad y alineación de capas.
**Revisar cuando:** una fuente esencial no cubre el ROI.

## ADR-004 — Prohibido un score de seguridad ficticio
**Decisión:** análisis solo de métricas sustentadas; mostrar cobertura, incertidumbre y peligros no evaluados.
**Justificación:** extrapolaciones y métricas falsas afectan validez y credibilidad del prototipo.

## ADR-005 — CTX controlado de Jezero y respaldo estático acotado
**Decisión:** usar el mosaico CTX controlado de Mars Trek como fondo y una tesela original z10 local debajo de todas las capas. Cargar WMTS parseando GetCapabilities en el navegador; MOLA y THEMIS como overlays opcionales.
**Evidencia:** GetCapabilities de tres productos y sus teselas centrales HTTP 200, CORS `*`, mismo TileMatrixSet y bbox que incluye el ROI (véase `DATA_SOURCES.md`).
**Alternativa descartada:** CTX beta01 global *uncontrolled* como única base; menos idóneo para alineación de Jezero. Respaldo no extrapolable fuera de la tesela.
**Hallazgo posterior:** Chrome confirmó teselas visibles de las tres capas tras normalizar en GetCapabilities `MatrixWidth`/`MatrixHeight` terminados en `.0`; ver `DATA_SOURCES.md`. La precisión absoluta frente a hitos independientes sigue pendiente.
**Revisión 14/11/2026:** el producto USGS CTX ortorrectificado se publicó como CC0 1.0 (DOI 10.5066/P9GV1ND3); se conserva la tesela local con atribución. El script `scripts/check_wmts_alignment.py` y `docs/ALIGNMENT.md` confirman **cuadrícula compartida**, no exactitud de píxeles. Las condiciones propias del servidor Mars Trek no se confirmaron; si las hubiera, el respaldo debe retirarse.

## ADR-006 — Coordenadas y medidas separadas
**Decisión:** proyección angular específica `urn:ogc:def:crs:EPSG::104905` para dibujar los WMTS; distancias en cálculo propio de Haversine sobre esfera de Marte de radio medio 3 389 500 m. Coordenadas UI longitud oriental −180…180°, latitud −90…90°.
**Motivo:** los denominadores WMTS con unidades `degrees` son una convención de cuadrícula; no equivalen a medir distancias terrestres. El radio medio y la esfera ignoran el elipsoide/relieve y la precisión espacial de fuentes.

## ADR-007 — Paradas propuestas, sin geología puntual ficticia
**Decisión:** A, P y B son clicks de usuario en el ROI; P solo representa la hipótesis «investigar el contexto regional del antiguo delta». No se ancla un afloramiento ni se infiere transitabilidad.
**Alternativa:** añadir una parada geológica fija únicamente después de conseguir coordenadas y evidencia verificadas.

## ADR-008 — Cache de fuentes por capa y pruebas sin servicios reales
**Decisión:** mantener una instancia WMTS por capa durante la vida del mapa; solo el primer encendido consulta GetCapabilities. Apagar no destruye fuente; al volver a encender, conserva su estado y ruta. Una petición GetCapabilities fallida se puede reintentar tras alternar la capa. Al desmontar se abortan solicitudes pendientes.
**Evidencia:** pruebas unitarias con fuente simulada y pruebas HTTP reales separadas, sin depender de Mars Trek durante `npm run test`.

## ADR-009 — Huella visible y selección de puntos separadas
**Decisión:** el límite de navegación local es el bbox CTX publicado (`CTX_EXTENT`), pero la edición de A/P/B permanece limitada al ROI demostrativo. El encuadre inicial deja margen para alejar; los controles de zoom se deshabilitan al alcanzar límites. Solo un modo explícito «Colocar»/«Mover» acepta un clic para cambiar la ruta; «Explorar» nunca la modifica. Se permite deshacer y restablecer.
**Motivo:** limitar `View.extent` al ROI impedía alejar en pantallas grandes y confundía la navegación con la planificación. El bbox no verifica cobertura continua ni la transitabilidad.

## ADR-010 — Contexto MOLA global, sin planificación planetaria
**Decisión:** alternar entre dos vistas OpenLayers del mismo mapa: Jezero con sus fuentes locales y una vista global 2D que muestra solo el WMTS MOLA existente. El acercamiento global termina en el nivel correspondiente a la última matriz MOLA z7 (zoom 8 de `View`); puntos y segmentos quedan ocultos, la edición se bloquea, el plan se conserva y se recupera al regresar.
**Motivo:** ofrecer contexto planetario sin extrapolar CTX/THEMIS locales ni convertir MOLA sombreado en altitudes numéricas. No hay navegación automática, datos globales de obstáculos ni 3D. Su visualización no valida detalle físico ni seguridad de una EVA.

## ADR-011 — Excepción de alcance: globo 3D como entrada de navegación
**Decisión:** en `feature/mars-globe`, a pedido expreso, añadir un globo de navegación esférico con textura global MGS MOLA auténtica y acceso al planificador Jezero 2D. Esto amplía el alcance original de `AGENTS.md` (§1.6, §1.7, §3) **solo para esta visualización no topográfica**: no crea malla de relieve, DEM numérico, planificación global ni valoración de seguridad. El gate estricto de un eventual 3D local *topográfico* sigue vigente. Mantener fallback 2D global y el ROI 2D existente.
**Fuente:** [USGS MOLA color shaded relief](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m): imagen planetocéntrica cilíndrica simple, este −180…180°, producto derivado de MGS/MOLA, 1999–2001, acceso público. Muestra oficial JPEG 1024×512, ≈135 kB, conservada localmente y atribuida; resolución de la muestra global muy inferior a los ≈463 m/píxel del original. [USGS/IAU Jezero](https://planetarynames.wr.usgs.gov/Feature/14300): centro 18.41°N, 77.69°E. El centro del cráter **queda fuera** del ROI del planificador (hasta 77.51°E): el marcador representa el cráter, no la ubicación del recorrido.
**Implementación:** Three.js se importa solo si se abre el globo; `App` conserva A/P/B fuera del componente 3D y no se modifican WMTS ni cálculo de distancias. Un error WebGL/textura vuelve al contexto 2D. Controles con límites y movimiento reducido; recursos GPU liberados al salir.

## ADR-012 — Escala de colores como referencia y Viking como segunda textura
**Decisión:** transcribir los 31 puntos de la tabla RGB vinculada por USGS al producto MOLA que da origen a la miniatura actual y presentar una **escala orientativa**, con enlace a la leyenda original y explicación del areoide. La correspondencia paleta-producto sí está documentada; una equivalencia RGB JPEG → cota exacta **no** lo está, por sombreado/compresión. Nunca derivar alturas de píxeles ni usar azul como agua.
**Segunda fuente:** miniatura global oficial del Viking MDIM 2.1 colorizado; crear WebP local reproducible, atribuido a NASA Ames/USGS y rotulado como colorización, no color natural exacto. Sus metadatos indican misma convención planetocéntrica/este −180…180°; no usar TIFF original pesado.
**Aislamiento:** cambiar `material.map` sobre la misma esfera y guardar texturas por instancia; conservar cámara, controles, marcador y navegación a Jezero. Si Viking falla, permanecer en MOLA y permitir reintento; no cambiar WMTS ni el análisis 2D.
