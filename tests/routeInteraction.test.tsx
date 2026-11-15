// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MarsPoint } from '../src/features/route/marsDistance'
import type { StopId, Stops } from '../src/features/route/routePlan'
import type { LayerState } from '../src/features/map/wmtsLayerManager'
import type { MapMode, MapScope } from '../src/components/MapView'
import type { Region } from '../src/features/map/planningRegion'
import { App } from '../src/app/App'

let placePoint: ((id: StopId, point: MarsPoint) => void) | undefined
let dragPoint: ((id: StopId, point: MarsPoint) => void) | undefined
let rejectPoint: (() => void) | undefined
let changeRegion: ((region: Region) => void) | undefined
let mapRegion: Region
let reportLayer: ((id: 'ctx' | 'mola' | 'themis', state: LayerState) => void) | undefined
let reportBase: ((state: 'cargando' | 'visible' | 'parcial' | 'error') => void) | undefined
let baseRetry = 0
let mapMode: MapMode
let mapStops: Stops
let mapScope: MapScope
vi.mock('../src/components/MapView', () => ({
  MapView: ({ onPlace, onMove, onInvalid, onRegionChange, region, onLayerState, onBaseState, baseRetry: retry, mode, stops, scope }: {
    onPlace: typeof placePoint
    onMove: typeof dragPoint
    onInvalid: typeof rejectPoint
    onRegionChange: typeof changeRegion
    region: Region
    panelOpen: boolean
    onLayerState: typeof reportLayer
    onBaseState: typeof reportBase
    baseRetry: number
    mode: MapMode
    stops: Stops
    scope: MapScope
  }) => {
    placePoint = onPlace
    dragPoint = onMove
    rejectPoint = onInvalid
    changeRegion = onRegionChange
    mapRegion = region
    reportLayer = onLayerState
    reportBase = onBaseState
    baseRetry = retry
    mapMode = mode
    mapStops = stops
    mapScope = scope
    return <div data-testid="mapa" />
  },
}))
vi.mock('../src/components/MarsGlobe', () => ({
  MarsGlobe: ({ onJezero, onFailure }: { onJezero: () => void; onFailure: () => void }) =>
    <><button type="button" className="mock-jezero" onClick={onJezero}>Explorar Jezero</button>
      <button type="button" className="mock-fail" onClick={onFailure}>Simular WebGL no disponible</button></>,
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
async function setup() {
  element = document.createElement('div')
  document.body.append(element)
  root = createRoot(element)
  await act(async () => { root.render(<App />) })
  click('.mock-jezero')
}
afterEach(() => {
  if (root) act(() => root.unmount())
  element?.remove()
  placePoint = undefined
  dragPoint = undefined
  rejectPoint = undefined
  reportBase = undefined
})

describe('interacción explícita del recorrido', () => {
  it('distingue fallo y reintento de Viking del estado CTX sin borrar la ruta', async () => {
    await setup()
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    act(() => reportLayer!('ctx', 'visible'))
    act(() => reportBase!('error'))
    expect(element.querySelector('.base-status')?.textContent).toContain('miniatura local')
    expect(element.querySelector('.base-status button')).not.toBeNull()
    expect(mapStops.A).toEqual([77.40, 18.38])
    expect(baseRetry).toBe(0)
    click('.base-status button')
    expect(baseRetry).toBe(1)
    act(() => reportBase!('visible'))
    expect(element.querySelector('.base-status')?.textContent).toContain('WMTS visible')
    expect(element.querySelector('.base-status button')).toBeNull()
    click('.tabs button:nth-child(2)')
    expect(element.querySelector('.layer-card .status')?.textContent).toBe('visible')
    expect(element.querySelector('.source-details')).not.toBeNull()
    expect(mapStops.A).toEqual([77.40, 18.38])
  })
  it('conserva A/P/B cuando la región se reduce y permite corregir sin borrarlos', async () => {
    await setup()
    expect(mapRegion).toEqual([77.27, 18.01, 78.11, 18.81])
    click('.stop:nth-child(1) button')
    point('A', [77.8, 18.4])
    const before = mapStops.A
    act(() => changeRegion!([77.164, 18.215, 77.695, 18.717]))
    expect(mapStops.A).toEqual(before)
    expect(element.querySelector('.stop-info')?.textContent).toContain('FUERA DE REGIÓN')
    expect(element.querySelector('.drawer .notice')?.textContent).toContain('OUT_OF_COVERAGE')
    act(() => dragPoint!('A', [77.4, 18.4]))
    expect(mapStops.A).toEqual([77.4, 18.4])
    click('.route-actions button:first-child')
    expect(mapStops.A).toEqual(before)
    expect(element.querySelector('.stop-info')?.textContent).toContain('FUERA DE REGIÓN')
    expect(mapRegion).toEqual([77.164, 18.215, 77.695, 18.717])
  })
  it('edita región sin confundir gestos de A/P/B y distingue cobertura por tramo', async () => {
    await setup()
    click('.stop:nth-child(1) button')
    point('A', [77.4, 18.4])
    click('.stop:nth-child(2) button')
    point('P', [77.9, 18.4])
    expect(element.querySelector('.leg-detail')?.textContent).toContain('CTX parcial')
    expect(element.querySelectorAll('.stop-info')[1].textContent).toContain('Sin imagen CTX detallada')
    click('.region-actions button:first-child')
    expect(mapMode).toEqual({ type: 'edit-region' })
    expect(element.querySelector('.drawer')).toBeNull()
    expect(element.querySelector('.edit-shortcuts')).not.toBeNull()
    point('B', [78, 18.5])
    expect(mapStops.B).toBeUndefined()
    click('.edit-shortcuts button:first-child')
    expect(mapMode).toEqual({ type: 'explore' })
    click('.region-actions button:last-child')
    expect(mapRegion).toEqual([77.164, 18.215, 77.695, 18.717])
    expect(mapStops.P).toEqual([77.9, 18.4])
    expect(element.querySelectorAll('.stop-info')[1].textContent).toContain('FUERA DE REGIÓN')
    click('.region-actions button:nth-child(2)')
    expect(mapRegion).toEqual([77.27, 18.01, 78.11, 18.81])
  })
  it('confirma un arrastre, muestra rechazo fuera del ROI y deshace solo el arrastre', async () => {
    await setup()
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    const initialTotal = element.querySelector('.route-total strong')?.textContent
    act(() => dragPoint!('A', [77.41, 18.39]))
    expect(mapStops.A).toEqual([77.41, 18.39])
    expect(element.querySelector('.route-total strong')?.textContent).toBe(initialTotal)
    act(() => rejectPoint!())
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Ningún límite indica')
    expect(mapStops.A).toEqual([77.41, 18.39])
    act(() => dragPoint!('A', [78.2, 18.39]))
    expect(mapStops.A).toEqual([77.41, 18.39])
    click('.route-actions button:first-child')
    expect(mapStops.A).toEqual([77.40, 18.38])
    click('.route-actions button:first-child')
    expect(mapStops.A).toBeUndefined()
  })
  it('abre primero el globo y ofrece mapa 2D global si WebGL falla', async () => {
    element = document.createElement('div')
    document.body.append(element)
    root = createRoot(element)
    await act(async () => { root.render(<App />) })
    expect(element.querySelector('[data-testid="mapa"]')).toBeNull()
    click('.mock-fail')
    expect(mapScope).toBe('global')
    expect(element.querySelector('[data-testid="mapa"]')).not.toBeNull()
    click('.scope-toggle')
    expect(mapScope).toBe('jezero')
  })
  it('no marca puntos al navegar ni con coordenadas fuera del ROI', async () => {
    await setup()
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
  it('marca A→P→B, edita P, deshace y restablece con distancias parciales', async () => {
    await setup()
    expect(element.querySelector<HTMLButtonElement>('.stop:nth-child(2) button')?.disabled).toBe(true)
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    click('.stop:nth-child(2) button')
    point('P', [77.42, 18.39])
    expect(element.querySelector('.route-total strong')?.textContent).toMatch(/km/)
    expect(element.querySelector('.leg-detail')?.textContent).toContain('A → P')
    click('.stop:nth-child(3) button')
    point('B', [77.44, 18.40])
    expect(element.querySelectorAll('.stop-info')[1].querySelector('small')?.textContent).toContain('77.42000')
    click('.stop:nth-child(2) button')
    expect(mapMode).toEqual({ type: 'move', id: 'P' })
    point('P', [77.43, 18.41])
    expect(element.querySelectorAll('.stop-info')[1].querySelector('small')?.textContent).toContain('77.43000')
    click('.route-actions button:first-child')
    expect(element.querySelectorAll('.stop-info')[1].querySelector('small')?.textContent).toContain('77.42000')
    expect(mapStops.A).toEqual([77.40, 18.38])
    click('.route-actions button:nth-child(2)')
    expect(mapStops).toEqual({})
    expect(element.querySelector('.route-total strong')?.textContent).toBe('Sin datos')
    click('.route-actions button:first-child')
    expect(mapStops.B).toEqual([77.44, 18.40])
  })
  it('conserva puntos al alternar paneles y fallar una fuente', async () => {
    await setup()
    click('.stop:nth-child(1) button')
    point('A', [77.40, 18.38])
    click('.tabs button:nth-child(2)')
    act(() => reportLayer!('ctx', 'error'))
    expect(element.querySelector('.layer-card .status')?.textContent).toBe('error')
    click('.layer-card input[type="checkbox"]')
    click('.tabs button:nth-child(3)')
    expect(element.querySelector('.notice')?.textContent).toContain('UNVERIFIED')
    click('.tabs button:nth-child(1)')
    expect(mapStops.A).toEqual([77.40, 18.38])
    expect(element.querySelector('[data-testid="mapa"]')).not.toBeNull()
  })
  it('conserva el plan al entrar/salir de Marte global y bloquea su edición', async () => {
    await setup()
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
  it('regresa al globo y vuelve a Jezero sin perder A/P/B ni distancias', async () => {
    await setup()
    for (const [index, id, coordinate] of [
      [1, 'A', [77.40, 18.38]],
      [2, 'P', [77.42, 18.39]],
      [3, 'B', [77.44, 18.40]],
    ] as const) {
      click(`.stop:nth-child(${index}) button`)
      point(id, coordinate)
    }
    const total = element.querySelector('.route-total strong')?.textContent
    click('.globe-return')
    expect(element.querySelector('.mock-jezero')).not.toBeNull()
    expect(element.querySelector('[data-testid="mapa"]')).toBeNull()
    click('.mock-jezero')
    expect(mapStops).toEqual({ A: [77.40, 18.38], P: [77.42, 18.39], B: [77.44, 18.40] })
    expect(element.querySelector('.route-total strong')?.textContent).toBe(total)
  })
  it('redirige a la pantalla de inicio al presionar el logo / marca Ares Route en la parte superior izquierda', async () => {
    await setup()
    expect(element.querySelector('[data-testid="mapa"]')).not.toBeNull()
    click('.brand')
    expect(element.querySelector('.mock-jezero')).not.toBeNull()
    expect(element.querySelector('[data-testid="mapa"]')).toBeNull()
  })
})
