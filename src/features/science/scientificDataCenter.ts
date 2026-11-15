/**
 * ARES SCIENTIFIC DATA CENTER — REGISTRO CENTRALIZADO DE FUENTES Y METADATOS CIENTÍFICOS
 * 
 * Cumple con los estándares de metadatos espaciales y científicos de la NASA, USGS y PDS.
 * Todos los conjuntos de datos incluyen los campos normalizados requeridos.
 */

export interface AresDatasetMetadata {
  datasetId: string
  name: string
  description: string
  organization: string
  mission: string
  instrument: string
  originUrl: string
  acquisitionDate: string
  publicationDate: string
  dataType: 'OBSERVED' | 'DERIVED' | 'HISTORICAL' | 'MODELED'
  resolution: string
  crs: string
  geographicExtent: string
  unitOfMeasure: string
  license: string
  credits: string
  availabilityStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'
  limitations: string
  category: 'CARTOGRAPHY' | 'GEOLOGY' | 'MISSION_HERITAGE' | 'SURFACE_IMAGERY' | 'TERRAIN_ANALYSIS'
}

export const ARES_SCIENTIFIC_REGISTRY: AresDatasetMetadata[] = [
  {
    datasetId: 'nasa-trek-gale-ctx',
    name: 'Mosaico Controlado CTX de Gale Crater (Gale_CTX_BlockAdj_dd)',
    description: 'Mosaico ortorectificado y ajustado por bloques de imágenes de la Context Camera (CTX). Cobertura continua de Gale Crater y las laderas de Mount Sharp.',
    organization: 'NASA / JPL-Caltech / MSSS / Mars Trek',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'CTX (Context Camera)',
    originUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml',
    acquisitionDate: '2006 - 2020 (Compilación multitemporal)',
    publicationDate: '2021-04-12',
    dataType: 'OBSERVED',
    resolution: '6.0 metros / píxel',
    crs: 'Equirectangular (Plate Carrée), Datum Areoide Marciano R=3,389.5 km',
    geographicExtent: 'Longitud: 135.18°E a 139.24°E; Latitud: 6.57°S a 2.81°S',
    unitOfMeasure: 'Reflectancia óptica normalizada I/F en espectro visible (500-800 nm)',
    license: 'Dominio Público NASA / Uso Científico y Educativo Libre',
    credits: 'NASA / JPL-Caltech / Malin Space Science Systems (MSSS) / USGS Astrogeology',
    availabilityStatus: 'AVAILABLE',
    limitations: 'Mosaico fotográfico bidimensional sin información vertical directa. No debe usarse como sustituto de un DEM numérico.',
    category: 'CARTOGRAPHY',
  },
  {
    datasetId: 'mgs-mola-clrshade',
    name: 'MOLA / HRSC Relieve Sombreado Hipsométrico en Color (ClrShade)',
    description: 'Producto cartográfico hipsométrico global que combina altimetría láser orbital de MOLA y estereografía de Mars Express HRSC.',
    organization: 'NASA / GSFC / DLR / Mars Trek',
    mission: 'Mars Global Surveyor (MGS) & Mars Express',
    instrument: 'MOLA (Mars Orbiter Laser Altimeter) + HRSC',
    originUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    acquisitionDate: '1999 - 2001 (MGS) / 2004 - 2018 (HRSC)',
    publicationDate: '2019-10-01',
    dataType: 'DERIVED',
    resolution: '463 metros / píxel a nivel ecuatorial (128 píxeles/grado)',
    crs: 'Equirectangular, Areoide de referencia gravitatorio (6.1 mbar)',
    geographicExtent: 'Global marciano (180°W a 180°E, 90°S a 90°N)',
    unitOfMeasure: 'Colores de relieve sombreado; no contiene alturas numéricas por píxel',
    license: 'NASA Open Data Policy (Dominio público)',
    credits: 'NASA/GSFC, DLR Institute of Planetary Research, Mars Trek Planetary Geodata',
    availabilityStatus: 'AVAILABLE',
    limitations: 'Imagen RGB de relieve sombreado, no DEM numérico. No permite medir alturas, pendientes ni obstáculos de una EVA.',
    category: 'CARTOGRAPHY',
  },
  {
    datasetId: 'themis-day-ir-mosaic',
    name: 'Mosaico Infrarrojo Térmico Diurno Controlado (THEMIS Day-IR)',
    description: 'Mosaico multitemporal de emisión infrarroja térmica diurna (Banda 9, 12.57 µm). Sensible a la inercia térmica, rugosidad del regolito y roca expuesta.',
    organization: 'NASA / JPL-Caltech / Arizona State University (ASU)',
    mission: '2001 Mars Odyssey',
    instrument: 'THEMIS (Thermal Emission Imaging System)',
    originUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    acquisitionDate: '2002 - 2018 (Adquisiciones sistemáticas en paso local 17:00)',
    publicationDate: '2018-10-25',
    dataType: 'HISTORICAL',
    resolution: '100 metros / píxel',
    crs: 'Equirectangular, Latitudes 65°S a 65°N',
    geographicExtent: 'Cobertura planetaria casi global entre latitudes medias',
    unitOfMeasure: 'Intensidad visual del mosaico infrarrojo; sin lectura local actual de temperatura',
    license: 'Dominio Público NASA / ASU Space Exploration Dataset',
    credits: 'NASA / JPL / Arizona State University (ASU)',
    availabilityStatus: 'AVAILABLE',
    limitations: 'Es un mosaico histórico que promedia observaciones multianuales. NO representa la temperatura meteorológica instantánea de la superficie.',
    category: 'CARTOGRAPHY',
  },
  {
    datasetId: 'usgs-sim-3292-geology',
    name: 'Mapa Geológico de Marte (USGS Scientific Investigations Map 3292)',
    description: 'Cartografía geológica unificada de Marte basada en morfología, cronoestratigrafía y estratigrafía de cráteres de impacto de múltiples misiones.',
    organization: 'USGS Astrogeology Science Center / NASA',
    mission: 'Programa de Mapeo Geológico Planetario USGS-NASA',
    instrument: 'Compilación multisinóptica (MOLA, THEMIS, CTX, HRSC)',
    originUrl: 'https://pubs.usgs.gov/sim/3292/',
    acquisitionDate: 'Síntesis de 40 años de exploración marciana',
    publicationDate: '2014-07-14',
    dataType: 'DERIVED',
    resolution: 'Escala 1:20,000,000 (Mapeo regional de Gale a escala 1:500,000)',
    crs: 'Proyección Planetocéntrica, Datum Areoide IAU/IAG 2000',
    geographicExtent: 'Global; los contactos detallados de Gale requieren un producto local distinto',
    unitOfMeasure: 'Clasificación de facies y unidades litoestratigráficas',
    license: 'Dominio Público Gubernamental de los Estados Unidos (USGS)',
    credits: 'Tanaka, K.L., Skinner, J.A., Jr., Dohm, J.M., et al., USGS Astrogeology',
    availabilityStatus: 'AVAILABLE',
    limitations: 'Mapa de escala regional. Los límites entre unidades son contactos inferidos y no deben interpretarse como barreras físicas impenetrables.',
    category: 'GEOLOGY',
  },
  {
    datasetId: 'msl-curiosity-traverse',
    name: 'Curiosity Proposed Path up Mount Sharp & Historical Traverse',
    description: 'Recurso de referencia sobre una ruta propuesta de Curiosity; no valida cada waypoint ni el recorrido animado en esta aplicación.',
    organization: 'NASA / JPL-Caltech / Mars Science Laboratory',
    mission: 'Mars Science Laboratory (Curiosity Rover)',
    instrument: 'Mastcam, Navcam, CheMin, SAM, ChemCam, APXS, DAN, MARDI',
    originUrl: 'https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/',
    acquisitionDate: '2012-08-06 (Sol 0) a 2024 (Sol 4100+)',
    publicationDate: '2019-04-18 (Actualizado periódicamente por JPL)',
    dataType: 'HISTORICAL',
    resolution: 'Trayectoria puntual georreferenciada y reconstrucción de Waypoints',
    crs: 'Sistema de Coordenadas de Superficie de Gale Crater (Topocéntrico MSL / IAU)',
    geographicExtent: 'Travesía de 32.2 km desde -4.589°S, 137.442°E hasta -4.851°S, 137.442°E',
    unitOfMeasure: 'Distancia métrica y odometría de rueda',
    license: 'Dominio Público NASA / JPL-Caltech',
    credits: 'NASA / JPL-Caltech / ESA / University of Arizona',
    availabilityStatus: 'AVAILABLE',
    limitations: 'La ruta propuesta publicada no es telemetría en tiempo real; los waypoints y tiempos ilustrativos de la escena Gale no están validados contra el producto fuente.',
    category: 'MISSION_HERITAGE',
  },
  {
    datasetId: 'perseverance-surface-imagery',
    name: 'Archivo de Imágenes Sin Procesar de Superficie de Perseverance',
    description: 'Colección fotográfica de alta resolución adquirida en la superficie de Marte por los sistemas de cámaras científicas e ingenieriles del rover.',
    organization: 'NASA / JPL-Caltech',
    mission: 'Mars 2020 (Perseverance Rover)',
    instrument: 'Mastcam-Z, SuperCam, WATSON, SHERLOC, PIXL, Navcam, Hazcam',
    originUrl: 'https://mars.nasa.gov/mars2020/multimedia/raw-images/',
    acquisitionDate: '2021-02-18 a la actualidad',
    publicationDate: 'Transmisión continua diaria a través de la Deep Space Network (DSN)',
    dataType: 'OBSERVED',
    resolution: 'Hasta 0.1 mm/píxel en primeros planos macro (WATSON); 1600x1200 px en paisaje',
    crs: 'Local Rover Frame / Coordenadas topocéntricas de Cráter Jezero (77.45°E, 18.38°N)',
    geographicExtent: 'Cráter Jezero (Delta fluvial y cráter Belva) — DISTINCIÓN ESTRICTA DE GALE',
    unitOfMeasure: 'Píxeles digitales RGB / Calibración fotométrica espectral',
    license: 'Dominio Público NASA / JPL-Caltech',
    credits: 'NASA/JPL-Caltech/ASU/MSSS',
    availabilityStatus: 'AVAILABLE',
    limitations: 'IMPORTANTE: Estas imágenes corresponden al Cráter Jezero, a más de 3,700 km de Gale Crater. Se integran exclusivamente como inteligencia de superficie comparativa y análogo planetario.',
    category: 'SURFACE_IMAGERY',
  },
  {
    datasetId: 'ares-topographic-dem',
    name: 'Reconstrucción procedural ilustrativa de Gale (NO es DEM validado)',
    description: 'Escena 3D generada mediante fórmulas procedurales para visualización educativa; no se obtuvo un DEM numérico local georreferenciado para esta escena.',
    organization: 'AresRoute (simulación educativa independiente)',
    mission: 'Contexto regional MOLA/HRSC; la malla local es simulada',
    instrument: 'Generación procedural de geometría, no altímetro',
    originUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    acquisitionDate: 'No aplica a la malla procedural',
    publicationDate: '2026-11-15',
    dataType: 'MODELED',
    resolution: 'Resolución física sin validar; el tamaño de celda computacional no equivale a resolución de observación',
    crs: 'Posicionamiento de la escena no validado contra un DEM local',
    geographicExtent: 'Región de operaciones de Gale: 136.75°E a 138.15°E; 5.75°S a 4.45°S',
    unitOfMeasure: 'Alturas y pendientes simuladas (no mediciones)',
    license: 'Escena educativa AresRoute; consultar por separado condiciones de fuentes externas',
    credits: 'AresRoute · simulación; MOLA/HRSC solo como contexto histórico',
    availabilityStatus: 'PARTIAL',
    limitations: 'No es un DEM georreferenciado ni apto para perfiles, tracción, seguridad EVA o inferencias de obstáculos. Valores verticales sin validación independiente.',
    category: 'TERRAIN_ANALYSIS',
  },
]

export const ARES_DISCLAIMER_NOTICE = 
  'ARES es un proyecto independiente desarrollado para el NASA Space Apps Challenge. ' +
  'No está afiliado, respaldado ni patrocinado por la NASA. Las fuentes y datos científicos se identifican individualmente en la aplicación.'

type LocalizedField = 'name' | 'description' | 'organization' | 'mission' | 'instrument' | 'credits' | 'acquisitionDate' | 'publicationDate' | 'resolution' | 'crs' | 'geographicExtent' | 'unitOfMeasure' | 'license' | 'limitations'
const englishRegistry: Record<string, Partial<Pick<AresDatasetMetadata, LocalizedField>>> = {
  'nasa-trek-gale-ctx': {
    name: 'Gale CTX controlled mosaic (Gale_CTX_BlockAdj_dd)',
    description: 'Orbital context imagery from the Context Camera. Coverage and alignment with procedural Gale scene are not independently verified.',
    acquisitionDate: 'Multi-year compilation; individual image dates unavailable here',
    publicationDate: 'Unverified for this mosaic', resolution: '6.0 m/pixel (source imagery)',
    crs: 'Equirectangular Mars mapping; check source capabilities for exact parameters',
    geographicExtent: 'Gale region; precise bounds require service verification',
    unitOfMeasure: 'Visual grayscale intensity, not numerical elevation',
    license: 'NASA data; verify reuse terms at source',
    limitations: 'Two-dimensional orbital image, not a numeric DEM or verified obstacle map.',
  },
  'mgs-mola-clrshade': {
    name: 'MOLA color-shaded relief (visual)',
    description: 'Regional color-shaded relief based on Mars Global Surveyor MOLA; the displayed mosaic is an image, not a numerical height grid.',
    acquisitionDate: 'Historical MOLA observations (1999–2001); no per-pixel date',
    publicationDate: 'Mosaic publication date unverified',
    resolution: '≈463 m/pixel (visual product)',
    crs: 'Mars equirectangular; source projection requires verification',
    geographicExtent: 'Global Mars',
    unitOfMeasure: 'Shaded-relief RGB; no numerical elevation per pixel',
    license: 'NASA data; verify reuse terms at source',
    limitations: 'Cannot measure elevation, slope, individual rocks or EVA route safety from this RGB layer.',
  },
  'themis-day-ir-mosaic': {
    name: 'THEMIS daytime infrared mosaic',
    description: 'Historical daytime infrared image mosaic from Mars Odyssey, not a live local temperature reading.',
    acquisitionDate: 'Multi-year observations; local acquisition date unavailable',
    publicationDate: 'October 2018 mosaic version',
    resolution: '≈100 m/pixel (source mosaic)', crs: 'Mars equirectangular (verify service)',
    geographicExtent: 'Approximate coverage between 65°S and 65°N',
    unitOfMeasure: 'Visual infrared mosaic intensity; no current local temperature',
    license: 'NASA/ASU data; verify reuse terms at source',
    limitations: 'Historical image mosaic. Does not measure current meteorology or thermal safety.',
  },
  'usgs-sim-3292-geology': {
    name: 'USGS geologic map of Mars (SIM 3292)',
    mission: 'USGS–NASA Planetary Geologic Mapping Program',
    instrument: 'Regional synthesis (MOLA, THEMIS, CTX, HRSC)',
    description: 'Global geologic synthesis. Detailed Gale contacts require a separate local product and spatial verification.',
    acquisitionDate: 'Synthesis of historical observations', publicationDate: '2014 (USGS publication)',
    resolution: 'Global map at 1:20,000,000; not a local Gale map',
    crs: 'Refer to official USGS map projection', geographicExtent: 'Global Mars',
    unitOfMeasure: 'Geologic unit classification, not obstacle measurements',
    license: 'USGS publication; consult source for terms',
    limitations: 'Regional geologic contacts are interpretations, not walkable boundaries or detailed Gale units.',
  },
  'msl-curiosity-traverse': {
    name: 'Curiosity proposed path up Mount Sharp',
    description: 'NASA reference graphic for a proposed rover route; the animated application path is illustrative, not a verified rover telemetry track.',
    acquisitionDate: 'Historical rover mission; not live telemetry',
    publicationDate: 'Refer to NASA resource for publication date',
    resolution: 'Illustrative path graphic; not a surveyed waypoint dataset',
    crs: 'Not established for the illustrated path',
    geographicExtent: 'Gale Crater (Mars)',
    unitOfMeasure: 'Path context; no verified per-waypoint odometry in this app',
    license: 'NASA resource; consult source for terms',
    limitations: 'Proposed path is not a live rover track. App waypoints and elapsed-time comparisons lack independent validation.',
  },
  'perseverance-surface-imagery': {
    name: 'Perseverance raw image archive',
    description: 'Mars 2020 camera imagery from Jezero Crater. Images are contextual and must not be pinned to Gale locations.',
    acquisitionDate: 'From 2021 onward; see individual image record for dates',
    publicationDate: 'Varies by image', resolution: 'Varies by camera and image',
    crs: 'Image-specific pointing; no verified georeference in this catalog',
    geographicExtent: 'Jezero Crater; not Gale Crater',
    unitOfMeasure: 'Image pixels; not a local elevation grid',
    license: 'NASA data; verify individual image attribution',
    limitations: 'Jezero observations cannot establish conditions in Gale. Individual photos require verified acquisition metadata and location.',
  },
  'ares-topographic-dem': {
    name: 'Gale procedural terrain (NOT a validated DEM)',
    organization: 'AresRoute (independent educational simulation)',
    mission: 'Regional MOLA/HRSC context; local mesh is simulated',
    instrument: 'Procedural geometry, not an altimeter',
    credits: 'AresRoute simulation; MOLA/HRSC only as historical context',
    description: 'Educational 3D geometry generated from procedural formulas; no georeferenced numerical local DEM was validated for this scene.',
    acquisitionDate: 'Not applicable to procedural geometry',
    publicationDate: '2026-11-15 (prototype)',
    resolution: 'Physical resolution unvalidated; computational cell size is not observation resolution',
    crs: 'Scene registration against local DEM unvalidated',
    geographicExtent: 'Illustrative Gale region; spatial coverage unverified',
    unitOfMeasure: 'Simulated heights and slopes, not observations',
    license: 'AresRoute educational simulation; external sources separately attributed',
    limitations: 'Cannot support elevation profiles, walkability, small-obstacle or EVA safety claims.',
  },
}

export const EN_DISCLAIMER_NOTICE =
  'AresRoute is an independent NASA Space Apps Challenge project. It is not affiliated with, endorsed or sponsored by NASA. Scientific sources and their limitations are listed individually.'

export function localizedScientificRegistry(language: 'en' | 'es'): AresDatasetMetadata[] {
  return language === 'en'
    ? ARES_SCIENTIFIC_REGISTRY.map(dataset => ({ ...dataset, ...englishRegistry[dataset.datasetId] }))
    : ARES_SCIENTIFIC_REGISTRY
}

/**
 * Consulta qué observaciones y datasets científicos cubren una coordenada dada en Marte
 */
export function queryScientificObservationProfile(
  lon: number,
  lat: number,
  elevationMeters: number,
  language: 'en' | 'es' = 'en'
): {
  targetCoordinates: { lon: number; lat: number; elevationMeters: number }
  availableDatasets: AresDatasetMetadata[]
  geologySummary: string
  terrainSummary: string
  missionHeritageNearby: string[]
} {
  // Gale bounds: lon 136.75..138.15, lat -5.75..-4.45
  const isInsideGale = lon >= 136.75 && lon <= 138.15 && lat >= -5.75 && lat <= -4.45

  const matchedDatasets = localizedScientificRegistry(language).filter((ds) => {
    if (ds.datasetId === 'ares-topographic-dem') return false // Simulation is not an observation.
    if (ds.category === 'SURFACE_IMAGERY') return true // Galería de análogo comparativo disponible
    if (isInsideGale) return true
    return ds.datasetId === 'mgs-mola-clrshade' || ds.datasetId === 'usgs-sim-3292-geology'
  })

  const geologySummary = isInsideGale
    ? language === 'en'
      ? 'Gale Crater has documented sedimentary geology. The displayed cursor height comes from an unvalidated procedural model, not a measured elevation.'
      : 'Gale Crater tiene geología sedimentaria documentada. La altura del cursor proviene de un modelo procedural sin validar, no de una medición.'
    : language === 'en' ? 'Outside Gale: only coarse global geologic context is available.' : 'Fuera de Gale: solo hay contexto geológico global de baja resolución.'

  const terrainSummary = isInsideGale
    ? language === 'en' ? 'No validated local numeric Gale DEM. Modeled slope and route safety cannot be assessed.' : 'Sin DEM numérico local validado para Gale. No se puede evaluar pendiente medida ni seguridad de ruta.'
    : language === 'en' ? 'No validated local topographic data for this coordinate.' : 'Sin datos topográficos locales validados para esta coordenada.'

  const missionHeritageNearby: string[] = []
  if (isInsideGale) {
    missionHeritageNearby.push(language === 'en' ? 'Mars Science Laboratory (Curiosity): historical Gale mission context; the animated track is illustrative.' : 'Mars Science Laboratory (Curiosity): contexto histórico de Gale; el recorrido animado es ilustrativo.')
    missionHeritageNearby.push(language === 'en' ? 'MRO CTX: visual orbital context; precise coverage and registration in this scene are unverified.' : 'MRO CTX: contexto orbital visual; cobertura exacta y registro en esta escena sin verificar.')
    missionHeritageNearby.push(language === 'en' ? 'Mars Odyssey THEMIS: historical infrared mosaic; not current temperature.' : 'Mars Odyssey THEMIS: mosaico infrarrojo histórico; no mide temperatura actual.')
  }

  return {
    targetCoordinates: { lon, lat, elevationMeters },
    availableDatasets: matchedDatasets,
    geologySummary,
    terrainSummary,
    missionHeritageNearby,
  }
}
