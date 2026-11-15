import Projection from 'ol/proj/Projection.js'
import { addProjection } from 'ol/proj.js'

// La cuadrícula WMTS usa grados y el código publicado por Mars Trek. Los
// denominadores WMTS son convenciones de visualización, NO distancias terrestres.
export const marsProjection = new Projection({
  code: 'urn:ogc:def:crs:EPSG::104905',
  units: 'degrees',
  extent: [-180, -90, 180, 90],
  global: false,
})
addProjection(marsProjection)

// Sector interior sin transparencias en las teselas CTX z11/z12 auditadas.
// Margen respecto de los bordes transparentes del bbox publicado; NO implica
// cobertura de obstáculos, seguridad de EVA ni disponibilidad de la red.
export const ROI: [number, number, number, number] = [77.164, 18.215, 77.695, 18.717]
// Huella nominal del ortomosaico CTX según GetCapabilities; no implica que
// todos los píxeles estén cubiertos por imágenes a cada escala.
export const CTX_EXTENT: [number, number, number, number] = [
  77.1604655, 18.2110274, 77.6991776, 18.7211945,
]
export const FALLBACK_EXTENT: [number, number, number, number] = [
  77.34375, 18.28125, 77.51953125, 18.45703125,
]

export function insideRoi(point: readonly number[]): boolean {
  return point[0] >= ROI[0] && point[0] <= ROI[2] && point[1] >= ROI[1] && point[1] <= ROI[3]
}
