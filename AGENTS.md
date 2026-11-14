# AGENTS.md — AresRoute (NASA Space Apps Challenge 2026)

> Este archivo define las instrucciones permanentes para OpenCode y cualquier agente que contribuya a este repositorio.
> Proyecto independiente de NASA; prototipo educativo/de investigación, NO sistema de navegación certificado para misiones humanas.
> Idioma de comunicación, documentación y UX: español. Identificadores de código, nombres de archivos y commits: inglés.

## 0. Contexto y misión

**Desafío:** Interplanetary Survival Guide: Martian Map — NASA Space Apps Challenge 2026.
**Fuente canónica:** https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=details
**Reproducción accesible del enunciado y sus 5 recursos:** https://hackathlone.com/challenges/interplanetary-survival-guide-martian-map
**Evento:** 14–15 de noviembre de 2026. Fecha límite publicada: 15 de noviembre de 2026, 23:59, hora local del evento/participante; verificar en la cuenta del equipo.

El desafío solicita crear una **vista integrada y por capas de una ubicación o ruta en Marte** a partir de datos de varias misiones científicas de NASA para ayudar a planificar una exploración humana de superficie (Marswalk/EVA), considerando seguridad y valor científico.

Distinción crítica entre obligación y sugerencia:
- Central al enunciado: ubicación/ruta marciana, integración de datos NASA de distintas misiones, utilidad para exploración humana y ciencia.
- NASA **sugiere** considerar tres o más tipos de datos y una ruta que evite obstáculos: es una orientación, no un umbral legal de aprobación.
- 2D, 3D, HUD, clima y simulación son enfoques opcionales, no requisitos absolutos.
- El producto deberá usar **al menos tres familias de datos en el MVP** como objetivo de calidad propio, no porque NASA lo exija literalmente.

**Pregunta que debe contestar la demo:**
> ¿Cómo puede un astronauta explorar un sitio científicamente valioso en Marte y comprender las limitaciones y riesgos del trayecto a partir de evidencias de diferentes misiones?

## 1. Principios no negociables

1. **Ciencia antes que espectáculo.** La interfaz debe demostrar integración de datos y una decisión de exploración entendible; una esfera 3D bonita no alcanza.
2. **No inventar ciencia.** Nunca fabricar mapas NASA, coordenadas precisas, mediciones de elevación, temperaturas, radiación, meteorología, fotografías geolocalizadas, cobertura, puntos de muestreo o umbrales de seguridad.
3. **Proveniencia obligatoria.** Cada capa, métrica y conclusión muestra misión/instrumento/producto, URL, fecha de adquisición si se conoce, resolución, cobertura y limitaciones. Distinguir OBSERVED, HISTORICAL, DERIVED, MODELED, SIMULATED y UNAVAILABLE.
4. **Nunca llamar "segura" a una ruta** basándose en mapas orbitales o modelos incompletos. Usar "ruta exploratoria", "riesgos detectados", "riesgos no evaluados" y "no apta para uso operacional".
5. **No sustituir ausencia de datos por números plausibles.** Mostrar "Sin datos" y desactivar el análisis afectado. Datos sintéticos únicamente en tests o demo claramente rotulada, jamás superpuestos sobre una capa real sin explicación.
6. **Primero 2D funcional.** El 3D regional se implementa **solo después** de completar y verificar criterios MVP y conseguir un DEM/DTM numérico auténtico y georreferenciado.
7. **Mantener alcance acotado.** Un sector demostrable, una misión científica coherente, fuentes verificadas. Nada de mapa global ultra detallado ni módulo planetario, login, chat de IA, gamificación o backend innecesario.
8. **Defender decisiones técnicas.** Identificar conflictos, riesgos, supuestos y alternativas; no confirmar automáticamente propuestas no validadas.
9. **Calidad incremental.** Implementar en vertical slices utilizables; tras cada fase, ejecutar checks y registrar evidencias. No prometer funcionalidades que aún no existen.
10. **Seguridad digital y operativa.** Nada de claves/API tokens embebidos, uso no autorizado de marcas, claims de aval NASA, ni etiquetado de "tiempo real" sin datos actuales y verificables.

## 2. Alcance geográfico y objetivo científico

**Región candidata:** sector de interés científico en **Jezero Crater**, preferentemente alrededores del delta antiguo estudiado por Perseverance, porque allí hay contexto geológico, imágenes orbitales e imágenes de superficie. NASA describe depósitos antiguos asociados a agua y preservación de posibles bioseñales; no afirmar descubrimiento de vida.

Fuente: https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/
Contexto geológico: https://science.nasa.gov/mission/mars-2020-perseverance/

El **recorte exacto/ROI y los puntos de ruta se deciden solo después de verificar cobertura y coincidencia espacial de las fuentes.** No hardcodear una ruta inventada como "ruta comprobada". Si la cobertura numérica de relieve en Jezero no existe para el ROI, adaptar el ROI dentro de Jezero o mostrar claramente el modo manual y posponer el 3D físico.

**Historia de usuario central:** Como planificador de EVA quiero activar imágenes y capas científicas, elegir origen, destino y una parada geológica documentada, observar distancia y restricciones de relieve disponibles, y entender qué se sabe y qué aún no puede inferirse.

## 3. Entregable MVP: definición de terminado

### MUST — implementar antes de cualquier 3D

- [ ] Aplicación web responsive que abre en escritorio sin autenticación y puede desplegarse como sitio estático.
- [ ] Mapa **2D de Marte**, no de la Tierra, centrado en ROI elegido; fondo orbital real con créditos y cobertura conocida.
- [ ] **Tres familias científicas distintas**, preferentemente: (1) óptica MRO CTX, (2) topografía MGS MOLA, (3) termal Mars Odyssey THEMIS. Cada una con activar/desactivar, leyenda, opacidad si procede, metadatos y estados carga/error/no cobertura.
- [ ] Capa adicional opcional de geología/CRISM si se puede integrar correctamente. No confundir una imagen de relieve sombreado con valores numéricos de altura.
- [ ] Selección visible de A (base/inicio), B (destino), y al menos una parada científica **respaldada** por evidencia/cita; ruta manual entre puntos funcional, editable y restablecible.
- [ ] Distancia de ruta calculada con **geometría marciana**; resumen de trayecto y panel de contexto geológico.
- [ ] Panel de riesgos distingue lo conocido de lo no evaluado; no muestra pendientes, rocas o alertas numéricas sin datos adecuados.
- [ ] Si se obtiene DEM numérico confiable: perfil altimétrico y estimación **exploratoria** de pendientes; si no, indicador claro "datos insuficientes para perfil/seguridad".
- [ ] Al menos una explicación comprobable de por qué una parada es científicamente valiosa.
- [ ] Carga y error gestionados, diseño legible, navegación básica accesible, atribución visible de datos NASA/USGS y advertencia de prototipo.
- [ ] README con instalación, ejecución, fuentes, metodología, límites y enlace a demo. Build de producción funcional.

### SHOULD — después del MVP, si sobra tiempo

- [ ] Trazado asistido A* **solo** sobre elevación numérica y máscara de cobertura verificada; comparar con ruta directa bajo hipótesis documentadas.
- [ ] Exportar/compartir el plan en JSON o PNG con metadatos y advertencia.
- [ ] Fotografías Perseverance en paradas con ubicación **comprobada**; si la foto no tiene georreferencia fiable, solo presentarla como contexto de misión, no anclarla a un punto arbitrario.
- [ ] Vista local **3D topográfica** con Three.js: superficie creada de un DEM real, ruta consistente con la vista 2D, escala vertical indicada y modo 2D siempre disponible.

### WON'T para la hackatón

- Planeta completo de alta definición en 3D, mundo abierto, avatar/simulador de astronauta, HUD falso, VR, avatar con controles, modelos de traje con oxígeno inventado, alertas solares "en tiempo real" extrapoladas desde la Tierra, inteligencia artificial conversacional, cuentas de usuario, base de datos y API propia sin necesidad demostrada.

## 4. Arquitectura seleccionada

**Stack MVP recomendado:**
- Node.js LTS compatible con el entorno, npm; package-lock committeado.
- **React + TypeScript strict + Vite** para web estática.
- **OpenLayers** para GIS 2D y fuentes WMTS, ya que ofrece integración con GetCapabilities, proyecciones y capas; no usar un mapa Earth/Web Mercator sin adaptación planetaria.
- CSS convencional o CSS Modules: accesible, simple y con pocas dependencias. No introducir framework visual complejo sin prueba de valor.
- **Vitest** para pruebas de utilidades geoespaciales y lógica de rutas.
- `Three.js` solo como dependencia opcional del 3D local si pasa el gate (no instalar por defecto).
- Python (`rasterio`, `numpy`, cuando se requiera) **solo como pipeline offline reproducible** para convertir raster DEM/DTM, generar recortes, estadísticas y archivos compactos. No requiere servicio Python en producción.
- Hosting: Vercel / Netlify / GitHub Pages; aplicación servida estáticamente y assets locales optimizados.

**No** añadir Express, PostgreSQL/Supabase, autenticación ni API generativa para el MVP. Un backend sería costo extra sin necesidad clara. Datos grandes se procesan **antes** del despliegue.

**Diagrama lógico:**

```text
NASA / USGS / PDS fuentes verificadas
        |
        +--- WMTS visuales ---------------------+
        |                                       |
        +--- DEM / puntos con metadatos --> pipeline Python --> assets GeoJSON/JSON/PNG
                                                |
React + TypeScript ---- OpenLayers 2D <---------+
   |                    |
   +--- Route planner --+--- distancia marciana / cobertura / pendientes cuando proceda
   |
   +--- Inspector científico + evidencia + alertas por falta de datos
   |
   +--- Three.js 3D local (opcional, SOLO desde DEM validado)
```

**Estructura objetivo (adaptar a repositorio existente; no borrar trabajo previo):**

```text
AGENTS.md
README.md
package.json
vite.config.ts
src/
  app/App.tsx
  components/{MapView,LayerPanel,RoutePlanner,SciencePanel,RiskPanel,SourceDetails}.tsx
  features/map/{marsProjection,wmtsSources,layerCatalog}.ts
  features/route/{marsDistance,routeGeometry,routeAnalysis}.ts
  features/science/scienceStops.ts
  features/terrain/{demGrid,slopeProfile}.ts
  data/sourceManifest.ts
  types/{geo,source,route}.ts
  styles/
public/
  data/  # derivados pequeños + manifiestos y licencias
scripts/
  README.md
  # scripts de ETL solo si son necesarios
  
tests/
  marsDistance.test.ts
  routeAnalysis.test.ts
  sourceCoverage.test.ts
docs/
  DATA_SOURCES.md
  DECISIONS.md
  VALIDATION.md
  DEMO.md
```

## 5. Fuentes: orden de verificación

**Oficiales enlazadas por el desafío:**

1. Mars Trek NASA/JPL: https://trek.nasa.gov/mars/
   - Documentación WMTS: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
2. USGS-NASA Planetary Geologic Mapping Program: https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars
3. Referencia de visualización de rutas Curiosity: https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
4. NASA Worldview (Tierra, **referencia de UX**, NO mapa de Marte): https://worldview.earthdata.nasa.gov/
5. Perseverance raw images: https://mars.nasa.gov/mars2020/multimedia/raw-images/

**Datos técnicos complementarios para explorar y verificar, no son una promesa de cobertura:**

- MRO CTX, Mars Trek WMTS, capabilities sugeridas:
  https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml
- MOLA color shaded relief `Mars_MGS_MOLA_ClrShade_merge_global_463m` en catálogo Mars Trek.
- THEMIS diurno/nocturno: identificar servicios exactos en catálogo Mars Trek y comprobar disponibilidad.
- MRO HiRISE/PDS: https://www.uahirise.org/ y https://hirise-pds.lpl.arizona.edu/PDS/
- Mars Orbital Data Explorer / CRISM: https://ode.rsl.wustl.edu/mars/
- Jezero / Perseverance ciencia: https://science.nasa.gov/mission/mars-2020-perseverance/science/

**ADVERTENCIA IMPORTANTE:** los endpoints específicos, CORS, TileMatrixSet, formato (.jpg/.png), cobertura, nombres de capa, legalidad/atribuciones y rendimiento deben probarse de forma efectiva en este entorno. Un URL en una guía o ejemplo no significa que hoy funcione. No registrar capa como integrada hasta que se vea en la aplicación.

**Protocolo de validación por fuente:**
1. Guardar URL oficial, misión/instrumento, propietario, uso permitido y atribuciones.
2. Verificar respuesta real del servicio y, si es WMTS, **parsear GetCapabilities** en lugar de asumir un esquema XYZ/TMS.
3. Comprobar proyección, extensión, eje/origen, TileMatrixSet, longitud 0–360° vs -180–180°, planetocéntrica vs planetográfica y sistema de referencia vertical.
4. Comprobar cobertura exacta del ROI Jezero; tomar captura verificable de capa cargada y comprobar superposición de hitos.
5. Registrar resolución y fecha, distinción entre imagen visual y observación numérica, y `nodata`.
6. Añadir a `docs/DATA_SOURCES.md` y al manifiesto de fuentes; no introducir capa falsa en producción.

**Prioridad de datos:** calidad+trazabilidad > cantidad. Un compuesto de 3 capas bien descritas vale más que 10 capas de procedencia ambigua.

## 6. Reglas de geodesia marciana y seguridad científica

- **Nunca usar el radio terrestre** para rutas marcianas. Para distancias aproximadas de superficie esférica, usar radio medio de Marte **3 389 500 m** como supuesto explícito; documentar error y limitaciones de esta aproximación.
- Implementar Haversine o gran círculo robusto para segmentos, en radianes; normalizar longitudes si se cruzan los 0°/360° o ±180°.
- Distinguir conversiones de coordenadas latitud/longitud y pixel/DEM, escalas y referencias. Mantener una convención interna documentada y convertir en límites de entrada/salida.
- Las coordenadas marcianas **no son WGS84 terrestre**. Si una biblioteca usa EPSG:4326 solo para visualizar coordenadas angulares, documentar que es un compromiso técnico de visualización; las mediciones se calculan con parámetros de Marte, y no atribuir exactitud geodésica absoluta.
- **MOLA global (~centenares de metros por pixel) NO permite detectar rocas individuales ni validar una EVA**. Una imagen MOLA sombreada NO da alturas numéricas. Una imagen CTX/HiRISE tampoco es un DEM.
- No derivar inclinación válida de una fotografía. El perfil altimétrico requiere DEM numérico documentado, `nodata`, m/pixel y referencia vertical coherente.
- Diferenciar **peligro observado, proxy derivado y desconocido**. Sin datos adecuados de piedras/abruptos, indicar "obstáculos pequeños no evaluados".
- Si se construye A*: rutas sobre grilla del DEM con cobertura validada, pendiente basada en `atan(deltaElevation/horizontalDistance)`, bloqueos solo sobre datos válidos y reglas claramente configurables; marcar toda decisión como **exploratoria**.
- Los valores de umbrales de pendiente para categorías (si se incluyen) deben documentarse como **supuestos configurables** o derivarse de una publicación citada. No afirmar "límite NASA" sin una fuente precisa.
- Los datos meteorológicos/radiación históricos, modelados o de otra región no son condiciones locales en tiempo real. Jamás extrapolar datos Curiosity/GOES/DONKI a Jezero como lectura actual del astronauta.
- Incluir `NO_DATA`, `LOW_RESOLUTION`, `OUT_OF_COVERAGE`, `PROJECTION_MISMATCH`, `UNVERIFIED` como estados que bloqueen conclusiones fuertes.

## 7. Experiencia de usuario y presentación

Diseño sugerido: panel lateral de capas; mapa central ocupando la mayor parte; inspector lateral/drawer con detalle científico y riesgo; barra inferior con plan de EVA. Modo claro/oscuro solo si es simple. Colores de riesgo con texto/iconos, no solo color. En móvil, mostrar mapa y paneles colapsables.

**Flujo de demo en menos de 3 minutos:**
1. Abrir Jezero y explicar por qué se eligió (delta antiguo, interés astrobiológico).
2. Alternar imágenes CTX, relieve MOLA y THEMIS; mostrar créditos y qué significa cada capa.
3. Seleccionar A, parada científica B y destino C; dibujar ruta y mostrar longitud marciana.
4. Mostrar qué se puede concluir y cuáles son los peligros **no evaluados**; cuando haya DEM, abrir perfil de pendientes.
5. Solo si existe DEM validado, pulsar "Vista 3D" y mostrar la misma ruta en relieve local.
6. Cerrar con utilidad real y limitaciones, no con marketing vacío.

Escribir README y guion con los criterios **Impact, Creativity, Validity, Relevance, Presentation** en mente. Nunca sacrificar validez científica por mostrar más funcionalidades.

## 8. Plan de ejecución obligatorio para OpenCode

### Fase 0 — auditoría de entorno y prueba de datos (gate)
- Inspeccionar repo, Node/npm, dependencias; preservar código existente.
- Consultar las páginas de fuente y probar un WMTS real (capabilities, una tesela, superposición en un visor mínimo).
- Definir una zona exacta de Jezero basada en datos disponibles, no preferencias estéticas.
- Crear `docs/DATA_SOURCES.md` con estado Verified/Partial/Blocked de cada capa; registrar qué fuente puede dar alturas numéricas.
- Crear `docs/DECISIONS.md` breve con decisiones, evidencia y alternativas descartadas.
- **Si fallan los WMTS**, implementar respaldo con imagen/mapa local NASA correctamente atribuida, indicando su naturaleza estática, mientras se investiga conexión. No bloquear todo el proyecto por una API.

### Fase 1 — MVP de valor (PRIORIDAD MÁXIMA)
- Inicializar React/Vite/TS, integración de OpenLayers y diseño de mapa.
- Integrar primera capa real e inspector de origen.
- Añadir al menos dos capas científicas más, con control de cobertura/errores y leyendas.
- Añadir interacción de puntos, polilínea, distancia en Marte, inspector y paradas científicas documentadas.
- Mostrar límites de evaluación de riesgo; exportar resumen de ruta si es sencillo.
- Entregar `npm run build` sin errores.

### Fase 2 — análisis defendible de relieve
- Solo si hay un DEM numérico georreferenciado con cobertura del ROI: convertir/recortar en script offline y comprobar elevaciones y escalas.
- Añadir perfil altimétrico y gradientes aproximados; introducir pruebas unitarias y casos `nodata`.
- A* opcional, solo si entrega resultados consistentes y explicables; nunca forzar A* en ausencia de DEM.

### Fase 3 — visualización 3D (GATE ESTRICTO)
**Autorizar SOLO si** fase 1 completa, despliegue funcional, fuentes documentadas, DEM con cobertura, tiempo disponible y ninguna regresión.
- Three.js: **malla regional** a partir del mismo DEM validado, texturas/overlays alineados, ruta y puntos sincronizados con 2D.
- Señalar exageración vertical y límites de resolución.
- Lazy-load de 3D, posibilidad de volver a 2D, y evitar cargar archivos enormes en red.
- Si falla alguno de los requisitos, **descartar 3D**, invertir tiempo en pruebas, credibilidad y demo.

### Fase 4 — cierre y entrega
- Pruebas, performance, responsive, créditos, disclaimer.
- README, captura del sistema y video corto narrando la historia del recorrido.
- Desplegar versión estable **antes** de experimentar con extras. Guardar punto de retorno en Git.
- Documentar enlaces verificables para entrega de NASA Space Apps y revisar hora de cierre en la cuenta oficial.

## 9. Pruebas y criterios de aceptación técnica

**Scripts esperados en package.json:**
- `npm run dev`
- `npm run build`
- `npm run typecheck` (si TS separado de Vite)
- `npm run test`
- `npm run lint` (si configurado)

**Tests mínimos:**
- Distancia cero entre coordenadas iguales; distancia Marte conocida calculada con fórmula independiente; dos puntos a través de meridiano 0/360.
- Evitar uso involuntario del radio terrestre.
- Coordenadas inválidas y valores NaN.
- Perfil de pendiente plano y pendiente con alturas sintéticas **solo en tests**.
- Cobertura y celdas `nodata`: resultados "desconocido" y no "seguro".
- Al cambiar capas, mantener ruta y coordenadas del ROI.
- Manejo de error de tiles/fuente: UI usable sin pantalla en blanco.
- Build y demo verificados desde URL desplegada, no solo desde localhost.

**Política de verificación:** si no se ejecutó un comando o no se validó un endpoint, decir explícitamente "no verificado". No declarar tests verdes por suposición. Usar errores para ajustar, no borrarlos.

## 10. Gestión de trabajo del agente

- Trabajar en pasos pequeños. Antes de programar, listar 3–6 pasos de ejecución y su criterio de aceptación.
- No pedir autorización para decisiones de bajo riesgo dentro de este alcance; actuar y explicar. Pedir decisión solo ante cambios de alcance grandes o ambigüedades bloqueantes.
- No cambiar el stack sin demostrar un problema real y comparar costos/beneficios.
- No agregar paquetes por costumbre. Preferir APIs nativas y dependencias mínimas.
- Respetar archivos existentes; inspeccionar antes de modificar y evitar grandes refactors durante la hackatón.
- No crear cientos de archivos vacíos, datos dummy no rotulados ni paneles con botones inertes.
- En cada entrega informar: **funcionalidades realmente implementadas; archivos cambiados; comandos realmente ejecutados/resultados; bloqueos y riesgos; siguiente paso más valioso.**
- Priorizar integración y funcionamiento sobre longitud de código.
- Si una biblioteca o fuente falla, diseñar un plan B acotado (no cambiar toda la arquitectura).
- Usar Git con commits claros, por ejemplo `feat(map): integrate nasa wmts layer` y `feat(route): mars-distance planner`.

## 11. Criterios GO / NO-GO

| Funcionalidad | GO si… | NO-GO si… |
|---|---|---|
| 2D capas WMTS | URL y tiles reales se ven, proyección/cuadrícula y fuentes confirmadas | solo mock sin procedencia o desalineación de capas |
| distancia | conversiones Marte coherentes + pruebas | se usa Earth/WGS84 para km |
| perfil de altitud | DEM numérico, vertical datum, resolución y nodata conocidos | solo existe MOLA hillshade/imagen RGB |
| ruta automática | grilla numérica y cobertura + tests de pendientes | obstáculos o terreno inventados |
| meteorología/radiación | datos/localidad/fecha documentados y uso contextual | valores históricos mostrados como "ahora" |
| 3D | DEM real local, MVP 2D estable y tiempo suficiente | retrasa el MVP o usa montañas falsas no etiquetadas |
| entrega | deploy visible, demo reproducible, atribución y límites explícitos | funcionalidades decorativas que no sirven |

## 12. Primer mandato para la próxima sesión de OpenCode

**No empezar por el 3D ni por estética.** Iniciar con auditoría de entorno/repositorio, verificar en vivo una capa CTX de Mars Trek (con GetCapabilities) y una capa MOLA, investigar THEMIS, documentar cobertura del ROI Jezero y entregar una primera pantalla web 2D con una capa real. Si falta información, poner `UNVERIFIED` y seguir con lo que sí sea verificable. Mantener el objetivo de tres familias de datos, ruta marciana y demo estable.

**Definición de éxito:** un juez abre un sitio, entiende por qué exploraría Jezero, activa al menos 3 fuentes científicas reales, planifica una caminata explicable y distingue evidencia de incertidumbre en menos de 3 minutos. El 3D es un premio adicional, no el producto.
