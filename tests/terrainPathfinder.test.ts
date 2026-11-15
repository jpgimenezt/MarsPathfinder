import { describe, expect, it } from 'vitest'
import { findMissionTerrainRoute, findTerrainRoute, type TerrainGrid } from '../src/features/route/terrainPathfinder'
import { compareTerrainRoutes, estimateDurationHours, horizontalDistance } from '../src/features/route/terrainAlternatives'
import { marsDistance } from '../src/features/route/marsDistance'

function grid(width = 7, height = 7): TerrainGrid {
  return { width, height, bounds: [77.3, 18.3, 77.31, 18.31],
    elevations: Array(width * height).fill(0), maxSlopeDegrees: Array(width * height).fill(0),
    source: 'SYNTHETIC TEST ONLY', nominalSourceResolutionMeters: 20, gridStepMeters: 80 }
}
const at = (g: TerrainGrid, x: number, y: number): [number, number] =>
  [g.bounds[0] + x * (g.bounds[2] - g.bounds[0]) / (g.width - 1),
    g.bounds[3] - y * (g.bounds[3] - g.bounds[1]) / (g.height - 1)]

describe('A* DEM: datos sintéticos únicamente en tests', () => {
  it('rodea celdas bloqueadas sin pisarlas ni cortar esquinas diagonales', () => {
    const g = grid(5, 5)
    g.maxSlopeDegrees[2 + 2 * 5] = 50
    const route = findTerrainRoute(g, at(g, 0, 2), at(g, 4, 2))
    expect(route.ok).toBe(true)
    if (!route.ok) return
    expect(route.points).not.toContainEqual(at(g, 2, 2))
    expect(route.distanceMeters).toBeGreaterThan(marsDistance(at(g, 0, 2), at(g, 4, 2)))
    const corner = grid(2, 2)
    corner.elevations[1] = null
    corner.elevations[2] = null
    expect(findTerrainRoute(corner, at(corner, 0, 0), at(corner, 1, 1))).toEqual({ ok: false, reason: 'no-path' })
  })
  it('rechaza NoData, extremos inválidos y umbrales de pendiente configurados', () => {
    const g = grid(3, 3)
    g.elevations[0] = null
    expect(findTerrainRoute(g, at(g, 0, 0), at(g, 2, 2))).toEqual({ ok: false, reason: 'no-elevation' })
    expect(findTerrainRoute(g, [0, 0], at(g, 2, 2))).toEqual({ ok: false, reason: 'outside-dem' })
    g.elevations[0] = 0
    g.maxSlopeDegrees[4] = null
    expect(findTerrainRoute(g, at(g, 1, 1), at(g, 2, 2)).ok).toBe(false)
    g.maxSlopeDegrees[4] = 25
    expect(findTerrainRoute(g, at(g, 1, 1), at(g, 2, 2), { maxSlopeDegrees: 15 })).toEqual({ ok: false, reason: 'steep-endpoint' })
    expect(findTerrainRoute(g, at(g, 1, 1), at(g, 2, 2), { maxSlopeDegrees: 30 }).ok).toBe(true)
  })
  it('calcula ascenso/descenso y no inventa distancia extra en una sola celda', () => {
    const g = grid(3, 2)
    g.elevations = [0, 20, 0, 0, 20, 0]
    const route = findTerrainRoute(g, at(g, 0, 0), at(g, 2, 0), { maxSlopeDegrees: 80 })
    expect(route.ok).toBe(true)
    if (!route.ok) return
    expect(route.ascentMeters).toBeGreaterThan(0)
    expect(route.descentMeters).toBeGreaterThan(0)
    expect(route.maximumSlopeDegrees).toBeGreaterThan(0)
    expect(route.segmentSlopeDegrees).toHaveLength(route.points.length - 1)
    const point = at(g, 0, 0)
    const same = findTerrainRoute(g, point, point)
    expect(same.ok && same.distanceMeters).toBe(0)
  })
  it('conserva A→P y P→B: si falla uno no presenta total como evaluado', () => {
    const g = grid()
    const a = at(g, 0, 0), p = at(g, 3, 3), b = at(g, 6, 6)
    const mission = findMissionTerrainRoute(g, { A: a, P: p, B: b })
    expect(mission.points).not.toBeNull()
    expect(mission.distanceMeters).toBeGreaterThan(0)
    g.elevations[6 + 6 * g.width] = null
    const incomplete = findMissionTerrainRoute(g, { A: a, P: p, B: b })
    expect(incomplete.first?.ok).toBe(true)
    expect(incomplete.second).toEqual({ ok: false, reason: 'no-elevation' })
    expect(incomplete.distanceMeters).toBeNull()
    expect(incomplete.points).toBeNull()
  })
  it('ofrece alternativas distintas solo si el trazado realmente difiere', () => {
    const g = grid(7, 5)
    // La ruta directa cruza pendientes aceptables para "más corta", pero no
    // para la alternativa cautelosa; un corredor vecino permanece plano.
    for (let x = 2; x <= 4; x++) g.maxSlopeDegrees[2 * 7 + x] = 23
    const alternatives = compareTerrainRoutes(g, { A: at(g, 0, 2), P: at(g, 6, 2) })
    expect(alternatives[0].route.first?.ok).toBe(true)
    expect(alternatives[2].route.first?.ok).toBe(true)
    expect(alternatives.filter(a => a.distinct).length).toBeGreaterThan(1)
    const first = alternatives[0].route.first
    if (first?.ok) expect(horizontalDistance(first.points)).toBeGreaterThan(0)
  })
  it('estima tiempo solo con velocidad y distancia válidas', () => {
    expect(estimateDurationHours(4000, 2)).toBe(2)
    expect(estimateDurationHours(4000, 0)).toBeNull()
    expect(estimateDurationHours(NaN, 2)).toBeNull()
  })
})
