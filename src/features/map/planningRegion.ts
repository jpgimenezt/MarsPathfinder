import type { MarsPoint } from '../route/marsDistance'

export type Region = readonly [west: number, south: number, east: number, north: number]

// Referencia aproximada del cráter aportada para navegación, NO su borde geológico.
export const JEZERO_CONTEXT: Region = [77.27, 18.01, 78.11, 18.81]
// Guarda el editor en el entorno local; NO representa cobertura científica.
export const EDIT_LIMITS: Region = [77.1, 17.85, 78.3, 18.95]
export const MIN_REGION_SPAN = 0.02 // grados; tamaño de interacción, no umbral de seguridad
export type RegionHandle = 'sw' | 's' | 'se' | 'e' | 'ne' | 'n' | 'nw' | 'w'

export function validRegion(region: Region): boolean {
  return region.every(Number.isFinite) &&
    region[0] >= EDIT_LIMITS[0] && region[1] >= EDIT_LIMITS[1] &&
    region[2] <= EDIT_LIMITS[2] && region[3] <= EDIT_LIMITS[3] &&
    region[2] - region[0] >= MIN_REGION_SPAN &&
    region[3] - region[1] >= MIN_REGION_SPAN
}

export function inRegion(point: readonly number[], region: Region): boolean {
  return point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= region[0] && point[0] <= region[2] &&
    point[1] >= region[1] && point[1] <= region[3]
}

export function resizeRegion(region: Region, handle: RegionHandle, [x, y]: readonly number[]): Region {
  return [
    handle.includes('w') ? x : region[0],
    handle.includes('s') ? y : region[1],
    handle.includes('e') ? x : region[2],
    handle.includes('n') ? y : region[3],
  ]
}

export function shiftRegion(region: Region, dx: number, dy: number): Region {
  return [region[0] + dx, region[1] + dy, region[2] + dx, region[3] + dy]
}

export function regionRing([west, south, east, north]: Region): number[][] {
  return [[west, south], [east, south], [east, north], [west, north], [west, south]]
}

export function handleCoordinates(region: Region): Record<RegionHandle, number[]> {
  const [w, s, e, n] = region
  return { sw: [w, s], s: [(w + e) / 2, s], se: [e, s], e: [e, (s + n) / 2],
    ne: [e, n], n: [(w + e) / 2, n], nw: [w, n], w: [w, (s + n) / 2] }
}

// Liang–Barsky sobre la línea angular dibujada en el mapa. La cobertura de
// imagen NO permite deducir la transitabilidad ni la cobertura física exacta.
export function segmentCoverage(a: MarsPoint, b: MarsPoint, region: Region): 'complete' | 'partial' | 'none' {
  if (inRegion(a, region) && inRegion(b, region)) return 'complete'
  const dx = b[0] - a[0], dy = b[1] - a[1]
  let enter = 0, leave = 1
  for (const [p, q] of [
    [-dx, a[0] - region[0]], [dx, region[2] - a[0]],
    [-dy, a[1] - region[1]], [dy, region[3] - a[1]],
  ]) {
    if (p === 0) { if (q < 0) return 'none' }
    else {
      const t = q / p
      if (p < 0) enter = Math.max(enter, t)
      else leave = Math.min(leave, t)
    }
  }
  return enter < leave ? 'partial' : 'none'
}
