import { marsDistance, type MarsPoint } from './marsDistance'
import { findMissionTerrainRoute, type TerrainGrid, type TerrainMissionRoute, type TerrainRoutingOptions } from './terrainPathfinder'
import type { Stops } from './routePlan'

export type AlternativeId = 'short' | 'balanced' | 'cautious'
export const ROUTING_PROFILES: Record<AlternativeId, { label: string; explanation: string; options: Partial<TerrainRoutingOptions> }> = {
  short: { label: 'Más corta estimada', explanation: 'Minimiza la distancia entre celdas admitidas.', options: { maxSlopeDegrees: 25, slopePenalty: 0, ascentPenalty: 0 } },
  balanced: { label: 'Equilibrada', explanation: 'Penaliza pendiente y ascenso relativos.', options: { maxSlopeDegrees: 20, slopePenalty: 6, ascentPenalty: 4 } },
  cautious: { label: 'Menor exposición estimada', explanation: 'Evita pendientes mayores según supuestos ilustrativos, no peligros medidos.', options: { maxSlopeDegrees: 15, slopePenalty: 18, ascentPenalty: 8 } },
}
export interface Alternative {
  id: AlternativeId
  route: TerrainMissionRoute
  distinct: boolean
}

export function compareTerrainRoutes(grid: TerrainGrid, stops: Stops): Alternative[] {
  const seen = new Set<string>()
  return (Object.keys(ROUTING_PROFILES) as AlternativeId[]).map(id => {
    const route = findMissionTerrainRoute(grid, stops, ROUTING_PROFILES[id].options)
    const key = route.points?.map(point => point.map(value => value.toFixed(5)).join(',')).join(';')
    const distinct = Boolean(key && !seen.has(key))
    if (key) seen.add(key)
    return { id, route, distinct }
  })
}

export function estimateDurationHours(distanceMeters: number, speedKmh: number): number | null {
  return Number.isFinite(distanceMeters) && distanceMeters >= 0
    && Number.isFinite(speedKmh) && speedKmh > 0
    ? distanceMeters / (speedKmh * 1000) : null
}

export function horizontalDistance(points: MarsPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + marsDistance(points[index], point), 0)
}
