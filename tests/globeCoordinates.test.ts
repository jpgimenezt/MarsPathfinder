import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { isFrontFacing, isSurfaceClick, JEZERO_CRATER, surfacePoint, texturePosition } from '../src/features/globe/globeCoordinates'

describe('orientación del globo MOLA (-180…180°E, planetocéntrico)', () => {
  it('ubica Jezero en la parte oriental y el hemisferio norte de la textura', () => {
    expect(JEZERO_CRATER).toEqual([77.69, 18.41])
    expect(texturePosition(...JEZERO_CRATER)[0]).toBeCloseTo(0.7158056, 6)
    expect(texturePosition(...JEZERO_CRATER)[1]).toBeCloseTo(0.3977222, 6)
    const point = surfacePoint(...JEZERO_CRATER)
    expect(point.y).toBeGreaterThan(0)
    expect(point.z).toBeLessThan(0)
    expect(point.length()).toBeCloseTo(1)
    expect(surfacePoint(0, 0)).toEqual(new Vector3(1, 0, -0))
    expect(surfacePoint(90, 0).z).toBeCloseTo(-1)
  })
  it('oculta el marcador detrás del globo y separa clic de arrastre', () => {
    const point = surfacePoint(...JEZERO_CRATER, 1.025)
    expect(isFrontFacing(point, point.clone().multiplyScalar(3), 1.025)).toBe(true)
    expect(isFrontFacing(point, point.clone().multiplyScalar(-3), 1.025)).toBe(false)
    expect(isSurfaceClick(5, 5, 9, 9)).toBe(true)
    expect(isSurfaceClick(5, 5, 12, 5)).toBe(false)
    expect(() => surfacePoint(NaN, 0)).toThrow()
    expect(() => surfacePoint(10, -91)).toThrow()
  })
})
