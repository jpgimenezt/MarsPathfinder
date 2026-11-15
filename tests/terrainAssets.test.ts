import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const metadata = JSON.parse(readFileSync('public/data/jezero-dem-80m.json', 'utf8')) as {
  width: number; height: number; bounds: number[]; validCells: number; sha256: string
  nominalSourceResolutionMeters: number; gridStepMeters: number; verticalReference: string
}
const raster = readFileSync('public/data/jezero-dem-80m.bin')

describe('derivado numérico USGS (no imagen sombreada)', () => {
  it('conserva forma, fuente y límites sin inventar celdas fuera del DEM', () => {
    expect(metadata.sha256).toBe('ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2')
    expect(metadata.nominalSourceResolutionMeters).toBe(20)
    expect(metadata.gridStepMeters).toBe(80)
    expect(raster.length).toBe(metadata.width * metadata.height * 8)
    expect(metadata.bounds[0]).toBeGreaterThan(77.2)
    expect(metadata.bounds[2]).toBeLessThan(78.12)
    expect(metadata.verticalReference).toContain('unknown')
  })
  it('solo contabiliza muestras finitas, mantiene elevaciones y pendientes posibles', () => {
    let valid = 0
    for (let i = 0; i < metadata.width * metadata.height; i++) {
      const z = raster.readFloatLE(i * 8)
      const slope = raster.readFloatLE(i * 8 + 4)
      if (Number.isFinite(z) !== Number.isFinite(slope)) throw new Error(`NoData inconsistente en celda ${i}`)
      if (Number.isFinite(z)) {
        valid++
        if (slope < 0 || slope >= 90) throw new Error(`Pendiente inválida en celda ${i}`)
      }
    }
    expect(valid).toBe(metadata.validCells)
  })
})
