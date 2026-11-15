import { useEffect, useRef, useState } from 'react'
import type { Stops } from './routePlan'
import type { Alternative } from './terrainAlternatives'

export type TerrainState = { status: 'idle' | 'loading' | 'ready' | 'error'; alternatives: Alternative[]; error?: string }
const initial: TerrainState = { status: 'idle', alternatives: [] }

export function useTerrainRoutes(stops: Stops): TerrainState {
  const [state, setState] = useState<TerrainState>(initial)
  const worker = useRef<Worker | null>(null)
  const request = useRef(0)
  useEffect(() => {
    if (!stops.A || !stops.P) {
      request.current++
      setState(initial)
      return
    }
    if (typeof Worker === 'undefined') {
      setState({ status: 'error', alternatives: [], error: 'UNAVAILABLE: trabajador de cálculo no disponible' })
      return
    }
    try {
      worker.current ??= new Worker(new URL('./terrainWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      setState({ status: 'error', alternatives: [], error: 'UNAVAILABLE: no se pudo iniciar el cálculo' })
      return
    }
    const active = ++request.current
    setState({ status: 'loading', alternatives: [] })
    worker.current.onmessage = (event: MessageEvent<{ id: number; alternatives?: Alternative[]; error?: string }>) => {
      if (event.data.id !== request.current) return
      setState(event.data.error
        ? { status: 'error', alternatives: [], error: event.data.error }
        : { status: 'ready', alternatives: event.data.alternatives ?? [] })
    }
    worker.current.onerror = () => {
      if (active === request.current) setState({ status: 'error', alternatives: [], error: 'UNVERIFIED: error del cálculo DEM' })
    }
    // Vite can emit BASE_URL="./"; resolving inside the worker would point
    // at /assets/data/ rather than the application's /data/ directory.
    worker.current.postMessage({ id: active, stops,
      baseUrl: new URL(import.meta.env.BASE_URL, document.baseURI).href })
  }, [stops])
  useEffect(() => () => { worker.current?.terminate(); worker.current = null }, [])
  return state
}
