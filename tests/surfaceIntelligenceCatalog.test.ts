import { describe, it, expect } from 'vitest'
import { SURFACE_INTELLIGENCE_GALLERY } from '../src/features/science/surfaceIntelligenceCatalog'

describe('Mars Surface Intelligence — Galería de Imágenes Reales', () => {
  it('contiene observaciones de superficie tanto de Curiosity como de Perseverance', () => {
    const curiosityImgs = SURFACE_INTELLIGENCE_GALLERY.filter(img => img.mission === 'Curiosity')
    const perseveranceImgs = SURFACE_INTELLIGENCE_GALLERY.filter(img => img.mission === 'Perseverance')

    expect(curiosityImgs.length).toBeGreaterThanOrEqual(4)
    expect(perseveranceImgs.length).toBeGreaterThanOrEqual(2)
  })

  it('mantiene distinción geográfica estricta entre Gale Crater y Jezero Crater', () => {
    for (const img of SURFACE_INTELLIGENCE_GALLERY) {
      if (img.mission === 'Curiosity') {
        expect(img.targetRegion).toContain('Gale')
        if (img.coordinates) {
          // Gale Crater: Longitud ~137°E, Latitud ~-4°S
          expect(img.coordinates.lon).toBeGreaterThan(136.0)
          expect(img.coordinates.lon).toBeLessThan(139.0)
          expect(img.coordinates.lat).toBeLessThan(0)
        }
      } else if (img.mission === 'Perseverance') {
        expect(img.targetRegion).toContain('Jezero')
        expect(img.targetRegion).toContain('ANÁLOGO PLANETARIO')
        if (img.coordinates) {
          // Jezero Crater: Longitud ~77°E, Latitud ~18°N
          expect(img.coordinates.lon).toBeGreaterThan(76.0)
          expect(img.coordinates.lon).toBeLessThan(79.0)
          expect(img.coordinates.lat).toBeGreaterThan(0)
        }
      }
    }
  })

  it('todas las imágenes poseen URLs a imágenes de alta resolución oficiales de la NASA', () => {
    for (const img of SURFACE_INTELLIGENCE_GALLERY) {
      expect(img.imageUrl.startsWith('data/') || img.imageUrl.startsWith('http')).toBe(true)
      expect(img.highResUrl).toMatch(/^https?:\/\/photojournal\.jpl\.nasa\.gov\/jpeg\//)
      expect(img.nasaCredit).toContain('NASA')
      expect(img.sol).toBeGreaterThanOrEqual(0)
      expect(img.camera).toBeTruthy()
    }
  })
})
