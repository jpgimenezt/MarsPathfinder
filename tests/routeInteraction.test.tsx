// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MarsPoint } from '../src/features/route/marsDistance'
import type { StopId, Stops } from '../src/features/route/routePlan'
import type { LayerState } from '../src/features/map/wmtsLayerManager'
import type { MapMode, MapScope } from '../src/components/MapView'
import { App } from '../src/app/App'

let placePoint: ((id: StopId, point: MarsPoint) => void) | undefined
let reportLayer: ((id: 'ctx' | 'mola' | 'themis', state: LayerState) => void) | undefined
let mapMode: MapMode
let mapStops: Stops
let mapScope: MapScope
vi.mock('../src/components/MapView', () => ({
  MapView: ({ onPlace, onLayerState, mode, stops, scope }: {
    onPlace: typeof placePoint
    onLayerState: typeof reportLayer
    mode: MapMode
    stops: Stops
    scope: MapScope
  }) => {
    placePoint = onPlace
    reportLayer = onLayerState
    mapMode = mode
    mapStops = stops
    mapScope = scope
    return <div data-testid="mapa" />
  },
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let element: HTMLDivElement
function click(selector: string) {
  const button = element.querySelector<HTMLButtonElement>(selector)
  expect(button).not.toBeNull()
  act(() => button!.click())
}
function point(id: StopId, value: MarsPoint) {
  act(() => placePoint!(id, value))
}
function setup() {
  element = document.createElement('div')
  document.body.append(element)
  root = createRoot(element)
  act(() => root.render(<App />))
}
afterEach(() => {
  if (root) act(() => root.unmount())
  element?.remove()
  placePoint = undefined
})

describe('interacción explícita del recorrido', () => {
  it('no marca puntos al navegar ni con coordenadas fuera del ROI', () => {
    setup()
    point('A', [77.40, 18.38])
    expect(mapStops.A).toBeUndefined()
    click('.stop:nth-child(1) button')
    expect(mapMode).toEqual({ type: 'place', id: 'A' })
    point('A', [0, 0])
    expect(mapStops.A).toBeUndefined()
    point('A', [77.40, 18.38])
    expect(mapMode).toEqual({ type: 'explore' })
    point('P', [77.42, 18.39])
    expect(mapStops.P).toBeUndefined()
  })
  it('marca A→P→B, edita P, deshace y restablece con distancias parciales', () => {
    setup()
    expect(element.querySelector<HTMLButtonElement>('.stop:nth-child(2) button')?.disabled).toBe(true)
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    click('.stop:nth-child(2) button')
    point('P', [77.42, 18.39])
    expect(element.querySelector('.route-total strong')?.textContent).toMatch(/km/)
    expect(element.querySelector('.leg-detail')?.textContent).toContain('A → P')
    click('.stop:nth-child(3) button')
    point('B', [77.44, 18.40])
    expect(element.querySelectorAll('.stop-info small')[1].textContent).toContain('77.42000')
    click('.stop:nth-child(2) button')
    expect(mapMode).toEqual({ type: 'move', id: 'P' })
    point('P', [77.43, 18.41])
    expect(element.querySelectorAll('.stop-info small')[1].textContent).toContain('77.43000')
    click('.route-actions button:first-child')
    expect(element.querySelectorAll('.stop-info small')[1].textContent).toContain('77.42000')
    expect(mapStops.A).toEqual([77.40, 18.38])
    click('.route-actions button:nth-child(2)')
    expect(mapStops).toEqual({})
    expect(element.querySelector('.route-total strong')?.textContent).toBe('Sin datos')
    click('.route-actions button:first-child')
    expect(mapStops.B).toEqual([77.44, 18.40])
  })
  it('conserva puntos al alternar paneles y fallar una fuente', () => {
    setup()
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    click('.tabs button:nth-child(2)')
    act(() => reportLayer!('ctx', 'error'))
    expect(element.querySelector('.layer-card .status')?.textContent).toBe('error')
    click('.layer-card input[type="checkbox"]')
    click('.tabs button:nth-child(3)')
    expect(element.querySelector('.notice')?.textContent).toContain('NO_DATA')
    click('.tabs button:nth-child(1)')
    expect(mapStops.A).toEqual([77.40, 18.38])
    expect(element.querySelector('[data-testid="mapa"]')).not.toBeNull()
  })
  it('conserva el plan al entrar/salir de Marte global y bloquea su edición', () => {
    setup()
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    click('.scope-toggle')
    expect(mapScope).toBe('global')
    expect(element.querySelector<HTMLButtonElement>('.stop:nth-child(1) button')?.disabled).toBe(true)
    expect(element.querySelector('.drawer .notice')?.textContent).toContain('OUT_OF_COVERAGE')
    point('A', [77.42, 18.39])
    expect(mapStops.A).toEqual([77.40, 18.38])
    click('.scope-toggle')
    expect(mapScope).toBe('jezero')
    expect(mapStops.A).toEqual([77.40, 18.38])
    expect(element.querySelector<HTMLButtonElement>('.stop:nth-child(1) button')?.disabled).toBe(false)
  })
})
