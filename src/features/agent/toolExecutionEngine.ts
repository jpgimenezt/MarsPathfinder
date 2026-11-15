/**
 * ARES MISSION COMMS - Structured Tool Execution Engine
 * Registro de herramientas tipadas con validación Zod y clasificación en 4 niveles de seguridad:
 *
 * Nivel 1: Consulta (Lectura y explicaciones sin efectos secundarios) -> Ejecución directa
 * Nivel 2: Visualización (Cambio de cámara, capas, modales) -> Ejecución directa
 * Nivel 3: Modificación (Creación/edición de rutas y waypoints) -> Requiere confirmación
 * Nivel 4: Simulación (Iniciar/alterar simulación activa o contingencias) -> Requiere confirmación
 */

import { z } from 'zod'
import type { MarsPoint } from '../route/marsDistance'
import { marsDistance } from '../route/marsDistance'
import type { StopId } from '../route/routePlan'
import { evaluateSlope, evaluateWalkbackLimit } from '../terrain/galeElevation'
import { GALE_DISCOVERIES } from '../science/galeCuriosityData'
import { DEFAULT_COLONY_MODULES } from '../colony/colonyCatalog'
import { queryScientificObservationProfile } from '../science/scientificDataCenter'
import type { CompactMissionContext } from './missionContext'

export type SecurityLevel = 1 | 2 | 3 | 4

export interface ToolDefinition<TArgs extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  description: string
  securityLevel: SecurityLevel
  schema: TArgs
  requiresConfirmation: boolean
  confirmationPrompt?: (args: z.infer<TArgs>) => string
}

export interface ToolExecutionRequest {
  tool: string
  input: Record<string, unknown>
  toolUseId?: string
}

export interface ToolExecutionResult {
  tool: string
  toolUseId?: string
  success: boolean
  output: Record<string, unknown>
  securityLevel: SecurityLevel
  requiresConfirmation?: boolean
  pendingConfirmationId?: string
  confirmationMessage?: string
  actionPerformed?: string
}

export interface AppActionHandlers {
  focusCamera?: (params: { lat: number; lon: number; height?: number; duration?: number }) => void
  toggleLayer?: (layerId: string, enabled: boolean) => void
  setWaypoint?: (id: StopId, point: MarsPoint, name?: string) => void
  previewRoute?: (mode: 'FOOT' | 'ROVER') => void
  openComparisonModal?: (open: boolean) => void
  openDataCenterModal?: (open: boolean) => void
  openSurfaceIntelligenceModal?: (open: boolean) => void
  startTour?: (startIndex?: number) => void
  pauseTour?: () => void
  setCleanViewMode?: (active: boolean) => void
  triggerSimContingency?: (contingencyType: string) => void
  getContextSnapshot: () => CompactMissionContext
}

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN ZOD PARA CADA HERRAMIENTA
// ==========================================

export const GetCurrentMissionContextSchema = z.object({})

export const FocusGeographicTargetSchema = z.object({
  lat: z.number().min(-90).max(90).optional().describe('Latitud planetocéntrica marciana (-90 a 90)'),
  lon: z.number().min(-180).max(360).optional().describe('Longitud Este marciana'),
  height: z.number().optional().describe('Altitud de cámara en metros o unidades 3D'),
  durationSeconds: z.number().min(0.5).max(10).optional().default(2).describe('Duración de transición suave en segundos'),
  targetName: z.string().optional().describe('Nombre del objetivo geológico (ej: Mount Sharp, Delta Jezero)'),
})

export const ToggleScientificLayerSchema = z.object({
  layerId: z.string().describe("Identificador de capa (ej: 'ctx', 'mola', 'themis', 'gale_dem', 'geology')"),
  enabled: z.boolean().describe('Estado deseado de la capa (true para encender, false para apagar)'),
})

export const ExplainSelectedRegionSchema = z.object({
  regionName: z.string().optional().describe("Nombre de región ('JEZERO', 'GALE', 'MOUNT_SHARP', 'BOXWORK', etc.)"),
  region: z.string().optional().describe("Alias alternativo para regionName"),
})

export const GetMissionObservationsSchema = z.object({
  lat: z.number().optional().describe('Latitud de consulta'),
  lon: z.number().optional().describe('Longitud de consulta'),
  region: z.string().optional().describe("Región de interés ('GALE' o 'JEZERO')"),
})

export const CreateMissionWaypointSchema = z.object({
  stopId: z.enum(['A', 'P', 'B']).describe("Punto de ruta: 'A' (Base/Inicio), 'P' (Parada Científica), 'B' (Destino)"),
  lat: z.number().min(-90).max(90).describe('Latitud del punto'),
  lon: z.number().min(-180).max(360).describe('Longitud del punto'),
  name: z.string().optional().describe('Etiqueta o nombre del waypoint'),
})

export const PreviewEVARouteSchema = z.object({
  mode: z.enum(['FOOT', 'ROVER']).optional().default('FOOT').describe('Modo de desplazamiento para la caminata'),
})

export const CompareMissionRoutesSchema = z.object({
  showModal: z.boolean().optional().default(true).describe('Abrir modal de comparación de trayectorias'),
})

export const GetRouteStatisticsSchema = z.object({
  includeElevation: z.boolean().optional().default(true).describe('Incluir pendientes y altimetría si está disponible'),
})

export const StartDiscoveryTourSchema = z.object({
  startIndex: z.number().min(0).max(10).optional().default(0).describe('Índice de parada inicial del tour'),
})

export const PauseDiscoveryTourSchema = z.object({})

export const GetHabitatStatusSchema = z.object({})

export const ActivateMissionSimulationSchema = z.object({
  scenario: z.enum(['DESCENT_EDL', 'EVA_TRAVERSE', 'DUST_STORM_CONTINGENCY']).describe('Escenario de simulación a activar'),
})

export const TriggerMissionContingencySchema = z.object({
  contingencyType: z.enum(['RADIO_LOSS', 'SUIT_LEAK_MINOR', 'BATTERY_LOW', 'SLOPE_HAZARD']).describe('Tipo de contingencia de entrenamiento'),
})

// Herramientas heredadas de aws-agent para compatibilidad total
export const CalculateMarsDistanceSchema = z.object({
  lat1: z.number(),
  lon1: z.number(),
  lat2: z.number(),
  lon2: z.number(),
})

export const LookupMissionDatasetSchema = z.object({
  instrument_or_mission: z.string(),
})

export const GetScienceTargetsSchema = z.object({
  region: z.string(),
})

export const EvaluateEVAFeasibilitySchema = z.object({
  total_distance_km: z.number(),
  eva_mode: z.enum(['FOOT', 'ROVER']),
  estimated_slope_deg: z.number().optional(),
  has_meter_scale_dem: z.boolean().optional(),
})

// ==========================================
// 2. REGISTRO MAESTRO DE HERRAMIENTAS
// ==========================================

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  getCurrentMissionContext: {
    name: 'getCurrentMissionContext',
    description: 'Obtiene el estado en tiempo real del mapa marciano, región activa, capas y ruta trazada.',
    securityLevel: 1,
    schema: GetCurrentMissionContextSchema,
    requiresConfirmation: false,
  },
  focusGeographicTarget: {
    name: 'focusGeographicTarget',
    description: 'Desplaza suavemente la cámara 3D o el visor cartográfico hacia unas coordenadas o hito marciano.',
    securityLevel: 2,
    schema: FocusGeographicTargetSchema,
    requiresConfirmation: false,
  },
  toggleScientificLayer: {
    name: 'toggleScientificLayer',
    description: "Activa o desactiva capas científicas orbitales de NASA (ej: 'ctx', 'mola', 'themis', 'gale_dem').",
    securityLevel: 2,
    schema: ToggleScientificLayerSchema,
    requiresConfirmation: false,
  },
  explainSelectedRegion: {
    name: 'explainSelectedRegion',
    description: 'Consulta explicaciones geológicas y astrobiológicas fundadas en misiones de NASA para una región.',
    securityLevel: 1,
    schema: ExplainSelectedRegionSchema,
    requiresConfirmation: false,
  },
  getMissionObservations: {
    name: 'getMissionObservations',
    description: 'Obtiene observaciones orbitales y de superficie de NASA (Perseverance, Curiosity, CTX, HiRISE).',
    securityLevel: 1,
    schema: GetMissionObservationsSchema,
    requiresConfirmation: false,
  },
  createMissionWaypoint: {
    name: 'createMissionWaypoint',
    description: 'Agrega o modifica un punto de navegación (A, P o B) en la ruta actual de la misión.',
    securityLevel: 3,
    schema: CreateMissionWaypointSchema,
    requiresConfirmation: true,
    confirmationPrompt: (args: any) => `¿Confirmar fijar el punto ${args.stopId} en [${args.lat.toFixed(4)}°N, ${args.lon.toFixed(4)}°E]?`,
  },
  previewEVARoute: {
    name: 'previewEVARoute',
    description: 'Genera una previsualización de ruta y evalúa viabilidad según límites de caminata marciana.',
    securityLevel: 2,
    schema: PreviewEVARouteSchema,
    requiresConfirmation: false,
  },
  compareMissionRoutes: {
    name: 'compareMissionRoutes',
    description: 'Abre el comparador de rutas para evaluar la traza histórica de Curiosity vs la ruta EVA actual.',
    securityLevel: 2,
    schema: CompareMissionRoutesSchema,
    requiresConfirmation: false,
  },
  getRouteStatistics: {
    name: 'getRouteStatistics',
    description: 'Calcula distancia geodésica con radio de Marte (3,389.5 km), elevaciones y límites de marcha.',
    securityLevel: 1,
    schema: GetRouteStatisticsSchema,
    requiresConfirmation: false,
  },
  startDiscoveryTour: {
    name: 'startDiscoveryTour',
    description: 'Inicia el recorrido guiado cinematográfico por los descubrimientos científicos clave en Gale/Mount Sharp.',
    securityLevel: 4,
    schema: StartDiscoveryTourSchema,
    requiresConfirmation: true,
    confirmationPrompt: (args: any) => `¿Iniciar recorrido cinematográfico por los descubrimientos desde la parada #${args.startIndex ?? 0}?`,
  },
  pauseDiscoveryTour: {
    name: 'pauseDiscoveryTour',
    description: 'Pausa o reanuda el recorrido de descubrimiento científico.',
    securityLevel: 2,
    schema: PauseDiscoveryTourSchema,
    requiresConfirmation: false,
  },
  getHabitatStatus: {
    name: 'getHabitatStatus',
    description: 'Consulta los sistemas operativos de la Base Ares Alpha (energía solar, reactores, soporte vital).',
    securityLevel: 1,
    schema: GetHabitatStatusSchema,
    requiresConfirmation: false,
  },
  activateMissionSimulation: {
    name: 'activateMissionSimulation',
    description: 'Activa un escenario de simulación (descenso EDL, travesía o contingencia atmosférica).',
    securityLevel: 4,
    schema: ActivateMissionSimulationSchema,
    requiresConfirmation: true,
    confirmationPrompt: (args: any) => `¿Activar la simulación de misión para el escenario ${args.scenario}?`,
  },
  openSurfaceIntelligence: {
    name: 'openSurfaceIntelligence',
    description: 'Abre el catálogo interactivo de inteligencia de superficie marciana y objetivos geológicos.',
    securityLevel: 2,
    schema: z.object({ open: z.boolean().optional().default(true) }),
    requiresConfirmation: false,
  },
  triggerMissionContingency: {
    name: 'triggerMissionContingency',
    description: 'Inicia un simulacro de contingencia táctica únicamente en el entorno de simulación.',
    securityLevel: 4,
    schema: TriggerMissionContingencySchema,
    requiresConfirmation: true,
    confirmationPrompt: (args: any) => `¿Simular contingencia de entrenamiento: ${args.contingencyType}?`,
  },

  // Compatibilidad con las 4 herramientas originales de aws-agent
  calculate_mars_distance: {
    name: 'calculate_mars_distance',
    description: 'Calcula distancia de gran círculo usando el radio de Marte Rm = 3,389.5 km.',
    securityLevel: 1,
    schema: CalculateMarsDistanceSchema,
    requiresConfirmation: false,
  },
  lookup_mission_dataset: {
    name: 'lookup_mission_dataset',
    description: 'Consulta especificaciones técnicas de sensores de NASA (CTX, HiRISE, MOLA, THEMIS, etc.).',
    securityLevel: 1,
    schema: LookupMissionDatasetSchema,
    requiresConfirmation: false,
  },
  get_science_targets: {
    name: 'get_science_targets',
    description: 'Obtiene puntos de alto valor geológico comprobados en Jezero o Gale/Mount Sharp.',
    securityLevel: 1,
    schema: GetScienceTargetsSchema,
    requiresConfirmation: false,
  },
  evaluate_eva_feasibility: {
    name: 'evaluate_eva_feasibility',
    description: 'Evalúa viabilidad y seguridad de caminata considerando distancia, pendientes y DEM métrico.',
    securityLevel: 1,
    schema: EvaluateEVAFeasibilitySchema,
    requiresConfirmation: false,
  },
}

// ==========================================
// 3. MOTOR DE EJECUCIÓN CON VALIDACIÓN Y SEGURIDAD
// ==========================================

export class ToolExecutionEngine {
  private handlers: AppActionHandlers
  private pendingConfirmations: Map<
    string,
    {
      request: ToolExecutionRequest
      resolve: (value: ToolExecutionResult) => void
    }
  > = new Map()

  constructor(handlers: AppActionHandlers) {
    this.handlers = handlers
  }

  /**
   * Resuelve la definición de la herramienta admitiendo camelCase, snake_case o alias tolerantes
   */
  private resolveToolDefinition(toolName: string): ToolDefinition | undefined {
    if (!toolName) return undefined
    if (TOOL_REGISTRY[toolName]) return TOOL_REGISTRY[toolName]

    // Normalizar snake_case a camelCase (ej: focus_geographic_target -> focusGeographicTarget)
    const camel = toolName.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase())
    if (TOOL_REGISTRY[camel]) return TOOL_REGISTRY[camel]

    // Normalizar a minúsculas alfanuméricas
    const clean = toolName.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const [key, def] of Object.entries(TOOL_REGISTRY)) {
      if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
        return def
      }
    }

    // Alias habituales invocados por modelos de lenguaje
    const ALIASES: Record<string, string> = {
      focusmarsregion: 'focusGeographicTarget',
      focusregion: 'focusGeographicTarget',
      focusmars: 'focusGeographicTarget',
      focuscamera: 'focusGeographicTarget',
      getsurfaceintelligence: 'explainSelectedRegion',
      getsurfaceanalysis: 'explainSelectedRegion',
      geologicalanalysis: 'explainSelectedRegion',
      explainregion: 'explainSelectedRegion',
      togglescientificlayers: 'toggleScientificLayer',
      togglelayer: 'toggleScientificLayer',
      togglelayers: 'toggleScientificLayer',
    }

    const aliasTarget = ALIASES[clean]
    if (aliasTarget && TOOL_REGISTRY[aliasTarget]) {
      return TOOL_REGISTRY[aliasTarget]
    }

    return undefined
  }

  /**
   * Ejecuta una herramienta solicitada por ARES
   */
  public async executeTool(
    request: ToolExecutionRequest,
    options: { confirmed?: boolean } = {}
  ): Promise<ToolExecutionResult> {
    const def = this.resolveToolDefinition(request.tool)
    if (!def) {
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: false,
        output: { error: `Herramienta desconocida: ${request.tool}` },
        securityLevel: 1,
      }
    }

    // Validar esquema de entrada con Zod
    const parseResult = def.schema.safeParse(request.input)
    if (!parseResult.success) {
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: false,
        output: {
          error: 'INVALID_PARAMETERS',
          details: parseResult.error.format(),
        },
        securityLevel: def.securityLevel,
      }
    }

    const validatedInput = parseResult.data

    // Si la herramienta requiere confirmación y aún no fue confirmada por el usuario
    if (def.requiresConfirmation && !options.confirmed) {
      const confirmationId = `conf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const message = def.confirmationPrompt ? def.confirmationPrompt(validatedInput) : `¿Confirmar ejecución de ${def.name}?`

      return new Promise<ToolExecutionResult>(resolve => {
        this.pendingConfirmations.set(confirmationId, {
          request,
          resolve,
        })

        // Retorno inmediato que indica que se espera confirmación en la UI
        resolve({
          tool: request.tool,
          toolUseId: request.toolUseId,
          success: true,
          securityLevel: def.securityLevel,
          requiresConfirmation: true,
          pendingConfirmationId: confirmationId,
          confirmationMessage: message,
          output: {
            status: 'PENDING_USER_CONFIRMATION',
            confirmationId,
            message,
          },
        })
      })
    }

    // Ejecución directa de la acción
    try {
      const output = await this.dispatchAction(def.name, validatedInput)
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: true,
        output,
        securityLevel: def.securityLevel,
        actionPerformed: `Herramienta ${def.name} ejecutada con éxito.`,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: false,
        output: { error: 'EXECUTION_FAILED', details: msg },
        securityLevel: def.securityLevel,
      }
    }
  }

  /**
   * Confirma una acción pendiente de Nivel 3 o 4
   */
  public async confirmPendingAction(confirmationId: string, proceed: boolean): Promise<ToolExecutionResult> {
    const pending = this.pendingConfirmations.get(confirmationId)
    if (!pending) {
      return {
        tool: 'unknown',
        success: false,
        output: { error: 'CONFIRMATION_EXPIRED_OR_NOT_FOUND' },
        securityLevel: 3,
      }
    }

    this.pendingConfirmations.delete(confirmationId)

    if (!proceed) {
      return {
        tool: pending.request.tool,
        toolUseId: pending.request.toolUseId,
        success: false,
        output: { status: 'CANCELLED_BY_ASTRONAUT' },
        securityLevel: TOOL_REGISTRY[pending.request.tool]?.securityLevel ?? 3,
      }
    }

    return this.executeTool(pending.request, { confirmed: true })
  }

  /**
   * Despacha la lógica interna de cada herramienta conectada al estado real
   */
  private async dispatchAction(name: string, input: any): Promise<Record<string, unknown>> {
    switch (name) {
      case 'getCurrentMissionContext': {
        const snapshot = this.handlers.getContextSnapshot()
        return snapshot as unknown as Record<string, unknown>
      }

      case 'focusGeographicTarget': {
        let { lat, lon, height, durationSeconds, targetName } = input
        const nameLower = (targetName || '').toLowerCase()
        if (lat === undefined || lon === undefined) {
          if (nameLower.includes('sharp') || nameLower.includes('monte')) {
            lat = -5.08
            lon = 137.85
            targetName = targetName || 'Mount Sharp (Gale Crater)'
          } else if (nameLower.includes('jezero') || nameLower.includes('delta')) {
            lat = 18.38
            lon = 77.58
            targetName = targetName || 'Delta de Jezero'
          } else if (nameLower.includes('bradbury')) {
            lat = -4.59
            lon = 137.44
            targetName = targetName || 'Bradbury Landing'
          } else if (nameLower.includes('boxwork')) {
            lat = -4.95
            lon = 137.72
            targetName = targetName || 'Boxwork Formations'
          } else {
            lat = -5.08
            lon = 137.85
            targetName = targetName || 'Mount Sharp'
          }
        }
        this.handlers.focusCamera?.({ lat, lon, height: height || 18000, duration: durationSeconds ?? 2 })
        return {
          status: 'CAMERA_TRANSITION_DISPATCHED',
          targetName: targetName ?? `[${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E]`,
          lat,
          lon,
          durationSeconds: durationSeconds ?? 2,
        }
      }

      case 'toggleScientificLayer': {
        const { layerId, enabled } = input
        this.handlers.toggleLayer?.(layerId, enabled)
        return {
          status: 'LAYER_TOGGLED',
          layerId,
          enabled,
        }
      }

      case 'explainSelectedRegion': {
        const snapshot = this.handlers.getContextSnapshot()
        const rawRegion = input.regionName || input.region || snapshot.geography.region || 'GALE'
        const region = String(rawRegion).toUpperCase()
        if (region.includes('GALE') || region.includes('SHARP') || region.includes('BOXWORK')) {
          return {
            region: 'Cráter Gale / Mount Sharp',
            geology:
              'Estructuras minerales de tipo boxwork formadas por percolación de fluidos subterráneos hidrotermales.',
            curiosityFindings:
              'Explorado en 2024-2025. Registra la transición entre arcillas lacustres ricas en agua y sulfatos áridos.',
            safetyLimits: 'Relieve escarpado en la base de Mount Sharp; pendientes > 20° NO-GO para caminata a pie.',
            provenance: 'OBSERVED_MSL_CURIOSITY_AND_ORBITAL',
          }
        }
        return {
          region: 'Cráter Jezero',
          geology: 'Abanico deltaico fluvial con sedimentos de grano fino ricas en esmectitas y carbonatos lacustres.',
          scienceGoal: 'Potencial de preservación de biofirmas microbianas del antiguo lago.',
          safetyLimits: 'Sin DTM métrico validado en el ROI completo; obstáculos submétricos no evaluados.',
          provenance: 'OBSERVED_M2020_PERSEVERANCE',
        }
      }

      case 'getMissionObservations': {
        const profile = queryScientificObservationProfile(input.lon ?? 137.441, input.lat ?? -4.589, -4450)
        this.handlers.openDataCenterModal?.(true)
        return profile as unknown as Record<string, unknown>
      }

      case 'createMissionWaypoint': {
        const { stopId, lat, lon, name: stopName } = input
        this.handlers.setWaypoint?.(stopId, [lon, lat], stopName)
        return {
          status: 'WAYPOINT_CREATED',
          stopId,
          point: [lon, lat],
          label: stopName ?? `Punto ${stopId}`,
        }
      }

      case 'previewEVARoute': {
        this.handlers.previewRoute?.(input.mode ?? 'FOOT')
        const snapshot = this.handlers.getContextSnapshot()
        return {
          status: 'EVA_ROUTE_PREVIEWED',
          mode: input.mode ?? 'FOOT',
          totalDistanceKm: snapshot.route.totalDistanceKm,
          walkbackStatus: snapshot.route.walkbackAssessment?.status ?? 'NO_ROUTE',
          nominalLimitKm: 5.0,
        }
      }

      case 'compareMissionRoutes': {
        this.handlers.openComparisonModal?.(input.showModal ?? true)
        return {
          status: 'COMPARISON_VIEW_OPENED',
          message: 'Mostrando comparador entre ruta de Curiosity y el plan EVA.',
        }
      }

      case 'getRouteStatistics': {
        const snapshot = this.handlers.getContextSnapshot()
        return {
          totalDistanceMeters: snapshot.route.totalDistanceMeters,
          totalDistanceKm: snapshot.route.totalDistanceKm,
          stopCount: snapshot.route.stopCount,
          walkback: snapshot.route.walkbackAssessment,
          hazards: snapshot.route.hazardsEvaluation,
        }
      }

      case 'startDiscoveryTour': {
        this.handlers.startTour?.(input.startIndex ?? 0)
        return {
          status: 'DISCOVERY_TOUR_STARTED',
          stopIndex: input.startIndex ?? 0,
          totalStops: GALE_DISCOVERIES.length,
        }
      }

      case 'pauseDiscoveryTour': {
        this.handlers.pauseTour?.()
        return { status: 'DISCOVERY_TOUR_PAUSED_OR_TOGGLED' }
      }

      case 'getHabitatStatus': {
        return {
          colony: 'Base Ares Alpha',
          modules: DEFAULT_COLONY_MODULES.length,
          activeGenerators: 4,
          powerKw: 145.0,
          oxygenDays: 180,
          provenance: 'SIMULATED',
        }
      }

      case 'activateMissionSimulation': {
        this.handlers.setCleanViewMode?.(true)
        return {
          status: 'SIMULATION_ACTIVATED',
          scenario: input.scenario,
          provenance: 'SIMULATED',
        }
      }

      case 'openSurfaceIntelligence': {
        this.handlers.openSurfaceIntelligenceModal?.(input.open ?? true)
        return {
          status: 'SURFACE_INTELLIGENCE_OPENED',
          message: 'Catálogo de inteligencia de superficie abierto.',
        }
      }

      case 'triggerMissionContingency': {
        this.handlers.triggerSimContingency?.(input.contingencyType)
        return {
          status: 'CONTINGENCY_TRIGGERED',
          contingencyType: input.contingencyType,
          protocol: 'PROTOCOLO_SIMULACION_MARTE_2026',
          provenance: 'SIMULATED',
        }
      }

      // Herramientas heredadas
      case 'calculate_mars_distance': {
        const p1: MarsPoint = [input.lon1, input.lat1]
        const p2: MarsPoint = [input.lon2, input.lat2]
        const distM = marsDistance(p1, p2)
        const distKm = Number((distM / 1000).toFixed(3))
        return {
          distance_meters: Math.round(distM),
          distance_km: distKm,
          mars_radius_km: 3389.5,
          estimated_walk_hours: Number((distKm / 2.5).toFixed(2)),
          status: 'CALCULATED_SPHERICAL_MARS_GEODESY',
        }
      }

      case 'lookup_mission_dataset': {
        const query = String(input.instrument_or_mission).toUpperCase()
        if (query.includes('CTX')) {
          return {
            instrument: 'MRO CTX (Context Camera)',
            resolution: '5 - 6 m/px',
            family: 'Óptica regional en escala de grises',
            is_numeric_dem: false,
            provenance: 'OBSERVED',
          }
        }
        if (query.includes('MOLA')) {
          return {
            instrument: 'MGS MOLA (Mars Orbiter Laser Altimeter)',
            resolution: '463 m/px global',
            family: 'Altimetría láser global / Hillshade',
            is_numeric_dem: true,
            provenance: 'OBSERVED',
          }
        }
        if (query.includes('THEMIS')) {
          return {
            instrument: 'Odyssey THEMIS (Thermal Emission Imaging System)',
            resolution: '100 m/px IR',
            family: 'Infrarrojo térmico diurno/nocturno',
            is_numeric_dem: false,
            provenance: 'OBSERVED',
          }
        }
        return {
          instrument: query,
          status: 'DATASET_FOUND_IN_CATALOG',
          provenance: 'OBSERVED',
        }
      }

      case 'get_science_targets': {
        return {
          region: input.region,
          targets: GALE_DISCOVERIES.slice(0, 4).map(d => ({
            name: d.name,
            lat: d.coordinates.lat,
            lon: d.coordinates.lon,
            science: d.significance,
          })),
        }
      }

      case 'evaluate_eva_feasibility': {
        const totalDistM = input.total_distance_km * 1000
        const walkback = evaluateWalkbackLimit(totalDistM)
        const slopeResult = input.estimated_slope_deg ? evaluateSlope(input.estimated_slope_deg) : null
        return {
          feasibility: walkback.status,
          walkback_assessment: walkback.label,
          slope_status: slopeResult?.riskLevel ?? 'PENDIENTE_NO_PROPORCIONADA',
          hazard_note: input.has_meter_scale_dem
            ? 'VERIFICADO_CON_DTM'
            : 'PELIGROS_SUBMETRICOS_NO_EVALUADOS_POR_FALTA_DE_DEM_METRICO',
        }
      }

      default:
        throw new Error(`Acción sin despachador: ${name}`)
    }
  }
}
