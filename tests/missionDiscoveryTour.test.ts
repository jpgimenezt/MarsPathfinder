import { describe, expect, it } from 'vitest'
import {
  MISSION_DISCOVERY_STOPS,
  type TourStop,
} from '../src/features/tour/missionDiscoveryTourData'

describe('Mission Discovery Tour Data (Gale Crater)', () => {
  it('contiene exactamente 7 paradas científicas georreferenciadas', () => {
    expect(MISSION_DISCOVERY_STOPS).toHaveLength(7)
  })

  it('todos los hitos se encuentran dentro de los límites geográficos de Gale Crater', () => {
    // Gale Crater: lon 136.8 a 138.2, lat -5.8 a -4.2
    MISSION_DISCOVERY_STOPS.forEach((stop: TourStop) => {
      expect(stop.coordinates.lon).toBeGreaterThanOrEqual(136.8)
      expect(stop.coordinates.lon).toBeLessThanOrEqual(138.2)
      expect(stop.coordinates.lat).toBeGreaterThanOrEqual(-5.8)
      expect(stop.coordinates.lat).toBeLessThanOrEqual(-4.2)
    })
  })

  it('cada hito posee unidad geológica USGS SIM 3292 y relevancia científica', () => {
    MISSION_DISCOVERY_STOPS.forEach((stop: TourStop) => {
      expect(stop.title).toBeTruthy()
      expect(stop.subtitle).toBeTruthy()
      expect(stop.geologicalUnit.length).toBeGreaterThan(5)
      expect(stop.scientificValue.length).toBeGreaterThan(15)
      expect(stop.elevationMeters).toBeLessThan(0) // Suelo de cuenca y Mount Sharp bajo el areoide
      expect(stop.flightDurationSeconds).toBeGreaterThanOrEqual(10)
    })
  })

  it('las imágenes de contexto provienen de dominios o créditos oficiales NASA/JPL', () => {
    MISSION_DISCOVERY_STOPS.forEach((stop: TourStop) => {
      expect(stop.imageCredit).toContain('NASA')
      if (stop.imageUrl) {
        expect(stop.imageUrl.startsWith('https://')).toBe(true)
      }
    })
  })

  it('los textos no contienen emojis que resten rigor profesional a la interfaz', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    MISSION_DISCOVERY_STOPS.forEach((stop: TourStop) => {
      expect(emojiRegex.test(stop.title)).toBe(false)
      expect(emojiRegex.test(stop.subtitle)).toBe(false)
      expect(emojiRegex.test(stop.scientificValue)).toBe(false)
      expect(emojiRegex.test(stop.geologicalUnit)).toBe(false)
    })
  })
})
