import { describe, expect, it } from 'vitest'
import { changeZoom, createGlobalView, createJezeroView, fitCtx, fitGlobal, fitJezero, zoomAvailability } from '../src/features/map/viewNavigation'
import { CTX_EXTENT, ROI } from '../src/features/map/marsProjection'
import { JEZERO_CONTEXT } from '../src/features/map/planningRegion'

describe('navegación de Jezero independiente de cobertura CTX', () => {
  it.each([[1100, 740], [560, 540], [375, 420]])('encuadra Jezero y el sector CTX en %ix%i sin limitarse al bbox', (width, height) => {
    const view = createJezeroView()
    view.setViewportSize([width, height])
    fitJezero(view, [width, height])
    const initial = view.getZoom()!
    const initialExtent = view.calculateExtent([width, height])
    expect(initialExtent[0]).toBeLessThan(JEZERO_CONTEXT[0])
    expect(initialExtent[1]).toBeLessThan(JEZERO_CONTEXT[1])
    expect(initialExtent[2]).toBeGreaterThan(JEZERO_CONTEXT[2])
    expect(initialExtent[3]).toBeGreaterThan(JEZERO_CONTEXT[3])
    fitCtx(view, [width, height])
    expect(view.getZoom()!).toBeGreaterThan(initial)
    fitJezero(view, [width, height])
    expect(view.getZoom()!).toBeCloseTo(initial, 4)
    expect(changeZoom(view, 0.75)).toBe(true)
    expect(view.getZoom()!).toBeGreaterThan(initial)
    expect(changeZoom(view, -0.75)).toBe(true)
    expect(view.getZoom()!).toBeCloseTo(initial, 4)
  })
  it('permite desplazar el centro al este del mosaico sin cambiar el rectángulo CTX', () => {
    const view = createJezeroView()
    view.setViewportSize([1100, 740])
    view.setCenter([78, 18.41])
    expect(view.getCenter()![0]).toBeCloseTo(78)
    expect(view.getCenter()![0]).toBeGreaterThan(CTX_EXTENT[2])
    expect(ROI).toEqual([77.164, 18.215, 77.695, 18.717])
  })
  it('deshabilita alejar al límite sin confundir el área visible con la cobertura CTX', () => {
    const view = createJezeroView()
    view.setViewportSize([1100, 740])
    fitJezero(view, [1100, 740])
    for (let index = 0; index < 20; index++) changeZoom(view, -0.75)
    expect(zoomAvailability(view).out).toBe(false)
    const visible = view.calculateExtent([1100, 740])
    // El área visible puede incluir márgenes SIN imagen fuera del bbox;
    // el ROI es cobertura auditada, NO el rectángulo manual editable.
    expect(visible[0]).toBeLessThan(CTX_EXTENT[0])
    expect(visible[0]).toBeLessThan(ROI[0])
    expect(visible[1]).toBeLessThan(ROI[1])
    expect(visible[2]).toBeGreaterThan(ROI[2])
    expect(visible[3]).toBeGreaterThan(ROI[3])
    fitJezero(view, [1100, 740])
    const framed = view.calculateExtent([1100, 740])
    expect(framed[0]).toBeLessThan(ROI[0])
    expect(framed[1]).toBeLessThan(ROI[1])
    expect(framed[2]).toBeGreaterThan(ROI[2])
    expect(framed[3]).toBeGreaterThan(ROI[3])
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
