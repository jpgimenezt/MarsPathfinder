// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadWmts } from '../src/features/map/wmtsSources'
import { sources, vikingBase } from '../src/data/sourceManifest'
import { marsProjection } from '../src/features/map/marsProjection'

const ctx = sources[0]
const matrix = (width: string) => `
  <TileMatrix><ows:Identifier>0</ows:Identifier>
    <ScaleDenominator>279227636.29807472</ScaleDenominator>
    <TopLeftCorner>-180 90</TopLeftCorner><TileWidth>256</TileWidth><TileHeight>256</TileHeight>
    <MatrixWidth>${width}</MatrixWidth><MatrixHeight>1.0</MatrixHeight>
  </TileMatrix>`

const xml = (width = '2.0', crs = marsProjection.getCode(), product = ctx.productId, format = 'image/png') => `<?xml version="1.0"?>
  <Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1" version="1.0.0">
    <Contents><Layer><ows:Identifier>${product}</ows:Identifier>
      <ows:BoundingBox crs="${crs}"><ows:LowerCorner>77.16 18.21</ows:LowerCorner>
        <ows:UpperCorner>77.69 18.72</ows:UpperCorner></ows:BoundingBox>
      <Style isDefault="true"><ows:Identifier>default</ows:Identifier></Style>
      <Format>${format}</Format><TileMatrixSetLink><TileMatrixSet>default028mm</TileMatrixSet></TileMatrixSetLink>
      <ResourceURL format="${format}" resourceType="tile"
        template="https://trek.nasa.gov/tiles/Mars/EQ/test/1.0.0//{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.${format === 'image/jpeg' ? 'jpg' : 'png'}"/>
    </Layer><TileMatrixSet><ows:Identifier>default028mm</ows:Identifier>
      <ows:SupportedCRS>${crs}</ows:SupportedCRS>${matrix(width)}
    </TileMatrixSet></Contents>
  </Capabilities>`

afterEach(() => vi.unstubAllGlobals())

describe('GetCapabilities WMTS de Mars Trek', () => {
  it('integra Viking JPEG como base con la misma proyección marciana', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      xml('2.0', marsProjection.getCode(), vikingBase.productId, 'image/jpeg'))))
    const source = await loadWmts(vikingBase, new AbortController().signal)
    expect(source.getProjection()?.getCode()).toBe(marsProjection.getCode())
    expect(source.getTileUrlFunction()([0, 1, 0], 1, marsProjection)).toContain('/default/default028mm/0/0/1.jpg')
    expect(source.getAttributions()?.({} as never)).toContain(vikingBase.attribution)
  })
  it('normaliza matrices decimales enteras sin alterar proyección, extensión ni URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml(), { status: 200 })))
    const source = await loadWmts(ctx, new AbortController().signal)
    expect(source.getProjection()?.getCode()).toBe(marsProjection.getCode())
    expect(source.getTileGrid()?.getFullTileRange(0)?.maxX).toBe(1)
    expect(source.getTileGrid()?.getExtent()).toEqual([77.16, 18.21, 77.69, 18.72])
    expect(source.getTileUrlFunction()([0, 1, 0], 1, marsProjection)).toContain('/default/default028mm/0/0/1.png')
  })
  it('no fuerza matrices con números fraccionarios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml('2.5'))))
    await expect(loadWmts(ctx, new AbortController().signal)).rejects.toThrow('matriz WMTS inválida')
  })
  it('rechaza HTTP fallido, XML inválido y proyección incorrecta', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('<broken>'))
      .mockResolvedValueOnce(new Response(xml('2.0', 'EPSG:4326')))
    vi.stubGlobal('fetch', fetchMock)
    for (const expected of ['HTTP 503', 'XML inválido', 'PROJECTION_MISMATCH']) {
      await expect(loadWmts(ctx, new AbortController().signal)).rejects.toThrow(expected)
    }
  })
  it('propaga abortos del navegador sin crear una fuente', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    await expect(loadWmts(ctx, controller.signal)).rejects.toHaveProperty('name', 'AbortError')
  })
})
