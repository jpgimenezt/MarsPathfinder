import { Vector3 } from 'three'

// USGS MOLA: latitud planetocéntrica, longitud positiva al este, -180…180.
// SphereGeometry usa u=0 en x=-1 (-180°), u=0.5 en x=+1 (0°),
// u=0.75 en z=-1 (+90°). La textura cubre -180°…+180°.
export const JEZERO_CRATER: readonly [longitude: number, latitude: number] = [77.69, 18.41]

export function surfacePoint(longitude: number, latitude: number, radius = 1): Vector3 {
  if (![longitude, latitude, radius].every(Number.isFinite) ||
      longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90 || radius <= 0) {
    throw new RangeError('Coordenadas marcianas inválidas')
  }
  const lon = longitude * Math.PI / 180
  const lat = latitude * Math.PI / 180
  return new Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon),
  )
}

export function texturePosition(longitude: number, latitude: number): readonly [number, number] {
  surfacePoint(longitude, latitude)
  return [(longitude + 180) / 360, (90 - latitude) / 180]
}

export function isFrontFacing(point: Vector3, camera: Vector3, radius = 1): boolean {
  return point.dot(camera) > radius * radius
}

export function isSurfaceClick(startX: number, startY: number, endX: number, endY: number): boolean {
  return Math.hypot(endX - startX, endY - startY) <= 6
}
