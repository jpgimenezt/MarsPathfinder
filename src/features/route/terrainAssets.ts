import type { TerrainGrid } from './terrainPathfinder'

interface DemMetadata {
  width: number
  height: number
  bounds: [number, number, number, number]
  source: string
  nominalSourceResolutionMeters: number
  gridStepMeters: number
  sha256: string
  verticalReference: string
}

export async function loadTerrainGrid(baseUrl: string): Promise<TerrainGrid> {
  const [metadataResponse, binaryResponse] = await Promise.all([
    fetch(`${baseUrl}data/jezero-dem-80m.json`), fetch(`${baseUrl}data/jezero-dem-80m.bin`),
  ])
  if (!metadataResponse.ok || !binaryResponse.ok) throw new Error('NO_DATA: derivado DEM no disponible')
  const metadata = await metadataResponse.json() as DemMetadata
  const binary = await binaryResponse.arrayBuffer()
  const count = metadata.width * metadata.height
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) ||
      !Number.isInteger(count) || count < 4 || count > 4_000_000 ||
      binary.byteLength !== count * 8 || metadata.bounds?.length !== 4 || !metadata.bounds.every(Number.isFinite) ||
      metadata.bounds[0] >= metadata.bounds[2] || metadata.bounds[1] >= metadata.bounds[3] ||
      metadata.nominalSourceResolutionMeters !== 20 || metadata.gridStepMeters !== 80 ||
      metadata.sha256 !== 'ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2') {
    throw new Error('UNVERIFIED: derivado DEM inválido')
  }
  const data = new DataView(binary)
  const elevations: (number | null)[] = Array(count)
  const maxSlopeDegrees: (number | null)[] = Array(count)
  for (let i = 0; i < count; i++) {
    const z = data.getFloat32(i * 8, true)
    const slope = data.getFloat32(i * 8 + 4, true)
    if (Number.isFinite(z) !== Number.isFinite(slope) ||
      (Number.isFinite(slope) && (slope < 0 || slope >= 90))) throw new Error('UNVERIFIED: máscara DEM inválida')
    elevations[i] = Number.isFinite(z) ? z : null
    maxSlopeDegrees[i] = Number.isFinite(slope) ? slope : null
  }
  return { width: metadata.width, height: metadata.height, bounds: metadata.bounds,
    source: metadata.source, nominalSourceResolutionMeters: metadata.nominalSourceResolutionMeters,
    gridStepMeters: metadata.gridStepMeters, elevations, maxSlopeDegrees }
}
