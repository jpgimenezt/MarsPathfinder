import { describe, expect, it } from 'vitest'
import { MARS_MEAN_RADIUS_METERS, marsDistance, routeDistance } from '../src/features/route/marsDistance'
import { CTX_EXTENT, ROI, insideRoi } from '../src/features/map/marsProjection'

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
  it('habilita el sector CTX auditado, con margen respecto al bbox nominal', () => {
    expect(ROI).toEqual([77.164, 18.215, 77.695, 18.717])
    expect(ROI[0]).toBeGreaterThan(CTX_EXTENT[0])
    expect(ROI[1]).toBeGreaterThan(CTX_EXTENT[1])
    expect(ROI[2]).toBeLessThan(CTX_EXTENT[2])
    expect(ROI[3]).toBeLessThan(CTX_EXTENT[3])
    expect(insideRoi([77.43, 18.38])).toBe(true)
    for (const x of [ROI[0] + 0.001, ROI[2] - 0.001]) {
      for (const y of [ROI[1] + 0.001, ROI[3] - 0.001]) {
        expect(insideRoi([x, y])).toBe(true)
      }
    }
    expect(insideRoi([77.60, 18.39])).toBe(true)
    expect(insideRoi([CTX_EXTENT[0], 18.4])).toBe(false)
    expect(insideRoi([77.43, CTX_EXTENT[3]])).toBe(false)
    expect(insideRoi([0, 0])).toBe(false)
    expect(insideRoi([NaN, 18.4])).toBe(false)
  })
})
