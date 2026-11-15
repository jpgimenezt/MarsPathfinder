import { describe, it, expect } from 'vitest'
import {
  USGS_GALE_UNITS,
  getUsgsGeologicUnitAt,
} from '../src/features/geology/usgsGeologyData'

describe('USGS Astrogeology — Sistema Geológico de Gale Crater', () => {
  it('contiene las 5 unidades estratigráficas clave de USGS SIM 3292', () => {
    const requiredCodes = ['lApm', 'eHh', 'AHv', 'mNh', 'Nhm']
    for (const code of requiredCodes) {
      const unit = USGS_GALE_UNITS[code]
      expect(unit).toBeDefined()
      expect(unit.name).toBeTruthy()
      expect(unit.description).toBeTruthy()
      expect(unit.citation).toContain('USGS')
      expect(unit.evaSuitability).toMatch(/OPTIMAL|MODERATE|CAUTION|RESTRICTED/)
      expect(unit.evaSuitabilityNotes).toBeTruthy()
    }
  })

  it('clasifica la cumbre de Mount Sharp como lApm (Unidad Estratificada del Montículo)', () => {
    const unit = getUsgsGeologicUnitAt(137.45, -5.08, -1200)
    expect(unit.code).toBe('lApm')
  })

  it('clasifica la Bahía Yellowknife y Glen Torridon como eHh (Transición Arcillosa-Sulfatada)', () => {
    const unit = getUsgsGeologicUnitAt(137.4485, -4.5925, -4100)
    expect(unit.code).toBe('eHh')
  })

  it('clasifica las dunas activas de Bagnold como AHv con precaución EVA', () => {
    const unit = getUsgsGeologicUnitAt(137.40, -4.72, -4380)
    expect(unit.code).toBe('AHv')
    expect(unit.evaSuitability).toBe('CAUTION')
  })

  it('clasifica el borde del cráter (>46 km de radio) como Nhm (Macizos del Borde)', () => {
    // Fuera del radio de 46 km
    const unit = getUsgsGeologicUnitAt(136.2, -6.2, -1500)
    expect(unit.code).toBe('Nhm')
    expect(unit.evaSuitability).toBe('RESTRICTED')
  })
})
