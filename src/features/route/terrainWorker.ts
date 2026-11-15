/// <reference lib="webworker" />
import { compareTerrainRoutes } from './terrainAlternatives'
import { loadTerrainGrid } from './terrainAssets'
import type { Stops } from './routePlan'

let gridPromise: ReturnType<typeof loadTerrainGrid> | null = null
self.onmessage = async (event: MessageEvent<{ id: number; stops: Stops; baseUrl: string }>) => {
  const { id, stops, baseUrl } = event.data
  try {
    gridPromise ??= loadTerrainGrid(baseUrl)
    const grid = await gridPromise
    const alternatives = compareTerrainRoutes(grid, stops)
    self.postMessage({ id, alternatives })
  } catch (error) {
    gridPromise = null
    self.postMessage({ id, error: error instanceof Error ? error.message : 'UNVERIFIED' })
  }
}
