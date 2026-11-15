# Misiones, Instrumentos y Conjuntos de Datos de la NASA para Marte

## 1. Misiones Orbitales y Sensores

### 1.1 MRO (Mars Reconnaissance Orbiter)
- **CTX (Context Camera):**
  - *Resolución:* ~5 a 6 metros por píxel.
  - *Función:* Cartografía regional en escala de grises, ideal para contextualizar características geomorfológicas y trazar rutas generales.
  - *Producto destacado:* Mosaico ortorrectificado controlado de Jezero Crater (`JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`, USGS/JPL, CC0).
  - *WMTS Mars Trek:* Servido a través de proyecciones cilíndricas ecuatoriales (`EPSG:104905`).
- **HiRISE (High Resolution Imaging Science Experiment):**
  - *Resolución:* ~0.25 a 0.50 metros por píxel.
  - *Función:* Detección de rocas individuales, grietas, dunas de arena (ripples) y microrrelieve crítico para la seguridad del astronauta.
  - *DTM numéricos (DEMs estéreo):* Proporcionan elevación numérica con resolución horizontal de 1 a 2 metros. Cobertura no global, focalizada en sitios de alto interés científico.
- **CRISM (Compact Reconnaissance Imaging Spectrometer for Mars):**
  - *Resolución:* 18 a 36 metros por píxel en modo hiperespectral.
  - *Función:* Identificación mineralógica (filosilicatos, carbonatos, sulfatos hidratados, óxidos de hierro). Clave para encontrar estratos formados en presencia de agua líquida neutra.

### 1.2 MGS (Mars Global Surveyor)
- **MOLA (Mars Orbiter Laser Altimeter):**
  - *Resolución:* ~463 metros por píxel a nivel global (128 píxeles por grado en el ecuador).
  - *Función:* Modelo topográfico global de Marte respecto al Areoide (geoide marciano definido por gravedad y presión de 6.1 mbar).
  - *Importante advertencia técnica:* El producto visual `Mars_MGS_MOLA_ClrShade_merge_global_463m` es un **hillshade coloreado (RGB)**; NO contiene directamente valores numéricos de altitud por píxel en la imagen renderizada. La altitud numérica proviene del grid altimétrico original del PDS.

### 1.3 Mars Odyssey
- **THEMIS (Thermal Emission Imaging System):**
  - *Resolución:* 100 metros por píxel en el infrarrojo térmico (Day IR / Night IR), 18 metros en el visible.
  - *Función:* La inercia térmica nocturna revela la naturaleza del terreno:
    - Alta inercia térmica (se enfría lentamente de noche): roca sólida o terreno consolidado.
    - Baja inercia térmica (se enfría rápidamente): polvo fino y arena suelta (riesgo de atrapamiento de rovers y resbalamiento de astronautas).

### 1.4 Viking Orbiters (1976)
- **Viking MDIM 2.1 (Mars Digital Image Mosaic):**
  - Mosaico global clásico (~232 m/px), útil para visión sinóptica y alineación histórica global.

---

## 2. Misiones de Superficie (In-situ)

### 2.1 Mars 2020 (Perseverance Rover & Ingenuity Helicopter)
- **Ubicación:** Cráter Jezero (18.38°N, 77.58°E).
- **Instrumental clave:**
  - *Mastcam-Z:* Cámaras estereoscópicas y multiespectrales con zoom, proporcionan imágenes POV (punto de vista) de superficie a nivel de milímetros.
  - *SuperCam:* Espectrometría Raman, LIBS y micrófono para análisis químico remoto.
  - *PIXL & SHERLOC:* Análisis mineralógico y detección de moléculas orgánicas a escala microscópica en el delta fluvial.
  - *MEDA (Mars Environmental Dynamics Analyzer):* Estación meteorológica que mide viento, temperatura atmosférica, radiación UV y opacidad del polvo (tau).

### 2.2 Mars Science Laboratory (Curiosity Rover)
- **Ubicación:** Cráter Gale / Monte Sharp (Aeolis Mons) (4.59°S, 137.44°E).
- **Hito 2024-2025:** Estudio de las estructuras **boxwork** (crestas poligonales minerales formadas por fluidos hidrotermales en fracturas subterráneas), objetivo sugerido en el desafío NASA Space Apps 2026.
- **Instrumental:** Mastcam, ChemCam, SAM (Sample Analysis at Mars), RAD (Radiation Assessment Detector).

---

## 3. Repositorios y Servicios de Acceso a Datos
1. **JPL Mars Trek:** APIs REST y WMTS (`https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars`). Provee teselas en tiempo real para visualizadores SIG.
2. **USGS Astrogeology Science Center:** Mapas geológicos interactivos, mosaicos controlados y modelos de elevación calibrados (`https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars`).
3. **PDS (Planetary Data System) Geosciences Node / ODE (Orbital Data Explorer):** Datos primarios calibrados, EDRs y RDRs de misiones científicas de la NASA.
4. **NASA Raw Image Repositories:** Acceso a imágenes en crudo tomadas por Perseverance y Curiosity para contextualización de terreno a nivel de suelo.
