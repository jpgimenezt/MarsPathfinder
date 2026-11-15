import { describe, expect, it } from 'vitest'
import {
  evaluateSlope,
  evaluateWalkbackLimit,
  getGaleElevation,
  getGaleSlopeDegrees,
} from '../src/features/terrain/galeElevation'
import { GALE_CENTER, GALE_DISCOVERIES, MOUNT_SHARP_PEAK } from '../src/features/science/galeCuriosityData'

describe('galeCuriosityData & galeElevation', () => {
  it('contiene los cuatro descubrimientos obligatorios de Gale y Curiosity con coordenadas válidas', () => {
    expect(GALE_DISCOVERIES.length).toBe(4)
    const pontours = GALE_DISCOVERIES.find(d => d.id === 'pontours-mud-cracks')
    expect(pontours).toBeDefined()
    expect(pontours?.coordinates.lat).toBeCloseTo(-4.652, 2)
    expect(pontours?.coordinates.lon).toBeCloseTo(137.404, 2)
    expect(pontours?.instruments).toContain('Mastcam')
    expect(pontours?.instruments).toContain('ChemCam LIBS')

    const boxwork = GALE_DISCOVERIES.find(d => d.id === 'mount-sharp-boxwork')
    expect(boxwork).toBeDefined()
    expect(boxwork?.coordinates.lat).toBeCloseTo(-4.821, 2)
    expect(boxwork?.significance).toContain('aguas subterráneas')

    const veraRubin = GALE_DISCOVERIES.find(d => d.id === 'vera-rubin-ridge')
    expect(veraRubin).toBeDefined()

    const yellowknife = GALE_DISCOVERIES.find(d => d.id === 'yellowknife-bay')
    expect(yellowknife).toBeDefined()
  })

  it('calcula la elevación hipsométrica de Mount Sharp significativamente más alta que el lecho de Gale', () => {
    const floorElevation = getGaleElevation(137.441, -4.589) // Yellowknife Bay (lecho norte de Gale)
    const peakElevation = getGaleElevation(MOUNT_SHARP_PEAK.lon, MOUNT_SHARP_PEAK.lat)

    expect(floorElevation).toBeLessThan(-4300)
    expect(peakElevation).toBeGreaterThan(0)
    // El desnivel relativo debe ser de más de 5,000 metros (monte de 5.5 km sobre el lecho)
    expect(peakElevation - floorElevation).toBeGreaterThan(5000)
  })

  it('evalúa pendientes según los límites de locomoción EVA de la NASA', () => {
    const nominal = evaluateSlope(4.5)
    expect(nominal.riskLevel).toBe('NOMINAL')
    expect(nominal.maxSafeSpeedKmh).toBe(3.6)

    const caution = evaluateSlope(11.2)
    expect(caution.riskLevel).toBe('PRECAUCIÓN')
    expect(caution.maxSafeSpeedKmh).toBe(1.8)

    const hazard = evaluateSlope(18.5)
    expect(hazard.riskLevel).toBe('PELIGROSO')
    expect(hazard.maxSafeSpeedKmh).toBe(0.6)
  })

  it('calcula la regla de walkback de la NASA con límites de 5 km nominal y 8 km contingencia', () => {
    const safeWalk = evaluateWalkbackLimit(3200)
    expect(safeWalk.status).toBe('NOMINAL')
    expect(safeWalk.distanceKm).toBe(3.2)

    const cautionWalk = evaluateWalkbackLimit(6400)
    expect(cautionWalk.status).toBe('PRECAUCIÓN')
    expect(cautionWalk.distanceKm).toBe(6.4)

    const dangerWalk = evaluateWalkbackLimit(9100)
    expect(dangerWalk.status).toBe('CRÍTICO')
    expect(dangerWalk.distanceKm).toBe(9.1)
  })

  it('calcula pendientes válidas y finitas en puntos representativos de Gale', () => {
    const slopeFloor = getGaleSlopeDegrees(GALE_CENTER.lon, GALE_CENTER.lat)
    expect(Number.isFinite(slopeFloor)).toBe(true)
    expect(slopeFloor).toBeGreaterThanOrEqual(0)
    expect(slopeFloor).toBeLessThan(45)
  })
})
