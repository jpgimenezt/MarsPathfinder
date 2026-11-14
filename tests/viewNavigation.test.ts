import { describe, expect, it } from 'vitest'
import { changeZoom, createGlobalView, createJezeroView, fitGlobal, fitJezero, zoomAvailability } from '../src/features/map/viewNavigation'
import { CTX_EXTENT, ROI } from '../src/features/map/marsProjection'

describe('zoom de Jezero con cobertura declarada', () => {
  it.each([[1100, 740], [560, 540], [375, 420]])('permite acercar y alejar desde el encuadre inicial %ix%i', (width, height) => {
    const view = createJezeroView()
    view.setViewportSize([width, height])
    fitJezero(view, [width, height])
    const initial = view.getZoom()!
    expect(changeZoom(view, -0.75)).toBe(true)
    expect(view.getZoom()!).toBeLessThan(initial)
    expect(changeZoom(view, 0.75)).toBe(true)
    expect(view.getZoom()!).toBeGreaterThan(initial - 0.75)
  })
  it('deshabilita alejar al límite y no amplía la huella de CTX', () => {
    const view = createJezeroView()
    view.setViewportSize([1100, 740])
    fitJezero(view, [1100, 740])
    for (let index = 0; index < 20; index++) changeZoom(view, -0.75)
    expect(zoomAvailability(view).out).toBe(false)
    const visible = view.calculateExtent([1100, 740])
    expect(visible[0]).toBeGreaterThanOrEqual(CTX_EXTENT[0] - 0.00001)
    expect(visible[1]).toBeGreaterThanOrEqual(CTX_EXTENT[1] - 0.00001)
    expect(visible[2]).toBeLessThanOrEqual(CTX_EXTENT[2] + 0.00001)
    expect(visible[3]).toBeLessThanOrEqual(CTX_EXTENT[3] + 0.00001)
    fitJezero(view, [1100, 740])
    expect(view.calculateExtent([1100, 740])[0]).toBeLessThan(ROI[0])
  })
  it('vista global usa Marte angular real y limita el acercamiento al máximo de MOLA', () => {
    const view = createGlobalView()
    view.setViewportSize([1100, 740])
    fitGlobal(view, [1100, 740])
    expect(view.getProjection().getCode()).toBe('urn:ogc:def:crs:EPSG::104905')
    expect(view.getZoom()!).toBeLessThanOrEqual(3)
    for (let index = 0; index < 30; index++) changeZoom(view, 0.75)
    expect(view.getZoom()).toBe(8) // z7 MOLA es el máximo del producto
    expect(zoomAvailability(view).in).toBe(false)
  })
})
