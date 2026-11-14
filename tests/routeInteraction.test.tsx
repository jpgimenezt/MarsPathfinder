// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MarsPoint } from '../src/features/route/marsDistance'
import type { LayerState } from '../src/features/map/wmtsLayerManager'
import { App } from '../src/app/App'

let addPoint: ((point: MarsPoint) => void) | undefined
let reportLayer: ((id: 'ctx' | 'mola' | 'themis', state: LayerState) => void) | undefined
vi.mock('../src/components/MapView', () => ({
  MapView: ({ onPoint, onLayerState }: {
    onPoint: typeof addPoint
    onLayerState: typeof reportLayer
  }) => {
    addPoint = onPoint
    reportLayer = onLayerState
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
function point(value: MarsPoint) {
  act(() => addPoint!(value))
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
  addPoint = undefined
})

describe('planificación y fallos de mapa', () => {
  it('marca A/P/B, mueve una parada y restablece el recorrido', () => {
    setup()
    point([77.40, 18.38])
    point([77.42, 18.39])
    point([77.44, 18.40])
    expect(element.querySelector('.route-summary strong')?.textContent).toMatch(/km/)
    expect(element.querySelectorAll('.waypoint span')[1].textContent).toContain('77.42000')
    click('.waypoint:nth-child(2) button')
    point([77.43, 18.41])
    expect(element.querySelectorAll('.waypoint span')[1].textContent).toContain('77.43000')
    expect(element.querySelectorAll('.waypoint span')[0].textContent).toContain('77.40000')
    click('.route-summary button')
    expect(element.querySelector('.route-summary strong')?.textContent).toBe('Sin distancia')
    expect([...element.querySelectorAll('.waypoint span')].every(span => span.textContent === 'Sin marcar')).toBe(true)
  })
  it('ignora coordenadas fuera del ROI y conserva ruta cuando falla una fuente', () => {
    setup()
    point([0, 0])
    expect(element.querySelectorAll('.waypoint span')[0].textContent).toBe('Sin marcar')
    point([77.40, 18.38])
    act(() => reportLayer!('ctx', 'error'))
    expect(element.querySelector('.layer-card .status')?.textContent).toBe('error')
    expect(element.querySelector('.map') ?? element.querySelector('[data-testid="mapa"]')).not.toBeNull()
    expect(element.querySelectorAll('.waypoint span')[0].textContent).toContain('77.40000')
    click('.layer-card:nth-of-type(2) input[type="checkbox"]')
    expect(element.querySelectorAll('.waypoint span')[0].textContent).toContain('77.40000')
  })
})
