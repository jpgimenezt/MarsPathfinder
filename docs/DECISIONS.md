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
