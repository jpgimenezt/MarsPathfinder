import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  AmbientLight,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  GALE_DISCOVERIES,
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
  TERRAIN_LAYERS_CATALOG,
  type TerrainLayerType,
} from '../features/terrain/terrainShaderUtils'
import { marsDistance, type MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'

export type CameraViewMode = 'orbit' | 'pan' | 'zoom' | 'firstPerson' | 'fly' | 'routeFollow'

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
const VERTEX_SUBDIVISIONS = 160 // Mayor densidad de vértices para relieve nítido
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
  const [selectedDiscovery, setSelectedDiscovery] = useState<ScientificDiscovery | null>(null)
  const [hoveredInfo, setHoveredInfo] = useState<{ lon: number; lat: number; elev: number; slope: number } | null>(null)
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false)
  const [flightTelemetry, setFlightTelemetry] = useState<EdlFlightTelemetry>({
    altitudeStr: '24,500 km',
    velocityStr: '21,400 km/h',
    machStr: 'MACH 24.2',
    pitchDeg: -88,
    phaseName: 'ÓRBITA PLANETARIA // ALINEACIÓN DE ENTRADA',
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

  // Inicialización de la escena Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    const scene = new Scene()
    sceneRef.current = scene
    scene.background = new Color(0x06070a)
    scene.fog = new FogExp2(0xb56338, 0.0028)

    // Cúpula celeste atmosférica marciana con estrellas y dispersión Mie
    const skyDome = createMartianSkyDome(850)
    scene.add(skyDome)

    const camera = new PerspectiveCamera(42, width / height, 0.5, 1600)
    cameraRef.current = camera
    // Posición inicial: perspectiva cinematográfica amplia hacia Mount Sharp
    camera.position.set(-55, 78, 125)
    camera.lookAt(18, 14, -18)

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      return
    }
    rendererRef.current = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = SRGBColorSpace
    container.replaceChildren(renderer.domElement)

    // Iluminación solar marciana realista
    const ambientLight = new AmbientLight(0xd47748, 1.25)
    scene.add(ambientLight)

    const sunLight = new DirectionalLight(0xfffaec, 2.7)
    sunLight.position.set(-110, 160, 85)
    scene.add(sunLight)

    // Controles orbitales con amortiguación suave tipo Google Earth
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.065
    controls.maxPolarAngle = Math.PI / 2 - 0.03
    controls.minDistance = 4
    controls.maxDistance = 580
    controls.target.set(12, 10, -12)

    // Malla de Terreno Georreferenciada de Gale Crater
    const terrainGeo = new PlaneGeometry(
      TERRAIN_WIDTH,
      TERRAIN_HEIGHT,
      VERTEX_SUBDIVISIONS,
      VERTEX_SUBDIVISIONS,
    )
    terrainGeo.rotateX(-Math.PI / 2)

    const posAttr = terrainGeo.attributes.position as Float32BufferAttribute
    const count = posAttr.count

    // Desplazar vértices con elevaciones numéricas de MOLA/HRSC
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i)
      const z = posAttr.getZ(i)

      const u = (x / TERRAIN_WIDTH) + 0.5
      const v = (z / TERRAIN_HEIGHT) + 0.5

      const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
      const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)

      const elevation = getGaleElevation(lon, lat)
      const y = (elevation + 4500) * ELEVATION_SCALE
      posAttr.setY(i, y)
    }

    terrainGeo.computeVertexNormals()

    // Textura difusa fotorrealista y Bump Map de micro-rugosidad
    const initialTex = generateTerrainTexture('optical', REGION_BOUNDS, 1024)
    const initialBump = generateTerrainBumpMap(REGION_BOUNDS, 512)

    const terrainMat = new MeshStandardMaterial({
      map: initialTex,
      bumpMap: initialBump,
      bumpScale: 0.85,
      roughness: 0.88,
      metalness: 0.06,
      flatShading: false,
    })

    const terrainMesh = new Mesh(terrainGeo, terrainMat)
    terrainMeshRef.current = terrainMesh
    scene.add(terrainMesh)

    // Balizas científicas de Curiosity
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

    // Grupo para la ruta EVA 3D
    const routeGroup = new Group()
    routeGroupRef.current = routeGroup
    scene.add(routeGroup)

    // Raycasting para inspección interactiva
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
      initialTex.dispose()
      initialBump.dispose()
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

  // Regeneración de textura al cambiar capa científica
  useEffect(() => {
    if (!terrainMeshRef.current) return
    const mesh = terrainMeshRef.current
    const mat = mesh.material as MeshStandardMaterial
    const oldMap = mat.map
    const newTex = generateTerrainTexture(activeLayer, REGION_BOUNDS, 1024)
    mat.map = newTex
    mat.needsUpdate = true
    if (oldMap) oldMap.dispose()
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
      const { x, z } = geoToTerrainPosition(137.404, -4.652) // Cerca de Pontours
      const elev = getGaleElevation(137.404, -4.652)
      const eyeY = (elev + 4500) * ELEVATION_SCALE + 1.8 * ELEVATION_SCALE * 10
      camera.position.set(x, eyeY + 1.2, z + 6)
      camera.lookAt(x + 10, eyeY + 3.5, z - 25)
    } else if (mode === 'fly') {
      controls.enabled = false
    }
  }, [])

  // Enfocar objetivo científico con animación suave
  const focusOnDiscovery = useCallback((disc: ScientificDiscovery) => {
    setSelectedDiscovery(disc)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const { x, z } = geoToTerrainPosition(disc.coordinates.lon, disc.coordinates.lat)
    const y = (disc.elevationMeters + 4500) * ELEVATION_SCALE

    controls.target.set(x, y, z)
    camera.position.set(x - 20, y + 22, z + 28)
    camera.lookAt(x, y, z)
    controls.update()
  }, [])

  // Secuencia de Descenso Continuo Google Earth (Orbital Dive)
  const playGoogleEarthDive = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    setIsCinematicPlaying(true)
    controls.enabled = false

    // Posición inicial: Órbita espacial alta (24,500 km virtuales), mirando perpendicularmente al cráter
    const spacePos = new Vector3(0, 480, 240)
    const targetNadir = new Vector3(10, 0, -10)
    camera.position.copy(spacePos)
    camera.lookAt(targetNadir)

    const endPos = new Vector3(-45, 26, 52)
    const endTarget = new Vector3(15, 30, -30)

    let isStopped = false
    stopDiveAnimRef.current = () => {
      isStopped = true
      setIsCinematicPlaying(false)
      camera.position.copy(endPos)
      camera.lookAt(endTarget)
      controls.enabled = true
      controls.target.copy(endTarget)
      controls.update()
    }

    const durationMs = 5200
    const start = performance.now()

    const step = (now: number) => {
      if (isStopped) return
      const elapsed = now - start
      const rawT = Math.min(1, elapsed / durationMs)
      // Easing quintic súper suave estilo Google Earth
      const ease = 1 - Math.pow(1 - rawT, 4)

      // Interpolación de posición de cámara con arco de descenso atmosférico
      const currentPos = new Vector3()
      currentPos.lerpVectors(spacePos, endPos, ease)
      // Ligera parábola orográfica
      currentPos.y += Math.sin(rawT * Math.PI) * 18
      camera.position.copy(currentPos)

      // Interpolación de orientación (de nadir 90° a rasante hacia Mount Sharp)
      const currentTarget = new Vector3()
      currentTarget.lerpVectors(targetNadir, endTarget, ease)
      camera.lookAt(currentTarget)

      // Actualizar telemetría EDL de vuelo en tiempo real
      const altKm = Math.round(24500 * (1 - ease) + 0.14)
      const altStr = altKm > 100 ? `${altKm.toLocaleString()} km` : `${(altKm * 1000).toLocaleString()} m`
      const velMach = Math.max(0, 24.2 * (1 - ease)).toFixed(1)
      const velKmh = Math.round(21400 * (1 - ease) + 80)
      const pitch = Math.round(-88 + ease * 66)

      let phase = 'ÓRBITA PLANETARIA // ALINEACIÓN DE ENTRADA'
      if (rawT > 0.25 && rawT <= 0.50) phase = 'INTERFAZ ATMOSFÉRICA // FRENO HIPERSÓNICO (EI-125)'
      else if (rawT > 0.50 && rawT <= 0.75) phase = 'CORREDOR DE ENTRADA // RADAR RELATIVO AL TERRENO (TRN)'
      else if (rawT > 0.75 && rawT <= 0.95) phase = 'APROXIMACIÓN TERMINAL // APERTURA DE RETÍCULA'
      else if (rawT > 0.95) phase = 'SUPERFICIE CONTACTADA // MODO EXPLORACIÓN EVA ACTIVO'

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
      }
    }

    requestAnimationFrame(step)
  }, [])

  // Secuencia de Ascenso a Órbita (Zoom Google Earth hacia el Espacio)
  const playGoogleEarthAscent = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    controls.enabled = false
    const startPos = camera.position.clone()
    const targetSpace = new Vector3(0, 480, 240)
    const targetCenter = new Vector3(10, 0, -10)

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

  return (
    <div className="ares-terrain-container" aria-label="Explorador 3D de Gale Crater y Mount Sharp">
      {/* Contenedor del Canvas de Three.js */}
      <div className="ares-canvas-host" ref={containerRef} />

      {/* HUD de Vuelo Cinemático Google Earth / EDL */}
      {isCinematicPlaying && (
        <div className="ares-google-earth-overlay" role="status">
          <div className="edl-reticle-bracket" aria-hidden="true" />

          {/* Cinta de Velocidad (Izquierda) */}
          <div className="edl-left-tape">
            <span className="tape-label">VELOCIDAD</span>
            <strong className="tape-value">{flightTelemetry.velocityStr}</strong>
            <span className="tape-sub">{flightTelemetry.machStr}</span>
          </div>

          {/* Panel Central EDL */}
          <div className="edl-center-hud">
            <div className="edl-phase-tag">[MANIOBRA GOOGLE EARTH // EDL ENTRY]</div>
            <h2 className="edl-target-title">DESCENSO A GALE CRATER & MOUNT SHARP</h2>
            <p className="edl-target-coords">5.37°S · 137.44°E // AREOIDE MOLA 6.1 MBAR</p>
            <div className="edl-phase-bar">
              <span className="phase-text">{flightTelemetry.phaseName}</span>
              <div className="phase-track">
                <div className="phase-fill" style={{ width: `${flightTelemetry.percent}%` }} />
              </div>
            </div>
            <button type="button" className="edl-skip-btn" onClick={skipCinematic}>
              SALTEAR ANIMACIÓN ⏭
            </button>
          </div>

          {/* Cinta de Altitud (Derecha) */}
          <div className="edl-right-tape">
            <span className="tape-label">ALTITUD</span>
            <strong className="tape-value">{flightTelemetry.altitudeStr}</strong>
            <span className="tape-sub">PITCH: {flightTelemetry.pitchDeg}°</span>
          </div>
        </div>
      )}

      {/* Barra de Telemetría Superior */}
      <header className="ares-stage-telemetry" aria-label="Telemetría de Navegación 3D">
        <div className="stage-telemetry-item">
          <span className="telemetry-label">REGIÓN PRINCIPAL</span>
          <strong className="telemetry-val">GALE CRATER · MOUNT SHARP</strong>
          <span className="telemetry-sub">Aeolis Mons (+5.5 km sobre el lecho)</span>
        </div>

        <div className="stage-telemetry-item">
          <span className="telemetry-label">COORDENADAS DE CENTRO</span>
          <strong className="telemetry-val">5.37°S · 137.44°E</strong>
          <span className="telemetry-sub">Datum Areoide MOLA</span>
        </div>

        {hoveredInfo && (
          <div className="stage-telemetry-item highlight">
            <span className="telemetry-label">CURSOR EN SUPERFICIE</span>
            <strong className="telemetry-val">
              {hoveredInfo.lat >= 0 ? `${hoveredInfo.lat.toFixed(3)}°N` : `${Math.abs(hoveredInfo.lat).toFixed(3)}°S`} · {hoveredInfo.lon.toFixed(3)}°E
            </strong>
            <span className="telemetry-sub">
              Cota: {hoveredInfo.elev} m · Pendiente: {hoveredInfo.slope}° ({evaluateSlope(hoveredInfo.slope).riskLevel})
            </span>
          </div>
        )}

        <div className="stage-actions">
          <button
            type="button"
            className="ares-btn-primary glow-btn"
            onClick={playGoogleEarthDive}
            title="Iniciar descenso orbital cinemático continuo estilo Google Earth hacia Gale Crater"
          >
            🎬 Descenso Google Earth
          </button>
          <button
            type="button"
            className="ares-btn-secondary"
            onClick={playGoogleEarthAscent}
            title="Ascender a órbita espacial alta (Zoom out planetario)"
          >
            🚀 Ascender a Órbita
          </button>
          <button
            type="button"
            className="ares-btn-secondary"
            onClick={onSwitchToGlobal}
            title="Cambiar a la vista planetaria global 3D de Marte"
          >
            🌐 Globo Global
          </button>
          <button
            type="button"
            className="ares-btn-secondary"
            onClick={onSwitchToJezero2D}
            title="Abrir mapa científico 2D de Jezero Crater"
          >
            🗺 Mapa 2D Jezero
          </button>
        </div>
      </header>

      {/* Controles de Modo de Cámara Flotantes */}
      <nav className="ares-camera-toolbar" aria-label="Modos de Cámara 3D">
        <span className="toolbar-section-tag">CÁMARA:</span>
        <button
          type="button"
          className={`cam-chip ${cameraMode === 'orbit' ? 'active' : ''}`}
          onClick={() => setMode('orbit')}
          title="Rotación orbital libre alrededor de Gale Crater"
        >
          🔄 ÓRBITA
        </button>
        <button
          type="button"
          className={`cam-chip ${cameraMode === 'pan' ? 'active' : ''}`}
          onClick={() => setMode('pan')}
          title="Desplazamiento horizontal por el terreno"
        >
          ✥ PAN
        </button>
        <button
          type="button"
          className={`cam-chip ${cameraMode === 'firstPerson' ? 'active' : ''}`}
          onClick={() => setMode('firstPerson')}
          title="Perspectiva de astronauta en superficie a ras de suelo marciano (1.8m)"
        >
          🧑‍🚀 1ª PERSONA (EVA)
        </button>
        <button
          type="button"
          className={`cam-chip ${cameraMode === 'fly' ? 'active' : ''}`}
          onClick={() => setMode('fly')}
          title="Vuelo panorámico continuo sobre Mount Sharp y Pontours"
        >
          🚀 VUELO FLY
        </button>
      </nav>

      {/* Selector Flotante de Capas Científicas */}
      <aside className="ares-layers-tray" aria-label="Selector de Familias Científicas">
        <span className="tray-title">CAPA CIENTÍFICA:</span>
        <div className="layers-chips-grid">
          {(Object.keys(TERRAIN_LAYERS_CATALOG) as TerrainLayerType[]).map((key) => {
            const meta = TERRAIN_LAYERS_CATALOG[key]
            const active = activeLayer === key
            return (
              <button
                key={key}
                type="button"
                className={`layer-chip ${active ? 'active' : ''}`}
                onClick={() => setActiveLayer(key)}
              >
                <span className="layer-chip-dot" />
                <span className="layer-chip-name">{meta.name.split(' (')[0]}</span>
                <span className="layer-chip-inst">{meta.instrument.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>

        {/* Leyenda Dinámica de la Capa Activa */}
        <div className="layer-mini-legend">
          <div className="legend-head">
            <strong>{TERRAIN_LAYERS_CATALOG[activeLayer].name}</strong>
            <small>{TERRAIN_LAYERS_CATALOG[activeLayer].mission}</small>
          </div>
          <div className="legend-items">
            {TERRAIN_LAYERS_CATALOG[activeLayer].legend.map((item, idx) => (
              <div key={idx} className="legend-item">
                <span className="legend-color-swatch" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Lista Rápida de Descubrimientos Científicos en Gale Crater */}
      <div className="ares-discoveries-dock" aria-label="Hitos de Investigación Curiosity">
        <span className="dock-title">DESCUBRIMIENTOS DE CURIOSITY // GALE CRATER</span>
        <div className="discoveries-buttons-row">
          {GALE_DISCOVERIES.map((disc) => (
            <button
              key={disc.id}
              type="button"
              className={`discovery-pill ${selectedDiscovery?.id === disc.id ? 'active' : ''}`}
              onClick={() => focusOnDiscovery(disc)}
            >
              <span className="disc-sol">SOL {disc.sol}</span>
              <strong className="disc-name">{disc.name.split(' · ')[0]}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Ficha Flotante de Descubrimiento Seleccionado */}
      {selectedDiscovery && (
        <article className="ares-discovery-card" aria-label="Detalles Científicos del Sitio">
          <div className="card-top">
            <span className="card-badge">[HITO CIENTÍFICO VERIFICADO]</span>
            <button
              type="button"
              className="card-close"
              onClick={() => setSelectedDiscovery(null)}
              aria-label="Cerrar ficha científica"
            >
              ×
            </button>
          </div>

          <h3 className="card-title">{selectedDiscovery.name}</h3>

          <div className="card-img-wrap">
            <img
              src={selectedDiscovery.imageUrl}
              alt={selectedDiscovery.name}
              className="card-photo"
              loading="lazy"
            />
            <span className="card-credit">{selectedDiscovery.imageCredit}</span>
          </div>

          <div className="card-meta-grid">
            <div>
              <label>MISIÓN</label>
              <span>{selectedDiscovery.mission}</span>
            </div>
            <div>
              <label>SOL / FECHA</label>
              <span>Sol {selectedDiscovery.sol} ({selectedDiscovery.discoveryDate})</span>
            </div>
            <div>
              <label>UNIDAD GEOLÓGICA</label>
              <span>{selectedDiscovery.geologicalUnit}</span>
            </div>
            <div>
              <label>INSTRUMENTOS</label>
              <span>{selectedDiscovery.instruments.join(', ')}</span>
            </div>
          </div>

          <p className="card-significance">
            <b>Relevancia astrobiológica:</b> {selectedDiscovery.significance}
          </p>

          <p className="card-safety">
            <b>Seguridad EVA:</b> {selectedDiscovery.safetyNotes}
          </p>

          <div className="card-actions">
            <button
              type="button"
              className="ares-btn-primary"
              onClick={() => focusOnDiscovery(selectedDiscovery)}
            >
              🎯 Centrar Cámara 3D
            </button>
            {onSelectScienceStop && (
              <button
                type="button"
                className="ares-btn-secondary"
                onClick={() => {
                  onSelectScienceStop(
                    [selectedDiscovery.coordinates.lon, selectedDiscovery.coordinates.lat],
                    selectedDiscovery.name,
                  )
                }}
              >
                📍 Fijar como Parada EVA (P)
              </button>
            )}
          </div>
        </article>
      )}

      {/* Barra Inferior de Estado EVA y Walkback */}
      <footer className="ares-eva-bottom-bar" aria-label="Monitoreo de Caminata EVA">
        <div className="eva-metric">
          <span className="metric-label">DISTANCIA DE RUTA EVA (3D)</span>
          <strong className="metric-val">
            {totalRouteMeters > 0 ? `${(totalRouteMeters / 1000).toFixed(2)} km` : '0.00 km (Sin trazar)'}
          </strong>
          <span className="metric-sub">{routePointsList.length} puntos definidos</span>
        </div>

        <div className="eva-walkback-gauge">
          <div className="gauge-header">
            <span className={`gauge-badge ${walkbackAssessment.status.toLowerCase()}`}>
              {walkbackAssessment.label}
            </span>
            <span className="gauge-val">
              {walkbackAssessment.distanceKm} km / 8.0 km máx
            </span>
          </div>
          <div className="gauge-track">
            <div
              className={`gauge-fill ${walkbackAssessment.status.toLowerCase()}`}
              style={{ width: `${walkbackAssessment.percentOfMax}%` }}
            />
            <div className="gauge-limit-marker" style={{ left: '62.5%' }} title="Límite nominal 5 km" />
          </div>
          <span className="gauge-hint">
            Regla de Walkback NASA: Retorno a pie nominal hasta 5 km · Contingencia PLSS 8 km
          </span>
        </div>
      </footer>
    </div>
  )
}
