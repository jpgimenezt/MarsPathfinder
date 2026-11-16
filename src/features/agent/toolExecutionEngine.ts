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
  language?: 'en' | 'es'
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
  switchScreen?: (screen: 'terrain3d' | 'globe' | 'map') => void
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

  // Control táctico de botones HUD / Consola
  openGuidedTour?: (open: boolean) => void
  triggerEdlDescent?: () => void
  triggerOrbitAscent?: () => void
  focusBaseLZ1?: () => void
  triggerPanoramaColony?: () => void
  setRouteViewMode?: (mode: 'both' | 'eva' | 'curiosity' | 'toggle') => void
  setTacticalDockCollapsed?: (collapsed: boolean | 'toggle') => void
  setTacticalDockTab?: (tab: 'layers' | 'camera' | 'colony') => void
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
  enabled: z.boolean().optional().default(true).describe('Estado deseado de la capa (true para encender, false para apagar)'),
}).passthrough().transform(data => {
  const raw = String(data.layerId || '').toLowerCase()
  let layerId = raw
  if (raw.includes('ctx_mosaic') || raw.includes('mosaico') || raw.includes('blockadj')) {
    layerId = 'ctx_mosaic'
  } else if (raw.includes('ctx')) {
    layerId = 'ctx'
  } else if (raw.includes('themis') || raw.includes('termica') || raw.includes('inercia')) {
    layerId = 'themis'
  } else if (raw.includes('mola') || raw.includes('elevacion') || raw.includes('relieve') || raw.includes('hipsometrica')) {
    layerId = 'mola'
  } else if (raw.includes('crism') || raw.includes('mineral') || raw.includes('espectral')) {
    layerId = 'crism'
  } else if (raw.includes('geolog') || raw.includes('usgs') || raw.includes('estratigrafia')) {
    layerId = 'geology'
  } else if (raw.includes('rad') || raw.includes('radiacion') || raw.includes('dosimetria')) {
    layerId = 'radiation'
  } else if (raw.includes('pendiente') || raw.includes('slope') || raw.includes('locomocion')) {
    layerId = 'slope'
  } else if (raw.includes('dem') || raw.includes('gale_dem')) {
    layerId = 'gale_dem'
  }
  return {
    layerId,
    enabled: data.enabled ?? true,
  }
})

export const SwitchScreenViewSchema = z.object({
  screen: z.string().optional().describe('Pantalla o modo de visualización a activar'),
  view: z.string().optional().describe('Alias para la vista deseada'),
  target: z.string().optional().describe('Objetivo de pantalla'),
}).passthrough().transform(data => {
  const raw = String(data.screen || data.view || data.target || 'terrain3d').toLowerCase()
  let screen: 'terrain3d' | 'globe' | 'map' = 'terrain3d'
  if (raw.includes('globe') || raw.includes('globo') || raw.includes('orbital') || raw.includes('orbita')) {
    screen = 'globe'
  } else if (raw.includes('map') || raw.includes('jezero') || raw.includes('2d') || raw.includes('mapa')) {
    screen = 'map'
  } else {
    screen = 'terrain3d'
  }
  return { screen }
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

export const ActivateMissionSimulationSchema = z.any().transform(rawInput => {
  let rawStr = 'DESCENT_EDL'
  if (typeof rawInput === 'string' && rawInput.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawInput)
      if (parsed && typeof parsed === 'object') {
        rawStr = String(parsed.scenario || parsed.scenarioType || parsed.type || parsed.simulation || parsed.mode || parsed.name || 'DESCENT_EDL')
      } else {
        rawStr = rawInput
      }
    } catch {
      rawStr = rawInput
    }
  } else if (rawInput && typeof rawInput === 'object') {
    rawStr = String(rawInput.scenario || rawInput.scenarioType || rawInput.type || rawInput.simulation || rawInput.mode || rawInput.name || 'DESCENT_EDL')
  }

  const raw = rawStr.toUpperCase()
  let scenario: 'DESCENT_EDL' | 'EVA_TRAVERSE' | 'DUST_STORM_CONTINGENCY' = 'DESCENT_EDL'
  if (raw.includes('TRAVERSE') || raw.includes('EVA') || raw.includes('CAMINATA') || raw.includes('ROVER') || raw.includes('MARCHA')) {
    scenario = 'EVA_TRAVERSE'
  } else if (raw.includes('STORM') || raw.includes('DUST') || raw.includes('SOLAR') || raw.includes('TORMENTA') || raw.includes('POLVO')) {
    scenario = 'DUST_STORM_CONTINGENCY'
  } else {
    scenario = 'DESCENT_EDL'
  }
  return {
    scenario,
    scenarioType: scenario,
  }
})

export const TriggerMissionContingencySchema = z.any().transform(rawInput => {
  const data = (rawInput && typeof rawInput === 'object') ? rawInput : {}
  const raw = String(data.contingencyType || data.type || data.contingency || rawInput || 'RADIO_LOSS').toUpperCase()
  let contingencyType: 'RADIO_LOSS' | 'SUIT_LEAK_MINOR' | 'BATTERY_LOW' | 'SLOPE_HAZARD' = 'RADIO_LOSS'
  if (raw.includes('LEAK') || raw.includes('TRAJE') || raw.includes('SUIT')) {
    contingencyType = 'SUIT_LEAK_MINOR'
  } else if (raw.includes('BATTERY') || raw.includes('BATERIA') || raw.includes('POWER')) {
    contingencyType = 'BATTERY_LOW'
  } else if (raw.includes('SLOPE') || raw.includes('PENDIENTE') || raw.includes('HAZARD')) {
    contingencyType = 'SLOPE_HAZARD'
  } else {
    contingencyType = 'RADIO_LOSS'
  }
  return { contingencyType }
})

// Control táctico por voz de botones HUD y Consola
export const OpenGuidedTourSchema = z.object({
  open: z.boolean().optional().default(true).describe('Abrir o cerrar la guía interactiva'),
})

export const TriggerEDLDescentSchema = z.object({})

export const TriggerOrbitAscentSchema = z.object({})

export const FocusBaseLZ1Schema = z.object({})

export const TriggerPanoramaColonySchema = z.object({})

export const SetCleanViewModeSchema = z.object({
  active: z.boolean().optional().default(true).describe('Activar modo pantalla limpia'),
})

export const SetRouteViewModeSchema = z.object({
  mode: z.string().optional().describe('Modo de visualización de rutas'),
}).passthrough().transform(data => {
  const raw = String(data.mode || 'toggle').toLowerCase()
  let mode: 'both' | 'eva' | 'curiosity' | 'toggle' = 'toggle'
  if (raw.includes('both') || raw.includes('ambas')) {
    mode = 'both'
  } else if (raw.includes('curiosity') || raw.includes('msl')) {
    mode = 'curiosity'
  } else if (raw.includes('eva') || raw.includes('caminata')) {
    mode = 'eva'
  } else {
    mode = 'toggle'
  }
  return { mode }
})

export const SetTacticalDockCollapsedSchema = z.object({
  collapsed: z.boolean().optional().describe('Estado de colapso deseado'),
  toggle: z.boolean().optional().default(true).describe('Alternar si collapsed no se especifica'),
})

export const SetTacticalDockTabSchema = z.object({
  tab: z.string().optional().describe('Pestaña de la consola a activar'),
}).passthrough().transform(data => {
  const raw = String(data.tab || 'layers').toLowerCase()
  let tab: 'layers' | 'camera' | 'colony' = 'layers'
  if (raw.includes('cam') || raw.includes('cámara')) {
    tab = 'camera'
  } else if (raw.includes('col') || raw.includes('base') || raw.includes('alfa')) {
    tab = 'colony'
  } else {
    tab = 'layers'
  }
  return { tab }
})

export const OpenDataCenterSchema = z.object({
  open: z.boolean().optional().default(true).describe('Abrir catálogo de datos NASA'),
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
  switchScreenView: {
    name: 'switchScreenView',
    description: 'Cambia la pantalla activa del sistema (Gale 3D, Globo Orbital Marciano o Mapa 2D de Jezero).',
    securityLevel: 2,
    schema: SwitchScreenViewSchema,
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
    securityLevel: 2,
    schema: ActivateMissionSimulationSchema,
    requiresConfirmation: false,
    confirmationPrompt: (args: any) => `¿Activar la simulación de misión para el escenario ${args?.scenario ?? 'DESCENT_EDL'}?`,
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

  // Herramientas de control directo de botones HUD y Consola Táctica
  openGuidedTour: {
    name: 'openGuidedTour',
    description: 'Abre o cierra la guía interactiva paso a paso de ARES.',
    securityLevel: 2,
    schema: OpenGuidedTourSchema,
    requiresConfirmation: false,
  },
  triggerEDLDescent: {
    name: 'triggerEDLDescent',
    description: 'Inicia la animación y secuencia cinemática de descenso orbital EDL hacia la Base LZ-1.',
    securityLevel: 2,
    schema: TriggerEDLDescentSchema,
    requiresConfirmation: false,
  },
  triggerOrbitAscent: {
    name: 'triggerOrbitAscent',
    description: 'Asciende la cámara a órbita espacial alta de Marte.',
    securityLevel: 2,
    schema: TriggerOrbitAscentSchema,
    requiresConfirmation: false,
  },
  focusBaseLZ1: {
    name: 'focusBaseLZ1',
    description: 'Enfoca la cámara en el Sitio Candidato Principal LZ-1 Base Bradbury.',
    securityLevel: 2,
    schema: FocusBaseLZ1Schema,
    requiresConfirmation: false,
  },
  triggerPanoramaColony: {
    name: 'triggerPanoramaColony',
    description: 'Inicia el recorrido panorámico de 360 grados por la Colonia Marciana Base Alfa.',
    securityLevel: 2,
    schema: TriggerPanoramaColonySchema,
    requiresConfirmation: false,
  },
  setCleanViewMode: {
    name: 'setCleanViewMode',
    description: 'Activa o desactiva la pantalla completa limpia sin paneles distractores.',
    securityLevel: 2,
    schema: SetCleanViewModeSchema,
    requiresConfirmation: false,
  },
  setRouteViewMode: {
    name: 'setRouteViewMode',
    description: 'Alterna o define el modo de visualización de rutas (ambas, solo eva o solo curiosity).',
    securityLevel: 2,
    schema: SetRouteViewModeSchema,
    requiresConfirmation: false,
  },
  setTacticalDockCollapsed: {
    name: 'setTacticalDockCollapsed',
    description: 'Colapsa o expande la Consola de Control Táctico izquierdo.',
    securityLevel: 2,
    schema: SetTacticalDockCollapsedSchema,
    requiresConfirmation: false,
  },
  setTacticalDockTab: {
    name: 'setTacticalDockTab',
    description: 'Cambia entre las pestañas de la consola táctica (Capas Científicas, Cámara o Base Alfa 3D).',
    securityLevel: 2,
    schema: SetTacticalDockTabSchema,
    requiresConfirmation: false,
  },
  openDataCenter: {
    name: 'openDataCenter',
    description: 'Abre el catálogo centralizado de datos científicos de NASA (MOLA, CTX, CRISM, THEMIS).',
    securityLevel: 2,
    schema: OpenDataCenterSchema,
    requiresConfirmation: false,
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
    const es = request.language === 'es'
    const def = this.resolveToolDefinition(request.tool)
    if (!def) {
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: false,
        output: { error: es ? `Herramienta desconocida: ${request.tool}` : `Unknown tool: ${request.tool}` },
        securityLevel: 1,
      }
    }

    // Sanitizar y normalizar entrada antes de validar
    let sanitizedInput: unknown = request.input
    if (typeof sanitizedInput === 'string') {
      try {
        sanitizedInput = JSON.parse(sanitizedInput)
      } catch {
        // String plano: mantener como valor
      }
    }
    if (sanitizedInput === undefined || sanitizedInput === null) {
      sanitizedInput = {}
    }

    // Validar esquema de entrada con Zod
    const parseResult = def.schema.safeParse(sanitizedInput)
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
      const targetItem = (validatedInput as any)?.stopId ? ` (${(validatedInput as any).stopId})` : ''
      const message = es
        ? (def.confirmationPrompt ? def.confirmationPrompt(validatedInput) : `¿Confirmar ejecución de ${def.name}?`)
        : `Confirm execution of ${def.name}${targetItem}? Review the proposed change before proceeding.`

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
      const output = await this.dispatchAction(def.name, validatedInput, request.language ?? 'en')
      return {
        tool: request.tool,
        toolUseId: request.toolUseId,
        success: true,
        output,
        securityLevel: def.securityLevel,
        actionPerformed: es ? `Herramienta ${def.name} ejecutada con éxito.` : `Tool ${def.name} executed successfully.`,
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
  private async dispatchAction(name: string, input: any, language: 'en' | 'es' = 'en'): Promise<Record<string, unknown>> {
    const es = language === 'es'
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

      case 'switchScreenView': {
        const { screen } = input
        this.handlers.switchScreen?.(screen)
        return {
          status: 'SCREEN_SWITCHED',
          screen,
          message: es ? `Vista cambiada a ${screen === 'terrain3d' ? 'Gale Crater 3D' : screen === 'globe' ? 'Globo Orbital Marciano' : 'Mapa 2D de Jezero Crater'}.` : `View switched to ${screen === 'terrain3d' ? 'Gale Crater 3D' : screen === 'globe' ? 'Mars orbital globe' : 'Jezero 2D map'}.`,
        }
      }

      case 'explainSelectedRegion': {
        const snapshot = this.handlers.getContextSnapshot()
        const rawRegion = input.regionName || input.region || snapshot.geography.region || 'GALE'
        const region = String(rawRegion).toUpperCase()
        if (region.includes('GALE') || region.includes('SHARP') || region.includes('BOXWORK')) {
          return {
            region: es ? 'Cráter Gale / Mount Sharp' : 'Gale Crater / Mount Sharp',
            geology: es ? 'Estructuras minerales de tipo boxwork formadas por percolación de fluidos subterráneos hidrotermales.' : 'Boxwork ridges may reflect ancient groundwater circulation; details require geological validation.',
            curiosityFindings: es ? 'Explorado en 2024-2025. Registra la transición entre arcillas lacustres ricas en agua y sulfatos áridos.' : 'Curiosity studies the transition from clay-rich strata to sulfate-bearing layers in Gale; this is regional context, not a site measurement.',
            safetyLimits: es ? 'Terreno procedural: no hay límites EVA operacionales verificados.' : 'Procedural terrain; no validated operational EVA slope limits or local hazard assessment.',
            provenance: 'OBSERVED_MSL_CURIOSITY_AND_ORBITAL',
          }
        }
        return {
          region: es ? 'Cráter Jezero' : 'Jezero Crater',
          geology: es ? 'Abanico deltaico fluvial con sedimentos de grano fino ricas en esmectitas y carbonatos lacustres.' : 'Ancient fluvial delta with fine-grained lake deposits, including clay- and carbonate-bearing sediments.',
          scienceGoal: es ? 'Potencial de preservación de biofirmas microbianas del antiguo lago.' : 'Study potential preservation of ancient microbial biosignatures.',
          safetyLimits: es ? 'Sin DTM métrico validado en el ROI completo; obstáculos submétricos no evaluados.' : 'No validated meter-scale DTM across the full ROI; sub-meter hazards unassessed.',
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
          label: stopName ?? (es ? `Punto ${stopId}` : `Waypoint ${stopId}`),
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
          message: es ? 'Mostrando comparador entre ruta de Curiosity y el plan EVA.' : 'Showing the illustrative Curiosity and proposed EVA route comparison.',
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
          colony: es ? 'Base Ares Alpha' : 'Ares Alpha Base (simulation)',
          modules: DEFAULT_COLONY_MODULES.length,
          activeGenerators: 4,
          powerKw: 145.0,
          oxygenDays: 180,
          provenance: 'SIMULATED',
        }
      }

      case 'activateMissionSimulation': {
        this.handlers.setCleanViewMode?.(true)
        if (input.scenario === 'DESCENT_EDL') {
          this.handlers.triggerEdlDescent?.()
        }
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
          message: es ? 'Catálogo de inteligencia de superficie abierto.' : 'Surface intelligence catalog opened.',
        }
      }

      case 'openGuidedTour': {
        this.handlers.openGuidedTour?.(input.open ?? true)
        return {
          status: 'GUIDED_TOUR_DISPATCHED',
          message: es ? 'Guía interactiva de ARES iniciada.' : 'ARES interactive guide opened.',
        }
      }

      case 'triggerEDLDescent': {
        this.handlers.triggerEdlDescent?.()
        return {
          status: 'EDL_DESCENT_DISPATCHED',
          message: es ? 'Secuencia de descenso orbital EDL iniciada.' : 'Educational EDL camera sequence started; not flight telemetry.',
        }
      }

      case 'triggerOrbitAscent': {
        this.handlers.triggerOrbitAscent?.()
        return {
          status: 'ORBIT_ASCENT_DISPATCHED',
          message: es ? 'Ascendiendo a órbita espacial alta de Marte.' : 'Moving the camera to a high Mars orbit view.',
        }
      }

      case 'focusBaseLZ1': {
        this.handlers.focusBaseLZ1?.()
        return {
          status: 'BASE_LZ1_FOCUSED',
          message: es ? 'Enfocando Sitio Candidato Principal LZ-1 Base Bradbury.' : 'Focusing on the conceptual LZ-1 Bradbury base.',
        }
      }

      case 'triggerPanoramaColony': {
        this.handlers.triggerPanoramaColony?.()
        return {
          status: 'PANORAMA_DISPATCHED',
          message: es ? 'Iniciando recorrido panorámico 360 de la Base Alfa.' : 'Starting the conceptual Alpha Base panorama.',
        }
      }

      case 'setCleanViewMode': {
        this.handlers.setCleanViewMode?.(input.active ?? true)
        return {
          status: 'CLEAN_VIEW_DISPATCHED',
          message: es ? 'Modo de pantalla limpia activado. Presiona Esc para restaurar.' : 'Clean display enabled. Press Esc to restore the controls.',
        }
      }

      case 'setRouteViewMode': {
        this.handlers.setRouteViewMode?.(input.mode ?? 'toggle')
        return {
          status: 'ROUTE_VIEW_MODE_CHANGED',
          mode: input.mode ?? 'toggle',
          message: es ? 'Visualización de rutas alternada.' : 'Route display mode changed.',
        }
      }

      case 'setTacticalDockCollapsed': {
        this.handlers.setTacticalDockCollapsed?.(input.collapsed !== undefined ? input.collapsed : 'toggle')
        return {
          status: 'DOCK_COLLAPSE_CHANGED',
          message: es ? 'Consola de control táctico actualizada.' : 'Tactical control console updated.',
        }
      }

      case 'setTacticalDockTab': {
        this.handlers.setTacticalDockTab?.(input.tab)
        return {
          status: 'DOCK_TAB_CHANGED',
          tab: input.tab,
          message: es ? `Pestaña cambiada a ${input.tab === 'layers' ? 'Capas Científicas' : input.tab === 'camera' ? 'Cámara' : 'Base Alfa'}.` : `Tab changed to ${input.tab === 'layers' ? 'Scientific Layers' : input.tab === 'camera' ? 'Camera' : 'Alpha Base'}.`,
        }
      }

      case 'openDataCenter': {
        this.handlers.openDataCenterModal?.(input.open ?? true)
        return {
          status: 'DATA_CENTER_OPENED',
          message: es ? 'Abriendo catálogo centralizado de datos científicos NASA.' : 'Opening the NASA science dataset catalog.',
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
            family: es ? 'Óptica regional en escala de grises' : 'Regional grayscale orbital imaging',
            is_numeric_dem: false,
            provenance: 'OBSERVED',
          }
        }
        if (query.includes('MOLA')) {
          return {
            instrument: 'MGS MOLA (Mars Orbiter Laser Altimeter)',
            resolution: '463 m/px global',
            family: es ? 'Imagen de relieve sombreado derivada de altimetría' : 'Color-shaded relief derived from global laser altimetry',
            is_numeric_dem: false,
            provenance: 'OBSERVED',
          }
        }
        if (query.includes('THEMIS')) {
          return {
            instrument: 'Odyssey THEMIS (Thermal Emission Imaging System)',
            resolution: '100 m/px IR',
            family: es ? 'Infrarrojo térmico diurno/nocturno' : 'Day/night thermal infrared imaging',
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
        throw new Error(es ? `Acción sin despachador: ${name}` : `Unsupported tool action: ${name}`)
    }
  }
}
