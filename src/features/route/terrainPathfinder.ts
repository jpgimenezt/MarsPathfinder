/**
 * Algoritmo de Enrutamiento Topográfico Marciano con Evasión de Obstáculos y Relieves Críticos.
 * 
 * En lugar de trazar líneas rectas directas (ruler lines) entre los puntos de parada (A, P, B),
 * este módulo calcula corredores transitables reales evaluando el modelo de elevación hipsométrica
 * y gradientes de pendiente (MOLA / HRSC en Gale Crater, y escarpes en Jezero Crater).
 * 
 * Principios Geodésicos de la NASA (Curiosity / Perseverance EVA Planning):
 * - Pendiente nominal (< 8°): tránsito óptimo a pie o rover.
 * - Pendiente de precaución (8° - 15°): velocidad reducida y mayor costo energético.
 * - Pendiente crítica / peligrosa (> 15°): NO-GO para locomoción directa; el algoritmo
 *   desvía la trayectoria hacia collados, depresiones y valles de menor pendiente.
 * - Geodesia: Radio marciano medio Rm = 3,389,500 m.
 */

import { marsDistance, type MarsPoint } from './marsDistance'
import { getGaleElevation, getGaleSlopeDegrees } from '../terrain/galeElevation'

export interface RouteCorridorPoint {
  point: MarsPoint
  elevationMeters: number
  slopeDegrees: number
  distanceFromStartMeters: number
  isObstacleDetour: boolean
}

export interface OptimizedTerrainRoute {
  coordinates: MarsPoint[]
  detailedPoints: RouteCorridorPoint[]
  totalGroundDistanceMeters: number
  straightLineDistanceMeters: number
  detourRatio: number
  maxSlopeDegrees: number
  averageSlopeDegrees: number
  hazardAvoidedCount: number
}

/**
 * Calcula una ruta topográfica optimizada entre dos puntos en Marte,
 * desviándose orgánicamente alrededor de crestas escarpadas, pendientes > 15° y obstáculos geológicos.
 */
export function calculateObstacleAvoidanceRoute(
  start: MarsPoint,
  goal: MarsPoint,
  samples: number = 36
): MarsPoint[] {
  const [startLon, startLat] = start
  const [goalLon, goalLat] = goal

  const straightDist = marsDistance(start, goal)
  if (straightDist < 10) {
    return [start, goal]
  }

  // Vector director del segmento en espacio angular marciano
  const dLon = goalLon - startLon
  const dLat = goalLat - startLat

  // Vector perpendicular (normal) para desvíos laterales en caso de pendientes críticas
  // Normalizamos aproximadamente en el espacio local
  const mag = Math.hypot(dLon, dLat)
  if (mag === 0) return [start, goal]

  const nx = -dLat / mag
  const ny = dLon / mag

  // Generamos una serie de nodos de navegación a lo largo de la trayectoria
  const rawWaypoints: MarsPoint[] = [start]

  // Analizamos secciones del recorrido
  const numSteps = Math.max(8, Math.min(24, Math.round(samples / 2)))

  for (let i = 1; i < numSteps; i++) {
    const t = i / numSteps
    // Coordenada nominal en línea recta
    const baseLon = startLon + t * dLon
    const baseLat = startLat + t * dLat

    const baseSlope = getGaleSlopeDegrees(baseLon, baseLat)

    // Si la pendiente es nominal (< 8°), no se requiere desvío lateral
    if (baseSlope < 8.5) {
      rawWaypoints.push([baseLon, baseLat])
      continue
    }

    // Si encontramos una pendiente de precaución o peligrosa (> 8.5° y especialmente > 15°),
    // sondeamos lateralmente en ambas direcciones perpendiculares para buscar el collado/valle de menor pendiente.
    // La amplitud máxima del desvío lateral depende de la distancia total (hasta un 18% de la longitud del tramo)
    const maxOffsetDegrees = (mag * 0.22) * Math.sin(t * Math.PI) // Forma de huso que cierra en start y goal

    const candidates: { point: MarsPoint; cost: number }[] = []

    // Probar el punto base
    candidates.push({
      point: [baseLon, baseLat],
      cost: calculateTerrainTraversalCost(baseLon, baseLat, 0),
    })

    // Sondeo bilateral en 7 niveles de offset (+/-)
    const lateralSteps = 7
    for (let s = 1; s <= lateralSteps; s++) {
      const offsetFraction = s / lateralSteps
      const offset = maxOffsetDegrees * offsetFraction

      // Lateral derecho
      const rightLon = baseLon + nx * offset
      const rightLat = baseLat + ny * offset
      candidates.push({
        point: [rightLon, rightLat],
        cost: calculateTerrainTraversalCost(rightLon, rightLat, offsetFraction),
      })

      // Lateral izquierdo
      const leftLon = baseLon - nx * offset
      const leftLat = baseLat - ny * offset
      candidates.push({
        point: [leftLon, leftLat],
        cost: calculateTerrainTraversalCost(leftLon, leftLat, offsetFraction),
      })
    }

    // Elegir el candidato con menor costo de locomoción
    candidates.sort((a, b) => a.cost - b.cost)
    rawWaypoints.push(candidates[0].point)
  }

  rawWaypoints.push(goal)

  // Suavizado spline Catmull-Rom para producir una trayectoria continua y orgánica
  // semejante a las huellas y recorridos de Curiosity y Perseverance (NASA/JPL).
  return smoothPathCatmullRom(rawWaypoints, samples)
}

/**
 * Función de costo de transitabilidad según pendientes y accidentes topográficos.
 * Penaliza fuertemente pendientes > 15° (peligrosas para EVA a pie y rovers).
 */
function calculateTerrainTraversalCost(lon: number, lat: number, lateralOffsetNorm: number): number {
  const slope = getGaleSlopeDegrees(lon, lat)
  const elev = getGaleElevation(lon, lat)

  let slopePenalty = 1.0
  if (slope < 6) {
    slopePenalty = 1.0 + slope * 0.05
  } else if (slope < 12) {
    slopePenalty = 2.0 + (slope - 6) * 0.8
  } else if (slope < 18) {
    slopePenalty = 10.0 + (slope - 12) * 5.0 // Esfuerzo crítico
  } else {
    slopePenalty = 60.0 + (slope - 18) * 15.0 // Terreno prohibitivo (acantilado/escarpe)
  }

  // Pequeña penalización por desvío excesivo para evitar curvas absurdas si el terreno es homogéneo
  const detourPenalty = 1.0 + lateralOffsetNorm * 0.65

  // Preferir depresiones y valles suaves sobre crestas afiladas
  const crestPenalty = elev > -4000 ? 1.25 : 1.0

  return slopePenalty * detourPenalty * crestPenalty
}

/**
 * Interpolación cúbica Catmull-Rom para generar una polilínea densa, suave y estéticamente idéntica
 * a las rutas de navegación de la NASA.
 */
function smoothPathCatmullRom(points: MarsPoint[], targetCount: number): MarsPoint[] {
  if (points.length <= 2) {
    const res: MarsPoint[] = []
    const [p0, p1] = points
    for (let i = 0; i <= targetCount; i++) {
      const t = i / targetCount
      res.push([p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1])])
    }
    return res
  }

  const result: MarsPoint[] = []
  const n = points.length

  // Duplicar extremos para condiciones de frontera
  const extended: MarsPoint[] = [points[0], ...points, points[n - 1]]

  const segments = n - 1
  const pointsPerSegment = Math.max(3, Math.ceil(targetCount / segments))

  for (let i = 0; i < segments; i++) {
    const p0 = extended[i]
    const p1 = extended[i + 1]
    const p2 = extended[i + 2]
    const p3 = extended[i + 3]

    for (let j = 0; j < pointsPerSegment; j++) {
      if (i > 0 && j === 0) continue // Evitar duplicar punto de empalme
      const t = j / pointsPerSegment

      const t2 = t * t
      const t3 = t2 * t

      // Matriz Catmull-Rom estándar
      const lon = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      )

      const lat = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      )

      result.push([lon, lat])
    }
  }

  // Garantizar que termine exactamente en el destino final
  result.push(points[n - 1])
  return result
}

/**
 * Genera una ruta alternativa de exploración geológica (como se observa en los mapas de travesía
 * de Perseverance y Curiosity en la NASA, mostrada como línea cian translúcida secundaria).
 */
export function calculateSecondaryExploratoryCorridor(
  start: MarsPoint,
  goal: MarsPoint,
  samples: number = 30
): MarsPoint[] {
  const [startLon, startLat] = start
  const [goalLon, goalLat] = goal

  const dLon = goalLon - startLon
  const dLat = goalLat - startLat
  const mag = Math.hypot(dLon, dLat)
  if (mag === 0) return [start, goal]

  // Desfase hacia un corredor geológico adyacente
  const nx = -dLat / mag
  const ny = dLon / mag
  const offsetMag = mag * 0.14

  const intermediate1: MarsPoint = [
    startLon + 0.3 * dLon + nx * offsetMag,
    startLat + 0.3 * dLat + ny * offsetMag,
  ]
  const intermediate2: MarsPoint = [
    startLon + 0.7 * dLon + nx * (offsetMag * 0.8),
    startLat + 0.7 * dLat + ny * (offsetMag * 0.8),
  ]

  return smoothPathCatmullRom([start, intermediate1, intermediate2, goal], samples)
}

/**
 * Calcula la distancia superficial total integrada a lo largo de una polilínea densa
 */
export function calculatePolylineMeters(points: MarsPoint[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += marsDistance(points[i - 1], points[i])
  }
  return Math.round(total)
}
