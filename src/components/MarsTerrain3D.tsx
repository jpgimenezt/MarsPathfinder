import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EllipseCurve,
  FogExp2,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  GALE_DISCOVERIES,
  PRIMARY_LANDING_SITE,
  type ScientificDiscovery,
} from '../features/science/galeCuriosityData'
import {
  evaluateSlope,
  evaluateWalkbackLimit,
  getGaleElevation,
  getGaleSlopeDegrees,
} from '../features/terrain/galeElevation'
import {
  createMartianSkyDome,
  generateTerrainBumpMap,
  generateTerrainTexture,
  REAL_LAYER_TEXTURE_URLS,
  TERRAIN_LAYERS_CATALOG,
  type TerrainLayerType,
} from '../features/terrain/terrainShaderUtils'
import {
  buildColony3DGroup,
} from '../features/colony/colony3DBuilder'
import {
  DEFAULT_COLONY_MODULES,
  type HabitatModuleConfig,
} from '../features/colony/colonyCatalog'
import { resolveAssetUrl } from '../utils/assetUrl'
import { marsDistance, type MarsPoint } from '../features/route/marsDistance'
import {
  calculateObstacleAvoidanceRoute,
  calculateSecondaryExploratoryCorridor,
  calculatePolylineMeters,
} from '../features/route/terrainPathfinder'
import type { StopId } from '../features/route/routePlan'
import {
  CURIOSITY_HISTORICAL_PATH,
  type CuriosityTraversePoint,
} from '../features/science/curiosityPathData'
import {
  queryScientificObservationProfile,
} from '../features/science/scientificDataCenter'
import { AresScientificDataCenterModal } from './AresScientificDataCenterModal'
import { MarsSurfaceIntelligenceModal } from './MarsSurfaceIntelligenceModal'
import { MissionPathComparisonModal } from './MissionPathComparisonModal'
import { AresGuidedTour } from './AresGuidedTour'
import { MissionDiscoveryTourOverlay } from './MissionDiscoveryTourOverlay'
import {
  MISSION_DISCOVERY_STOPS,
} from '../features/tour/missionDiscoveryTourData'

export type CameraViewMode = 'orbit' | 'pan' | 'firstPerson' | 'fly'

export interface Tactical3DCommand {
  id: number
  action: string
  params?: Record<string, unknown>
}

interface MarsTerrain3DProps {
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
  onSelectScienceStop?: (point: MarsPoint, name: string) => void
  onSwitchToGlobal?: () => void
  onSwitchToJezero2D?: () => void
  initialDive?: boolean
  focusTarget?: { lat: number; lon: number; height?: number } | null
  activeLayerOverride?: TerrainLayerType | null
  onLayerChange?: (layer: TerrainLayerType) => void
  isComparisonOpenOverride?: boolean | null
  isDataCenterOpenOverride?: boolean | null
  onDataCenterClose?: () => void
  onComparisonClose?: () => void
  isTourActiveOverride?: boolean | null
  onTourStateChange?: (active: boolean, paused: boolean, stopIdx: number) => void
  tacticalCommand?: Tactical3DCommand | null
}

interface EdlFlightTelemetry {
  altitudeStr: string
  velocityStr: string
  machStr: string
  pitchDeg: number
  phaseName: string
  percent: number
}

const REGION_BOUNDS = {
  minLon: 136.25,
  maxLon: 138.63,
  minLat: -6.55,
  maxLat: -4.19,
}

const TERRAIN_WIDTH = 280
const TERRAIN_HEIGHT = 280
const VERTEX_SUBDIVISIONS = 160
const ELEVATION_SCALE = 0.0085 // 5,500 m de Mount Sharp = ~46.7 unidades en 3D

function geoToTerrainPosition(lon: number, lat: number): { x: number; z: number } {
  const u = (lon - REGION_BOUNDS.minLon) / (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
  const v = (REGION_BOUNDS.maxLat - lat) / (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
  const x = (u - 0.5) * TERRAIN_WIDTH
  const z = (v - 0.5) * TERRAIN_HEIGHT
  return { x, z }
}

export function MarsTerrain3D({
  currentStops,
  onSelectScienceStop,
  onSwitchToGlobal,
  onSwitchToJezero2D,
  initialDive = false,
  focusTarget,
  activeLayerOverride,
  onLayerChange,
  isComparisonOpenOverride,
  isDataCenterOpenOverride,
  onDataCenterClose,
  onComparisonClose,
  isTourActiveOverride,
  onTourStateChange,
  tacticalCommand,
}: MarsTerrain3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isCameraAnimatingRef = useRef(false)
  const [activeLayer, setActiveLayer] = useState<TerrainLayerType>('optical')
  const lastAppliedOverrideRef = useRef<TerrainLayerType | null>(null)
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('orbit')
  const [leftTab, setLeftTab] = useState<'layers' | 'camera' | 'colony'>('layers')
  const [isLeftDockCollapsed, setIsLeftDockCollapsed] = useState(false)
  const [colonyVisible, setColonyVisible] = useState(true)

  // Estados exclusivos del inspector derecho (solo uno activo a la vez para evitar superposiciones)
  const [selectedDiscovery, setSelectedDiscovery] = useState<ScientificDiscovery | null>(null)
  const [selectedColonyModule, setSelectedColonyModule] = useState<HabitatModuleConfig | null>(null)
  const [selectedCuriosityWaypoint, setSelectedCuriosityWaypoint] = useState<CuriosityTraversePoint | null>(null)
  const [selectedObservationProfile, setSelectedObservationProfile] = useState<ReturnType<typeof queryScientificObservationProfile> | null>(null)
  const [showLandingBriefing, setShowLandingBriefing] = useState(false)
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false)

  // Estados de modales científicos multimisión y visualización
  const [isDataCenterOpen, setIsDataCenterOpen] = useState(false)
  const [isSurfaceIntelligenceOpen, setIsSurfaceIntelligenceOpen] = useState(false)
  const [isMissionComparisonOpen, setIsMissionComparisonOpen] = useState(false)
  const [routeViewMode, setRouteViewMode] = useState<'both' | 'eva' | 'curiosity'>('both')

  const [hoveredInfo, setHoveredInfo] = useState<{ lon: number; lat: number; elev: number; slope: number } | null>(null)
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false)
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false)
  const [isDiscoveryTourActive, setIsDiscoveryTourActive] = useState(false)
  const [currentDiscoveryStopIndex, setCurrentDiscoveryStopIndex] = useState(0)
  const [isDiscoveryPaused, setIsDiscoveryPaused] = useState(false)
  const [isCleanViewMode, setIsCleanViewMode] = useState(false)

  // Sincronización de overrides provenientes de ARES MISSION COMMS
  useEffect(() => {
    if (focusTarget && controlsRef.current && cameraRef.current) {
      const { x, z } = geoToTerrainPosition(focusTarget.lon, focusTarget.lat)
      const elev = (getGaleElevation(focusTarget.lon, focusTarget.lat) + 4500) * ELEVATION_SCALE
      controlsRef.current.target.set(x, elev + 2, z)
      cameraRef.current.position.set(x + 12, elev + (focusTarget.height ? focusTarget.height * ELEVATION_SCALE : 14), z + 16)
    }
  }, [focusTarget])

  // Sincronización de capa científica con compuerta para no bloquear la selección manual en la UI
  useEffect(() => {
    if (activeLayerOverride && activeLayerOverride !== lastAppliedOverrideRef.current) {
      lastAppliedOverrideRef.current = activeLayerOverride
      setActiveLayer(activeLayerOverride)
    }
  }, [activeLayerOverride])

  useEffect(() => {
    if (isComparisonOpenOverride !== undefined && isComparisonOpenOverride !== null) {
      setIsMissionComparisonOpen(isComparisonOpenOverride)
    }
  }, [isComparisonOpenOverride])

  useEffect(() => {
    if (isDataCenterOpenOverride !== undefined && isDataCenterOpenOverride !== null) {
      setIsDataCenterOpen(isDataCenterOpenOverride)
    }
  }, [isDataCenterOpenOverride])

  useEffect(() => {
    if (isTourActiveOverride !== undefined && isTourActiveOverride !== null) {
      setIsDiscoveryTourActive(isTourActiveOverride)
    }
  }, [isTourActiveOverride])

  useEffect(() => {
    onTourStateChange?.(isDiscoveryTourActive, isDiscoveryPaused, currentDiscoveryStopIndex)
  }, [isDiscoveryTourActive, isDiscoveryPaused, currentDiscoveryStopIndex, onTourStateChange])

  const isDiscoveryTourActiveRef = useRef(isDiscoveryTourActive)
  isDiscoveryTourActiveRef.current = isDiscoveryTourActive
  const currentDiscoveryStopIndexRef = useRef(currentDiscoveryStopIndex)
  currentDiscoveryStopIndexRef.current = currentDiscoveryStopIndex
  const isDiscoveryPausedRef = useRef(isDiscoveryPaused)
  isDiscoveryPausedRef.current = isDiscoveryPaused

  const [flightTelemetry, setFlightTelemetry] = useState<EdlFlightTelemetry>({
    altitudeStr: '24,500 km',
    velocityStr: '21,400 km/h',
    machStr: 'MACH 24.2',
    pitchDeg: -88,
    phaseName: 'ÓRBITA PLANETARIA // ALINEACIÓN CON ELIPSE LZ-1',
    percent: 0,
  })

  // Referencias para Three.js y controles de cámara
  const sceneRef = useRef<Scene | null>(null)
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const terrainMeshRef = useRef<Mesh | null>(null)
  const routeGroupRef = useRef<Group | null>(null)
  const curiosityGroupRef = useRef<Group | null>(null)
  const beaconsGroupRef = useRef<Group | null>(null)
  const landingGroupRef = useRef<Group | null>(null)
  const landingRingsRef = useRef<Group | null>(null)
  const colonyGroupRef = useRef<Group | null>(null)
  const realOrbitalTexRef = useRef<Texture | null>(null)
  const loadedTexturesRef = useRef<Record<string, Texture>>({})
  const activeLayerRef = useRef<TerrainLayerType>(activeLayer)
  activeLayerRef.current = activeLayer
  const animFrameId = useRef<number>(0)
  const cameraModeRef = useRef<CameraViewMode>(cameraMode)
  cameraModeRef.current = cameraMode
  const stopDiveAnimRef = useRef<(() => void) | null>(null)

  // Ruta EVA calculada
  const routePointsList = useMemo(() => {
    if (!currentStops) return []
    const list: { id: StopId; point: MarsPoint; name: string }[] = []
    if (currentStops.A) list.push({ id: 'A', point: currentStops.A, name: 'Base / Inicio A' })
    if (currentStops.P) list.push({ id: 'P', point: currentStops.P, name: 'Parada Científica P' })
    if (currentStops.B) list.push({ id: 'B', point: currentStops.B, name: 'Objetivo B' })
    return list
  }, [currentStops])

  const totalRouteMeters = useMemo(() => {
    if (routePointsList.length < 2) return 0
    let total = 0
    for (let i = 1; i < routePointsList.length; i++) {
      const segCoords = calculateObstacleAvoidanceRoute(routePointsList[i - 1].point, routePointsList[i].point, 32)
      total += calculatePolylineMeters(segCoords)
    }
    return total
  }, [routePointsList])

  const walkbackAssessment = useMemo(() => {
    return evaluateWalkbackLimit(totalRouteMeters)
  }, [totalRouteMeters])

  // Desglose exhaustivo de trazabilidad de distancias y métricas geodésicas
  const routeTelemetry = useMemo(() => {
    if (!currentStops || routePointsList.length < 2) return null

    const segments: {
      fromId: StopId
      toId: StopId
      fromName: string
      toName: string
      horizontalMeters: number
      distance3DMeters: number
      startElevMeters: number
      endElevMeters: number
      deltaZMeters: number
      avgSlopeDeg: number
      estWalkHours: number
      estRoverHours: number
    }[] = []

    let total3DMeters = 0
    let totalGain = 0
    let totalLoss = 0

    for (let i = 1; i < routePointsList.length; i++) {
      const p1 = routePointsList[i - 1]
      const p2 = routePointsList[i]

      const segCoords = calculateObstacleAvoidanceRoute(p1.point, p2.point, 32)
      const horizM = calculatePolylineMeters(segCoords)
      const elev1 = getGaleElevation(p1.point[0], p1.point[1])
      const elev2 = getGaleElevation(p2.point[0], p2.point[1])
      const dz = elev2 - elev1

      if (dz > 0) totalGain += dz
      else totalLoss += Math.abs(dz)

      const dist3D = Math.sqrt(horizM * horizM + dz * dz)
      total3DMeters += dist3D

      const slopeDeg = (Math.atan(Math.abs(dz) / (horizM || 1)) * 180) / Math.PI

      segments.push({
        fromId: p1.id,
        toId: p2.id,
        fromName: p1.name,
        toName: p2.name,
        horizontalMeters: horizM,
        distance3DMeters: dist3D,
        startElevMeters: elev1,
        endElevMeters: elev2,
        deltaZMeters: dz,
        avgSlopeDeg: Number(slopeDeg.toFixed(1)),
        estWalkHours: Number((horizM / 1000 / 3.6).toFixed(2)),
        estRoverHours: Number((horizM / 1000 / 12.0).toFixed(2)),
      })
    }

    const topoCorrection = totalRouteMeters > 0
      ? Number(((total3DMeters - totalRouteMeters) / totalRouteMeters * 100).toFixed(2))
      : 0

    return {
      segments,
      totalHorizontalMeters: totalRouteMeters,
      total3DMeters,
      totalGainMeters: totalGain,
      totalLossMeters: totalLoss,
      topographicCorrectionPercent: topoCorrection,
      datumRadiusMeters: 3389500,
    }
  }, [currentStops, routePointsList, totalRouteMeters])



  // Sincronizar visibilidad de la colonia marciana 3D
  useEffect(() => {
    if (colonyGroupRef.current) {
      colonyGroupRef.current.visible = colonyVisible
    }
  }, [colonyVisible])

  // Inicialización de la escena 3D con Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    // 1. Escena y Niebla Atmosférica Marciana
    const scene = new Scene()
    sceneRef.current = scene
    scene.background = new Color('#04090e')
    scene.fog = new FogExp2(0xd97736, 0.0018)

    // 2. Cámara de Perspectiva
    const camera = new PerspectiveCamera(45, width / height, 0.5, 4500)
    cameraRef.current = camera
    camera.position.set(-50, 48, 85)

    // 3. Renderizador WebGL2 con PBR e iluminación lineal y sombras suaves PCF
    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    rendererRef.current = renderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Controles de Órbita
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minDistance = 6
    controls.maxDistance = 650
    controls.target.set(10, 8, -10)
    controls.update()

    // 5. Cúpula Atmosférica de Dispersión Mie Marciana
    const skyDome = createMartianSkyDome(950)
    scene.add(skyDome)

    // 6. Iluminación Solar y Difusa con sombras rasantes de Marte
    const ambientLight = new AmbientLight(0xffeedd, 0.55)
    scene.add(ambientLight)

    // Luz hemisférica marciana: cielo cálido anaranjado arriba, rebote de polvo marciano rojizo abajo
    const hemiLight = new HemisphereLight(0xffedd5, 0x9a3412, 0.85)
    scene.add(hemiLight)

    const sunLight = new DirectionalLight(0xfff5ea, 2.5)
    sunLight.position.set(140, 220, 100)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 600
    sunLight.shadow.camera.left = -150
    sunLight.shadow.camera.right = 150
    sunLight.shadow.camera.top = 150
    sunLight.shadow.camera.bottom = -150
    sunLight.shadow.bias = -0.0003
    sunLight.shadow.normalBias = 0.02
    scene.add(sunLight)

    const skyFillLight = new DirectionalLight(0xd97736, 0.75)
    skyFillLight.position.set(-100, 60, -80)
    scene.add(skyFillLight)

    // 7. Malla del Terreno de Gale Crater con Vértices Hipsométricos MOLA
    const terrainGeo = new PlaneGeometry(
      TERRAIN_WIDTH,
      TERRAIN_HEIGHT,
      VERTEX_SUBDIVISIONS,
      VERTEX_SUBDIVISIONS,
    )
    terrainGeo.rotateX(-Math.PI / 2)

    const posAttr = terrainGeo.attributes.position as Float32BufferAttribute
    const vertexCount = posAttr.count

    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i)
      const vz = posAttr.getZ(i)

      const u = (vx / TERRAIN_WIDTH) + 0.5
      const v = (vz / TERRAIN_HEIGHT) + 0.5

      const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
      const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)

      const elevation = getGaleElevation(lon, lat)
      const y = (elevation + 4500) * ELEVATION_SCALE
      posAttr.setY(i, y)
    }

    terrainGeo.computeVertexNormals()

    // Textura difusa: Se usa fallback o textura satelital precargada si existe
    const initialTex = realOrbitalTexRef.current || generateTerrainTexture('optical', REGION_BOUNDS, 512)
    const initialBump = generateTerrainBumpMap(REGION_BOUNDS, 512)

    const terrainMat = new MeshStandardMaterial({
      map: initialTex,
      bumpMap: initialBump,
      bumpScale: 0.7,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: false,
    })

    const terrainMesh = new Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = true
    terrainMeshRef.current = terrainMesh
    scene.add(terrainMesh)

    // 8. Balizas Científicas de Descubrimientos de Curiosity (Estaciones de Sensores + Retícula Holográfica Compacta)
    const beaconsGroup = new Group()
    beaconsGroupRef.current = beaconsGroup
    scene.add(beaconsGroup)

    GALE_DISCOVERIES.forEach((disc) => {
      const { x, z } = geoToTerrainPosition(disc.coordinates.lon, disc.coordinates.lat)
      const elev = getGaleElevation(disc.coordinates.lon, disc.coordinates.lat)
      const y = (elev + 4500) * ELEVATION_SCALE

      const pinGroup = new Group()
      pinGroup.position.set(x, y, z)
      pinGroup.name = `discovery-${disc.id}`
      pinGroup.userData = { discoveryData: disc }

      // Trípode de anclaje de titanio al regolito (escala compacta proporcional firmemente en el suelo)
      for (let leg = 0; leg < 3; leg++) {
        const legAngle = (leg * Math.PI * 2) / 3
        const legGeo = new CylinderGeometry(0.025, 0.04, 0.55, 6)
        legGeo.rotateZ(Math.PI / 5.2)
        legGeo.translate(0.22, 0.25, 0)
        legGeo.rotateY(legAngle)
        const legMesh = new Mesh(legGeo, new MeshStandardMaterial({ color: 0x334155, metalness: 0.35, roughness: 0.55 }))
        legMesh.castShadow = true
        pinGroup.add(legMesh)
      }

      // Canister central presurizado de instrumentación analítica (CheMin/SAM)
      const coreGeo = new CylinderGeometry(0.18, 0.22, 0.35, 8)
      coreGeo.translate(0, 0.32, 0)
      const coreMesh = new Mesh(coreGeo, new MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.5 }))
      coreMesh.castShadow = true
      pinGroup.add(coreMesh)

      // Tapa con micro-celdas solares fotovoltaicas
      const capGeo = new CylinderGeometry(0.22, 0.22, 0.04, 8)
      capGeo.translate(0, 0.52, 0)
      const capMesh = new Mesh(capGeo, new MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.4, roughness: 0.35 }))
      pinGroup.add(capMesh)

      // Mástil sensor vertical con cabezal óptico Mastcam / ChemCam
      const mastGeo = new CylinderGeometry(0.025, 0.025, 0.35, 6)
      mastGeo.translate(0, 0.7, 0)
      const mastMesh = new Mesh(mastGeo, new MeshStandardMaterial({ color: 0x475569, metalness: 0.35, roughness: 0.55 }))
      mastMesh.castShadow = true
      pinGroup.add(mastMesh)

      const sensorHeadGeo = new BoxGeometry(0.16, 0.12, 0.16)
      sensorHeadGeo.translate(0, 0.88, 0)
      const sensorHeadMesh = new Mesh(sensorHeadGeo, new MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.2, roughness: 0.45 }))
      sensorHeadMesh.castShadow = true
      pinGroup.add(sensorHeadMesh)

      // Retícula táctica compacta integrada en el mástil (y = 0.95 m)
      const reticleGroup = new Group()
      reticleGroup.position.set(0, 0.95, 0)
      reticleGroup.name = 'holographic-reticle'

      // Anillo exterior con muescas de adquisición de objetivo
      const outerRingGeo = new RingGeometry(0.28, 0.36, 24)
      outerRingGeo.rotateX(-Math.PI / 2)
      reticleGroup.add(new Mesh(outerRingGeo, new MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: DoubleSide })))

      // Rombo de telemetría interior
      const diamondRingGeo = new RingGeometry(0.1, 0.16, 4)
      diamondRingGeo.rotateX(-Math.PI / 2)
      diamondRingGeo.rotateZ(Math.PI / 4)
      reticleGroup.add(new Mesh(diamondRingGeo, new MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9, side: DoubleSide })))

      pinGroup.add(reticleGroup)
      beaconsGroup.add(pinGroup)
    })

    // 9. Elipse de seguridad NASA EDL (7.0 x 4.5 km, azimut 78°) proyectada en el regolito
    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const ellipseCurve = new EllipseCurve(0, 0, 20.65, 13.28, 0, 2 * Math.PI, false, (78 * Math.PI) / 180)
    const ellipsePoints3D = ellipseCurve.getPoints(64).map(p => new Vector3(p.x, 0.08, p.y))
    const ellipseGeo = new BufferGeometry().setFromPoints(ellipsePoints3D)
    const ellipseMat = new LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 })
    const landingEllipse = new LineLoop(ellipseGeo, ellipseMat)
    landingEllipse.position.set(landingX, landingY, landingZ)
    landingEllipse.name = `landing-ellipse-${PRIMARY_LANDING_SITE.id}`
    scene.add(landingEllipse)

    // 10. MÓDULO DE COLONIA Y HÁBITAT MARCIANO 3D (BASE ALFA)
    const colonyGroup = buildColony3DGroup({
      getTerrainHeight: (x, z) => {
        const u = (x / TERRAIN_WIDTH) + 0.5
        const v = (z / TERRAIN_HEIGHT) + 0.5
        const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
        return (getGaleElevation(lon, lat) + 4500) * ELEVATION_SCALE
      },
      centerTerrainPos: { x: landingX, z: landingZ },
      scale: 1.0,
    })
    colonyGroupRef.current = colonyGroup
    scene.add(colonyGroup)

    // 11. Grupo para la Ruta EVA 3D
    const routeGroup = new Group()
    routeGroupRef.current = routeGroup
    scene.add(routeGroup)

    // 11b. Grupo para la Travesía Histórica de Curiosity (MSL Heritage)
    const curiosityGroup = new Group()
    curiosityGroup.name = 'curiosity-heritage-group'
    curiosityGroupRef.current = curiosityGroup
    scene.add(curiosityGroup)

    // Muestreo denso de 200 puntos que abraza el relieve real de Mount Sharp (fiel a NASA PIA22207)
    const denseSampleCount = 200
    const rawWaypoints2D = CURIOSITY_HISTORICAL_PATH.map((wp) => {
      const { x, z } = geoToTerrainPosition(wp.lon, wp.lat)
      return new Vector3(x, 0, z)
    })
    const curve2D = new CatmullRomCurve3(rawWaypoints2D, false, 'catmullrom', 0.25)
    const sampledPoints = curve2D.getPoints(denseSampleCount)

    const terrainConformingPoints: Vector3[] = sampledPoints.map((p) => {
      const u = (p.x / TERRAIN_WIDTH) + 0.5
      const v = (p.z / TERRAIN_HEIGHT) + 0.5
      const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
      const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
      const elev = getGaleElevation(lon, lat)
      // Offset de 0.12 unidades para evitar z-fighting y abrazar fielmente colinas y valles
      const y = (elev + 4500) * ELEVATION_SCALE + 0.12
      return new Vector3(p.x, y, p.z)
    })

    const conformingSpline = new CatmullRomCurve3(terrainConformingPoints)

    // Núcleo fino blanco nítido estilo NASA (radio 0.038)
    const tubeCoreGeo = new TubeGeometry(conformingSpline, denseSampleCount, 0.038, 6, false)
    const tubeCoreMat = new MeshBasicMaterial({ color: 0xffffff })
    curiosityGroup.add(new Mesh(tubeCoreGeo, tubeCoreMat))

    // Sutil halo exterior técnico (radio 0.065)
    const tubeHaloGeo = new TubeGeometry(conformingSpline, denseSampleCount, 0.065, 6, false)
    const tubeHaloMat = new MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
    })
    curiosityGroup.add(new Mesh(tubeHaloGeo, tubeHaloMat))

    CURIOSITY_HISTORICAL_PATH.forEach((wp) => {
      const { x, z } = geoToTerrainPosition(wp.lon, wp.lat)
      const elev = getGaleElevation(wp.lon, wp.lat)
      const y = (elev + 4500) * ELEVATION_SCALE

      const wpGroup = new Group()
      wpGroup.name = `curiosity-wp-${wp.id}`
      wpGroup.userData = { curiosityPoint: wp }
      wpGroup.position.set(x, y, z)

      // Marcador geológico de superficie Curiosity (anclado directamente al regolito, sin postes flotantes)
      const ringGeo = new RingGeometry(0.24, 0.42, 16)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMesh = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xd97706, side: DoubleSide, transparent: true, opacity: 0.75 }))
      ringMesh.position.y = 0.04
      wpGroup.add(ringMesh)

      const baseGeo = new CylinderGeometry(0.08, 0.12, 0.08, 8)
      const baseMesh = new Mesh(baseGeo, new MeshStandardMaterial({ color: 0x334155, metalness: 0.25, roughness: 0.55 }))
      baseMesh.position.y = 0.04
      wpGroup.add(baseMesh)

      const pinGeo = new CylinderGeometry(0.02, 0.02, 0.2, 6)
      const pinMat = new MeshBasicMaterial({ color: 0xd97706 })
      const pinMesh = new Mesh(pinGeo, pinMat)
      pinMesh.position.y = 0.14
      wpGroup.add(pinMesh)

      const topGeo = new OctahedronGeometry(0.08)
      const topMat = new MeshBasicMaterial({ color: 0xf8fafc })
      const topMesh = new Mesh(topGeo, topMat)
      topMesh.position.y = 0.26
      wpGroup.add(topMesh)

      curiosityGroup.add(wpGroup)
    })

    // 12. Raycasting para Inspección Interactiva
    const raycaster = new Raycaster()
    const mouse = new Vector2()
    let pointerDownPos = { x: 0, y: 0 }
    let isDragging = false

    const onPointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY }
      isDragging = false
    }

    const onPointerMove = (e: MouseEvent) => {
      const dx = e.clientX - pointerDownPos.x
      const dy = e.clientY - pointerDownPos.y
      if (dx * dx + dy * dy > 36) {
        isDragging = true
      }

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(terrainMesh)
      if (intersects.length > 0) {
        const hit = intersects[0].point
        const u = (hit.x / TERRAIN_WIDTH) + 0.5
        const v = (hit.z / TERRAIN_HEIGHT) + 0.5
        const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
        const elev = getGaleElevation(lon, lat)
        const slope = getGaleSlopeDegrees(lon, lat)
        setHoveredInfo({ lon, lat, elev, slope })
      }
    }

    const onPointerClick = (e: MouseEvent) => {
      if (isDragging) {
        isDragging = false
        return
      }

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Clic en módulos de la colonia 3D
      if (colonyGroupRef.current && colonyGroupRef.current.visible) {
        const colonyHits = raycaster.intersectObjects(colonyGroupRef.current.children, true)
        if (colonyHits.length > 0) {
          let currentObj = colonyHits[0].object
          while (currentObj.parent && !currentObj.name.startsWith('colony-module-')) {
            currentObj = currentObj.parent as Mesh
          }
          if (currentObj.userData?.moduleData) {
            setSelectedColonyModule(currentObj.userData.moduleData as HabitatModuleConfig)
            setSelectedDiscovery(null)
            setShowLandingBriefing(false)
            setSelectedCuriosityWaypoint(null)
            setSelectedObservationProfile(null)
            return
          }
        }
      }

      // Clic en la zona de aterrizaje candidata principal LZ-1
      if (landingGroupRef.current) {
        const landingHits = raycaster.intersectObjects(landingGroupRef.current.children, true)
        if (landingHits.length > 0) {
          setShowLandingBriefing(true)
          setSelectedDiscovery(null)
          setSelectedColonyModule(null)
          setSelectedCuriosityWaypoint(null)
          setSelectedObservationProfile(null)
          return
        }
      }

      // Clic en balizas científicas de descubrimientos
      const pinHits = raycaster.intersectObjects(beaconsGroup.children, true)
      if (pinHits.length > 0) {
        let currentObj = pinHits[0].object
        while (currentObj.parent && !currentObj.name.startsWith('discovery-')) {
          currentObj = currentObj.parent as Mesh
        }
        const discId = currentObj.name.replace('discovery-', '')
        const found = GALE_DISCOVERIES.find(d => d.id === discId)
        if (found) {
          setSelectedDiscovery(found)
          setShowLandingBriefing(false)
          setSelectedColonyModule(null)
          setSelectedCuriosityWaypoint(null)
          setSelectedObservationProfile(null)
          return
        }
      }

      // Clic en balizas históricas de la travesía de Curiosity
      if (curiosityGroupRef.current && curiosityGroupRef.current.visible) {
        const curHits = raycaster.intersectObjects(curiosityGroupRef.current.children, true)
        if (curHits.length > 0) {
          let currentObj = curHits[0].object
          while (currentObj.parent && !currentObj.name.startsWith('curiosity-wp-')) {
            currentObj = currentObj.parent as Mesh
          }
          if (currentObj.userData?.curiosityPoint) {
            setSelectedCuriosityWaypoint(currentObj.userData.curiosityPoint as CuriosityTraversePoint)
            setSelectedDiscovery(null)
            setSelectedColonyModule(null)
            setShowLandingBriefing(false)
            setSelectedObservationProfile(null)
            return
          }
        }
      }

      // Clic en la superficie para perfil científico multimisión
      const terrainHits = raycaster.intersectObject(terrainMesh)
      if (terrainHits.length > 0) {
        const hit = terrainHits[0].point
        const u = (hit.x / TERRAIN_WIDTH) + 0.5
        const v = (hit.z / TERRAIN_HEIGHT) + 0.5
        const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
        const elev = getGaleElevation(lon, lat)
        const profile = queryScientificObservationProfile(lon, lat, elev)
        setSelectedObservationProfile(profile)
        setSelectedDiscovery(null)
        setSelectedColonyModule(null)
        setShowLandingBriefing(false)
        setSelectedCuriosityWaypoint(null)
      }
    }

    renderer.domElement.addEventListener('mousedown', onPointerDown)
    renderer.domElement.addEventListener('mousemove', onPointerMove)
    renderer.domElement.addEventListener('click', onPointerClick)

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    resizeObserver.observe(container)

    let clockTime = 0
    let flyAngle = 0

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate)
      clockTime += 0.016

      beaconsGroup.children.forEach((beacon, index) => {
        const reticle = beacon.getObjectByName('holographic-reticle')
        if (reticle) {
          reticle.rotation.y += 0.015
          const pulse = Math.sin(clockTime * 3 + index * 1.2) * 0.1 + 1.0
          reticle.scale.set(pulse, pulse, pulse)
        }
      })

      if (landingRingsRef.current) {
        const pulse = Math.sin(clockTime * 3.5) * 0.12 + 1
        landingRingsRef.current.scale.set(pulse, 1, pulse)
      }

      const currentMode = cameraModeRef.current

      if (isCameraAnimatingRef.current) {
        // La cámara está siendo interpolada activamente por una secuencia cinemática (Dive EDL, Ascenso a Órbita, Foco LZ-1 o Panorama)
        // Omitimos controls.update() para que el amortiguamiento de OrbitControls no anule el movimiento de la cámara
      } else if (isDiscoveryTourActiveRef.current) {
        const stop = MISSION_DISCOVERY_STOPS[currentDiscoveryStopIndexRef.current]
        if (stop) {
          const { x, z } = geoToTerrainPosition(stop.coordinates.lon, stop.coordinates.lat)
          const elev = (getGaleElevation(stop.coordinates.lon, stop.coordinates.lat) + 4500) * ELEVATION_SCALE
          const targetLook = new Vector3(x + stop.lookAtOffset.dx, elev + stop.lookAtOffset.dy, z + stop.lookAtOffset.dz)

          if (isDiscoveryPausedRef.current) {
            controls.update()
          } else {
            const radius = Math.hypot(stop.cameraPositionOffset.dx, stop.cameraPositionOffset.dz)
            const baseAngle = Math.atan2(stop.cameraPositionOffset.dz, stop.cameraPositionOffset.dx)
            const currentAngle = baseAngle + Math.sin(clockTime * 0.25) * 0.2
            const camX = x + Math.cos(currentAngle) * radius
            const camZ = z + Math.sin(currentAngle) * radius
            const camY = elev + stop.cameraPositionOffset.dy + Math.sin(clockTime * 0.15) * 1.0

            camera.position.lerp(new Vector3(camX, camY, camZ), 0.04)
            controls.target.lerp(targetLook, 0.05)
            camera.lookAt(controls.target)
          }
        }
      } else if (currentMode === 'fly') {
        flyAngle += 0.0028
        const radius = 95
        const camX = Math.sin(flyAngle) * radius + 15
        const camZ = Math.cos(flyAngle) * radius - 15
        const u = (camX / TERRAIN_WIDTH) + 0.5
        const v = (camZ / TERRAIN_HEIGHT) + 0.5
        const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
        const groundY = (getGaleElevation(lon, lat) + 4500) * ELEVATION_SCALE
        camera.position.set(camX, groundY + 16, camZ)
        camera.lookAt(20, 24, -20)
      } else {
        controls.update()
      }

      renderer.render(scene, camera)
    }

    animFrameId.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameId.current)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('mousedown', onPointerDown)
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      renderer.domElement.removeEventListener('click', onPointerClick)
      controls.dispose()
      terrainGeo.dispose()
      terrainMat.dispose()
      skyDome.geometry.dispose()
      if (Array.isArray(skyDome.material)) {
        skyDome.material.forEach(m => m.dispose())
      } else {
        skyDome.material.dispose()
      }
      scene.clear()
      renderer.dispose()
    }
  }, [])

  // Actualización de capa científica en la textura del terreno
  useEffect(() => {
    if (!terrainMeshRef.current) return
    const mesh = terrainMeshRef.current
    const mat = mesh.material as MeshStandardMaterial

    const realUrl = REAL_LAYER_TEXTURE_URLS[activeLayer]
    if (realUrl) {
      if (loadedTexturesRef.current[activeLayer]) {
        mat.map = loadedTexturesRef.current[activeLayer]
        mat.needsUpdate = true
        return
      }
      const loader = new TextureLoader()
      loader.load(
        realUrl,
        (tex) => {
          tex.colorSpace = SRGBColorSpace
          loadedTexturesRef.current[activeLayer] = tex
          if (activeLayerRef.current === activeLayer && terrainMeshRef.current) {
            mat.map = tex
            mat.needsUpdate = true
          }
        },
        undefined,
        (err) => {
          console.warn(`Fallback procedural para capa ${activeLayer}:`, err)
          const fallbackTex = generateTerrainTexture(activeLayer, REGION_BOUNDS, 1024)
          fallbackTex.colorSpace = SRGBColorSpace
          mat.map = fallbackTex
          mat.needsUpdate = true
        }
      )
      return
    }

    const dataTex = generateTerrainTexture(activeLayer, REGION_BOUNDS, 1024)
    dataTex.colorSpace = SRGBColorSpace
    mat.map = dataTex
    mat.needsUpdate = true
  }, [activeLayer])

  // Sincronizar visibilidad de los dos sistemas de rutas (EVA y Curiosity)
  useEffect(() => {
    if (curiosityGroupRef.current) {
      curiosityGroupRef.current.visible = routeViewMode === 'both' || routeViewMode === 'curiosity'
    }
    if (routeGroupRef.current) {
      routeGroupRef.current.visible = routeViewMode === 'both' || routeViewMode === 'eva'
    }
  }, [routeViewMode])

  // Actualización de ruta EVA 3D: Travesía no lineal con evasión de obstáculos y doble filamento luminoso
  // Estilo inspirado en los mapas de travesía de Perseverance y Curiosity de la NASA (ref. canónica de misión)
  useEffect(() => {
    if (!routeGroupRef.current) return
    const group = routeGroupRef.current
    while (group.children.length > 0) {
      const child = group.children[0] as Mesh
      if (child.geometry) child.geometry.dispose()
      group.remove(child)
    }

    if (routePointsList.length < 2) return

    const primary3DPoints: Vector3[] = []
    const secondary3DPoints: Vector3[] = []

    for (let i = 0; i < routePointsList.length - 1; i++) {
      const p1 = routePointsList[i].point
      const p2 = routePointsList[i + 1].point

      // 1. Ruta principal óptima: rodea relieves escarpados, paredes de cráter y pendientes críticas (>15°)
      const optimalCoords = calculateObstacleAvoidanceRoute(p1, p2, 40)
      for (let s = 0; s < optimalCoords.length; s++) {
        if (i > 0 && s === 0) continue
        const [lon, lat] = optimalCoords[s]
        const { x, z } = geoToTerrainPosition(lon, lat)
        const elev = getGaleElevation(lon, lat)
        const y = (elev + 4500) * ELEVATION_SCALE + 0.14
        primary3DPoints.push(new Vector3(x, y, z))
      }

      // 2. Corredor exploratorio secundario / travesía previa (estilo Perseverance Traverse NASA/JPL)
      const secCoords = calculateSecondaryExploratoryCorridor(p1, p2, 28)
      for (let s = 0; s < secCoords.length; s++) {
        if (i > 0 && s === 0) continue
        const [lon, lat] = secCoords[s]
        const { x, z } = geoToTerrainPosition(lon, lat)
        const elev = getGaleElevation(lon, lat)
        const y = (elev + 4500) * ELEVATION_SCALE + 0.10
        secondary3DPoints.push(new Vector3(x, y, z))
      }
    }

    if (primary3DPoints.length >= 2) {
      const primaryCurve = new CatmullRomCurve3(primary3DPoints)

      // A. Casing exterior táctico dorado/ámbar (#f59e0b) que destaca nítidamente sobre el terreno marciano
      const outerColor = walkbackAssessment.status === 'CRÍTICO' ? 0xef4444 : 0xf59e0b
      const outerTubeGeo = new TubeGeometry(primaryCurve, primary3DPoints.length * 2, 0.082, 8, false)
      const outerMat = new MeshBasicMaterial({
        color: outerColor,
        transparent: true,
        opacity: 0.88,
      })
      group.add(new Mesh(outerTubeGeo, outerMat))

      // B. Núcleo central luminoso cian brillante (#00f0ff)
      const innerTubeGeo = new TubeGeometry(primaryCurve, primary3DPoints.length * 2, 0.035, 6, false)
      const innerMat = new MeshBasicMaterial({ color: 0x00f0ff })
      group.add(new Mesh(innerTubeGeo, innerMat))

      // C. Corredor alternativo / travesía secundaria (faint cyan estilo NASA traverse)
      if (secondary3DPoints.length >= 2) {
        const secCurve = new CatmullRomCurve3(secondary3DPoints)
        const secTubeGeo = new TubeGeometry(secCurve, secondary3DPoints.length * 2, 0.024, 6, false)
        const secMat = new MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45,
        })
        group.add(new Mesh(secTubeGeo, secMat))
      }

      // D. Balizas circulares de hitos de navegación (círculos azules/cian con aro oscuro en el suelo)
      let accumMeters = 0
      let nextMilestoneKm = 1
      for (let s = 1; s < primary3DPoints.length; s++) {
        const pA = primary3DPoints[s - 1]
        const pB = primary3DPoints[s]
        const uA = (pA.x / TERRAIN_WIDTH) + 0.5
        const vA = (pA.z / TERRAIN_HEIGHT) + 0.5
        const lonA = REGION_BOUNDS.minLon + uA * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const latA = REGION_BOUNDS.maxLat - vA * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)

        const uB = (pB.x / TERRAIN_WIDTH) + 0.5
        const vB = (pB.z / TERRAIN_HEIGHT) + 0.5
        const lonB = REGION_BOUNDS.minLon + uB * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const latB = REGION_BOUNDS.maxLat - vB * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)

        accumMeters += marsDistance([lonA, latA], [lonB, latB])

        if (accumMeters >= nextMilestoneKm * 1000) {
          const mGroup = new Group()
          mGroup.position.copy(pB)
          mGroup.name = `route-milestone-${nextMilestoneKm}km`

          // Disco circular oscuro de contraste
          const mBaseGeo = new RingGeometry(0.38, 0.52, 20)
          mBaseGeo.rotateX(-Math.PI / 2)
          mBaseGeo.translate(0, 0.045, 0)
          mGroup.add(new Mesh(mBaseGeo, new MeshBasicMaterial({ color: 0x0f172a, side: DoubleSide })))

          // Anillo cian luminiscente rasante en el suelo (360° indicator)
          const mRingGeo = new RingGeometry(0.24, 0.38, 20)
          mRingGeo.rotateX(-Math.PI / 2)
          mRingGeo.translate(0, 0.05, 0)
          mGroup.add(new Mesh(mRingGeo, new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9, side: DoubleSide })))

          // Punto central de baliza táctica
          const mCenterDot = new OctahedronGeometry(0.10, 0)
          mCenterDot.translate(0, 0.22, 0)
          mGroup.add(new Mesh(mCenterDot, new MeshBasicMaterial({ color: 0x00f0ff })))

          group.add(mGroup)
          nextMilestoneKm++
        }
      }
    }

    // Paradas / Waypoints A, P, B con distintivos acordes a la foto de referencia (START, WAYPOINT, TARGET)
    routePointsList.forEach((stop) => {
      const { x, z } = geoToTerrainPosition(stop.point[0], stop.point[1])
      const elev = getGaleElevation(stop.point[0], stop.point[1])
      const y = (elev + 4500) * ELEVATION_SCALE

      const waypointGroup = new Group()
      waypointGroup.position.set(x, y, z)
      waypointGroup.name = `waypoint-stop-${stop.id}`

      // A: START (verde #10b981), P: WAYPOINT (ámbar #f59e0b), B: TARGET (coral #f97316)
      const colorHex = stop.id === 'A' ? 0x10b981 : stop.id === 'P' ? 0xf59e0b : 0xf97316

      // Base táctica compacta en el regolito
      const baseGeo = new CylinderGeometry(0.35, 0.42, 0.12, 12)
      const baseMesh = new Mesh(baseGeo, new MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 }))
      baseMesh.castShadow = true
      baseMesh.receiveShadow = true
      baseMesh.position.y = 0.06
      waypointGroup.add(baseMesh)

      // Anillo concéntrico exterior oscuro
      const borderRingGeo = new RingGeometry(0.85, 1.05, 28)
      borderRingGeo.rotateX(-Math.PI / 2)
      borderRingGeo.translate(0, 0.04, 0)
      waypointGroup.add(new Mesh(borderRingGeo, new MeshBasicMaterial({ color: 0x0f172a, side: DoubleSide })))

      // Anillo concéntrico rasante de adquisición de objetivo en el suelo (START 360° / TARGET 360°)
      const distRingGeo = new RingGeometry(0.65, 0.85, 28)
      distRingGeo.rotateX(-Math.PI / 2)
      distRingGeo.translate(0, 0.045, 0)
      waypointGroup.add(new Mesh(distRingGeo, new MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9, side: DoubleSide })))

      // Micro-sensor vertical de telemetría
      const pylonGeo = new CylinderGeometry(0.04, 0.05, 0.55, 6)
      pylonGeo.translate(0, 0.35, 0)
      const pylonMesh = new Mesh(pylonGeo, new MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 }))
      waypointGroup.add(pylonMesh)

      // Emisor óptico de baliza compacto
      const collarGeo = new CylinderGeometry(0.08, 0.08, 0.12, 8)
      collarGeo.translate(0, 0.65, 0)
      waypointGroup.add(new Mesh(collarGeo, new MeshBasicMaterial({ color: colorHex })))

      // Retícula holográfica compacta en la cima (altura total 0.85 m)
      const diamondGeo = new OctahedronGeometry(0.14, 0)
      diamondGeo.translate(0, 0.82, 0)
      waypointGroup.add(new Mesh(diamondGeo, new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })))

      group.add(waypointGroup)
    })
  }, [routePointsList, walkbackAssessment.status])

  // Modos de cámara
  const setMode = useCallback((mode: CameraViewMode) => {
    setCameraMode(mode)
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return

    if (mode === 'orbit') {
      controls.enabled = true
      controls.enablePan = false
      controls.enableRotate = true
      controls.target.set(12, 10, -12)
    } else if (mode === 'pan') {
      controls.enabled = true
      controls.enablePan = true
      controls.enableRotate = false
    } else if (mode === 'firstPerson') {
      controls.enabled = false
      const { x, z } = geoToTerrainPosition(PRIMARY_LANDING_SITE.coordinates.lon, PRIMARY_LANDING_SITE.coordinates.lat)
      const elev = getGaleElevation(PRIMARY_LANDING_SITE.coordinates.lon, PRIMARY_LANDING_SITE.coordinates.lat)
      const eyeY = (elev + 4500) * ELEVATION_SCALE + 1.8 * ELEVATION_SCALE * 10
      camera.position.set(x - 2, eyeY + 1.6, z + 6)
      camera.lookAt(x + 12, eyeY + 3.0, z - 20)
    } else if (mode === 'fly') {
      controls.enabled = false
    }
  }, [])

  const skipCinematic = useCallback(() => {
    if (stopDiveAnimRef.current) {
      stopDiveAnimRef.current()
      stopDiveAnimRef.current = null
    }
    isCameraAnimatingRef.current = false
    setIsCinematicPlaying(false)
    if (controlsRef.current) {
      controlsRef.current.enabled = true
      controlsRef.current.update()
    }
  }, [])

  // Foco en descubrimiento científico
  const focusOnDiscovery = useCallback((disc: ScientificDiscovery) => {
    skipCinematic()
    setSelectedDiscovery(disc)
    setSelectedColonyModule(null)
    setShowLandingBriefing(false)

    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { x, z } = geoToTerrainPosition(disc.coordinates.lon, disc.coordinates.lat)
    const y = (disc.elevationMeters + 4500) * ELEVATION_SCALE

    controls.target.set(x, y, z)
    camera.position.set(x - 18, y + 20, z + 26)
    camera.lookAt(x, y, z)
    controls.update()
  }, [skipCinematic])

  // Foco en el Sitio Candidato Principal LZ-1
  const focusOnLandingSite = useCallback(() => {
    skipCinematic()
    setSelectedDiscovery(null)
    setSelectedColonyModule(null)
    setShowLandingBriefing(true)

    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    isCameraAnimatingRef.current = true
    controls.enabled = false
    setIsDiscoveryTourActive(false)
    isDiscoveryTourActiveRef.current = false

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const target = new Vector3(landingX, landingY + 1.2, landingZ)
    const eye = new Vector3(landingX - 18, landingY + 8.5, landingZ + 22)

    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    const durationMs = 1400
    const start = performance.now()

    const anim = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const ease = 1 - Math.pow(1 - t, 3)

      camera.position.lerpVectors(startPos, eye, ease)
      const curTarget = new Vector3().lerpVectors(startTarget, target, ease)
      camera.lookAt(curTarget)
      controls.target.copy(curTarget)

      if (t < 1) {
        requestAnimationFrame(anim)
      } else {
        isCameraAnimatingRef.current = false
        controls.enabled = true
        controls.target.copy(target)
        controls.update()
      }
    }

    requestAnimationFrame(anim)
  }, [skipCinematic])

  // Foco en módulo específico de la colonia
  const focusOnColonyModule = useCallback((mod: HabitatModuleConfig) => {
    skipCinematic()
    setSelectedColonyModule(mod)
    setSelectedDiscovery(null)
    setShowLandingBriefing(false)

    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const meterToUnit = 0.12
    const targetX = landingX + mod.offsetMeters.east * meterToUnit
    const targetZ = landingZ - mod.offsetMeters.north * meterToUnit
    const targetY = (getGaleElevation(PRIMARY_LANDING_SITE.coordinates.lon, PRIMARY_LANDING_SITE.coordinates.lat) + 4500) * ELEVATION_SCALE

    controls.target.set(targetX, targetY + 1.0, targetZ)
    camera.position.set(targetX - 9, targetY + 6.0, targetZ + 12)
    camera.lookAt(targetX, targetY + 1.0, targetZ)
    controls.update()
  }, [])

  // Recorrido panorámico de la Colonia Marciana Base Alfa
  const tourColony = useCallback(() => {
    skipCinematic()
    setColonyVisible(true)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    isCameraAnimatingRef.current = true
    controls.enabled = false
    setIsDiscoveryTourActive(false)
    isDiscoveryTourActiveRef.current = false

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const durationMs = 4500
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const angle = t * Math.PI * 1.5 + Math.PI / 4
      const radius = 28
      const eyeX = landingX + Math.sin(angle) * radius
      const eyeZ = landingZ + Math.cos(angle) * radius
      const eyeY = landingY + 11 + Math.sin(t * Math.PI) * 4

      camera.position.set(eyeX, eyeY, eyeZ)
      const lookTarget = new Vector3(landingX, landingY + 1.5, landingZ)
      camera.lookAt(lookTarget)
      controls.target.copy(lookTarget)

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        isCameraAnimatingRef.current = false
        controls.enabled = true
        controls.target.copy(lookTarget)
        controls.update()
      }
    }

    requestAnimationFrame(step)
  }, [skipCinematic])

  // Secuencia de Descenso Continuo Google Earth (Orbital Dive) con foco estricto en LZ-1
  const playGoogleEarthDive = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    setIsCinematicPlaying(true)
    isCameraAnimatingRef.current = true
    controls.enabled = false
    closeInspector()
    setIsDiscoveryTourActive(false)
    isDiscoveryTourActiveRef.current = false

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const spacePos = new Vector3(landingX + 24, landingY + 450, landingZ + 180)
    const targetLanding = new Vector3(landingX, landingY, landingZ)
    camera.position.copy(spacePos)
    camera.lookAt(targetLanding)
    controls.target.copy(targetLanding)

    const endPos = new Vector3(landingX - 18, landingY + 8.5, landingZ + 22)
    const endTarget = new Vector3(landingX, landingY + 1.2, landingZ)

    let isStopped = false
    stopDiveAnimRef.current = () => {
      isStopped = true
      isCameraAnimatingRef.current = false
      setIsCinematicPlaying(false)
      camera.position.copy(endPos)
      camera.lookAt(endTarget)
      controls.target.copy(endTarget)
      controls.enabled = true
      controls.update()
      setShowLandingBriefing(true)
    }

    const durationMs = 5400
    const start = performance.now()

    const step = (now: number) => {
      if (isStopped) return
      const elapsed = now - start
      const rawT = Math.min(1, elapsed / durationMs)
      const ease = 1 - Math.pow(1 - rawT, 4)

      const currentPos = new Vector3()
      currentPos.lerpVectors(spacePos, endPos, ease)
      currentPos.y += Math.sin(rawT * Math.PI) * 16
      camera.position.copy(currentPos)

      const currentTarget = new Vector3()
      currentTarget.lerpVectors(targetLanding, endTarget, ease)
      camera.lookAt(currentTarget)
      controls.target.copy(currentTarget)

      const altKm = Math.round(24500 * (1 - ease) + 0.14)
      const altStr = altKm > 100 ? `${altKm.toLocaleString()} km` : `${(altKm * 1000).toLocaleString()} m`
      const velMach = Math.max(0, 24.2 * (1 - ease)).toFixed(1)
      const velKmh = Math.round(21400 * (1 - ease) + 80)
      const pitch = Math.round(-88 + ease * 66)

      let phase = 'ÓRBITA PLANETARIA // ALINEACIÓN CON ELIPSE LZ-1'
      if (rawT > 0.25 && rawT <= 0.50) phase = 'INTERFAZ ATMOSFÉRICA // FRENO HIPERSÓNICO (EI-125)'
      else if (rawT > 0.50 && rawT <= 0.75) phase = 'RADAR RELATIVO AL TERRENO (TRN) // ESCANEO LZ-1'
      else if (rawT > 0.75 && rawT <= 0.95) phase = 'APROXIMACIÓN TERMINAL // APERTURA RETÍCULA BRADBURY'
      else if (rawT > 0.95) phase = 'SUPERFICIE CONTACTADA // LZ-1 BRADBURY BASE OPERACIONAL'

      setFlightTelemetry({
        altitudeStr: altStr,
        velocityStr: `${velKmh.toLocaleString()} km/h`,
        machStr: `MACH ${velMach}`,
        pitchDeg: pitch,
        phaseName: phase,
        percent: Math.round(rawT * 100),
      })

      if (rawT < 1) {
        requestAnimationFrame(step)
      } else {
        isCameraAnimatingRef.current = false
        setIsCinematicPlaying(false)
        controls.target.copy(endTarget)
        controls.enabled = true
        controls.update()
        setShowLandingBriefing(true)
      }
    }

    requestAnimationFrame(step)
  }, [])

  // Ascenso a Órbita Espacial Alta
  const playGoogleEarthAscent = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    skipCinematic()
    isCameraAnimatingRef.current = true
    controls.enabled = false
    setIsDiscoveryTourActive(false)
    isDiscoveryTourActiveRef.current = false
    const startPos = camera.position.clone()

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const targetSpace = new Vector3(landingX + 24, landingY + 450, landingZ + 180)
    const targetCenter = new Vector3(landingX, landingY, landingZ)

    let progress = 0
    const durationMs = 3600
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      progress = Math.min(1, elapsed / durationMs)
      const ease = 1 - Math.pow(1 - progress, 3)

      camera.position.lerpVectors(startPos, targetSpace, ease)
      camera.lookAt(targetCenter)
      controls.target.copy(targetCenter)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        isCameraAnimatingRef.current = false
        controls.enabled = true
        controls.target.copy(targetCenter)
        controls.update()
      }
    }

    requestAnimationFrame(step)
  }, [skipCinematic])

  useEffect(() => {
    if (initialDive) {
      const timer = setTimeout(() => {
        playGoogleEarthDive()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [initialDive, playGoogleEarthDive])

  const closeInspector = () => {
    setSelectedDiscovery(null)
    setSelectedColonyModule(null)
    setShowLandingBriefing(false)
    setSelectedCuriosityWaypoint(null)
    setSelectedObservationProfile(null)
  }

  const isInspectorOpen = Boolean(
    selectedDiscovery ||
    selectedColonyModule ||
    showLandingBriefing ||
    selectedCuriosityWaypoint ||
    selectedObservationProfile
  )

  // Despacho táctico de comandos provenientes del Copiloto de Voz ARES
  const lastExecutedCommandIdRef = useRef<number>(0)
  useEffect(() => {
    if (!tacticalCommand || tacticalCommand.id === lastExecutedCommandIdRef.current) return
    lastExecutedCommandIdRef.current = tacticalCommand.id

    switch (tacticalCommand.action) {
      case 'GUIDED_TOUR':
        setIsGuidedTourOpen(Boolean(tacticalCommand.params?.open ?? true))
        break
      case 'SOBREVUELO':
        closeInspector()
        setIsCinematicPlaying(false)
        isCameraAnimatingRef.current = false
        isDiscoveryTourActiveRef.current = true
        isDiscoveryPausedRef.current = false
        currentDiscoveryStopIndexRef.current = Number(tacticalCommand.params?.startIndex ?? 0)
        setIsDiscoveryTourActive(true)
        setCurrentDiscoveryStopIndex(Number(tacticalCommand.params?.startIndex ?? 0))
        setIsDiscoveryPaused(false)
        break
      case 'DESCENSO_EDL':
        playGoogleEarthDive()
        break
      case 'ORBITA':
        playGoogleEarthAscent()
        break
      case 'BASE_LZ1':
        focusOnLandingSite()
        break
      case 'PANORAMA':
        tourColony()
        break
      case 'DATOS_NASA':
        setIsDataCenterOpen(Boolean(tacticalCommand.params?.open ?? true))
        break
      case 'FOTOS_RAW':
        setIsSurfaceIntelligenceOpen(Boolean(tacticalCommand.params?.open ?? true))
        break
      case 'LIMPIAR':
        setIsCleanViewMode(Boolean(tacticalCommand.params?.active ?? true))
        break
      case 'COMPARAR_MISIONES':
        setIsMissionComparisonOpen(Boolean(tacticalCommand.params?.open ?? true))
        break
      case 'ROUTE_VIEW_MODE': {
        const mode = tacticalCommand.params?.mode
        if (mode === 'both' || mode === 'eva' || mode === 'curiosity') {
          setRouteViewMode(mode)
        } else {
          setRouteViewMode(prev => (prev === 'both' ? 'eva' : prev === 'eva' ? 'curiosity' : 'both'))
        }
        break
      }
      case 'TOGGLE_DOCK': {
        const collapsed = tacticalCommand.params?.collapsed
        if (typeof collapsed === 'boolean') {
          setIsLeftDockCollapsed(collapsed)
        } else {
          setIsLeftDockCollapsed(prev => !prev)
        }
        break
      }
      case 'SET_DOCK_TAB': {
        const tab = tacticalCommand.params?.tab as 'layers' | 'camera' | 'colony'
        if (tab) {
          setLeftTab(tab)
          setIsLeftDockCollapsed(false)
        }
        break
      }
    }
  }, [
    tacticalCommand,
    playGoogleEarthDive,
    playGoogleEarthAscent,
    focusOnLandingSite,
    tourColony,
  ])

  // Sincronizar clases globales para evitar superposiciones de UI
  useEffect(() => {
    if (isInspectorOpen && !isDiscoveryTourActive && !isCinematicPlaying) {
      document.body.classList.add('has-right-drawer')
    } else {
      document.body.classList.remove('has-right-drawer')
    }
    return () => {
      document.body.classList.remove('has-right-drawer')
    }
  }, [isInspectorOpen, isDiscoveryTourActive, isCinematicPlaying])

  useEffect(() => {
    if (isCleanViewMode) {
      document.body.classList.add('is-clean-view')
    } else {
      document.body.classList.remove('is-clean-view')
    }
    return () => {
      document.body.classList.remove('is-clean-view')
    }
  }, [isCleanViewMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCleanViewMode) {
          setIsCleanViewMode(false)
        } else if (isDiscoveryTourActive) {
          setIsDiscoveryTourActive(false)
        } else if (isInspectorOpen) {
          closeInspector()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCleanViewMode, isDiscoveryTourActive, isInspectorOpen])

  return (
    <div className="ares-terrain-container" aria-label="Explorador 3D de Gale Crater y Mount Sharp">
      {/* Contenedor del Canvas de Three.js */}
      <div className="ares-canvas-host" ref={containerRef} />

      {/* HUD de Vuelo Cinemático Google Earth / EDL */}
      {isCinematicPlaying && (
        <div className="ares-google-earth-overlay" role="status">
          <div className="edl-reticle-bracket" aria-hidden="true" />

          <div className="edl-left-tape">
            <span className="tape-label">VELOCIDAD</span>
            <strong className="tape-value">{flightTelemetry.velocityStr}</strong>
            <span className="tape-sub">{flightTelemetry.machStr}</span>
          </div>

          <div className="edl-center-hud">
            <div className="edl-phase-tag">[MANIOBRA GOOGLE EARTH // EDL ENTRY]</div>
            <h2 className="edl-target-title">DESCENSO A BRADBURY BASE (GALE CRATER)</h2>
            <p className="edl-target-coords">4.590°S · 137.442°E // COTA: -4,520 M // ELIPSE: 7.0 × 4.5 KM</p>
            <div className="edl-phase-bar">
              <span className="phase-text">{flightTelemetry.phaseName}</span>
              <div className="phase-track">
                <div className="phase-fill" style={{ width: `${flightTelemetry.percent}%` }} />
              </div>
            </div>
            <button type="button" className="edl-skip-btn" onClick={skipCinematic}>
              [SALTEAR ANIMACIÓN]
            </button>
          </div>

          <div className="edl-right-tape">
            <span className="tape-label">ALTITUD</span>
            <strong className="tape-value">{flightTelemetry.altitudeStr}</strong>
            <span className="tape-sub">PITCH: {flightTelemetry.pitchDeg}°</span>
          </div>
        </div>
      )}

      {/* ZONA 1: HUD SUPERIOR UNIFICADO (Sin superposiciones) */}
      <header className="ares-hud-top" aria-label="Telemetría de Navegación 3D">
        <div className="hud-top-telemetry">
          <div className="top-telemetry-block">
            <span className="top-telemetry-tag">REGIÓN CANÓNICA</span>
            <strong className="top-telemetry-val">GALE CRATER · MOUNT SHARP</strong>
            <span className="top-telemetry-sub">Aeolis Mons (+5.5 km sobre el lecho)</span>
          </div>

          <div className="top-telemetry-block">
            <span className="top-telemetry-tag">DATUM AREOIDE MOLA</span>
            <strong className="top-telemetry-val">5.37°S · 137.44°E</strong>
            <span className="top-telemetry-sub">Referencia 6.1 mbar</span>
          </div>

          <div className="top-telemetry-block cursor-block">
            <span className="top-telemetry-tag">COORDENADAS BAJO CURSOR</span>
            <strong className="top-telemetry-val">
              {hoveredInfo
                ? `${hoveredInfo.lat >= 0 ? `${hoveredInfo.lat.toFixed(3)}°N` : `${Math.abs(hoveredInfo.lat).toFixed(3)}°S`} · ${hoveredInfo.lon.toFixed(3)}°E`
                : 'EXPLORACIÓN EN SUPERFICIE'}
            </strong>
            <span className="top-telemetry-sub">
              {hoveredInfo
                ? `Cota: ${hoveredInfo.elev} m · Pendiente: ${hoveredInfo.slope}° (${evaluateSlope(hoveredInfo.slope).riskLevel})`
                : 'Mover cursor para inspección'}
            </span>
          </div>
        </div>

        <div className="hud-top-actions">
          <button
            type="button"
            className="hud-btn highlight"
            onClick={() => setIsGuidedTourOpen(true)}
            title="Iniciar recorrido guiado interactivo por todas las funciones de ARES"
          >
            [GUÍA]
          </button>
          <button
            type="button"
            className="hud-btn highlight"
            onClick={() => {
              closeInspector()
              setIsCinematicPlaying(false)
              isCameraAnimatingRef.current = false
              isDiscoveryTourActiveRef.current = true
              isDiscoveryPausedRef.current = false
              currentDiscoveryStopIndexRef.current = 0
              setIsDiscoveryTourActive(true)
              setCurrentDiscoveryStopIndex(0)
              setIsDiscoveryPaused(false)
            }}
            title="Iniciar sobrevuelo cinematográfico 3D por los 7 hitos científicos de Gale Crater"
          >
            [SOBREVUELO]
          </button>
          <button
            type="button"
            className="hud-btn primary"
            onClick={playGoogleEarthDive}
            title="Iniciar descenso orbital continuo estilo Google Earth hacia LZ-1 Bradbury Base"
          >
            [DESCENSO EDL]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={playGoogleEarthAscent}
            title="Ascender a órbita espacial alta de Marte"
          >
            [ÓRBITA]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={focusOnLandingSite}
            title="Enfocar cámara en el Sitio Candidato Principal LZ-1"
          >
            [LZ-1 BASE]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={tourColony}
            title="Recorrido panorámico de la Colonia Marciana Base Alfa"
          >
            [PANORAMA]
          </button>
          <button
            type="button"
            className="hud-btn highlight"
            onClick={() => setIsDataCenterOpen(true)}
            title="Abrir el catálogo centralizado ARES Scientific Data Center (NASA/USGS/PDS)"
          >
            [DATOS NASA]
          </button>
          <button
            type="button"
            className="hud-btn primary"
            onClick={() => setIsSurfaceIntelligenceOpen(true)}
            title="Abrir galería de observaciones de superficie Curiosity y Perseverance"
          >
            [FOTOS RAW]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={onSwitchToGlobal}
            title="Cambiar al Globo 3D planetario de Marte"
          >
            [GLOBO 3D]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={onSwitchToJezero2D}
            title="Abrir mapa científico 2D de Jezero Crater"
          >
            [JEZERO 2D]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={() => setIsCleanViewMode(true)}
            title="Modo pantalla completa limpia sin paneles distractores (Esc para restaurar)"
          >
            [LIMPIAR]
          </button>
        </div>
      </header>

      {/* ZONA 2: PANEL DE CONTROL TÁCTICO IZQUIERDO (Acoplado y Colapsable) */}
      <aside className={`ares-tactical-dock ${isLeftDockCollapsed ? 'collapsed' : ''}`} aria-label="Panel Táctico">
        <div className="dock-header">
          <span className="dock-title">CONSOLA DE CONTROL TÁCTICO</span>
          <button
            type="button"
            className="dock-collapse-toggle"
            onClick={() => setIsLeftDockCollapsed(prev => !prev)}
            title={isLeftDockCollapsed ? 'Expandir panel táctico' : 'Colapsar panel táctico'}
          >
            {isLeftDockCollapsed ? '[▶]' : '[◀]'}
          </button>
        </div>

        <nav className="dock-nav-tabs">
          <button
            type="button"
            className={`dock-tab ${leftTab === 'layers' ? 'active' : ''}`}
            onClick={() => {
              setLeftTab('layers')
              setIsLeftDockCollapsed(false)
            }}
          >
            CAPAS CIENTÍFICAS
          </button>
          <button
            type="button"
            className={`dock-tab ${leftTab === 'camera' ? 'active' : ''}`}
            onClick={() => {
              setLeftTab('camera')
              setIsLeftDockCollapsed(false)
            }}
          >
            CÁMARA
          </button>
          <button
            type="button"
            className={`dock-tab ${leftTab === 'colony' ? 'active' : ''}`}
            onClick={() => {
              setLeftTab('colony')
              setIsLeftDockCollapsed(false)
            }}
          >
            BASE ALFA (3D)
          </button>
        </nav>

        <div className="dock-content">
          {leftTab === 'layers' && (
            <div className="layer-selection-list">
              <div className="layer-category-header">CARTOGRAFÍA PLANETARIA</div>
              {(['optical', 'ctx_mosaic', 'thermal'] as TerrainLayerType[]).map((key) => {
                const meta = TERRAIN_LAYERS_CATALOG[key]
                const active = activeLayer === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`layer-select-btn ${active ? 'active' : ''}`}
                    onClick={() => {
                      setActiveLayer(key)
                      lastAppliedOverrideRef.current = key
                      onLayerChange?.(key)
                    }}
                  >
                    <span className="layer-btn-title">{meta.name.split(' (')[0]}</span>
                    <span className="layer-btn-sub">{meta.instrument.split(' ')[0]} · {meta.mission.split(' ')[0]}</span>
                  </button>
                )
              })}

              <div className="layer-category-header">GEOLOGÍA Y COMPOSICIÓN</div>
              {(['geology', 'spectral'] as TerrainLayerType[]).map((key) => {
                const meta = TERRAIN_LAYERS_CATALOG[key]
                const active = activeLayer === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`layer-select-btn ${active ? 'active' : ''}`}
                    onClick={() => {
                      setActiveLayer(key)
                      lastAppliedOverrideRef.current = key
                      onLayerChange?.(key)
                    }}
                  >
                    <span className="layer-btn-title">{meta.name.split(' (')[0]}</span>
                    <span className="layer-btn-sub">{meta.instrument.split(' ')[0]} · {meta.mission.split(' ')[0]}</span>
                  </button>
                )
              })}

              <div className="layer-category-header">ANÁLISIS TOPOGRÁFICO Y RIESGO</div>
              {(['dem', 'slope', 'radiation'] as TerrainLayerType[]).map((key) => {
                const meta = TERRAIN_LAYERS_CATALOG[key]
                const active = activeLayer === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`layer-select-btn ${active ? 'active' : ''}`}
                    onClick={() => {
                      setActiveLayer(key)
                      lastAppliedOverrideRef.current = key
                      onLayerChange?.(key)
                    }}
                  >
                    <span className="layer-btn-title">{meta.name.split(' (')[0]}</span>
                    <span className="layer-btn-sub">{meta.instrument.split(' ')[0]} · {meta.mission.split(' ')[0]}</span>
                  </button>
                )
              })}

              <div className="dock-integrated-legend">
                <div className="legend-title">{TERRAIN_LAYERS_CATALOG[activeLayer].name}</div>
                {TERRAIN_LAYERS_CATALOG[activeLayer].legend.map((item, idx) => (
                  <div key={idx} className="legend-row">
                    <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="dock-action-buttons">
                <button
                  type="button"
                  className="hud-btn highlight"
                  onClick={() => setIsDataCenterOpen(true)}
                >
                  [CENTRO CIENTÍFICO ARES]
                </button>
                <button
                  type="button"
                  className="hud-btn primary"
                  onClick={() => setIsSurfaceIntelligenceOpen(true)}
                >
                  [INTELIGENCIA DE SUPERFICIE]
                </button>
                <button
                  type="button"
                  className="hud-btn secondary"
                  onClick={() => setIsMissionComparisonOpen(true)}
                >
                  [COMPARAR MISIONES]
                </button>
                <button
                  type="button"
                  className="hud-btn secondary"
                  style={{
                    borderColor: routeViewMode === 'eva' ? '#00f0ff' : routeViewMode === 'curiosity' ? '#f59e0b' : 'rgba(0, 240, 255, 0.4)',
                    color: routeViewMode === 'eva' ? '#00f0ff' : routeViewMode === 'curiosity' ? '#f59e0b' : '#ffffff',
                  }}
                  onClick={() => {
                    setRouteViewMode(prev => prev === 'both' ? 'eva' : prev === 'eva' ? 'curiosity' : 'both')
                  }}
                  title="Alternar entre la Ruta EVA planificada de astronautas y la Travesía histórica de Curiosity"
                >
                  {routeViewMode === 'both' ? '[VISTA: AMBAS RUTAS]' : routeViewMode === 'eva' ? '[VISTA: SOLO RUTA EVA]' : '[VISTA: SOLO CURIOSITY]'}
                </button>
              </div>
            </div>
          )}

          {leftTab === 'camera' && (
            <div className="camera-modes-stack">
              <button
                type="button"
                className={`cam-mode-btn ${cameraMode === 'orbit' ? 'active' : ''}`}
                onClick={() => setMode('orbit')}
              >
                <span>VISTA ÓRBITA</span>
                <small>Rotación 360° libre</small>
              </button>
              <button
                type="button"
                className={`cam-mode-btn ${cameraMode === 'pan' ? 'active' : ''}`}
                onClick={() => setMode('pan')}
              >
                <span>VISTA PAN</span>
                <small>Desplazamiento horizontal</small>
              </button>
              <button
                type="button"
                className={`cam-mode-btn ${cameraMode === 'firstPerson' ? 'active' : ''}`}
                onClick={() => setMode('firstPerson')}
              >
                <span>1ª PERSONA (EVA)</span>
                <small>Perspectiva astronauta a 1.8 m</small>
              </button>
              <button
                type="button"
                className={`cam-mode-btn ${cameraMode === 'fly' ? 'active' : ''}`}
                onClick={() => setMode('fly')}
              >
                <span>VUELO PANORÁMICO</span>
                <small>Recorrido aéreo continuo</small>
              </button>
            </div>
          )}

          {leftTab === 'colony' && (
            <div className="colony-dock-section">
              <label className="colony-visibility-toggle">
                <span>Visualizar Base Alfa 3D</span>
                <input
                  type="checkbox"
                  checked={colonyVisible}
                  onChange={(e) => setColonyVisible(e.target.checked)}
                />
              </label>

              <button
                type="button"
                className="hud-btn highlight"
                onClick={tourColony}
              >
                [INICIAR RECORRIDO BASE]
              </button>

              <div className="colony-modules-list">
                {DEFAULT_COLONY_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    className={`colony-module-pill ${selectedColonyModule?.id === mod.id ? 'active' : ''}`}
                    onClick={() => focusOnColonyModule(mod)}
                  >
                    <span className="mod-pill-name">{mod.name.split(' (')[0]}</span>
                    <span className="mod-pill-cat">{mod.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ZONA 3: DRAWER DERECHO INSPECTOR (Sin superposiciones con otros paneles) */}
      {!isCinematicPlaying && !isDiscoveryTourActive && isInspectorOpen && (
        <article className="ares-inspector-drawer" aria-label="Inspector de Objeto Seleccionado">
          <div className="drawer-header">
            <span className={`drawer-badge ${selectedColonyModule ? 'conceptual' : ''}`}>
              {selectedColonyModule
                ? '[PROPUESTA CONCEPTUAL // SIMULACIÓN]'
                : showLandingBriefing
                ? '[SITIO CANDIDATO PRINCIPAL LZ-1]'
                : selectedCuriosityWaypoint
                ? '[HERENCIA CURIOSITY // HISTÓRICO NASA]'
                : selectedObservationProfile
                ? '[PERFIL CIENTÍFICO MULTIMISIÓN]'
                : '[HITO CIENTÍFICO VERIFICADO]'}
            </span>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={closeInspector}
              aria-label="Cerrar inspector"
            >
              [CERRAR]
            </button>
          </div>

          <div className="drawer-body">
            {/* 1. Vista de Módulo de Colonia */}
            {selectedColonyModule && (
              <>
                <h3 className="drawer-title">{selectedColonyModule.name}</h3>
                <p className="drawer-sub">{selectedColonyModule.designation}</p>

                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <label>CATEGORÍA</label>
                    <span>{selectedColonyModule.category}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>CAPACIDAD TRIPULACIÓN</label>
                    <span>{selectedColonyModule.crewCapacity > 0 ? `${selectedColonyModule.crewCapacity} astronautas` : 'Autónomo / Remoto'}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>DEMANDA ENERGÉTICA</label>
                    <span>{selectedColonyModule.powerRequirementKw > 0 ? `${selectedColonyModule.powerRequirementKw} kW` : `Generación ${Math.abs(selectedColonyModule.powerRequirementKw)} kW`}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>DIMENSIONES (An x L x Al)</label>
                    <span>{selectedColonyModule.dimensions.widthMeters} × {selectedColonyModule.dimensions.lengthMeters} × {selectedColonyModule.dimensions.heightMeters} m</span>
                  </div>
                </div>

                <div className="drawer-text-block">
                  <strong>Función Operacional:</strong>
                  <p>{selectedColonyModule.functionSummary}</p>
                </div>

                <div className="drawer-text-block">
                  <strong>Descripción de Ingeniería:</strong>
                  <p>{selectedColonyModule.description}</p>
                </div>

                <div className="drawer-text-block">
                  <strong>Subsistemas Principales:</strong>
                  <ul className="subsystems-list">
                    {selectedColonyModule.subsystems.map((sub, idx) => (
                      <li key={idx}>{sub}</li>
                    ))}
                  </ul>
                </div>

                <div className="drawer-text-block">
                  <strong>Referencia Técnica:</strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.64rem' }}>{selectedColonyModule.technicalReference}</p>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="hud-btn primary"
                    onClick={() => focusOnColonyModule(selectedColonyModule)}
                  >
                    [CENTRAR CÁMARA]
                  </button>
                  {onSelectScienceStop && (
                    <button
                      type="button"
                      className="hud-btn highlight"
                      onClick={() => {
                        onSelectScienceStop(
                          [PRIMARY_LANDING_SITE.coordinates.lon, PRIMARY_LANDING_SITE.coordinates.lat],
                          `Base Alfa (${selectedColonyModule.name.split(' (')[0]})`,
                        )
                      }}
                    >
                      [FIJAR BASE A (RUTA EVA)]
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 2. Vista de Descubrimiento Científico */}
            {selectedDiscovery && (
              <>
                <h3 className="drawer-title">{selectedDiscovery.name}</h3>
                <p className="drawer-sub">{selectedDiscovery.feature}</p>

                <div className="drawer-photo-wrap">
                  <img
                    src={resolveAssetUrl(selectedDiscovery.imageUrl)}
                    alt={selectedDiscovery.name}
                    className="drawer-photo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = resolveAssetUrl('data/curiosity/bradbury-landing.jpg')
                    }}
                  />
                  <span className="drawer-photo-credit">{selectedDiscovery.imageCredit}</span>
                </div>

                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <label>MISIÓN / SOL</label>
                    <span>{selectedDiscovery.mission} · Sol {selectedDiscovery.sol}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>UNIDAD GEOLÓGICA</label>
                    <span>{selectedDiscovery.geologicalUnit}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>INSTRUMENTOS</label>
                    <span>{selectedDiscovery.instruments.join(', ')}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>VALOR CIENTÍFICO</label>
                    <span>{selectedDiscovery.details.scientificValue}</span>
                  </div>
                </div>

                <div className="drawer-text-block">
                  <strong>Relevancia Astrobiológica:</strong>
                  <p>{selectedDiscovery.significance}</p>
                </div>

                <div className="drawer-text-block">
                  <strong style={{ color: '#ff9d00' }}>Seguridad de Locomoción EVA:</strong>
                  <p>{selectedDiscovery.safetyNotes}</p>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="hud-btn primary"
                    onClick={() => focusOnDiscovery(selectedDiscovery)}
                  >
                    [CENTRAR CÁMARA]
                  </button>
                  {onSelectScienceStop && (
                    <button
                      type="button"
                      className="hud-btn highlight"
                      onClick={() => {
                        onSelectScienceStop(
                          [selectedDiscovery.coordinates.lon, selectedDiscovery.coordinates.lat],
                          selectedDiscovery.name,
                        )
                      }}
                    >
                      [FIJAR PARADA EVA P]
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 3. Vista de Sitio Candidato de Aterrizaje LZ-1 */}
            {showLandingBriefing && (
              <>
                <h3 className="drawer-title">{PRIMARY_LANDING_SITE.name}</h3>
                <p className="drawer-sub">{PRIMARY_LANDING_SITE.designation}</p>

                {PRIMARY_LANDING_SITE.imageUrl && (
                  <div className="drawer-photo-wrap">
                    <img
                      src={resolveAssetUrl(PRIMARY_LANDING_SITE.imageUrl)}
                      alt={PRIMARY_LANDING_SITE.name}
                      className="drawer-photo"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = resolveAssetUrl('data/curiosity/bradbury-landing.jpg')
                      }}
                    />
                    <span className="drawer-photo-credit">{PRIMARY_LANDING_SITE.imageCredit}</span>
                  </div>
                )}

                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <label>COORDENADAS GEODÉSICAS</label>
                    <span>4.5895°S · 137.4417°E</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>COTA AREOIDE MOLA</label>
                    <span>-4,520 m (Presión ~8.5 hPa)</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>ELIPSE DE SEGURIDAD</label>
                    <span>7.0 × 4.5 km · Azimut 78°</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>PENDIENTE MEDIA</label>
                    <span>2.1° · ÓPTIMA (&lt;15° límite)</span>
                  </div>
                </div>

                <div className="drawer-text-block">
                  <strong>Racional de Selección:</strong>
                  <p>{PRIMARY_LANDING_SITE.rationale}</p>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="hud-btn primary"
                    onClick={focusOnLandingSite}
                  >
                    [CENTRAR CÁMARA]
                  </button>
                  {onSelectScienceStop && (
                    <button
                      type="button"
                      className="hud-btn highlight"
                      onClick={() => {
                        onSelectScienceStop(
                          [PRIMARY_LANDING_SITE.coordinates.lon, PRIMARY_LANDING_SITE.coordinates.lat],
                          PRIMARY_LANDING_SITE.name,
                        )
                      }}
                    >
                      [FIJAR COMO BASE A (RUTA EVA)]
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 4. Vista de Hito de la Travesía de Curiosity (MSL Heritage) */}
            {selectedCuriosityWaypoint && (
              <>
                <h3 className="drawer-title">{selectedCuriosityWaypoint.name}</h3>
                <p className="drawer-sub">
                  Sol {selectedCuriosityWaypoint.sol} · {selectedCuriosityWaypoint.earthDate} · Odometría: {selectedCuriosityWaypoint.cumulativeDistKm} km
                </p>

                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <label>MISIÓN OFICIAL</label>
                    <span>MSL Curiosity (NASA/JPL)</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>TIPO DE OBJETIVO</label>
                    <span>{selectedCuriosityWaypoint.targetType}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>COTA AREOIDE MOLA</label>
                    <span>{selectedCuriosityWaypoint.elevationMeters} m</span>
                  </div>
                  <div className="drawer-meta-item">
                    <label>INSTRUMENTOS CLAVE</label>
                    <span>{selectedCuriosityWaypoint.instruments.join(', ')}</span>
                  </div>
                </div>

                <div className="drawer-text-block">
                  <strong style={{ color: '#f59e0b' }}>Resumen de Campaña Científica:</strong>
                  <p>{selectedCuriosityWaypoint.scienceSummary}</p>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="hud-btn primary"
                    onClick={() => {
                      const { x, z } = geoToTerrainPosition(selectedCuriosityWaypoint.lon, selectedCuriosityWaypoint.lat)
                      const elev = (getGaleElevation(selectedCuriosityWaypoint.lon, selectedCuriosityWaypoint.lat) + 4500) * ELEVATION_SCALE
                      if (controlsRef.current && cameraRef.current) {
                        controlsRef.current.target.set(x, elev + 2, z)
                        cameraRef.current.position.set(x + 12, elev + 14, z + 16)
                      }
                    }}
                  >
                    [CENTRAR CÁMARA]
                  </button>
                  {onSelectScienceStop && (
                    <button
                      type="button"
                      className="hud-btn highlight"
                      onClick={() => {
                        onSelectScienceStop(
                          [selectedCuriosityWaypoint.lon, selectedCuriosityWaypoint.lat],
                          `Curiosity Sol ${selectedCuriosityWaypoint.sol}: ${selectedCuriosityWaypoint.name.split(' (')[0]}`,
                        )
                      }}
                    >
                      [FIJAR DESTINO EVA B]
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 5. Vista de Perfil Científico Multimisión */}
            {selectedObservationProfile && (
              <>
                <h3 className="drawer-title">PERFIL CIENTÍFICO MULTIMISIÓN</h3>
                <p className="drawer-sub">
                  {Math.abs(selectedObservationProfile.targetCoordinates.lat).toFixed(4)}°S · {selectedObservationProfile.targetCoordinates.lon.toFixed(4)}°E · Cota {Math.round(selectedObservationProfile.targetCoordinates.elevationMeters)} m
                </p>

                <div className="drawer-text-block">
                  <strong style={{ color: '#00f0ff' }}>Contexto Geológico Identificado:</strong>
                  <p>{selectedObservationProfile.geologySummary}</p>
                </div>

                <div className="drawer-text-block">
                  <strong style={{ color: '#f59e0b' }}>Análisis Topográfico y de Seguridad:</strong>
                  <p>{selectedObservationProfile.terrainSummary}</p>
                </div>

                <div className="drawer-text-block">
                  <strong>Herencia de Exploración Cercana:</strong>
                  <ul className="subsystems-list">
                    {selectedObservationProfile.missionHeritageNearby.map((h, idx) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>

                <div className="drawer-text-block">
                  <strong>Datasets Oficiales con Cobertura en este Punto:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {selectedObservationProfile.availableDatasets.map((ds) => (
                      <div
                        key={ds.datasetId}
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: '0.66rem',
                        }}
                      >
                        <span style={{ color: '#00f0ff', fontWeight: 800 }}>{ds.instrument}</span>
                        <div style={{ color: '#cbd5e1' }}>{ds.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="hud-btn highlight"
                    onClick={() => setIsDataCenterOpen(true)}
                  >
                    [ABRIR CENTRO CIENTÍFICO]
                  </button>
                  {onSelectScienceStop && (
                    <button
                      type="button"
                      className="hud-btn primary"
                      onClick={() => {
                        onSelectScienceStop(
                          [selectedObservationProfile.targetCoordinates.lon, selectedObservationProfile.targetCoordinates.lat],
                          `Sector ${Math.abs(selectedObservationProfile.targetCoordinates.lat).toFixed(2)}S/${selectedObservationProfile.targetCoordinates.lon.toFixed(2)}E`,
                        )
                      }}
                    >
                      [FIJAR DESTINO EVA B]
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </article>
      )}

      {/* Panel Flotante de Trazabilidad Geodésica de Distancias */}
      {showTraceabilityModal && routeTelemetry && (
        <aside className="ares-traceability-panel" aria-label="Trazabilidad Geodésica de Distancias">
          <div className="trace-header">
            <div className="trace-title">
              <span>[TRAZABILIDAD GEODÉSICA DE DISTANCIAS]</span>
              <small style={{ color: '#94a3b8', fontSize: '0.62rem' }}>
                DATUM AREOIDE MOLA // RM = 3,389,500 M
              </small>
            </div>
            <button
              type="button"
              className="trace-close-btn"
              onClick={() => setShowTraceabilityModal(false)}
            >
              ✕
            </button>
          </div>

          <div className="trace-summary-grid">
            <div className="trace-card">
              <label>DISTANCIA HORIZONTAL</label>
              <strong>{(routeTelemetry.totalHorizontalMeters / 1000).toFixed(2)} km</strong>
              <small>Arco esférico Haversine</small>
            </div>
            <div className="trace-card">
              <label>DISTANCIA 3D (CON RELIEVE)</label>
              <strong style={{ color: '#00f0ff' }}>{(routeTelemetry.total3DMeters / 1000).toFixed(2)} km</strong>
              <small>+{routeTelemetry.topographicCorrectionPercent}% esfuerzo topográfico</small>
            </div>
            <div className="trace-card">
              <label>DESNIVEL ACUMULADO</label>
              <strong style={{ color: '#ff9d00' }}>
                +{Math.round(routeTelemetry.totalGainMeters)} m / -{Math.round(routeTelemetry.totalLossMeters)} m
              </strong>
              <small>Perfil hipsométrico MOLA</small>
            </div>
            <div className="trace-card">
              <label>LÍMITE DE RETORNO (WALKBACK)</label>
              <strong className={`walkback-badge ${walkbackAssessment.status.toLowerCase()}`}>
                {walkbackAssessment.status}
              </strong>
              <small>{walkbackAssessment.distanceKm} km / 8.0 km máx</small>
            </div>
          </div>

          <div className="trace-table-wrap">
            <table className="trace-table">
              <thead>
                <tr>
                  <th>TRAMO</th>
                  <th>DESCRIPCIÓN</th>
                  <th>DIST. HORIZ.</th>
                  <th>DIST. 3D</th>
                  <th>COTA INI / FIN</th>
                  <th>DESNIVEL Δz</th>
                  <th>PEND. MEDIA</th>
                  <th>TIEMPO MARCHA</th>
                  <th>TIEMPO ROVER</th>
                </tr>
              </thead>
              <tbody>
                {routeTelemetry.segments.map((seg, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: '#00f0ff' }}>{seg.fromId} → {seg.toId}</td>
                    <td>{seg.fromName.split(' / ')[0]} → {seg.toName.split(' / ')[0]}</td>
                    <td>{(seg.horizontalMeters / 1000).toFixed(2)} km</td>
                    <td style={{ fontWeight: 800, color: '#ffffff' }}>{(seg.distance3DMeters / 1000).toFixed(2)} km</td>
                    <td>{seg.startElevMeters}m / {seg.endElevMeters}m</td>
                    <td style={{ color: seg.deltaZMeters > 0 ? '#ff9d00' : '#10b981' }}>
                      {seg.deltaZMeters > 0 ? `+${seg.deltaZMeters}m` : `${seg.deltaZMeters}m`}
                    </td>
                    <td>{seg.avgSlopeDeg}°</td>
                    <td>{seg.estWalkHours} h (3.6 km/h)</td>
                    <td>{seg.estRoverHours} h (12 km/h)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="trace-footnote">
            <strong>Metodología de Validación:</strong> Distancias calculadas sobre la esfera marciana utilizando el radio medio canónico R_M = 3,389,500 m. La distancia tridimensional integra la componente vertical euclidiana sobre la malla de elevación hipsométrica de Gale Crater. No apto para navegación humana en vuelo real; uso exploratorio y educativo.
          </p>
        </aside>
      )}

      {/* ZONA 4: HUD INFERIOR TELEMETRÍA & WAYPOINTS */}
      <footer className={`ares-hud-bottom ${isInspectorOpen ? 'has-inspector-open' : ''}`} aria-label="Monitoreo de Caminata EVA">
        <div className="hud-bottom-eva">
          <div className="eva-distance-block">
            <span className="eva-distance-label">DISTANCIA DE RUTA EVA (3D)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong className="eva-distance-val">
                {totalRouteMeters > 0 ? `${(totalRouteMeters / 1000).toFixed(2)} km` : '0.00 km (Sin trazar)'}
              </strong>
              {routeTelemetry && (
                <button
                  type="button"
                  className="traceability-pill-btn"
                  onClick={() => setShowTraceabilityModal(!showTraceabilityModal)}
                  title="Abrir panel de trazabilidad geodésica de distancias"
                >
                  {showTraceabilityModal ? '[CERRAR TRAZABILIDAD]' : '[VER TRAZABILIDAD]'}
                </button>
              )}
            </div>
          </div>

          <div className="hud-walkback-gauge">
            <div className="walkback-labels">
              <span className={`walkback-badge ${walkbackAssessment.status.toLowerCase()}`}>
                {walkbackAssessment.label}
              </span>
              <span>{walkbackAssessment.distanceKm} km / 8.0 km máx</span>
            </div>
            <div className="walkback-track">
              <div
                className={`walkback-fill ${walkbackAssessment.status.toLowerCase()}`}
                style={{ width: `${walkbackAssessment.percentOfMax}%` }}
              />
            </div>
          </div>
        </div>

        {/* Carrusel Horizontal de Waypoints / Hitos */}
        <div className="hud-waypoints-carousel" aria-label="Hitos de Navegación">
          <button
            type="button"
            className={`waypoint-chip lz-chip ${showLandingBriefing ? 'active' : ''}`}
            onClick={focusOnLandingSite}
          >
            [BASE LZ-1 BRADBURY]
          </button>
          <button
            type="button"
            className="waypoint-chip"
            style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b' }}
            onClick={() => setIsMissionComparisonOpen(true)}
            title="Comparar travesía de 32 km de Curiosity con ruta EVA planificada"
          >
            [COMPARAR CON CURIOSITY]
          </button>
          <button
            type="button"
            className="waypoint-chip"
            style={{
              borderColor: routeViewMode === 'eva' ? '#00f0ff' : routeViewMode === 'curiosity' ? '#f59e0b' : 'rgba(0, 240, 255, 0.5)',
              color: routeViewMode === 'eva' ? '#00f0ff' : routeViewMode === 'curiosity' ? '#f59e0b' : '#ffffff',
            }}
            onClick={() => {
              setRouteViewMode(prev => prev === 'both' ? 'eva' : prev === 'eva' ? 'curiosity' : 'both')
            }}
            title="Alternar entre la Ruta EVA de astronautas y la Travesía histórica de Curiosity"
          >
            {routeViewMode === 'both' ? '[VISTA: AMBAS RUTAS]' : routeViewMode === 'eva' ? '[VISTA: SOLO RUTA EVA]' : '[VISTA: SOLO CURIOSITY]'}
          </button>
          {GALE_DISCOVERIES.map((disc) => (
            <button
              key={disc.id}
              type="button"
              className={`waypoint-chip ${selectedDiscovery?.id === disc.id ? 'active' : ''}`}
              onClick={() => focusOnDiscovery(disc)}
            >
              [SOL {disc.sol}: {disc.name.split(' · ')[0].toUpperCase()}]
            </button>
          ))}
        </div>
      </footer>

      {/* Modales Científicos y de Inteligencia Multimisión */}
      <AresScientificDataCenterModal
        isOpen={isDataCenterOpen}
        onClose={() => { setIsDataCenterOpen(false); onDataCenterClose?.() }}
      />

      <MarsSurfaceIntelligenceModal
        isOpen={isSurfaceIntelligenceOpen}
        onClose={() => setIsSurfaceIntelligenceOpen(false)}
        onFocusCoordinates={(coords) => {
          const { x, z } = geoToTerrainPosition(coords.lon, coords.lat)
          const elev = (getGaleElevation(coords.lon, coords.lat) + 4500) * ELEVATION_SCALE
          if (controlsRef.current && cameraRef.current) {
            controlsRef.current.target.set(x, elev + 2, z)
            cameraRef.current.position.set(x + 15, elev + 16, z + 20)
          }
        }}
      />

      <MissionPathComparisonModal
        isOpen={isMissionComparisonOpen}
        onClose={() => { setIsMissionComparisonOpen(false); onComparisonClose?.() }}
        evaDistanceKm={totalRouteMeters / 1000}
        evaHours={routeTelemetry ? routeTelemetry.segments.reduce((acc, s) => acc + s.estWalkHours, 0) : 0}
      />

      {/* Recorrido Guiado Interactivo ARES (Onboarding) */}
      <AresGuidedTour
        isOpen={isGuidedTourOpen}
        onClose={() => setIsGuidedTourOpen(false)}
        onComplete={() => setIsGuidedTourOpen(false)}
      />

      {/* Sobrevuelo Científico 3D Cinemático por Gale Crater */}
      {isDiscoveryTourActive && (
        <MissionDiscoveryTourOverlay
          currentStopIndex={currentDiscoveryStopIndex}
          totalStops={MISSION_DISCOVERY_STOPS.length}
          currentStop={MISSION_DISCOVERY_STOPS[currentDiscoveryStopIndex]}
          isPaused={isDiscoveryPaused}
          onNext={() => {
            if (currentDiscoveryStopIndex < MISSION_DISCOVERY_STOPS.length - 1) {
              setCurrentDiscoveryStopIndex(prev => prev + 1)
            } else {
              setIsDiscoveryTourActive(false)
            }
          }}
          onPrev={() => {
            if (currentDiscoveryStopIndex > 0) {
              setCurrentDiscoveryStopIndex(prev => prev - 1)
            }
          }}
          onTogglePause={() => setIsDiscoveryPaused(prev => !prev)}
          onExit={() => setIsDiscoveryTourActive(false)}
          onJumpToStop={(idx) => setCurrentDiscoveryStopIndex(idx)}
        />
      )}

      {/* Botón flotante para restaurar interfaz desde el modo pantalla limpia */}
      {isCleanViewMode && (
        <button
          type="button"
          className="ares-clean-view-exit"
          onClick={() => setIsCleanViewMode(false)}
          title="Restaurar todos los paneles tácticos (Esc)"
        >
          [RESTAURAR PANELES HUD]
        </button>
      )}
    </div>
  )
}
