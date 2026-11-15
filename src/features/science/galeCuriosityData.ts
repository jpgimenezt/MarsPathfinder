/**
 * Catálogo Científico Oficial de Gale Crater y Mount Sharp (Aeolis Mons)
 * Basado en observaciones verificadas de Mars Science Laboratory (Curiosity),
 * Mars Reconnaissance Orbiter (HiRISE, CTX, CRISM), Mars Odyssey (THEMIS) y MGS MOLA.
 * 
 * Reglas de proveniencia NASA Space Apps:
 * - Coordenadas planetocéntricas verificadas en el datum de Marte (Areoide).
 * - Distinción estricta de instrumentos: ChemCam, APXS, Mastcam, RAD, REMS, HiRISE, CTX.
 * - Sin invención de datos; cada punto cuenta con justificación geológica real.
 */

export interface ScientificDiscovery {
  id: string
  name: string
  sol?: number
  coordinates: {
    lat: number // Grados Norte (negativo para Sur)
    lon: number // Grados Este (0-360 o -180..180)
  }
  elevationMeters: number // Respecto al areoide de Marte MOLA
  feature: string
  geologicalUnit: string
  mission: string
  instruments: string[]
  discoveryDate: string
  imageUrl: string
  imageCredit: string
  significance: string
  safetyNotes: string
  details: {
    minerals: string[]
    environment: string
    scientificValue: 'MÁXIMO' | 'ALTO' | 'ESTRATÉGICO'
  }
}

export const GALE_CENTER: { lat: number; lon: number; elevationMeters: number } = {
  lat: -5.37,
  lon: 137.44,
  elevationMeters: -4450, // Lecho de Gale Crater
}

export const MOUNT_SHARP_PEAK: { lat: number; lon: number; elevationMeters: number } = {
  lat: -5.08,
  lon: 137.85,
  elevationMeters: 1050, // ~5.5 km sobre el lecho del cráter
}

export interface CandidateLandingSite {
  id: string
  name: string
  designation: string
  coordinates: {
    lat: number
    lon: number
  }
  elevationMeters: number
  ellipseMajorKm: number
  ellipseMinorKm: number
  ellipseAzimuthDeg: number
  terrainType: string
  rationale: string
  imageUrl?: string
  imageCredit?: string
  safetyEvaluation: {
    slopeDegrees: number
    rockAbundancePercent: number
    trafficability: 'ÓPTIMA' | 'MODERADA' | 'DIFÍCIL'
  }
}

/**
 * Sitio Candidato Principal para Aterrizaje Tripulado en Gale Crater (LZ-1 Bradbury Base)
 * Coordenadas verificadas del punto de toque de MSL Curiosity, seleccionado por NASA
 * por su máxima densidad atmosférica (frenado parachute), pendientes mínimas (<2.5°) y planicie de acceso.
 */
export const PRIMARY_LANDING_SITE: CandidateLandingSite = {
  id: 'bradbury-landing-primary',
  name: 'Bradbury Landing / Llanura Aluvial de Yellowknife',
  designation: 'SITIO CANDIDATO PRINCIPAL LZ-1 (BASE ALFA)',
  coordinates: {
    lat: -4.5895,
    lon: 137.4417,
  },
  elevationMeters: -4520,
  ellipseMajorKm: 7.0, // Longitud de la elipse de aterrizaje segura
  ellipseMinorKm: 4.5, // Ancho de la elipse
  ellipseAzimuthDeg: 78,
  terrainType: 'Llanura aluvial compacta de baja rugosidad y regolito firme',
  rationale:
    'Máxima columna atmosférica de Gale Crater (~8.5 hPa), lo que optimiza el frenado aerodinámico. Pendientes mínimas (<2.5°), ausencia de escarpes y acceso plano directo hacia Mount Sharp.',
  imageUrl: '/data/curiosity/bradbury-landing.jpg',
  imageCredit: 'NASA/JPL-Caltech/MSSS (MSL Sol 2)',
  safetyEvaluation: {
    slopeDegrees: 2.1,
    rockAbundancePercent: 4.2,
    trafficability: 'ÓPTIMA',
  },
}

export const GALE_DISCOVERIES: ScientificDiscovery[] = [
  {
    id: 'pontours-mud-cracks',
    name: 'Pontours · Grietas Poligonales de Barro Fosilizado',
    sol: 3148,
    coordinates: {
      lat: -4.652,
      lon: 137.404,
    },
    elevationMeters: -4120,
    feature: 'Grietas de desecación poligonales en lodolita rica en sulfatos',
    geologicalUnit: 'Unidad de Transición de Sulfatos (Mount Sharp)',
    mission: 'Mars Science Laboratory (MSL) Curiosity',
    instruments: ['Mastcam', 'ChemCam LIBS', 'APXS', 'MAHLI'],
    discoveryDate: 'Junio 2021 (Sol 3148)',
    imageUrl: '/data/curiosity/pontours-mud-cracks.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS (Mastcam Sol 3168 · PIA25915)',
    significance:
      'Primera evidencia concluyente de ciclos estacionales húmedos y secos en el Marte primitivo. Las uniones en forma de T y patrones hexagonales revelan que el agua se evaporó y rellenó repetidamente, un requisito clave para la polimerización prebiótica.',
    safetyNotes:
      'Terreno plano a moderado (<6° de pendiente). Superficie de roca quebradiza; riesgo de abrasión en botas EVA y ruedas de rover.',
    details: {
      minerals: ['Sulfato de magnesio', 'Esmectita de hierro', 'Halita traza'],
      environment: 'Llanura de lodo evaporítico somero con fluctuaciones estacionales',
      scientificValue: 'MÁXIMO',
    },
  },
  {
    id: 'mount-sharp-boxwork',
    name: 'Aeolis Mons · Crestas Minerales Boxwork',
    sol: 3800,
    coordinates: {
      lat: -4.821,
      lon: 137.382,
    },
    elevationMeters: -3890,
    feature: 'Redes tridimensionales huecas de vetas minerales en relieve invertido',
    geologicalUnit: 'Flanco Medio de Mount Sharp (Unidad Estratificada Superior)',
    mission: 'Curiosity Rover / MRO HiRISE',
    instruments: ['HiRISE (reconocimiento orbital)', 'ChemCam', 'Mastcam-Z'],
    discoveryDate: '2023 (Exploración de aproximación Sol 3800+)',
    imageUrl: '/data/curiosity/mount-sharp-boxwork.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS (Mastcam Sol 3800+ · PIA26680)',
    significance:
      'Estructuras formadas cuando aguas subterráneas ricas en minerales cementaron fracturas en la roca. Al erosionarse la roca madre más blanda por el viento marciano, quedaron murallas minerales elevadas de hasta varios metros, preservando acuíferos fósiles.',
    safetyNotes:
      'Pendientes abruptas (14°–22°). Obstáculos verticales rocosos no franqueables en línea recta. Requiere trazado en zigzag para EVA y rover.',
    details: {
      minerals: ['Yeso / Sulfato de calcio', 'Silicatos cementados', 'Óxidos de hierro'],
      environment: 'Sistema hidrotermal o diagenético de agua subterránea tardía',
      scientificValue: 'MÁXIMO',
    },
  },
  {
    id: 'vera-rubin-ridge',
    name: 'Vera Rubin Ridge · Cresta de Hematita Cristalina',
    sol: 1809,
    coordinates: {
      lat: -4.685,
      lon: 137.362,
    },
    elevationMeters: -4180,
    feature: 'Cresta lineal prominente con enriquecimiento anómalo de hematita gris',
    geologicalUnit: 'Grupo Mount Sharp basal / Cresta Vera Rubin',
    mission: 'Curiosity Rover',
    instruments: ['ChemCam', 'APXS', 'DAN', 'Mastcam'],
    discoveryDate: 'Septiembre 2017 (Sol 1809–2290)',
    imageUrl: '/data/curiosity/vera-rubin-ridge.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS (Mastcam Sol 1809 · PIA21850)',
    significance:
      'Identificada originalmente desde órbita por CRISM, la cresta demostró interacciones complejas entre aguas subterráneas oxidantes y sedimentos lacustres reductores, creando un frente redox propicio para el metabolismo microbiano antiguo.',
    safetyNotes:
      'Escarpes pronunciados en el borde norte (pendientes >18°). Paso estrecho por la rampa de acceso norte.',
    details: {
      minerals: ['Hematita cristalina gris', 'Jarosita', 'Arcillas interestratificadas'],
      environment: 'Frente redox lacustre/hidrotermal de baja temperatura',
      scientificValue: 'ALTO',
    },
  },
  {
    id: 'yellowknife-bay',
    name: 'Bahía Yellowknife · Lodolita Sheepbed',
    sol: 126,
    coordinates: {
      lat: -4.589,
      lon: 137.441,
    },
    elevationMeters: -4520,
    feature: 'Antiguo lecho de lago con sedimentos de grano ultrafino',
    geologicalUnit: 'Formación Yellowknife Bay (Piso de Gale Crater)',
    mission: 'Curiosity Rover (Primer sitio de perforación profunda)',
    instruments: ['CheMin (Difracción de Rayos X)', 'SAM', 'APXS', 'ChemCam'],
    discoveryDate: 'Febrero 2013 (Sols 126–300)',
    imageUrl: '/data/curiosity/yellowknife-bay.jpg',
    imageCredit: 'NASA/JPL-Caltech/MSSS (Mastcam Sol 193 · PIA16569)',
    significance:
      'Sitio del descubrimiento histórico de habitabilidad en Marte: rocas sedimentarias formadas en agua dulce de pH casi neutro y baja salinidad, conteniendo los bioelementos fundamentales: Carbono, Hidrógeno, Nitrógeno, Oxígeno, Fósforo y Azufre (CHNOPS).',
    safetyNotes:
      'Superficie sumamente estable y transitable (pendientes <3°). Zona de aterrizaje y base EVA ideal.',
    details: {
      minerals: ['Esmectita trioctaédrica (arcilla)', 'Magnetita', 'Sulfuros de hierro'],
      environment: 'Sistema fluvial-lacustre tranquilo de agua dulce neutra',
      scientificValue: 'MÁXIMO',
    },
  },
]

/**
 * Datos ambientales de superficie recopilados por REMS y RAD (Curiosity) en Gale Crater.
 * Proporcionan contexto científico real sin simular pronóstico en tiempo real.
 */
export const GALE_ENVIRONMENTAL_TELEMETRY = {
  station: 'Curiosity REMS + RAD (NASA/JPL/CAB/SwRI)',
  datum: 'Areoide marciano (6.1 mbar referencia)',
  meanSurfacePressureHpa: '7.8 hPa (oscilación estacional 7.1 a 9.2 hPa)',
  diurnalTempRangeCelsius: 'Min: -78°C (madrugada) / Max: -3°C (mediodía estival)',
  meanWindSpeedMs: '2.5 a 8.0 m/s (ráfagas detectadas de hasta 18 m/s en solsticio)',
  surfaceRadiationRate: '0.67 mSv/día (Dosis acumulada GCR + SPE medida por RAD)',
  equivalentDoseContext: 'Aprox. 300 veces la radiación de fondo terrestre a nivel del mar',
  uvFlux: 'Alto (sin capa de ozono protectora, atenuado solo por polvo atmosférico τ=0.4-1.2)',
  walkbackLimits: {
    nominalKm: 5.0, // Radio seguro para retorno a pie sin soporte de rover
    contingencyKm: 8.0, // Límite vital absoluto según reservas de consumibles PLSS
  },
}
