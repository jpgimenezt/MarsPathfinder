import { describe, it, expect } from 'vitest'
import {
  CURIOSITY_HISTORICAL_PATH,
  compareCuriosityWithEva,
} from '../src/features/science/curiosityPathData'

describe('Curiosity Exploration Heritage & Mission Comparison', () => {
  it('contiene los hitos históricos fundamentales de la misión MSL (Sol 0 a Sol 3800)', () => {
    expect(CURIOSITY_HISTORICAL_PATH.length).toBeGreaterThanOrEqual(10)
    
    const landing = CURIOSITY_HISTORICAL_PATH[0]
    expect(landing.id).toBe('msl-sol0')
    expect(landing.sol).toBe(0)
    expect(landing.cumulativeDistKm).toBe(0)

    const yellowknife = CURIOSITY_HISTORICAL_PATH.find(p => p.sol === 126)
    expect(yellowknife).toBeDefined()
    expect(yellowknife?.scienceSummary).toContain('lago antiguo')

    const pontours = CURIOSITY_HISTORICAL_PATH.find(p => p.sol === 3148)
    expect(pontours).toBeDefined()
    expect(pontours?.scienceSummary).toContain('grietas')
  })

  it('verifica que la odometría acumulada sea monótona creciente', () => {
    for (let i = 1; i < CURIOSITY_HISTORICAL_PATH.length; i++) {
      expect(CURIOSITY_HISTORICAL_PATH[i].cumulativeDistKm).toBeGreaterThan(
        CURIOSITY_HISTORICAL_PATH[i - 1].cumulativeDistKm
      )
    }
  })

  it('compara métricas operacionales de rover robótico vs EVA tripulada', () => {
    const comparison = compareCuriosityWithEva(5.2, 1.8)
    
    expect(comparison.roverTraverse.cumulativeDistanceKm).toBe(32.2)
    expect(comparison.roverTraverse.durationYears).toBeGreaterThan(10)
    expect(comparison.roverTraverse.averageSpeedKmh).toBeLessThan(1.0)
    expect(comparison.roverTraverse.maxSlopeToleranceDeg).toBe(15)

    expect(comparison.humanEvaPlan.plannedDistanceKm).toBe(5.2)
    expect(comparison.humanEvaPlan.durationHours).toBe(1.8)
    expect(comparison.humanEvaPlan.averageSpeedKmh).toBeGreaterThan(3.0)
    expect(comparison.humanEvaPlan.primaryConstraint).toContain('Walkback')
  })
})
