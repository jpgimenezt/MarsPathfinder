/**
 * CURIOSITY EXPLORATION HERITAGE & HISTORICAL TRAVERSE
 * 
 * Recurso oficial NASA:
 * https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
 * 
 * Reconstrucción georreferenciada de la ruta histórica propuesta y recorrida por
 * Mars Science Laboratory (MSL) Curiosity en Gale Crater (2012 - 2024).
 * Combina datos de MRO HiRISE, CRISM, CTX y HRSC.
 */



export interface CuriosityTraversePoint {
  id: string
  name: string
  sol: number
  earthDate: string
  lon: number
  lat: number
  elevationMeters: number
  targetType: 'LANDING' | 'SCIENCE_CAMPAIGN' | 'WAYPOINT' | 'GEOLOGICAL_UNIT'
  scienceSummary: string
  instruments: string[]
  cumulativeDistKm: number
  officialImageThumb?: string
}

export const CURIOSITY_HISTORICAL_PATH: CuriosityTraversePoint[] = [
  {
    id: 'msl-sol0',
    name: 'Bradbury Landing (Sitio de Aterrizaje MSL)',
    sol: 0,
    earthDate: '2012-08-06',
    lon: 137.4452,
    lat: -4.5880,
    elevationMeters: -4501,
    targetType: 'LANDING',
    scienceSummary: 'Aterrizaje exitoso mediante el sistema Sky Crane en la elipse norte de Gale Crater.',
    instruments: ['MARDI', 'Mastcam', 'Navcam', 'REMS'],
    cumulativeDistKm: 0.0,
  },
  {
    id: 'msl-sol126',
    name: 'Bahía Yellowknife (Sitio John Klein / Cumberland)',
    sol: 126,
    earthDate: '2012-12-17',
    lon: 137.4485,
    lat: -4.5925,
    elevationMeters: -4520,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Primera perforación en roca extraterrestre. Descubrimiento de un lago antiguo habitable de agua neutra.',
    instruments: ['CheMin', 'SAM', 'APXS', 'ChemCam', 'MAHLI'],
    cumulativeDistKm: 0.85,
  },
  {
    id: 'msl-sol590',
    name: 'The Kimberley (Afloramiento Cuádruple)',
    sol: 590,
    earthDate: '2014-04-02',
    lon: 137.4120,
    lat: -4.6210,
    elevationMeters: -4485,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Areniscas fluviales cruzadas con altas concentraciones de potasio y feldespatos.',
    instruments: ['CheMin', 'SAM', 'ChemCam'],
    cumulativeDistKm: 6.4,
  },
  {
    id: 'msl-sol753',
    name: 'Pahrump Hills (Base de Mount Sharp)',
    sol: 753,
    earthDate: '2014-09-19',
    lon: 137.3880,
    lat: -4.6920,
    elevationMeters: -4450,
    targetType: 'GEOLOGICAL_UNIT',
    scienceSummary: 'Inicio formal de la exploración de Aeolis Mons. Contacto basal de la Formación Murray.',
    instruments: ['Mastcam', 'ChemCam', 'MAHLI', 'APXS'],
    cumulativeDistKm: 9.2,
  },
  {
    id: 'msl-sol1190',
    name: 'Dunas de Bagnold (Campo Eólico Activo)',
    sol: 1190,
    earthDate: '2015-12-13',
    lon: 137.3910,
    lat: -4.7215,
    elevationMeters: -4410,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Primer estudio in-situ de dunas de arena activas en otro planeta. Análisis de dinámica de vientos.',
    instruments: ['Mastcam', 'REMS', 'MAHLI', 'ChemCam'],
    cumulativeDistKm: 12.1,
  },
  {
    id: 'msl-sol1440',
    name: 'Murray Buttes (Colinas y Mesas Testigo)',
    sol: 1440,
    earthDate: '2016-08-25',
    lon: 137.4020,
    lat: -4.7430,
    elevationMeters: -4360,
    targetType: 'GEOLOGICAL_UNIT',
    scienceSummary: 'Estratigrafía cruzada relicta de antiguas dunas fósiles preservadas sobre lutitas lacustres.',
    instruments: ['Mastcam', 'MAHLI', 'ChemCam'],
    cumulativeDistKm: 14.8,
  },
  {
    id: 'msl-sol1809',
    name: 'Vera Rubin Ridge (Cresta de Hematita)',
    sol: 1809,
    earthDate: '2017-09-08',
    lon: 137.4115,
    lat: -4.7640,
    elevationMeters: -4280,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Cresta resistente con una intensa firma espectral de hematita cristalina formada por fluidos subterráneos.',
    instruments: ['CRISM (orbital)', 'ChemCam', 'CheMin', 'APXS'],
    cumulativeDistKm: 17.5,
  },
  {
    id: 'msl-sol2300',
    name: 'Glen Torridon (Unidad Portadora de Arcillas)',
    sol: 2300,
    earthDate: '2019-01-26',
    lon: 137.4150,
    lat: -4.7820,
    elevationMeters: -4210,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Mayor concentración de minerales de arcilla (esmectitas) de toda la misión, indicativo de aguas tranquilas.',
    instruments: ['CheMin', 'SAM', 'ChemCam', 'DAN'],
    cumulativeDistKm: 21.0,
  },
  {
    id: 'msl-sol2700',
    name: 'Greenheugh Pediment (Rampa de Siccar Point)',
    sol: 2700,
    earthDate: '2020-03-09',
    lon: 137.3850,
    lat: -4.8020,
    elevationMeters: -4050,
    targetType: 'GEOLOGICAL_UNIT',
    scienceSummary: 'Superficie de discordancia geológica mayor. Ascenso sobre pendientes de hasta 32°.',
    instruments: ['Mastcam', 'Navcam', 'ChemCam'],
    cumulativeDistKm: 24.3,
  },
  {
    id: 'msl-sol3148',
    name: 'Pontours (Unidad de Transición de Sulfatos)',
    sol: 3148,
    earthDate: '2021-06-15',
    lon: 137.4280,
    lat: -4.7390,
    elevationMeters: -3980,
    targetType: 'SCIENCE_CAMPAIGN',
    scienceSummary: 'Primera evidencia concluyente de ciclos secos y húmedos estacionales: grietas hexagonales fósiles en barro.',
    instruments: ['Mastcam', 'ChemCam', 'APXS', 'MAHLI'],
    cumulativeDistKm: 27.8,
  },
  {
    id: 'msl-sol3800',
    name: 'Gediz Vallis Ridge & Boxwork (Estructuras de Red)',
    sol: 3800,
    earthDate: '2023-04-18',
    lon: 137.4420,
    lat: -4.8510,
    elevationMeters: -3650,
    targetType: 'GEOLOGICAL_UNIT',
    scienceSummary: 'Depósito masivo de flujos de lodo y rocas gigantes transportadas desde la cumbre de Mount Sharp.',
    instruments: ['Mastcam', 'ChemCam', 'CheMin', 'SAM'],
    cumulativeDistKm: 32.2,
  },
]

export interface MissionPathComparison {
  roverTraverse: {
    mission: string
    vehicle: string
    cumulativeDistanceKm: number
    durationYears: number
    averageSpeedKmh: number
    maxSlopeToleranceDeg: number
    operationalMode: string
    primaryConstraint: string
  }
  humanEvaPlan: {
    mission: string
    operator: string
    plannedDistanceKm: number
    durationHours: number
    averageSpeedKmh: number
    maxSlopeToleranceDeg: number
    operationalMode: string
    primaryConstraint: string
  }
}

export function compareCuriosityWithEva(
  evaDistanceKm: number,
  evaEstimatedHours: number
): MissionPathComparison {
  return {
    roverTraverse: {
      mission: 'Mars Science Laboratory (MSL Curiosity)',
      vehicle: 'Rover robótico autónomo de 899 kg',
      cumulativeDistanceKm: 32.2,
      durationYears: 12.2,
      averageSpeedKmh: 0.14,
      maxSlopeToleranceDeg: 15,
      operationalMode: 'Conducción robótica supervisada desde Tierra (latencia 7-22 min)',
      primaryConstraint: 'Desgaste mecánico de ruedas de aluminio, presupuesto de energía RTG y riesgo de atrapamiento.',
    },
    humanEvaPlan: {
      mission: 'ARES — Excursión de Exploración Tripulada',
      operator: 'Tripulación de astronautas en superficie + Rover presurizado',
      plannedDistanceKm: Math.round(evaDistanceKm * 100) / 100,
      durationHours: Math.round(evaEstimatedHours * 10) / 10,
      averageSpeedKmh: 3.2,
      maxSlopeToleranceDeg: 20,
      operationalMode: 'Toma de decisiones tácticas en tiempo real por la tripulación',
      primaryConstraint: 'Consumibles de soporte vital (O2/CO2 scrubbing, agua de refrigeración) y regla de Walkback Limit (≤ 8 km de la base).',
    },
  }
}
