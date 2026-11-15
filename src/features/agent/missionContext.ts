/**
 * ARES MISSION COMMS - Dynamic Mission Context Provider
 * Construye el contexto operativo y cientifico estructurado y compacto
 * para que ARES (Amazon Nova 2.5 Sonic) conozca el estado real del mapa y la exploracion.
 * 
 * Sigue los principios de procedencia: OBSERVED, DERIVED, SIMULATED, UNAVAILABLE.
 */

import type { MarsPoint } from '../route/marsDistance'
import type { StopId } from '../route/routePlan'
import { marsDistance } from '../route/marsDistance'
import { evaluateWalkbackLimit } from '../terrain/galeElevation'
import { GALE_DISCOVERIES } from '../science/galeCuriosityData'
import { DEFAULT_COLONY_MODULES } from '../colony/colonyCatalog'

export type ProvenanceCategory = 'OBSERVED' | 'DERIVED' | 'SIMULATED' | 'UNAVAILABLE'

export interface GeographicTargetInfo {
  region: 'JEZERO' | 'GALE_MOUNT_SHARP' | 'MARS_GLOBAL'
  screenMode: 'terrain3d' | 'globe' | 'map'
  centerCoords: {
    lat: number
    lon: number
  }
  elevationMeters: number | null
  elevationStatus: ProvenanceCategory
  selectedTargetName?: string
  geologicalUnit?: string
}

export interface ActiveLayerInfo {
  id: string
  name: string
  instrument: string
  mission: string
  enabled: boolean
  isDemNumeric: boolean
  provenance: ProvenanceCategory
}

export interface MissionRouteState {
  hasRoute: boolean
  stopCount: number
  stops: {
    A: MarsPoint | null
    P: MarsPoint | null
    B: MarsPoint | null
  }
  totalDistanceMeters: number
  totalDistanceKm: number
  walkbackAssessment: {
    status: 'NOMINAL' | 'PRECAUCIÓN' | 'CRÍTICO'
    label: string
    color: string
    nominalLimitKm: number
    emergencyLimitKm: number
  } | null
  hazardsEvaluation: string
}

export interface HabitatOperationalStatus {
  colonyName: string
  totalModules: number
  powerGenerationKw: number
  oxygenReserveDays: number
  crewCapacity: number
  status: 'NOMINAL' | 'STANDBY' | 'SIMULATED_ACTIVE'
  provenance: 'SIMULATED'
}

export interface CompactMissionContext {
  systemName: 'ARES-NAV TACTICAL SYSTEM'
  timestampUtc: string
  geography: GeographicTargetInfo
  activeLayers: ActiveLayerInfo[]
  route: MissionRouteState
  habitat: HabitatOperationalStatus
  knownDiscoveriesCount: number
  simulationState: {
    isTourActive: boolean
    isTourPaused: boolean
    activeTourStop?: string
    isCleanView: boolean
  }
  epistemicNote: string
}

export interface MissionContextInput {
  language?: 'en' | 'es'
  screen: 'terrain3d' | 'globe' | 'map'
  scope?: 'jezero' | 'global'
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
  activeLayerId?: string
  enabledLayers?: Record<string, boolean>
  currentLocation?: { lat: number; lon: number; elev?: number }
  selectedDiscoveryName?: string
  isDiscoveryTourActive?: boolean
  isDiscoveryPaused?: boolean
  currentDiscoveryStopIndex?: number
  isCleanViewMode?: boolean
}

/**
 * Genera un payload de contexto compacto y estructurado listo para inyectar a ARES
 */
export function buildCompactMissionContext(input: MissionContextInput): CompactMissionContext {
  const es = input.language === 'es'
  // 1. Determinar Region Geografica
  let region: 'JEZERO' | 'GALE_MOUNT_SHARP' | 'MARS_GLOBAL' = 'GALE_MOUNT_SHARP'
  if (input.screen === 'globe') {
    region = 'MARS_GLOBAL'
  } else if (input.screen === 'map') {
    region = input.scope === 'global' ? 'MARS_GLOBAL' : 'JEZERO'
  }

  // 2. Coordenadas de Referencia
  let centerLat = -4.589
  let centerLon = 137.441
  let elevationMeters: number | null = null
  let elevationStatus: ProvenanceCategory = 'UNAVAILABLE'

  if (region === 'JEZERO') {
    centerLat = 18.38
    centerLon = 77.58
    elevationMeters = null
    elevationStatus = 'UNAVAILABLE' // No hay DTM numerico validado en Jezero ROI
  } else if (region === 'MARS_GLOBAL') {
    centerLat = 0.0
    centerLon = 0.0
    elevationMeters = null // A visual hillshade does not give numerical elevation at this point.
    elevationStatus = 'UNAVAILABLE'
  }

  if (input.currentLocation) {
    centerLat = input.currentLocation.lat
    centerLon = input.currentLocation.lon
    if (input.currentLocation.elev !== undefined) {
      elevationMeters = input.currentLocation.elev
      elevationStatus = region === 'GALE_MOUNT_SHARP' ? 'SIMULATED' : 'UNAVAILABLE'
    }
  }

  // 3. Capas Activas y Proveniencia
  const activeLayers: ActiveLayerInfo[] = [
    {
      id: 'ctx',
      name: 'MRO CTX Mosaic',
      instrument: 'Context Camera (CTX)',
      mission: 'Mars Reconnaissance Orbiter (NASA/JPL/MSSS)',
      enabled: input.enabledLayers?.ctx ?? true,
      isDemNumeric: false,
      provenance: 'OBSERVED',
    },
    {
      id: 'mola',
      name: 'MGS MOLA ClrShade',
      instrument: 'Mars Orbiter Laser Altimeter (MOLA)',
      mission: 'Mars Global Surveyor (NASA/GSFC)',
      enabled: input.enabledLayers?.mola ?? false,
      isDemNumeric: false,
      provenance: 'OBSERVED',
    },
    {
      id: 'themis',
      name: 'Odyssey THEMIS Day IR',
      instrument: 'Thermal Emission Imaging System (THEMIS)',
      mission: '2001 Mars Odyssey (NASA/JPL/ASU)',
      enabled: input.enabledLayers?.themis ?? false,
      isDemNumeric: false,
      provenance: 'OBSERVED',
    },
    {
      id: 'gale_dem',
      name: 'Gale procedural terrain — not a verified numeric DTM',
      instrument: 'Procedural model, not an instrument',
      mission: 'AresRoute educational simulation (MOLA/HRSC are context only)',
      enabled: region === 'GALE_MOUNT_SHARP',
      isDemNumeric: false,
      provenance: 'SIMULATED',
    },
  ]

  // 4. Analisis de Ruta Marciana
  const stops = {
    A: input.currentStops?.A ?? null,
    P: input.currentStops?.P ?? null,
    B: input.currentStops?.B ?? null,
  }

  const stopList: MarsPoint[] = []
  if (stops.A) stopList.push(stops.A)
  if (stops.P) stopList.push(stops.P)
  if (stops.B) stopList.push(stops.B)

  let totalDistMeters = 0
  if (stopList.length >= 2) {
    for (let i = 1; i < stopList.length; i++) {
      totalDistMeters += marsDistance(stopList[i - 1], stopList[i])
    }
  }

  const walkback = stopList.length >= 2 ? evaluateWalkbackLimit(totalDistMeters) : null

  const hazardsEvaluation =
    region === 'GALE_MOUNT_SHARP'
      ? es
        ? 'SIMULATED: terreno procedural sin DEM local validado. Pendientes y obstáculos pequeños no evaluados para seguridad EVA.'
        : 'SIMULATED: procedural terrain without a validated local DEM. Slopes and small obstacles are not assessed for EVA safety.'
      : es
        ? 'SIN DATOS: cobertura DEM local limitada o no validada para esta selección; peligros pequeños no evaluados.'
        : 'INSUFFICIENT DATA: local DEM coverage limited or unverified for this selection; small hazards unassessed.'

  // 5. Estado del Habitat / Base Conceptual
  const habitat: HabitatOperationalStatus = {
    colonyName: es ? 'Base Ares Alpha (simulación conceptual en Gale)' : 'Ares Alpha Base (conceptual Gale simulation)',
    totalModules: DEFAULT_COLONY_MODULES.length,
    powerGenerationKw: 145.0,
    oxygenReserveDays: 180,
    crewCapacity: 6,
    status: 'SIMULATED_ACTIVE',
    provenance: 'SIMULATED',
  }

  // 6. Ensamblado Compacto
  return {
    systemName: 'ARES-NAV TACTICAL SYSTEM',
    timestampUtc: new Date().toISOString(),
    geography: {
      region,
      screenMode: input.screen,
      centerCoords: {
        lat: Number(centerLat.toFixed(5)),
        lon: Number(centerLon.toFixed(5)),
      },
      elevationMeters: elevationMeters !== null ? Math.round(elevationMeters) : null,
      elevationStatus,
      selectedTargetName: input.selectedDiscoveryName
        ? es ? input.selectedDiscoveryName : 'Illustrative science target (position unverified)'
        : undefined,
    },
    activeLayers,
    route: {
      hasRoute: stopList.length >= 2,
      stopCount: stopList.length,
      stops,
      totalDistanceMeters: Math.round(totalDistMeters),
      totalDistanceKm: Number((totalDistMeters / 1000).toFixed(2)),
      walkbackAssessment: walkback
        ? {
            status: walkback.status,
            label: es ? `Supuesto ilustrativo: ${walkback.label}; NO es un límite NASA` : `Illustrative distance band (${walkback.status}); NOT a NASA EVA limit`,
            color: walkback.status === 'NOMINAL' ? '#63D4E5' : walkback.status === 'PRECAUCIÓN' ? '#E9B85C' : '#FF4444',
            nominalLimitKm: 5.0,
            emergencyLimitKm: 8.0,
          }
        : null,
      hazardsEvaluation,
    },
    habitat,
    knownDiscoveriesCount: GALE_DISCOVERIES.length,
    simulationState: {
      isTourActive: Boolean(input.isDiscoveryTourActive),
      isTourPaused: Boolean(input.isDiscoveryPaused),
      activeTourStop:
        input.isDiscoveryTourActive && input.currentDiscoveryStopIndex !== undefined
          ? es ? GALE_DISCOVERIES[input.currentDiscoveryStopIndex]?.name : 'Illustrative Gale science stop — site match unverified'
          : undefined,
      isCleanView: Boolean(input.isCleanViewMode),
    },
    epistemicNote:
      es
        ? 'Distancia horizontal con radio medio marciano aproximado 3 389,5 km; la escena Gale, hábitat, recursos y categorías de retorno son SIMULATED y NO son límites NASA. Sin DEM validado no se infiere seguridad.'
        : 'Horizontal distance uses approximate Mars mean radius 3,389.5 km. Gale terrain, habitat, resources and walkback bands are SIMULATED, NOT NASA limits. No verified DEM means route safety cannot be inferred.',
  }
}
