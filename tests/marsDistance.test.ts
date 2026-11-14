import { describe, expect, it } from 'vitest'
import { MARS_MEAN_RADIUS_METERS, marsDistance, routeDistance } from '../src/features/route/marsDistance'
import { insideRoi } from '../src/features/map/marsProjection'

describe('distancias y cobertura de Marte', () => {
  it('retorna cero para un punto idéntico', () => expect(marsDistance([77, 18], [77, 18])).toBe(0))
  it('usa el radio marciano en el cuarto de circunferencia', () => {
    expect(MARS_MEAN_RADIUS_METERS).toBe(3_389_500)
    expect(marsDistance([0, 0], [90, 0])).toBeCloseTo(Math.PI * 3_389_500 / 2, 5)
  })
  it('normaliza el cruce 0/360 representado como ±180', () => {
    expect(marsDistance([179, 0], [-179, 0])).toBeCloseTo(2 * Math.PI * 3_389_500 / 180, 4)
  })
  it('rechaza latitud, longitud y NaN inválidos', () => {
    expect(() => marsDistance([0, 91], [0, 0])).toThrow(RangeError)
    expect(() => marsDistance([181, 0], [0, 0])).toThrow(RangeError)
    expect(() => marsDistance([NaN, 0], [0, 0])).toThrow(RangeError)
  })
  it('suma tramos consecutivos sin inventar relieve', () => {
    expect(routeDistance([[0, 0], [1, 0], [2, 0]])).toBeCloseTo(marsDistance([0, 0], [2, 0]), 5)
  })
  it('bloquea puntos fuera del recorte, sin afirmar cobertura fina', () => {
    expect(insideRoi([77.43, 18.38])).toBe(true)
    expect(insideRoi([0, 0])).toBe(false)
  })
})
