import { describe, it, expect } from 'vitest'
import { buildCompactMissionContext } from '../src/features/agent/missionContext'

describe('ARES MISSION COMMS - buildCompactMissionContext', () => {
  it('genera contexto estructurado y compacto para Gale Crater / Mount Sharp en 3D', () => {
    const context = buildCompactMissionContext({
      screen: 'terrain3d',
      currentLocation: { lat: -4.68, lon: 137.40, elev: -2100 },
      selectedDiscoveryName: 'Crestas Boxwork de Mount Sharp',
      isDiscoveryTourActive: true,
      currentDiscoveryStopIndex: 1,
    })

    expect(context.systemName).toBe('ARES-NAV TACTICAL SYSTEM')
    expect(context.geography.region).toBe('GALE_MOUNT_SHARP')
    expect(context.geography.screenMode).toBe('terrain3d')
    expect(context.geography.centerCoords.lat).toBe(-4.68)
    expect(context.geography.centerCoords.lon).toBe(137.4)
    expect(context.geography.elevationMeters).toBe(-2100)
    expect(context.geography.elevationStatus).toBe('SIMULATED')
    expect(context.geography.selectedTargetName).toContain('Illustrative science target')
    expect(context.activeLayers.length).toBeGreaterThanOrEqual(3)
    expect(context.activeLayers.find(layer => layer.id === 'gale_dem')).toMatchObject({ provenance: 'SIMULATED', isDemNumeric: false })
    expect(context.habitat.status).toBe('SIMULATED_ACTIVE')
    expect(context.habitat.provenance).toBe('SIMULATED')
    expect(context.epistemicNote).toContain('3,389.5 km')
  })

  it('determina correctamente la ausencia de DEM numérico en Jezero (UNAVAILABLE)', () => {
    const context = buildCompactMissionContext({
      screen: 'map',
      scope: 'jezero',
    })

    expect(context.geography.region).toBe('JEZERO')
    expect(context.geography.elevationMeters).toBeNull()
    expect(context.geography.elevationStatus).toBe('UNAVAILABLE')
    expect(context.route.hazardsEvaluation).toContain('INSUFFICIENT DATA')
  })

  it('evalúa correctamente los límites de caminata marciana con radio de Marte en rutas activas', () => {
    // Origen Base A [137.44, -4.59], Parada P [137.45, -4.61] (~2.4 km)
    const context = buildCompactMissionContext({
      screen: 'terrain3d',
      currentStops: {
        A: [137.44, -4.59],
        P: [137.45, -4.61],
      },
    })

    expect(context.route.hasRoute).toBe(true)
    expect(context.route.stopCount).toBe(2)
    expect(context.route.totalDistanceKm).toBeGreaterThan(1.0)
    expect(context.route.totalDistanceKm).toBeLessThan(5.0)
    expect(context.route.walkbackAssessment?.status).toBe('NOMINAL')
    expect(context.route.walkbackAssessment?.nominalLimitKm).toBe(5.0)
    expect(context.route.walkbackAssessment?.label).toContain('NOT a NASA EVA limit')
  })

  it('indica precaución o exceso de límite si la caminata supera 5 km', () => {
    // Distancia larga > 6 km
    const context = buildCompactMissionContext({
      screen: 'terrain3d',
      currentStops: {
        A: [137.30, -4.50],
        P: [137.50, -4.75],
      },
    })

    expect(context.route.totalDistanceKm).toBeGreaterThan(5.0)
    expect(['PRECAUCIÓN', 'CRÍTICO']).toContain(context.route.walkbackAssessment?.status)
  })
})
