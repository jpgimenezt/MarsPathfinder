import TileLayer from 'ol/layer/Tile.js'
import WMTS from 'ol/source/WMTS.js'
import { sources, type LayerId, type SourceRecord } from '../../data/sourceManifest'
import { loadWmts } from './wmtsSources'

export type LayerState = 'cargando' | 'visible' | 'error' | 'sin cobertura' | 'apagada'
type SourceLoader = (source: SourceRecord, signal: AbortSignal) => Promise<WMTS>

interface Entry {
  source?: WMTS
  pending?: Promise<void>
  successfulTiles: number
  failedTiles: number
}

// Conserva una sola instancia WMTS por producto durante la vida del mapa.
// Los listeners de tiles continúan activos aunque se oculte una capa.
export class WmtsLayerManager {
  private readonly controller = new AbortController()
  private readonly entries: Record<LayerId, Entry> = {
    ctx: { successfulTiles: 0, failedTiles: 0 },
    mola: { successfulTiles: 0, failedTiles: 0 },
    themis: { successfulTiles: 0, failedTiles: 0 },
  }

  constructor(
    private readonly layers: Record<LayerId, TileLayer<WMTS>>,
    private readonly notify: (id: LayerId, state: LayerState) => void,
    private readonly loader: SourceLoader = loadWmts,
  ) {}

  setEnabled(id: LayerId, enabled: boolean): void {
    const layer = this.layers[id]
    const entry = this.entries[id]
    layer.setVisible(enabled)
    if (!enabled) {
      this.notify(id, 'apagada')
      return
    }
    if (entry.source) {
      this.report(id)
      return
    }
    this.notify(id, 'cargando')
    if (entry.pending) return
    entry.pending = this.loader(sources.find(source => source.id === id)!, this.controller.signal)
      .then(wmts => {
        if (this.controller.signal.aborted) return
        entry.source = wmts
        wmts.on('tileloadend', () => {
          entry.successfulTiles++
          this.report(id)
        })
        wmts.on('tileloaderror', () => {
          entry.failedTiles++
          this.report(id)
        })
        layer.setSource(wmts)
        this.report(id)
      })
      .catch(error => {
        if (this.controller.signal.aborted) return
        layer.setSource(null)
        if (layer.getVisible()) this.notify(id, 'error')
        console.warn(`Fuente ${id}:`, error)
      })
      .finally(() => { entry.pending = undefined })
  }

  private report(id: LayerId): void {
    if (this.controller.signal.aborted || !this.layers[id].getVisible()) return
    const entry = this.entries[id]
    this.notify(id, entry.successfulTiles > 0 ? 'visible' : entry.failedTiles > 0 ? 'error' : 'cargando')
  }

  dispose(): void {
    this.controller.abort()
  }
}
