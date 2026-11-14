import View from 'ol/View.js'
import { CTX_EXTENT, marsProjection, ROI } from './marsProjection'

export function createJezeroView(): View {
  return new View({
    projection: marsProjection,
    center: [77.43, 18.38],
    zoom: 12,
    minZoom: 7,
    maxZoom: 14,
    extent: CTX_EXTENT,
    showFullExtent: false,
  })
}

export function createGlobalView(): View {
  return new View({
    projection: marsProjection,
    center: [77.43, 18.38],
    zoom: 3,
    minZoom: 0,
    maxZoom: 8,
    extent: [-180, -90, 180, 90],
    showFullExtent: true,
  })
}

export function fitJezero(view: View, size: number[]): void {
  view.fit(ROI, { size, padding: [36, 36, 36, 36], maxZoom: 12.5 })
}

export function fitGlobal(view: View, size: number[]): void {
  view.fit([-180, -85, 180, 85], { size, padding: [28, 28, 28, 28], maxZoom: 3 })
}

// Retorna false cuando la restricción por huella/visor impide cambiar escala.
export function changeZoom(view: View, delta: number): boolean {
  const current = view.getZoom()
  if (current === undefined) return false
  view.setZoom(current + delta)
  return Math.abs((view.getZoom() ?? current) - current) > 0.01
}

export function zoomAvailability(view: View): { in: boolean; out: boolean } {
  const zoom = view.getZoom()
  if (zoom === undefined) return { in: false, out: false }
  const resolution = view.getResolution()
  if (resolution === undefined) return { in: false, out: false }
  const zoomIn = view.getConstrainedZoom(zoom + 0.75)
  const zoomOut = view.getConstrainedZoom(zoom - 0.75)
  return {
    in: zoomIn !== undefined && zoomIn > zoom + 0.01,
    out: zoomOut !== undefined && zoomOut < zoom - 0.01,
  }
}
