import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  AmbientLight,
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
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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
  REAL_GALE_TEXTURE_URL,
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
import { marsDistance, type MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'

export type CameraViewMode = 'orbit' | 'pan' | 'firstPerson' | 'fly'

interface MarsTerrain3DProps {
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
  onSelectScienceStop?: (point: MarsPoint, name: string) => void
  onSwitchToGlobal?: () => void
  onSwitchToJezero2D?: () => void
  initialDive?: boolean
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
  minLon: 137.20,
  maxLon: 138.00,
  minLat: -5.45,
  maxLat: -4.50,
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
}: MarsTerrain3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeLayer, setActiveLayer] = useState<TerrainLayerType>('optical')
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('orbit')
  const [leftTab, setLeftTab] = useState<'layers' | 'camera' | 'colony'>('layers')
  const [isLeftDockCollapsed, setIsLeftDockCollapsed] = useState(false)
  const [colonyVisible, setColonyVisible] = useState(true)

  // Estados exclusivos del inspector derecho (solo uno activo a la vez para evitar superposiciones)
  const [selectedDiscovery, setSelectedDiscovery] = useState<ScientificDiscovery | null>(null)
  const [selectedColonyModule, setSelectedColonyModule] = useState<HabitatModuleConfig | null>(null)
  const [showLandingBriefing, setShowLandingBriefing] = useState(false)

  const [hoveredInfo, setHoveredInfo] = useState<{ lon: number; lat: number; elev: number; slope: number } | null>(null)
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false)
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
  const beaconsGroupRef = useRef<Group | null>(null)
  const landingGroupRef = useRef<Group | null>(null)
  const landingRingsRef = useRef<Group | null>(null)
  const colonyGroupRef = useRef<Group | null>(null)
  const realOrbitalTexRef = useRef<Texture | null>(null)
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
      total += marsDistance(routePointsList[i - 1].point, routePointsList[i].point)
    }
    return total
  }, [routePointsList])

  const walkbackAssessment = useMemo(() => {
    return evaluateWalkbackLimit(totalRouteMeters)
  }, [totalRouteMeters])

  // Carga asíncrona de la fotografía satelital real de NASA MRO/HRSC
  useEffect(() => {
    const loader = new TextureLoader()
    loader.load(
      REAL_GALE_TEXTURE_URL,
      (tex) => {
        tex.colorSpace = SRGBColorSpace
        realOrbitalTexRef.current = tex
        if (activeLayer === 'optical' && terrainMeshRef.current) {
          const mat = terrainMeshRef.current.material as MeshStandardMaterial
          mat.map = tex
          mat.needsUpdate = true
        }
      },
      undefined,
      (err) => {
        console.warn('Textura satelital real cargando con fallback:', err)
      }
    )
  }, [activeLayer])

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

    // 3. Renderizador WebGL2 con PBR e iluminación lineal
    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    rendererRef.current = renderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = SRGBColorSpace
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

    // 6. Iluminación Solar y Difusa
    const ambientLight = new AmbientLight(0xffeedd, 0.65)
    scene.add(ambientLight)

    const sunLight = new DirectionalLight(0xfff5ea, 2.4)
    sunLight.position.set(140, 220, 100)
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
    terrainMeshRef.current = terrainMesh
    scene.add(terrainMesh)

    // 8. Balizas Científicas de Descubrimientos de Curiosity
    const beaconsGroup = new Group()
    beaconsGroupRef.current = beaconsGroup
    scene.add(beaconsGroup)

    GALE_DISCOVERIES.forEach((disc) => {
      const { x, z } = geoToTerrainPosition(disc.coordinates.lon, disc.coordinates.lat)
      const y = (disc.elevationMeters + 4500) * ELEVATION_SCALE + 0.5

      const pinGroup = new Group()
      pinGroup.position.set(x, y, z)
      pinGroup.name = `discovery-${disc.id}`

      const stemGeo = new CylinderGeometry(0.3, 0.3, 4.5, 12)
      stemGeo.translate(0, 2.25, 0)
      const stemMat = new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
      const stem = new Mesh(stemGeo, stemMat)
      pinGroup.add(stem)

      const ringGeo = new RingGeometry(1.2, 1.8, 24)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 })
      const ring = new Mesh(ringGeo, ringMat)
      pinGroup.add(ring)

      const headGeo = new CylinderGeometry(1.3, 0, 1.8, 6)
      headGeo.translate(0, 5, 0)
      const headMat = new MeshBasicMaterial({ color: 0xffffff })
      const head = new Mesh(headGeo, headMat)
      pinGroup.add(head)

      beaconsGroup.add(pinGroup)
    })

    // 9. Baliza y Elipse de Seguridad del Sitio Candidato Principal LZ-1 (Bradbury Base)
    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const landingGroup = new Group()
    landingGroup.position.set(landingX, landingY, landingZ)
    landingGroup.name = `landing-${PRIMARY_LANDING_SITE.id}`
    landingGroupRef.current = landingGroup
    scene.add(landingGroup)

    // Haz láser vertical de aproximación atmosférica
    const laserCylinderGeo = new CylinderGeometry(0.8, 3.2, 380, 16, 1, true)
    laserCylinderGeo.translate(0, 190, 0)
    const laserCylinderMat = new MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: DoubleSide,
    })
    landingGroup.add(new Mesh(laserCylinderGeo, laserCylinderMat))

    const laserCoreGeo = new CylinderGeometry(0.2, 0.2, 380, 8, 1, true)
    laserCoreGeo.translate(0, 190, 0)
    const laserCoreMat = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
    landingGroup.add(new Mesh(laserCoreGeo, laserCoreMat))

    // Anillos concéntricos de touchdown
    const landingRings = new Group()
    landingRingsRef.current = landingRings
    landingGroup.add(landingRings)

    const ringInnerGeo = new RingGeometry(1.6, 2.5, 32)
    ringInnerGeo.rotateX(-Math.PI / 2)
    const ringInner = new Mesh(ringInnerGeo, new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9, side: DoubleSide }))
    ringInner.position.y = 0.25
    landingRings.add(ringInner)

    const ringOuterGeo = new RingGeometry(4.2, 5.0, 32)
    ringOuterGeo.rotateX(-Math.PI / 2)
    const ringOuter = new Mesh(ringOuterGeo, new MeshBasicMaterial({ color: 0xff9d00, transparent: true, opacity: 0.8, side: DoubleSide }))
    ringOuter.position.y = 0.22
    landingRings.add(ringOuter)

    // Elipse de seguridad NASA (7.0 x 4.5 km, azimut 78°)
    const ellipseCurve = new EllipseCurve(0, 0, 20.65, 13.28, 0, 2 * Math.PI, false, (78 * Math.PI) / 180)
    const ellipsePoints3D = ellipseCurve.getPoints(64).map(p => new Vector3(p.x, 0.35, p.y))
    const ellipseGeo = new BufferGeometry().setFromPoints(ellipsePoints3D)
    const ellipseMat = new LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
    landingGroup.add(new LineLoop(ellipseGeo, ellipseMat))

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

    // 12. Raycasting para Inspección Interactiva
    const raycaster = new Raycaster()
    const mouse = new Vector2()

    const onPointerMove = (e: MouseEvent) => {
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
          return
        }
      }

      // Clic en balizas científicas de Curiosity
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
        }
      }
    }

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
        const pulse = Math.sin(clockTime * 3 + index * 1.5) * 0.15 + 1
        beacon.scale.set(pulse, 1, pulse)
      })

      if (landingRingsRef.current) {
        const pulse = Math.sin(clockTime * 3.5) * 0.12 + 1
        landingRingsRef.current.scale.set(pulse, 1, pulse)
      }

      const currentMode = cameraModeRef.current

      if (currentMode === 'fly') {
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

    if (activeLayer === 'optical') {
      if (realOrbitalTexRef.current) {
        mat.map = realOrbitalTexRef.current
        mat.needsUpdate = true
      } else {
        const fallback = generateTerrainTexture('optical', REGION_BOUNDS, 512)
        mat.map = fallback
        mat.needsUpdate = true
      }
    } else {
      const dataTex = generateTerrainTexture(activeLayer, REGION_BOUNDS, 1024)
      mat.map = dataTex
      mat.needsUpdate = true
    }
  }, [activeLayer])

  // Actualización de ruta 3D
  useEffect(() => {
    if (!routeGroupRef.current) return
    const group = routeGroupRef.current
    while (group.children.length > 0) {
      const child = group.children[0] as Mesh
      if (child.geometry) child.geometry.dispose()
      group.remove(child)
    }

    if (routePointsList.length < 2) return

    const sampled3DPoints: Vector3[] = []
    for (let i = 0; i < routePointsList.length - 1; i++) {
      const p1 = routePointsList[i].point
      const p2 = routePointsList[i + 1].point
      const steps = 14

      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lon = p1[0] + t * (p2[0] - p1[0])
        const lat = p1[1] + t * (p2[1] - p1[1])
        const { x, z } = geoToTerrainPosition(lon, lat)
        const elev = getGaleElevation(lon, lat)
        const y = (elev + 4500) * ELEVATION_SCALE + 0.4
        sampled3DPoints.push(new Vector3(x, y, z))
      }
    }

    if (sampled3DPoints.length >= 2) {
      const curve = new CatmullRomCurve3(sampled3DPoints)
      const tubeGeo = new TubeGeometry(curve, sampled3DPoints.length * 2, 0.45, 8, false)
      const tubeMat = new MeshBasicMaterial({
        color: walkbackAssessment.status === 'CRÍTICO' ? 0xef4444 : 0x00f0ff,
        transparent: true,
        opacity: 0.9,
      })
      const routeMesh = new Mesh(tubeGeo, tubeMat)
      group.add(routeMesh)
    }

    routePointsList.forEach((stop) => {
      const { x, z } = geoToTerrainPosition(stop.point[0], stop.point[1])
      const elev = getGaleElevation(stop.point[0], stop.point[1])
      const y = (elev + 4500) * ELEVATION_SCALE

      const markerGeo = new CylinderGeometry(0.8, 0.8, 3, 16)
      markerGeo.translate(0, 1.5, 0)
      const color = stop.id === 'A' ? 0x10b981 : stop.id === 'P' ? 0xf59e0b : 0xef4444
      const markerMat = new MeshBasicMaterial({ color })
      const markerMesh = new Mesh(markerGeo, markerMat)
      markerMesh.position.set(x, y, z)
      group.add(markerMesh)
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

  // Foco en descubrimiento científico
  const focusOnDiscovery = useCallback((disc: ScientificDiscovery) => {
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
  }, [])

  // Foco en el Sitio Candidato Principal LZ-1
  const focusOnLandingSite = useCallback(() => {
    setSelectedDiscovery(null)
    setSelectedColonyModule(null)
    setShowLandingBriefing(true)

    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const target = new Vector3(landingX, landingY + 1.2, landingZ)
    const eye = new Vector3(landingX - 18, landingY + 8.5, landingZ + 22)

    controls.enabled = false
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    const durationMs = 1200
    const start = performance.now()

    const anim = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const ease = 1 - Math.pow(1 - t, 3)

      camera.position.lerpVectors(startPos, eye, ease)
      const curTarget = new Vector3().lerpVectors(startTarget, target, ease)
      camera.lookAt(curTarget)

      if (t < 1) {
        requestAnimationFrame(anim)
      } else {
        controls.enabled = true
        controls.target.copy(target)
        controls.update()
      }
    }

    requestAnimationFrame(anim)
  }, [])

  // Foco en módulo específico de la colonia
  const focusOnColonyModule = useCallback((mod: HabitatModuleConfig) => {
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
    setColonyVisible(true)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    controls.enabled = false
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
      camera.lookAt(landingX, landingY + 1.5, landingZ)

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        controls.enabled = true
        controls.target.set(landingX, landingY + 1.5, landingZ)
        controls.update()
      }
    }

    requestAnimationFrame(step)
  }, [])

  // Secuencia de Descenso Continuo Google Earth (Orbital Dive) con foco estricto en LZ-1
  const playGoogleEarthDive = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    setIsCinematicPlaying(true)
    controls.enabled = false

    const { x: landingX, z: landingZ } = geoToTerrainPosition(
      PRIMARY_LANDING_SITE.coordinates.lon,
      PRIMARY_LANDING_SITE.coordinates.lat
    )
    const landingY = (PRIMARY_LANDING_SITE.elevationMeters + 4500) * ELEVATION_SCALE

    const spacePos = new Vector3(landingX + 24, landingY + 450, landingZ + 180)
    const targetLanding = new Vector3(landingX, landingY, landingZ)
    camera.position.copy(spacePos)
    camera.lookAt(targetLanding)

    const endPos = new Vector3(landingX - 18, landingY + 8.5, landingZ + 22)
    const endTarget = new Vector3(landingX, landingY + 1.2, landingZ)

    let isStopped = false
    stopDiveAnimRef.current = () => {
      isStopped = true
      setIsCinematicPlaying(false)
      camera.position.copy(endPos)
      camera.lookAt(endTarget)
      controls.enabled = true
      controls.target.copy(endTarget)
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
        setIsCinematicPlaying(false)
        controls.enabled = true
        controls.target.copy(endTarget)
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

    controls.enabled = false
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

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        controls.enabled = true
        controls.target.copy(targetCenter)
        controls.update()
      }
    }

    requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    if (initialDive) {
      const timer = setTimeout(() => {
        playGoogleEarthDive()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [initialDive, playGoogleEarthDive])

  const skipCinematic = useCallback(() => {
    if (stopDiveAnimRef.current) {
      stopDiveAnimRef.current()
    }
  }, [])

  const closeInspector = () => {
    setSelectedDiscovery(null)
    setSelectedColonyModule(null)
    setShowLandingBriefing(false)
  }

  const isInspectorOpen = Boolean(selectedDiscovery || selectedColonyModule || showLandingBriefing)

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

          {hoveredInfo && (
            <div className="top-telemetry-block cursor-block">
              <span className="top-telemetry-tag">COORDENADAS BAJO CURSOR</span>
              <strong className="top-telemetry-val">
                {hoveredInfo.lat >= 0 ? `${hoveredInfo.lat.toFixed(3)}°N` : `${Math.abs(hoveredInfo.lat).toFixed(3)}°S`} · {hoveredInfo.lon.toFixed(3)}°E
              </strong>
              <span className="top-telemetry-sub">
                Cota: {hoveredInfo.elev} m · Pendiente: {hoveredInfo.slope}° ({evaluateSlope(hoveredInfo.slope).riskLevel})
              </span>
            </div>
          )}
        </div>

        <div className="hud-top-actions">
          <button
            type="button"
            className="hud-btn primary"
            onClick={playGoogleEarthDive}
            title="Iniciar descenso orbital continuo estilo Google Earth hacia LZ-1 Bradbury Base"
          >
            [DESCENSO CONTINUO]
          </button>
          <button
            type="button"
            className="hud-btn highlight"
            onClick={focusOnLandingSite}
            title="Enfocar cámara en el Sitio Candidato Principal LZ-1"
          >
            [FOCO LZ-1 BASE]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={tourColony}
            title="Recorrido panorámico de la Colonia Marciana Base Alfa"
          >
            [RECORRIDO BASE]
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={playGoogleEarthAscent}
            title="Ascender a órbita espacial alta"
          >
            [ASCENSO ORBITAL]
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
            [MAPA 2D JEZERO]
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
              {(Object.keys(TERRAIN_LAYERS_CATALOG) as TerrainLayerType[]).map((key) => {
                const meta = TERRAIN_LAYERS_CATALOG[key]
                const active = activeLayer === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`layer-select-btn ${active ? 'active' : ''}`}
                    onClick={() => setActiveLayer(key)}
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
      {isInspectorOpen && (
        <article className="ares-inspector-drawer" aria-label="Inspector de Objeto Seleccionado">
          <div className="drawer-header">
            <span className={`drawer-badge ${selectedColonyModule ? 'conceptual' : ''}`}>
              {selectedColonyModule
                ? '[PROPUESTA CONCEPTUAL // SIMULACIÓN]'
                : showLandingBriefing
                ? '[SITIO CANDIDATO PRINCIPAL LZ-1]'
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
                    src={selectedDiscovery.imageUrl}
                    alt={selectedDiscovery.name}
                    className="drawer-photo"
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
                      src={PRIMARY_LANDING_SITE.imageUrl}
                      alt={PRIMARY_LANDING_SITE.name}
                      className="drawer-photo"
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
          </div>
        </article>
      )}

      {/* ZONA 4: HUD INFERIOR TELEMETRÍA & WAYPOINTS */}
      <footer className="ares-hud-bottom" aria-label="Monitoreo de Caminata EVA">
        <div className="hud-bottom-eva">
          <div className="eva-distance-block">
            <span className="eva-distance-label">DISTANCIA DE RUTA EVA (3D)</span>
            <strong className="eva-distance-val">
              {totalRouteMeters > 0 ? `${(totalRouteMeters / 1000).toFixed(2)} km` : '0.00 km (Sin trazar)'}
            </strong>
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
    </div>
  )
}
