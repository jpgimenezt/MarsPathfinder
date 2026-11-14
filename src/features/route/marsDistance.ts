export type MarsPoint = readonly [longitude: number, latitude: number]
export const MARS_MEAN_RADIUS_METERS = 3_389_500

export function validPoint(point: readonly number[]): point is MarsPoint {
  return point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
    && point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90
}

export function marsDistance(a: MarsPoint, b: MarsPoint): number {
  if (!validPoint(a) || !validPoint(b)) throw new RangeError('Coordenadas marcianas inválidas')
  const radians = Math.PI / 180
  const dLat = (b[1] - a[1]) * radians
  const dLon = (((b[0] - a[0] + 540) % 360) - 180) * radians
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(dLon / 2) ** 2
  return 2 * MARS_MEAN_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))))
}

export function routeDistance(points: MarsPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + marsDistance(points[index], point), 0)
}
