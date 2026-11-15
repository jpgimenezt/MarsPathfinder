/**
 * Modelo Conceptual de Elevación y Gradientes Topográficos de Gale Crater y Mount Sharp (Aeolis Mons).
 * PROVENIENCIA: [SIMULATED / RECONSTRUCCIÓN PROCEDURAL]
 * 
 * NOTA CIENTÍFICA METODOLÓGICA (NASA Space Apps Challenge 2026):
 * Este modelo constituye una reconstrucción continua matemática basada en perfiles hipsométricos
 * de MGS MOLA y Mars Express HRSC. No constituye un Modelo Digital de Elevación (DEM) numérico
 * oficial georreferenciado celda a celda (como el DEM USGS de Jezero). Las pendientes calculadas
 * son aproximaciones derivadas del modelo geométrico procedural para el entorno educativo.
 * 
 * Parámetros geodésicos:
 * - Centro de Gale Crater: -5.37°N, 137.44°E (Areoide MOLA z ≈ -4,450 m)
 * - Cumbre de Mount Sharp: -5.08°N, 137.85°E (z ≈ +1,050 m, elevación relativa de ~5.5 km)
 * - Borde del cráter: Radio nominal ≈ 77 km (1.30° angulares marcianos)
 */

import { GALE_CENTER, MOUNT_SHARP_PEAK } from '../science/galeCuriosityData'
import { marsDistance } from '../route/marsDistance'

export type SlopeRiskLevel = 'NOMINAL' | 'PRECAUCIÓN' | 'PELIGROSO'

export interface SlopeEvaluation {
  degrees: number
  riskLevel: SlopeRiskLevel
  maxSafeSpeedKmh: number
  advisory: string
}

/**
 * Calcula la elevación estimada en metros respecto al Areoide de Marte
 * para cualquier coordenada dentro de la región de Gale Crater.
 */
export function getGaleElevation(lon: number, lat: number): number {
  // Distancia horizontal en km respecto al centro de Gale
  const distFromCenterKm = marsDistance([GALE_CENTER.lon, GALE_CENTER.lat], [lon, lat]) / 1000

  // Distancia horizontal en km respecto a la cumbre de Mount Sharp
  const distFromPeakKm = marsDistance([MOUNT_SHARP_PEAK.lon, MOUNT_SHARP_PEAK.lat], [lon, lat]) / 1000

  // Borde exterior y murallas del cráter de impacto Gale (R ≈ 77 km)
  // El foso llano interior (Aeolis Palus) se extiende a cota baja (-4,520 m)
  const craterFloorBase = -4520

  // 1. Murallas y Borde Circular del Cráter de Impacto (Gale Crater Rim Walls):
  // La llanura aluvial de Bradbury / Yellowknife se ubica en el foso norte (~46 km del centro).
  // A partir de los 46.5 km hacia las paredes del cráter, el terreno asciende de forma pronunciada
  // en 360 grados, formando la muralla circular de impacto que culmina en crestas de -1,600 m a -1,450 m.
  let rimElevation = 0
  if (distFromCenterKm > 46.5) {
    const rimProgress = Math.min(1.0, (distFromCenterKm - 46.5) / 22)
    // Escarpe sigmoidal pronunciado característico de las paredes de un cráter de impacto
    const rimProfile = Math.pow(rimProgress, 1.45)
    rimElevation = rimProfile * 3050 // Eleva las murallas hasta aprox -1,470 m
    
    // Terrazas y gradas morfológicas de impacto
    const rimTerrace = Math.sin((distFromCenterKm - 46.5) * 0.4) * 60
    rimElevation += rimTerrace * rimProgress

    // Fuera de la cresta del cráter (R > 68.5 km), desciende suavemente hacia las tierras altas marcianas
    if (distFromCenterKm > 68.5) {
      rimElevation -= Math.min(800, (distFromCenterKm - 68.5) * 35)
    }
  }

  // 2. Montículo Central Sedimentario (Mount Sharp / Aeolis Mons):
  // Se ubica en el centro-sur de la cuenca y asciende hasta +1,050 m
  let moundElevation = 0
  if (distFromPeakKm < 42) {
    const moundProfile = Math.exp(-Math.pow(distFromPeakKm / 18, 1.85))
    moundElevation = moundProfile * (MOUNT_SHARP_PEAK.elevationMeters - craterFloorBase)
    
    // Tiers y bancos sedimentarios estratificados característicos de Mount Sharp (arcillas y sulfatos)
    const strataModulation = Math.sin(distFromPeakKm * 0.45) * 55
    moundElevation += strataModulation * (distFromPeakKm < 28 ? 1.0 : 0.4)
  }

  // Micro-relieves específicos de las unidades de Curiosity:
  // 1. Vera Rubin Ridge (cresta lineal elevada de ~30-40 m a ~ -4180 m)
  const distVeraRubinKm = marsDistance([137.362, -4.685], [lon, lat]) / 1000
  let ridgeEffect = 0
  if (distVeraRubinKm < 3.5) {
    ridgeEffect = Math.exp(-Math.pow(distVeraRubinKm / 1.2, 2)) * 48
  }

  // 2. Depresión de Yellowknife Bay (-4520 m)
  const distYellowknifeKm = marsDistance([137.441, -4.589], [lon, lat]) / 1000
  let depressionEffect = 0
  if (distYellowknifeKm < 4.0) {
    depressionEffect = -Math.exp(-Math.pow(distYellowknifeKm / 2.0, 2)) * 40
  }

  return Math.round(craterFloorBase + moundElevation + rimElevation + ridgeEffect + depressionEffect)
}

/**
 * Calcula la pendiente en grados en un punto mediante diferencias finitas geodésicas (step = 50 m)
 */
export function getGaleSlopeDegrees(lon: number, lat: number): number {
  const stepMeters = 60
  // En el ecuador marciano, 1 grado ≈ 59,160 m
  const dDeg = stepMeters / 59160

  const zEast = getGaleElevation(lon + dDeg, lat)
  const zWest = getGaleElevation(lon - dDeg, lat)
  const zNorth = getGaleElevation(lon, lat + dDeg)
  const zSouth = getGaleElevation(lon, lat - dDeg)

  const dzDx = (zEast - zWest) / (2 * stepMeters)
  const dzDy = (zNorth - zSouth) / (2 * stepMeters)
  const gradientMagnitude = Math.sqrt(dzDx * dzDx + dzDy * dzDy)

  const slopeRad = Math.atan(gradientMagnitude)
  const degrees = (slopeRad * 180) / Math.PI

  return Number(degrees.toFixed(1))
}

/**
 * Evalúa la pendiente según supuestos configurables de locomoción para el prototipo educativo (EVA)
 * y rovers clase Curiosity/Perseverance (no constituye certificación formal de vuelo humano):
 * - NOMINAL: < 8° (Tránsito a pie estimado, consumo metabólico modelado)
 * - PRECAUCIÓN: 8° - 15° (Esfuerzo moderado estimado, riesgo de deslizamiento de regolito, velocidad reducida)
 * - PELIGROSO: > 15° (Pendiente crítica estimada, requiere ruta alterna)
 */
export function evaluateSlope(slopeDegrees: number): SlopeEvaluation {
  if (slopeDegrees < 8) {
    return {
      degrees: slopeDegrees,
      riskLevel: 'NOMINAL',
      maxSafeSpeedKmh: 3.6,
      advisory: 'Terreno estable y óptimo para locomoción a pie y rover. Consumo de O2 nominal.',
    }
  }

  if (slopeDegrees <= 15) {
    return {
      degrees: slopeDegrees,
      riskLevel: 'PRECAUCIÓN',
      maxSafeSpeedKmh: 1.8,
      advisory: 'Pendiente moderada. Tránsito con pasos cortos y firmes; monitorear anclaje de botas y carga metabólica.',
    }
  }

  return {
    degrees: slopeDegrees,
    riskLevel: 'PELIGROSO',
    maxSafeSpeedKmh: 0.6,
    advisory: 'Pendiente crítica (>15°). Peligro de deslizamiento en regolito suelto. No transitar en línea recta.',
  }
}

/**
 * Evalúa una distancia de ruta según la hipótesis de diseño de Walkback para el prototipo de exploración:
 * - Nominal: <= 5 km de la base o vehículo de retorno
 * - Precaución: 5 a 8 km (aproximación al límite modelado de consumibles PLSS)
 * - Contingencia Crítica: > 8 km (riesgo elevado de no retorno a pie en caso de falla de rover)
 */
export function evaluateWalkbackLimit(distanceMeters: number): {
  distanceKm: number
  status: 'NOMINAL' | 'PRECAUCIÓN' | 'CRÍTICO'
  label: string
  percentOfMax: number
} {
  const distanceKm = distanceMeters / 1000
  const maxContingencyKm = 8.0
  const percentOfMax = Math.min(100, Math.round((distanceKm / maxContingencyKm) * 100))

  if (distanceKm <= 5.0) {
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      status: 'NOMINAL',
      label: 'DENTRO DEL RADIO DE WALKBACK NOMINAL (≤ 5.0 KM)',
      percentOfMax,
    }
  }

  if (distanceKm <= 8.0) {
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      status: 'PRECAUCIÓN',
      label: 'ZONA DE PRECAUCIÓN DE WALKBACK (5.0 - 8.0 KM)',
      percentOfMax,
    }
  }

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    status: 'CRÍTICO',
    label: 'EXCESO DE LÍMITE DE WALKBACK (> 8.0 KM) · CONTINGENCIA VITAL',
    percentOfMax,
  }
}
