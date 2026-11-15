import { describe, expect, it, vi } from 'vitest'
import TileLayer from 'ol/layer/Tile.js'
import WMTS from 'ol/source/WMTS.js'
import WMTSTileGrid from 'ol/tilegrid/WMTS.js'
import { marsProjection } from '../src/features/map/marsProjection'
import { WmtsLayerManager, type LayerState } from '../src/features/map/wmtsLayerManager'
import type { LayerId } from '../src/data/sourceManifest'

function makeSource(): WMTS {
  return new WMTS({
    layer: 'test', matrixSet: 'default028mm', style: 'default', projection: marsProjection,
    url: 'https://trek.nasa.gov/test/{TileMatrix}/{TileRow}/{TileCol}.png',
    tileGrid: new WMTSTileGrid({
      origins: [[-180, 90]], resolutions: [0.703125], matrixIds: ['0'], tileSize: 256,
    }),
  })
}

function setup(loader = vi.fn(async () => makeSource())) {
  const layers = { ctx: new TileLayer<WMTS>(), mola: new TileLayer<WMTS>(), themis: new TileLayer<WMTS>() }
  const events: Array<[LayerId, LayerState]> = []
  const manager = new WmtsLayerManager(layers, (id, state) => events.push([id, state]), loader)
  return { layers, events, manager, loader }
}

describe('ciclo de vida de capas WMTS', () => {
  it('reutiliza cada fuente y no vuelve a solicitar CTX al activar otras capas', async () => {
    const { manager, layers, events, loader } = setup()
    manager.setEnabled('ctx', true)
    manager.setEnabled('ctx', true) // deduplicar solicitud pendiente
    await vi.waitFor(() => expect(layers.ctx.getSource()).not.toBeNull())
    const first = layers.ctx.getSource()
    first!.dispatchEvent('tileloadend')
    manager.setEnabled('ctx', false)
    manager.setEnabled('mola', true)
    await vi.waitFor(() => expect(layers.mola.getSource()).not.toBeNull())
    manager.setEnabled('ctx', true)
    expect(loader).toHaveBeenCalledTimes(2) // CTX + MOLA, no tercer GetCapabilities
    expect(layers.ctx.getSource()).toBe(first)
    expect(events.at(-1)).toEqual(['ctx', 'visible'])
    manager.dispose()
  })
  it('muestra errores de GetCapabilities y permite reintentar tras desactivar/activar', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loader = vi.fn().mockRejectedValueOnce(new Error('HTTP 503')).mockResolvedValueOnce(makeSource())
    const { manager, events, layers } = setup(loader)
    manager.setEnabled('ctx', true)
    await vi.waitFor(() => expect(events).toContainEqual(['ctx', 'error']))
    expect(layers.ctx.getSource()).toBeNull()
    manager.setEnabled('ctx', false)
    manager.setEnabled('ctx', true)
    await vi.waitFor(() => expect(layers.ctx.getSource()).not.toBeNull())
    expect(loader).toHaveBeenCalledTimes(2)
    manager.dispose()
    warn.mockRestore()
  })
  it('gestiona teselas fallidas sin pantalla en blanco y conserva estado al alternar', async () => {
    const { manager, layers, events } = setup()
    manager.setEnabled('ctx', true)
    await vi.waitFor(() => expect(layers.ctx.getSource()).not.toBeNull())
    layers.ctx.getSource()!.dispatchEvent('tileloaderror')
    expect(events.at(-1)).toEqual(['ctx', 'error'])
    layers.ctx.getSource()!.dispatchEvent('tileloadend')
    expect(events.at(-1)).toEqual(['ctx', 'visible'])
    manager.setEnabled('ctx', false)
    layers.ctx.getSource()!.dispatchEvent('tileloaderror')
    expect(events.at(-1)).toEqual(['ctx', 'apagada'])
    manager.setEnabled('ctx', true)
    expect(events.at(-1)).toEqual(['ctx', 'visible'])
    manager.dispose()
  })
  it('ignora respuestas pendientes después de desmontar el mapa', async () => {
    let resolve!: (source: WMTS) => void
    const { manager, layers, events } = setup(vi.fn(() => new Promise<WMTS>(done => { resolve = done })))
    manager.setEnabled('ctx', true)
    manager.dispose()
    resolve(makeSource())
    await Promise.resolve()
    expect(layers.ctx.getSource()).toBeNull()
    expect(events).toEqual([['ctx', 'cargando']])
  })
})
