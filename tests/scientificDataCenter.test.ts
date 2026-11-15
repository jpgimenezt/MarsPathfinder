import { describe, it, expect } from 'vitest'
import {
  ARES_SCIENTIFIC_REGISTRY,
  ARES_DISCLAIMER_NOTICE,
  queryScientificObservationProfile,
} from '../src/features/science/scientificDataCenter'

describe('ARES Scientific Data Center & Observation Profile', () => {
  it('todos los datasets contienen los 14 campos de metadatos normalizados obligatorios', () => {
    expect(ARES_SCIENTIFIC_REGISTRY.length).toBeGreaterThanOrEqual(6)

    for (const ds of ARES_SCIENTIFIC_REGISTRY) {
      expect(ds.datasetId).toBeTruthy()
      expect(ds.name).toBeTruthy()
      expect(ds.description).toBeTruthy()
      expect(ds.organization).toBeTruthy()
      expect(ds.mission).toBeTruthy()
      expect(ds.instrument).toBeTruthy()
      expect(ds.originUrl).toMatch(/^https?:\/\//)
      expect(ds.acquisitionDate).toBeTruthy()
      expect(ds.publicationDate).toBeTruthy()
      expect(ds.dataType).toMatch(/OBSERVED|DERIVED|HISTORICAL|MODELED/)
      expect(ds.resolution).toBeTruthy()
      expect(ds.crs).toBeTruthy()
      expect(ds.geographicExtent).toBeTruthy()
      expect(ds.unitOfMeasure).toBeTruthy()
      expect(ds.license).toBeTruthy()
      expect(ds.credits).toBeTruthy()
      expect(ds.availabilityStatus).toBe('AVAILABLE')
      expect(ds.limitations).toBeTruthy()
    }
  })

  it('incluye el mosaico CTX controlado de Gale Crater (Gale_CTX_BlockAdj_dd)', () => {
    const ctx = ARES_SCIENTIFIC_REGISTRY.find(ds => ds.datasetId === 'nasa-trek-gale-ctx')
    expect(ctx).toBeDefined()
    expect(ctx?.instrument).toContain('CTX')
    expect(ctx?.resolution).toContain('6.0')
    expect(ctx?.originUrl).toContain('Gale_CTX_BlockAdj_dd')
  })

  it('incluye la cartografía geológica de USGS SIM 3292', () => {
    const geology = ARES_SCIENTIFIC_REGISTRY.find(ds => ds.datasetId === 'usgs-sim-3292-geology')
    expect(geology).toBeDefined()
    expect(geology?.organization).toContain('USGS')
    expect(geology?.category).toBe('GEOLOGY')
  })

  it('contiene el aviso institucional obligatorio de independencia de NASA', () => {
    expect(ARES_DISCLAIMER_NOTICE).toContain('ARES es un proyecto independiente')
    expect(ARES_DISCLAIMER_NOTICE).toContain('NASA Space Apps Challenge')
    expect(ARES_DISCLAIMER_NOTICE).toContain('No está afiliado, respaldado ni patrocinado por la NASA')
  })

  it('queryScientificObservationProfile identifica datasets y contexto para coordenadas de Gale', () => {
    const profile = queryScientificObservationProfile(137.4485, -4.5925, -4520)
    expect(profile.availableDatasets.length).toBeGreaterThanOrEqual(4)
    expect(profile.geologySummary).toContain('Gale Crater')
    expect(profile.missionHeritageNearby.some(h => h.includes('Curiosity'))).toBe(true)
    expect(profile.missionHeritageNearby.some(h => h.includes('CTX'))).toBe(true)
  })
})
