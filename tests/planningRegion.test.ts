import { describe, expect, it } from 'vitest'
import { ROI } from '../src/features/map/marsProjection'
import { JEZERO_CONTEXT, handleCoordinates, inRegion, resizeRegion, segmentCoverage,
  shiftRegion, validRegion } from '../src/features/map/planningRegion'

describe('región manual independiente de cobertura CTX', () => {
  it('acepta región del cráter, evita degeneración, NaN y salida del entorno', () => {
    expect(validRegion(JEZERO_CONTEXT)).toBe(true)
    expect(validRegion(ROI)).toBe(true)
    expect(validRegion([77.5, 18.4, 77.51, 18.7])).toBe(false)
    expect(validRegion([77.5, 18.4, 77.7, NaN])).toBe(false)
    expect(validRegion([76.9, 18.4, 77.6, 18.7])).toBe(false)
    expect(inRegion([77.9, 18.5], JEZERO_CONTEXT)).toBe(true)
    expect(inRegion([77.9, 18.5], ROI)).toBe(false)
  })
  it('mueve lados, esquinas e interior sin alterar el rectángulo verificado', () => {
    const handles = handleCoordinates(ROI)
    expect(Object.keys(handles)).toEqual(['sw', 's', 'se', 'e', 'ne', 'n', 'nw', 'w'])
    expect(handles.sw).toEqual([ROI[0], ROI[1]])
    expect(handles.n).toEqual([(ROI[0] + ROI[2]) / 2, ROI[3]])
    expect(handles.ne).toEqual([ROI[2], ROI[3]])
    expect(resizeRegion(ROI, 'ne', [77.8, 18.8])).toEqual([ROI[0], ROI[1], 77.8, 18.8])
    expect(resizeRegion(ROI, 's', [77.4, 18.1])).toEqual([ROI[0], 18.1, ROI[2], ROI[3]])
    expect(shiftRegion(ROI, 0.1, 0.1)).toEqual([ROI[0] + 0.1, ROI[1] + 0.1, ROI[2] + 0.1, ROI[3] + 0.1])
    expect(ROI).toEqual([77.164, 18.215, 77.695, 18.717])
  })
  it('distingue tramos completos, parciales y sin CTX incluso si extremos están afuera', () => {
    expect(segmentCoverage([77.3, 18.4], [77.6, 18.5], ROI)).toBe('complete')
    expect(segmentCoverage([77.5, 18.4], [77.9, 18.4], ROI)).toBe('partial')
    expect(segmentCoverage([77.1, 18.4], [77.9, 18.4], ROI)).toBe('partial')
    expect(segmentCoverage([77.9, 18.2], [77.9, 18.7], ROI)).toBe('none')
  })
})
