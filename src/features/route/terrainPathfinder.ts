import { marsDistance, validPoint, type MarsPoint } from './marsDistance'
import type { Stops } from './routePlan'

/**
 * Exploratory terrain-aware routes for Jezero. The raster MUST contain real,
 * georeferenced numerical elevations and per-cell maximum slopes derived from
 * the USGS CTX DEM. Never infer elevations or safety from rendered imagery.
 */
export interface TerrainGrid {
  width: number
  height: number
  bounds: readonly [west: number, south: number, east: number, north: number]
  elevations: (number | null)[]
  maxSlopeDegrees: (number | null)[]
  source: string
  nominalSourceResolutionMeters: number
  gridStepMeters: number
}

export interface TerrainRoutingOptions {
  /** Illustrative planning assumption, NOT a NASA operational safety limit. */
  maxSlopeDegrees: number
  /** Relative reluctance to cross steep but allowed terrain. */
  slopePenalty: number
  /** Additional equivalent horizontal cost per metre of ascent. */
  ascentPenalty: number
  /** Computation guard for large / invalid grids. */
  maxExpandedNodes: number
}

export const DEFAULT_TERRAIN_ROUTING: TerrainRoutingOptions = {
  maxSlopeDegrees: 15,
  slopePenalty: 6,
  ascentPenalty: 4,
  maxExpandedNodes: 400_000,
}

export type TerrainRouteFailure =
  | 'invalid-grid' | 'outside-dem' | 'no-elevation'
  | 'steep-endpoint' | 'no-path' | 'search-limit'

export interface TerrainRoute {
  ok: true
  points: MarsPoint[]
  distanceMeters: number
  directMeters: number
  ascentMeters: number
  descentMeters: number
  maximumSlopeDegrees: number
  expandedNodes: number
  /** Relative comparison score; not physical energy or safety. */
  relativeCost: number
  /** Conservative local proxy for each rendered segment; not obstacle detection. */
  segmentSlopeDegrees: number[]
}
export type TerrainRouteResult = TerrainRoute | { ok: false; reason: TerrainRouteFailure }

export interface TerrainMissionRoute {
  first: TerrainRouteResult | null
  second: TerrainRouteResult | null
  points: MarsPoint[] | null
  distanceMeters: number | null
  /** All routes are exploratory; small rocks, regolith and weather are unknown. */
  classification: 'DEM-DERIVED-EXPLORATORY'
}

function validGrid(g: TerrainGrid): boolean {
  return Number.isInteger(g.width) && Number.isInteger(g.height)
    && g.width >= 2 && g.height >= 2 && g.width * g.height <= 4_000_000
    && g.elevations.length === g.width * g.height
    && g.maxSlopeDegrees.length === g.width * g.height
    && g.bounds.length === 4 && g.bounds.every(Number.isFinite)
    && g.bounds[0] < g.bounds[2] && g.bounds[1] < g.bounds[3]
    && Number.isFinite(g.gridStepMeters) && g.gridStepMeters > 0
    && Number.isFinite(g.nominalSourceResolutionMeters) && g.nominalSourceResolutionMeters > 0
}

function indexFor(g: TerrainGrid, point: MarsPoint): number {
  const [west, south, east, north] = g.bounds
  if (!validPoint(point) || point[0] < west || point[0] > east
      || point[1] < south || point[1] > north) return -1
  const x = Math.round((point[0] - west) * (g.width - 1) / (east - west))
  const y = Math.round((north - point[1]) * (g.height - 1) / (north - south))
  return y * g.width + x
}

function coordinateAt(g: TerrainGrid, idx: number): MarsPoint {
  const x = idx % g.width
  const y = Math.floor(idx / g.width)
  return [
    g.bounds[0] + x * (g.bounds[2] - g.bounds[0]) / (g.width - 1),
    g.bounds[3] - y * (g.bounds[3] - g.bounds[1]) / (g.height - 1),
  ]
}

function isPassable(g: TerrainGrid, index: number, maxSlope: number): boolean {
  const z = g.elevations[index]
  const slope = g.maxSlopeDegrees[index]
  return typeof z === 'number' && Number.isFinite(z)
    && typeof slope === 'number' && Number.isFinite(slope)
    && slope >= 0 && slope <= maxSlope
}

type HeapNode = { index: number; priority: number }
class MinHeap {
  private nodes: HeapNode[] = []
  get size(): number { return this.nodes.length }

  push(node: HeapNode): void {
    const a = this.nodes
    a.push(node)
    let i = a.length - 1
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (a[parent].priority <= node.priority) break
      a[i] = a[parent]
      i = parent
    }
    a[i] = node
  }

  pop(): HeapNode | undefined {
    const a = this.nodes
    if (!a.length) return undefined
    const first = a[0]
    const last = a.pop()!
    if (!a.length) return first
    let i = 0
    while (true) {
      const left = i * 2 + 1
      if (left >= a.length) break
      const right = left + 1
      const child = right < a.length && a[right].priority < a[left].priority ? right : left
      if (a[child].priority >= last.priority) break
      a[i] = a[child]
      i = child
    }
    a[i] = last
    return first
  }
}

/**
 * A* over eight neighbours. NoData and steep cells are blocked; diagonal
 * moves cannot cut through the corners of blocked cells. The spherical
 * geodesic distance is an admissible lower-bound heuristic for relativeCost.
 */
export function findTerrainRoute(
  grid: TerrainGrid,
  start: MarsPoint,
  goal: MarsPoint,
  options: Partial<TerrainRoutingOptions> = {},
): TerrainRouteResult {
  if (!validGrid(grid)) return { ok: false, reason: 'invalid-grid' }
  const config = { ...DEFAULT_TERRAIN_ROUTING, ...options }
  if (!(config.maxSlopeDegrees > 0 && config.maxSlopeDegrees < 90)
      || !(config.slopePenalty >= 0) || !(config.ascentPenalty >= 0)
      || !(config.maxExpandedNodes > 0)) return { ok: false, reason: 'invalid-grid' }

  const source = indexFor(grid, start)
  const target = indexFor(grid, goal)
  if (source < 0 || target < 0) return { ok: false, reason: 'outside-dem' }
  if (grid.elevations[source] === null || grid.elevations[target] === null
      || !Number.isFinite(grid.elevations[source]) || !Number.isFinite(grid.elevations[target]))
    return { ok: false, reason: 'no-elevation' }
  if (!isPassable(grid, source, config.maxSlopeDegrees)
      || !isPassable(grid, target, config.maxSlopeDegrees))
    return { ok: false, reason: 'steep-endpoint' }
  if (source === target) {
    const slope = grid.maxSlopeDegrees[source] as number
    return {
      ok: true, points: [start, goal], distanceMeters: marsDistance(start, goal),
      directMeters: marsDistance(start, goal), ascentMeters: 0, descentMeters: 0,
      maximumSlopeDegrees: slope, expandedNodes: 0, relativeCost: marsDistance(start, goal),
      segmentSlopeDegrees: [slope],
    }
  }

  const size = grid.width * grid.height
  const costs = new Float64Array(size).fill(Infinity)
  const parent = new Int32Array(size).fill(-1)
  const closed = new Uint8Array(size)
  const queue = new MinHeap()
  const heuristic = (idx: number) => marsDistance(coordinateAt(grid, idx), coordinateAt(grid, target))
  costs[source] = 0
  queue.push({ index: source, priority: heuristic(source) })
  const neighbours: ReadonlyArray<readonly [number, number]> =
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]
  let expanded = 0

  while (queue.size > 0) {
    const current = queue.pop()!.index
    if (closed[current]) continue
    if (++expanded > config.maxExpandedNodes) return { ok: false, reason: 'search-limit' }
    closed[current] = 1
    if (current === target) break
    const x = current % grid.width
    const y = Math.floor(current / grid.width)
    const coord = coordinateAt(grid, current)
    const z0 = grid.elevations[current] as number

    for (const [dx, dy] of neighbours) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue
      const other = ny * grid.width + nx
      if (closed[other] || !isPassable(grid, other, config.maxSlopeDegrees)) continue
      if (dx && dy) {
        // A diagonal can't pass between two impassable orthogonal neighbours.
        if (!isPassable(grid, y * grid.width + nx, config.maxSlopeDegrees)
            || !isPassable(grid, ny * grid.width + x, config.maxSlopeDegrees)) continue
      }
      const horizontal = marsDistance(coord, coordinateAt(grid, other))
      const climb = (grid.elevations[other] as number) - z0
      const edgeSlope = Math.atan2(Math.abs(climb), horizontal) * 180 / Math.PI
      const slope = Math.max(edgeSlope, grid.maxSlopeDegrees[current] as number,
        grid.maxSlopeDegrees[other] as number)
      if (slope > config.maxSlopeDegrees) continue
      const nextCost = costs[current] +
        horizontal * (1 + config.slopePenalty * Math.pow(slope / config.maxSlopeDegrees, 2))
        + Math.max(0, climb) * config.ascentPenalty
      if (nextCost >= costs[other]) continue
      costs[other] = nextCost
      parent[other] = current
      queue.push({ index: other, priority: nextCost + heuristic(other) })
    }
  }

  if (!closed[target]) return { ok: false, reason: 'no-path' }
  const cells: number[] = []
  let index = target
  while (index >= 0) {
    cells.push(index)
    if (index === source) break
    index = parent[index]
  }
  if (cells.at(-1) !== source) return { ok: false, reason: 'no-path' }
  cells.reverse()
  const sampled = cells.map(idx => coordinateAt(grid, idx))
  const points: MarsPoint[] = [start, ...sampled, goal]
  let distanceMeters = 0
  let ascentMeters = 0
  let descentMeters = 0
  let maximumSlopeDegrees = 0
  const segmentSlopeDegrees: number[] = []
  // Elevation metrics are calculated along raster cell centres. Endpoint
  // elevation is nearest-cell estimated, not an independently sampled value.
  for (let i = 1; i < cells.length; i++) {
    const prev = cells[i - 1]
    const next = cells[i]
    const horizontal = marsDistance(sampled[i - 1], sampled[i])
    const dz = (grid.elevations[next] as number) - (grid.elevations[prev] as number)
    distanceMeters += Math.hypot(horizontal, dz)
    ascentMeters += Math.max(0, dz)
    descentMeters += Math.max(0, -dz)
    const segmentSlope = Math.max(
      Math.atan2(Math.abs(dz), horizontal) * 180 / Math.PI,
      grid.maxSlopeDegrees[prev] as number, grid.maxSlopeDegrees[next] as number)
    segmentSlopeDegrees.push(segmentSlope)
    maximumSlopeDegrees = Math.max(maximumSlopeDegrees, segmentSlope)
  }
  // Include sub-cell start/end offsets in the approximate distance.
  distanceMeters += marsDistance(start, sampled[0]) +
    marsDistance(sampled[sampled.length - 1], goal)
  return {
    ok: true, points, distanceMeters, directMeters: marsDistance(start, goal),
    ascentMeters, descentMeters, maximumSlopeDegrees,
    expandedNodes: expanded, relativeCost: costs[target],
    segmentSlopeDegrees: [
      grid.maxSlopeDegrees[cells[0]] as number,
      ...segmentSlopeDegrees,
      grid.maxSlopeDegrees[cells[cells.length - 1]] as number,
    ],
  }
}

export function findMissionTerrainRoute(
  grid: TerrainGrid, stops: Stops, options: Partial<TerrainRoutingOptions> = {},
): TerrainMissionRoute {
  const first = stops.A && stops.P ? findTerrainRoute(grid, stops.A, stops.P, options) : null
  const second = stops.P && stops.B ? findTerrainRoute(grid, stops.P, stops.B, options) : null
  const firstOk = first?.ok ? first : null
  const secondOk = second?.ok ? second : null
  const anyFailure = Boolean((first && !first.ok) || (second && !second.ok))
  const points = !anyFailure && firstOk
    ? firstOk.points.concat(secondOk ? secondOk.points.slice(1) : [])
    : null
  return {
    first, second, points,
    distanceMeters: points ? firstOk!.distanceMeters + (secondOk?.distanceMeters ?? 0) : null,
    classification: 'DEM-DERIVED-EXPLORATORY',
  }
}
