/**
 * USGS ASTROGEOLOGY — SISTEMA DE INFORMACIÓN GEOLÓGICA DE GALE CRATER
 * 
 * Basado en:
 * - USGS Scientific Investigations Map 3292 (Geologic Map of Mars, Tanaka et al., 2014, 1:20M).
 * - Mapeo estratigráfico regional de Gale Crater (Grotzinger et al., Science 2014, 2015).
 * - Compilación de unidades geológicas y facies sedimentarias analizadas por MSL Curiosity.
 */

export interface UsgsGeologicUnit {
  code: string
  name: string
  epoch: string
  ageRange: string
  usgsColor: string
  description: string
  lithology: string
  depositionalEnvironment: string
  citation: string
  evaSuitability: 'OPTIMAL' | 'MODERATE' | 'CAUTION' | 'RESTRICTED'
  evaSuitabilityNotes: string
}

export const USGS_GALE_UNITS: Record<string, UsgsGeologicUnit> = {
  lApm: {
    code: 'lApm',
    name: 'Unidad Estratificada del Montículo Central (Aeolis Mons)',
    epoch: 'Amazoniano Tardío a Hesperiano',
    ageRange: '< 3.0 Ga',
    usgsColor: '#a855f7',
    description: 'Secuencia sedimentaria masiva de lutitas, areniscas y estratos ricos en sulfatos hidratados de magnesio y calcio. Constituye los flancos superiores de Mount Sharp.',
    lithology: 'Lutitas sulfatadas, anhidrita, areniscas eólicas finamente estratificadas.',
    depositionalEnvironment: 'Transición de cuenca lacustre en desecación a sistema eólico desértico regional.',
    citation: 'USGS SIM 3292 (Tanaka et al., 2014); Grotzinger et al. (Science, 2015).',
    evaSuitability: 'MODERATE',
    evaSuitabilityNotes: 'Pendientes de 8° a 15°. Tracción firme sobre roca expuesta; escalonamiento estratigráfico manejable.',
  },
  eHh: {
    code: 'eHh',
    name: 'Unidad de Transición Arcillosa-Sulfatada (Bahía Yellowknife & Glen Torridon)',
    epoch: 'Hesperiano Temprano',
    ageRange: '3.7 - 3.4 Ga',
    usgsColor: '#0ea5e9',
    description: 'Depósitos de lodo lacustre fosilizado (mudstone) ricos en esmectitas, magnetita y sulfatos de calcio. Evidencia directa de un lago antiguo habitable de agua neutra.',
    lithology: 'Lutitas ricas en filosilicatos (arcillas de esmectita), venas de yeso hidrotermal, areniscas finas.',
    depositionalEnvironment: 'Lago perenne estacionalmente recargado por deltas y ríos fluviales.',
    citation: 'USGS SIM 3292; Grotzinger et al. (Science, 2014); Bristow et al. (Science, 2021).',
    evaSuitability: 'OPTIMAL',
    evaSuitabilityNotes: 'Pendientes suaves (<6°). Superficie plana consolidada, ideal para marcha y emplazamiento de instrumentación.',
  },
  AHv: {
    code: 'AHv',
    name: 'Campo de Dunas Eólicas Basálticas Activas (Dunas de Bagnold)',
    epoch: 'Amazoniano a Hesperiano activo',
    ageRange: 'Contemporáneo / Activo',
    usgsColor: '#334155',
    description: 'Cinturón eólico activo de arenas basálticas oscuras no consolidadas. Muestra migración activa de crestas onduladas por vientos estacionales.',
    lithology: 'Arenas ricas en olivino, piroxeno y titanomagnetita.',
    depositionalEnvironment: 'Transporte y acumulación eólica contemporánea atrapada por la orografía de Mount Sharp.',
    citation: 'USGS SIM 3292; Bridges et al. (JGR Planets, 2017); Lapotre et al. (Science, 2016).',
    evaSuitability: 'CAUTION',
    evaSuitabilityNotes: 'ALTO RIESGO DE ATRICCIÓN. Arena fina incoherente, riesgo de atasco de ruedas de rover y sobreesfuerzo biomecánico de astronauta.',
  },
  mNh: {
    code: 'mNh',
    name: 'Unidad de Suelo de Cráter y Abanico Aluvial (Formación Bradbury)',
    epoch: 'Noeico Tardío a Hesperiano',
    ageRange: '> 3.6 Ga',
    usgsColor: '#eab308',
    description: 'Conglomerados y areniscas depositados por corrientes fluviales vigorosas provenientes del borde norte de Gale Crater (Peace Vallis fan). Clastos redondeados de basalto.',
    lithology: 'Conglomerados polimícticos fluviales, areniscas líticas y pavimento de regolito consolidado.',
    depositionalEnvironment: 'Abanicos aluviales fluviales de alta energía.',
    citation: 'Williams et al. (Science, 2013); USGS SIM 3292.',
    evaSuitability: 'OPTIMAL',
    evaSuitabilityNotes: 'Suelo firme, excelente capacidad de carga para módulos pesados y pistas de aterrizaje.',
  },
  Nhm: {
    code: 'Nhm',
    name: 'Macizos del Borde y Muralla del Cráter Gale (Basamento Noeico)',
    epoch: 'Noeico Medio',
    ageRange: '> 3.8 Ga',
    usgsColor: '#ef4444',
    description: 'Corteza marciana primordial levantada e impactada durante el evento de formación del cráter de 154 km. Muy tectonizada y meteorizada.',
    lithology: 'Brechas de impacto autóctonas, bloques basálticos anortosíticos y material del manto superior eyectado.',
    depositionalEnvironment: 'Excavación por impacto de asteroide en la cuenca de Elysium.',
    citation: 'Tanaka et al. (USGS SIM 3292, 2014).',
    evaSuitability: 'RESTRICTED',
    evaSuitabilityNotes: 'Pendientes abruptas (>20°), taludes inestables y acantilados. Requiere equipo de escalada técnica o sobrevuelo.',
  },
}

/**
 * Determina la unidad geológica USGS para cualquier coordenada dada de Gale Crater
 */
export function getUsgsGeologicUnitAt(
  lon: number,
  lat: number,
  elevationMeters: number
): UsgsGeologicUnit {
  // Centro de Gale / Mount Sharp
  const centerLon = 137.45
  const centerLat = -5.08
  const dxKm = (lon - centerLon) * 59.16
  const dyKm = (lat - centerLat) * 59.16
  const distKm = Math.hypot(dxKm, dyKm)

  // Murallas y borde del cráter (>46 km del centro)
  if (distKm > 46) {
    return USGS_GALE_UNITS.Nhm
  }

  // Dunas de Bagnold: franja alargada al norte de Mount Sharp
  // Entre latitudes -4.70 y -4.75, longitudes 137.35 y 137.45
  if (lat >= -4.76 && lat <= -4.70 && lon >= 137.35 && lon <= 137.45) {
    return USGS_GALE_UNITS.AHv
  }

  // Aeolis Mons (Montículo central): elevación > -3600m
  if (elevationMeters > -3600) {
    return USGS_GALE_UNITS.lApm
  }

  // Unidad de transición lacustre arcillosa / Bahía Yellowknife y flanco inferior de Mount Sharp
  if (elevationMeters >= -4400 && elevationMeters <= -3600) {
    return USGS_GALE_UNITS.eHh
  }

  // Piso del cráter y Formación Bradbury
  return USGS_GALE_UNITS.mNh
}
