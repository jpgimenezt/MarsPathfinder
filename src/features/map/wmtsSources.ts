import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js'
import { marsProjection } from './marsProjection'
import type { SourceRecord } from '../../data/sourceManifest'

export async function loadWmts(source: Pick<SourceRecord, 'sourceUrl' | 'productId' | 'attribution'>, signal: AbortSignal): Promise<WMTS> {
  const response = await fetch(source.sourceUrl, { signal })
  if (!response.ok) throw new Error(`GetCapabilities: HTTP ${response.status}`)
  const xml = await response.text()
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('GetCapabilities: XML inválido')
  // Mars Trek entrega MatrixWidth/MatrixHeight como "4096.0". OpenLayers
  // correctamente exige enteros XML; normalizamos únicamente los .0 exactos.
  for (const element of document.getElementsByTagNameNS('http://www.opengis.net/wmts/1.0', '*')) {
    if (element.localName !== 'MatrixWidth' && element.localName !== 'MatrixHeight') continue
    const raw = element.textContent?.trim() ?? ''
    if (/^\d+\.0+$/.test(raw)) element.textContent = raw.slice(0, raw.indexOf('.'))
  }
  const capabilities = new WMTSCapabilities().read(document)
  const options = optionsFromCapabilities(capabilities, {
    layer: source.productId,
    matrixSet: 'default028mm',
    projection: marsProjection,
  })
  const code = typeof options?.projection === 'string' ? options.projection : options?.projection?.getCode()
  if (!options || code !== marsProjection.getCode()) {
    throw new Error('PROJECTION_MISMATCH: revisar cuadrícula WMTS')
  }
  const grid = options.tileGrid
  if (!grid) throw new Error('GetCapabilities: matriz WMTS inválida')
  for (let zoom = 0; zoom < grid.getResolutions().length; zoom++) {
    const range = grid.getFullTileRange(zoom)
    if (!Number.isFinite(grid.getResolution(zoom)) ||
        !range || ![range.minX, range.maxX, range.minY, range.maxY].every(Number.isFinite)) {
      throw new Error('GetCapabilities: matriz WMTS inválida')
    }
  }
  return new WMTS({ ...options, crossOrigin: 'anonymous', attributions: source.attribution })
}
