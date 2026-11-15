/**
 * Modelo de Elevación y Gradientes Topográficos de Gale Crater y Mount Sharp (Aeolis Mons).
 * Basado en los perfiles hipsométricos de MGS MOLA y Mars Express HRSC.
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

  // Borde exterior del cráter (R ≈ 77 km): sube hasta -1800 m
  const craterRimRadiusKm = 77
  const craterFloorBase = -4480

  // Contribución de Mount Sharp (mound central asimétrico)
  // Ancho característico de la base de Mount Sharp: ~28 km
  let moundElevation = 0
  if (distFromPeakKm < 42) {
    const moundProfile = Math.exp(-Math.pow(distFromPeakKm / 19, 1.8))
    moundElevation = moundProfile * (MOUNT_SHARP_PEAK.elevationMeters - craterFloorBase)
    
    // Tiers y bancos sedimentarios estratificados característicos de Mount Sharp
    const strataModulation = Math.sin(distFromPeakKm * 0.45) * 45
    moundElevation += strataModulation * (distFromPeakKm < 30 ? 1 : 0)
  }

  // Contribución de la pared del cráter (transición piso a murallas a partir de 47 km)
  let rimElevation = 0
  if (distFromCenterKm > 47) {
    const rimFraction = Math.min(1, Math.max(0, (distFromCenterKm - 47) / (craterRimRadiusKm - 47)))
    rimElevation = Math.pow(rimFraction, 2.0) * 2600 // De -4480 a aprox -1880 m
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
 * Evalúa la pendiente según los criterios de seguridad de locomoción de NASA para astronautas (EVA)
 * y rovers clase Curiosity/Perseverance:
 * - NOMINAL: < 8° (Tránsito a pie seguro, consumo metabólico normal)
 * - PRECAUCIÓN: 8° - 15° (Esfuerzo moderado, riesgo de deslizamiento de regolito, velocidad reducida)
 * - PELIGROSO: > 15° (Pendiente crítica, riesgo de caída/avalancha de arena, requiere cuerda/ruta alterna)
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
 * Evalúa una distancia de ruta según la Regla de Walkback de la NASA para misiones de superficie:
 * - Nominal: <= 5 km de la base o vehículo de retorno
 * - Precaución: 5 a 8 km (aproximación al límite de consumibles PLSS)
 * - Contingencia Crítica: > 8 km (riesgo extremo de no retorno a pie en caso de falla de rover)
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
