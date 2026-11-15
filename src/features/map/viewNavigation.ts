import View from 'ol/View.js'
import { marsProjection, ROI } from './marsProjection'
import { EDIT_LIMITS, JEZERO_CONTEXT, type Region } from './planningRegion'

// Encuadre visual inicial fijo, NO se calcula desde la región editable ni
// afirma que haya cobertura CTX fuera de ROI.
export const INITIAL_JEZERO_VIEW: [number, number, number, number] = [77.20, 18.16, 77.89, 18.76]

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

function viewPadding(size: number[], panelOpen: boolean): number[] {
  const [width, height] = size
  return width <= 680
    ? [24, 26, panelOpen ? Math.min(300, height * 0.43) : 28, 26]
    : [36, 36, 36, 36] // panel en columna propia, fuera del viewport del mapa
}

export function fitInitialJezero(view: View, size: number[], panelOpen = false): void {
  view.fit(INITIAL_JEZERO_VIEW, { size, padding: viewPadding(size, panelOpen), maxZoom: 11.3 })
}

export function fitJezero(view: View, size: number[], panelOpen = false): void {
  view.fit([...JEZERO_CONTEXT], { size, padding: viewPadding(size, panelOpen), maxZoom: 11.3 })
}

export function fitCtx(view: View, size: number[], panelOpen = false): void {
  view.fit(ROI, { size, padding: viewPadding(size, panelOpen), maxZoom: 12.5 })
}

export function fitPlanningRegion(view: View, region: Region, size: number[]): void {
  const padding = size[0] <= 680 ? [145, 28, 90, 28] : [44, 44, 44, 44]
  view.fit([...region], { size, padding, maxZoom: 12.5 })
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
