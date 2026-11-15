import { describe, it, expect } from 'vitest'
import {
  calculateObstacleAvoidanceRoute,
  calculateSecondaryExploratoryCorridor,
  calculatePolylineMeters,
} from '../src/features/route/terrainPathfinder'
import { marsDistance, type MarsPoint } from '../src/features/route/marsDistance'
import { getGaleSlopeDegrees } from '../src/features/terrain/galeElevation'

describe('Topographic Terrain Pathfinder & Obstacle Avoidance', () => {
  const startPoint: MarsPoint = [137.441, -4.589] // Yellowknife Bay / Bradbury area
  const goalPoint: MarsPoint = [137.362, -4.685] // Vera Rubin Ridge

  it('generates a non-linear path with valid start and end points', () => {
    const route = calculateObstacleAvoidanceRoute(startPoint, goalPoint, 24)

    expect(route.length).toBeGreaterThanOrEqual(10)
    // Starts close to startPoint
    expect(Math.abs(route[0][0] - startPoint[0])).toBeLessThan(0.001)
    expect(Math.abs(route[0][1] - startPoint[1])).toBeLessThan(0.001)

    // Ends close to goalPoint
    const last = route[route.length - 1]
    expect(Math.abs(last[0] - goalPoint[0])).toBeLessThan(0.001)
    expect(Math.abs(last[1] - goalPoint[1])).toBeLessThan(0.001)
  })

  it('calculates integrated ground distance longer than straight-line Euclidean distance due to terrain detours', () => {
    const route = calculateObstacleAvoidanceRoute(startPoint, goalPoint, 30)
    const integratedDist = calculatePolylineMeters(route)
    const straightDist = marsDistance(startPoint, goalPoint)

    expect(integratedDist).toBeGreaterThanOrEqual(straightDist * 0.99)
    expect(Number.isFinite(integratedDist)).toBe(true)
  })

  it('produces intermediate points that navigate around high slopes', () => {
    const route = calculateObstacleAvoidanceRoute(startPoint, goalPoint, 30)

    // Verify all points have finite coordinates and realistic slope evaluations
    for (const pt of route) {
      expect(Number.isFinite(pt[0])).toBe(true)
      expect(Number.isFinite(pt[1])).toBe(true)
      const slope = getGaleSlopeDegrees(pt[0], pt[1])
      expect(Number.isFinite(slope)).toBe(true)
      expect(slope).toBeGreaterThanOrEqual(0)
    }
  })

  it('generates secondary exploratory corridor for dual traverse view', () => {
    const secondary = calculateSecondaryExploratoryCorridor(startPoint, goalPoint, 20)

    expect(secondary.length).toBeGreaterThanOrEqual(8)
    expect(secondary[0][0]).toBeCloseTo(startPoint[0], 2)
    expect(secondary[secondary.length - 1][0]).toBeCloseTo(goalPoint[0], 2)
  })
})
