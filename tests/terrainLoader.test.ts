// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadTerrainGrid } from '../src/features/route/terrainAssets'

afterEach(() => vi.unstubAllGlobals())
const metadata = {
  width: 2, height: 2, bounds: [77.3, 18.3, 77.4, 18.4],
  sha256: 'ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2',
  nominalSourceResolutionMeters: 20, gridStepMeters: 80, source: 'TEST ONLY',
}

describe('carga binaria y bloqueo explícito de datos no verificables', () => {
  it('distingue celdas NoData de valores numéricos, sin sustituirlos por ceros', async () => {
    const binary = new ArrayBuffer(32)
    const view = new DataView(binary)
    for (let i = 0; i < 4; i++) {
      view.setFloat32(i * 8, i === 1 ? NaN : -2500 + i, true)
      view.setFloat32(i * 8 + 4, i === 1 ? NaN : 3, true)
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(metadata)))
      .mockResolvedValueOnce(new Response(binary)))
    const grid = await loadTerrainGrid('/')
    expect(grid.elevations).toEqual([-2500, null, -2498, -2497])
    expect(grid.maxSlopeDegrees[1]).toBeNull()
  })
  it('bloquea errores HTTP, longitud truncada o identificador ajeno', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(loadTerrainGrid('/')).rejects.toThrow('NO_DATA')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(metadata)))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4))))
    await expect(loadTerrainGrid('/')).rejects.toThrow('UNVERIFIED')
  })
})
