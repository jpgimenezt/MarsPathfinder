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
    unitOfMeasure: 'Elevación topográfica en metros respecto al Areoide marciano',
    license: 'NASA Open Data Policy (Dominio público)',
    credits: 'NASA/GSFC, DLR Institute of Planetary Research, Mars Trek Planetary Geodata',
    availabilityStatus: 'AVAILABLE',
    limitations: 'La resolución de 463 m/px es apta para contexto regional pero insuficiente para detectar microrrelieve, rocas o peligros locales de una caminata EVA.',
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
    unitOfMeasure: 'Brillo de temperatura diurna en Kelvin / Inercia térmica (J·m⁻²·K⁻¹·s⁻½)',
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
    geographicExtent: 'Global planetario con unidades estratigráficas detalladas en Gale Crater',
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
    description: 'Reconstrucción georreferenciada de la ruta histórica y planeada de ascenso por las capas sedimentarias de Mount Sharp desde Bradbury Landing.',
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
    limitations: 'La ruta publicada en 2019 es una propuesta estratégica planificada y documenta los hitos ya recorridos, no la telemetría en tiempo real de este instante.',
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
    name: 'Modelo Topográfico Hipsométrico ARES (Reconstrucción Procedural Educativa)',
    description: 'Malla topográfica hipsométrica basada en perfiles de MOLA y HRSC para visualización 3D y análisis exploratorio de gradientes. Reconstrucción matemática continua, no DEM oficial georreferenciado.',
    organization: 'ARES Geospatial Systems (Modelo Educativo)',
    mission: 'Modelo conceptual derivado de perfiles de MGS MOLA y Mars Express HRSC',
    instrument: 'Interpolación matemática de superficie hipsométrica en Areoide marciano',
    originUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    acquisitionDate: 'Datos de referencia: 1999 - 2020',
    publicationDate: '2026-11-15',
    dataType: 'MODELED',
    resolution: 'Malla procedural (~50 metros / vértice)',
    crs: 'Areoide de referencia gravitacional marciano (Radio ecuatorial 3,389.5 km)',
    geographicExtent: 'Región de operaciones de Gale: 136.75°E a 138.15°E; 5.75°S a 4.45°S',
    unitOfMeasure: 'Metros estimados sobre el nivel de referencia cero marciano (6.1 mbar)',
    license: 'Derivado Educativo ARES para NASA Space Apps Challenge 2026',
    credits: 'Equipo ARES · Reconstrucción geométrica continua',
    availabilityStatus: 'AVAILABLE',
    limitations: 'El relieve de Gale es una reconstrucción procedural con fines educativos. Las alturas, pendientes y rutas simuladas no constituyen mediciones topográficas verificadas ni evaluaciones de seguridad operacional.',
    category: 'TERRAIN_ANALYSIS',
  },
]

export const ARES_DISCLAIMER_NOTICE = 
  'ARES es un proyecto independiente desarrollado para el NASA Space Apps Challenge. ' +
  'No está afiliado, respaldado ni patrocinado por la NASA. Las fuentes y datos científicos se identifican individualmente en la aplicación.'

/**
 * Consulta qué observaciones y datasets científicos cubren una coordenada dada en Marte
 */
export function queryScientificObservationProfile(
  lon: number,
  lat: number,
  elevationMeters: number
): {
  targetCoordinates: { lon: number; lat: number; elevationMeters: number }
  availableDatasets: AresDatasetMetadata[]
  geologySummary: string
  terrainSummary: string
  missionHeritageNearby: string[]
} {
  // Gale bounds: lon 136.75..138.15, lat -5.75..-4.45
  const isInsideGale = lon >= 136.75 && lon <= 138.15 && lat >= -5.75 && lat <= -4.45

  const matchedDatasets = ARES_SCIENTIFIC_REGISTRY.filter((ds) => {
    if (ds.category === 'SURFACE_IMAGERY') return true // Galería de análogo comparativo disponible
    if (isInsideGale) return true
    return ds.geographicExtent.toLowerCase().includes('global')
  })

  const geologySummary = isInsideGale
    ? `Sector geológico de Gale Crater con elevación estimada de ${Math.round(elevationMeters)} m sobre el Areoide. Evidencia de sedimentación lacustre estratificada y capas ricas en arcillas o sulfatos.`
    : 'Ubicación fuera del cuadrante de alta resolución de Gale Crater. Contexto geológico global de baja resolución.'

  const terrainSummary = isInsideGale
    ? 'Modelo topográfico conceptual 3D disponible (~50 m/vértice interpolado). Estimación de pendientes y análisis exploratorio de transitabilidad.'
    : 'Datos topográficos locales no resueltos para esta coordenada.'

  const missionHeritageNearby: string[] = []
  if (isInsideGale) {
    missionHeritageNearby.push('Misión Mars Science Laboratory (Curiosity Rover, 2012 - presente): Travesía histórica de 32 km en este cráter.')
    missionHeritageNearby.push('MRO CTX: Cobertura fotográfica completa con resolución de 6 m/px (Mosaico Gale_CTX_BlockAdj_dd).')
    missionHeritageNearby.push('Mars Odyssey THEMIS: Registro térmico infrarrojo controlado de 100 m/px.')
  }

  return {
    targetCoordinates: { lon, lat, elevationMeters },
    availableDatasets: matchedDatasets,
    geologySummary,
    terrainSummary,
    missionHeritageNearby,
  }
}
