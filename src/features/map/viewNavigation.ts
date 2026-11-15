import View from 'ol/View.js'
import { marsProjection, ROI } from './marsProjection'
import { EDIT_LIMITS, JEZERO_CONTEXT } from './planningRegion'

export function createJezeroView(): View {
  return new View({
    projection: marsProjection,
    center: [77.69, 18.41],
    zoom: 10,
    minZoom: 7.5,
    maxZoom: 14,
    // Solo restringe el CENTRO a los alrededores de Jezero, no la cobertura.
    extent: [...EDIT_LIMITS],
    constrainOnlyCenter: true,
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

export function fitJezero(view: View, size: number[], panelOpen = false): void {
  const [width, height] = size
  const padding = width <= 680
    ? [24, 26, panelOpen ? Math.min(300, height * 0.43) : 28, 26]
    : [36, 36, 36, panelOpen ? Math.min(390, width * 0.34) : 36]
  view.fit([...JEZERO_CONTEXT], { size, padding, maxZoom: 11.3 })
}

export function fitCtx(view: View, size: number[], panelOpen = false): void {
  const [width, height] = size
  const padding = width <= 680
    ? [24, 26, panelOpen ? Math.min(300, height * 0.43) : 28, 26]
    : [36, 36, 36, panelOpen ? Math.min(390, width * 0.34) : 36]
  view.fit(ROI, { size, padding, maxZoom: 12.5 })
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
