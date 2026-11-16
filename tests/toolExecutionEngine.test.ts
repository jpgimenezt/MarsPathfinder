import { describe, it, expect, vi } from 'vitest'
import { ToolExecutionEngine, type AppActionHandlers } from '../src/features/agent/toolExecutionEngine'
import { buildCompactMissionContext } from '../src/features/agent/missionContext'

describe('ARES MISSION COMMS - ToolExecutionEngine', () => {
  const mockHandlers: AppActionHandlers = {
    focusCamera: vi.fn(),
    toggleLayer: vi.fn(),
    setWaypoint: vi.fn(),
    previewRoute: vi.fn(),
    openComparisonModal: vi.fn(),
    openDataCenterModal: vi.fn(),
    openSurfaceIntelligenceModal: vi.fn(),
    startTour: vi.fn(),
    pauseTour: vi.fn(),
    setCleanViewMode: vi.fn(),
    triggerSimContingency: vi.fn(),
    getContextSnapshot: () =>
      buildCompactMissionContext({
        screen: 'terrain3d',
        currentLocation: { lat: -4.68, lon: 137.40 },
      }),
  }

  it('ejecuta herramientas de Nivel 1 (Consulta) de forma inmediata sin confirmación', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'getCurrentMissionContext',
      input: {},
    })

    expect(result.success).toBe(true)
    expect(result.securityLevel).toBe(1)
    expect(result.requiresConfirmation).toBeFalsy()
    expect(result.output).toHaveProperty('systemName', 'ARES-NAV TACTICAL SYSTEM')
  })

  it('ejecuta herramientas de Nivel 2 (Visualización) y activa callbacks reales de la app', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'focusGeographicTarget',
      input: {
        lat: -4.68,
        lon: 137.40,
        height: 25,
        durationSeconds: 2.5,
        targetName: 'Mount Sharp Boxwork',
      },
    })

    expect(result.success).toBe(true)
    expect(result.securityLevel).toBe(2)
    expect(mockHandlers.focusCamera).toHaveBeenCalledWith({
      lat: -4.68,
      lon: 137.40,
      height: 25,
      duration: 2.5,
    })
    expect(result.output.status).toBe('CAMERA_TRANSITION_DISPATCHED')
  })

  it('solicita confirmación para herramientas de Nivel 3 (Modificación de waypoints)', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'createMissionWaypoint',
      input: {
        stopId: 'P',
        lat: -4.685,
        lon: 137.395,
        name: 'Afloramiento Boxwork',
      },
    })

    expect(result.securityLevel).toBe(3)
    expect(result.requiresConfirmation).toBe(true)
    expect(result.pendingConfirmationId).toBeDefined()
    expect(result.confirmationMessage).toContain('P')

    // Confirmar la acción
    const confirmResult = await engine.confirmPendingAction(result.pendingConfirmationId!, true)
    expect(confirmResult.success).toBe(true)
    expect(mockHandlers.setWaypoint).toHaveBeenCalledWith('P', [137.395, -4.685], 'Afloramiento Boxwork')
  })

  it('cancela la acción si el usuario decide abortar', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'createMissionWaypoint',
      input: {
        stopId: 'B',
        lat: -4.75,
        lon: 137.38,
      },
    })

    expect(result.requiresConfirmation).toBe(true)
    const cancelResult = await engine.confirmPendingAction(result.pendingConfirmationId!, false)
    expect(cancelResult.success).toBe(false)
    expect(cancelResult.output.status).toBe('CANCELLED_BY_ASTRONAUT')
  })

  it('valida parámetros con Zod y rechaza coordenadas inválidas', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'focusGeographicTarget',
      input: {
        lat: 95.0, // Latitud fuera de rango (-90 a 90)
        lon: 137.40,
      },
    })

    expect(result.success).toBe(false)
    expect(result.output.error).toBe('INVALID_PARAMETERS')
  })

  it('mantiene compatibilidad con calculate_mars_distance usando Rm = 3,389.5 km', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const result = await engine.executeTool({
      tool: 'calculate_mars_distance',
      input: {
        lat1: 18.42,
        lon1: 77.45,
        lat2: 18.51,
        lon2: 77.30,
      },
    })

    expect(result.success).toBe(true)
    expect(result.output.mars_radius_km).toBe(3389.5)
    expect(result.output.distance_km).toBeCloseTo(9.959, 1)
  })

  it('ejecuta activateMissionSimulation tolerando parámetros vacíos o aliases de Bedrock', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)

    // Caso 1: Sin argumentos {}
    const r1 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: {},
    })
    expect(r1.success).toBe(true)
    expect(r1.output.scenario).toBe('DESCENT_EDL')
    expect(r1.output.provenance).toBe('SIMULATED')

    // Caso 2: Con scenarioType de Nova Sonic
    const r2 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: { scenarioType: 'EDL_DESCENT' },
    })
    expect(r2.success).toBe(true)
    expect(r2.output.scenario).toBe('DESCENT_EDL')

    // Caso 3: Contingencia o tormenta
    const r3 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: { scenarioType: 'DUST_STORM' },
    })
    expect(r3.success).toBe(true)
    expect(r3.output.scenario).toBe('DUST_STORM_CONTINGENCY')

    // Caso 4: Parámetros nulos o string plano (evita INVALID_PARAMETERS en Bedrock)
    const r4 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: { scenario: null } as any,
    })
    expect(r4.success).toBe(true)
    expect(r4.output.scenario).toBe('DESCENT_EDL')

    const r5 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: 'DESCENT_EDL' as any,
    })
    expect(r5.success).toBe(true)
    expect(r5.output.scenario).toBe('DESCENT_EDL')

    const r6 = await engine.executeTool({
      tool: 'activateMissionSimulation',
      input: null as any,
    })
    expect(r6.success).toBe(true)
    expect(r6.output.scenario).toBe('DESCENT_EDL')
  })

  it('normaliza nombres de capas en toggleScientificLayer', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const r = await engine.executeTool({
      tool: 'toggleScientificLayer',
      input: { layerId: 'THEMIS Inercia Térmica' },
    })
    expect(r.success).toBe(true)
    expect(r.output.layerId).toBe('themis')
    expect(r.output.enabled).toBe(true)
    expect(mockHandlers.toggleLayer).toHaveBeenCalledWith('themis', true)
  })
  it('localizes tool outputs and confirmation prompts without changing their stable status codes', async () => {
    const engine = new ToolExecutionEngine(mockHandlers)
    const en = await engine.executeTool({ tool: 'switchScreenView', input: { screen: 'map' } })
    expect(en.output.message).toContain('View switched to Jezero')
    expect(en.actionPerformed).toContain('executed successfully')

    const es = await engine.executeTool({ tool: 'switchScreenView', language: 'es', input: { screen: 'map' } })
    expect(es.output.message).toContain('Vista cambiada')

    const enConfirmation = await engine.executeTool({
      tool: 'createMissionWaypoint', input: { stopId: 'B', lon: 77.4, lat: 18.4 },
    })
    expect(enConfirmation.confirmationMessage).toContain('Confirm execution')
    const esConfirmation = await engine.executeTool({
      tool: 'createMissionWaypoint', language: 'es', input: { stopId: 'P', lon: 77.4, lat: 18.4 },
    })
    expect(esConfirmation.confirmationMessage).toContain('Confirmar')
    const mola = await engine.executeTool({ tool: 'lookup_mission_dataset', input: { instrument_or_mission: 'MOLA' } })
    expect(mola.output.is_numeric_dem).toBe(false)
    expect(mola.output.family).toContain('Color-shaded relief')
  })

})
