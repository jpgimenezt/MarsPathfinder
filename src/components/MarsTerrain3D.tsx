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
}

const REGION_BOUNDS = {
  minLon: 137.20,
  maxLon: 138.00,
  minLat: -5.45,
  maxLat: -4.50,
}

const TERRAIN_WIDTH = 280
const TERRAIN_HEIGHT = 280
const VERTEX_SUBDIVISIONS = 128
const ELEVATION_SCALE = 0.0085 // 5,500 m = ~46.7 units in 3D scene

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
}: MarsTerrain3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeLayer, setActiveLayer] = useState<TerrainLayerType>('optical')
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('orbit')
  const [selectedDiscovery, setSelectedDiscovery] = useState<ScientificDiscovery | null>(null)
  const [hoveredInfo, setHoveredInfo] = useState<{ lon: number; lat: number; elev: number; slope: number } | null>(null)
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false)

  // Referencias para el loop de Three.js y controles de cámara
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
    scene.background = new Color(0x130a08)
    scene.fog = new FogExp2(0xb56338, 0.0032)

    const camera = new PerspectiveCamera(45, width / height, 0.5, 1200)
    cameraRef.current = camera
    camera.position.set(-60, 95, 140)
    camera.lookAt(20, 10, -20)

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

    // Iluminación solar marciana y dispersión atmosférica
    const ambientLight = new AmbientLight(0xd97746, 1.4)
    scene.add(ambientLight)

    const sunLight = new DirectionalLight(0xfff3e0, 2.4)
    sunLight.position.set(-100, 150, 80)
    scene.add(sunLight)

    // Controles orbitales con amortiguación
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.maxPolarAngle = Math.PI / 2 - 0.04 // Evitar pasar por debajo del suelo
    controls.minDistance = 6
    controls.maxDistance = 340
    controls.target.set(10, 8, -10)

    // Construcción de la Malla de Terreno Georreferenciada de Gale Crater
    const terrainGeo = new PlaneGeometry(
      TERRAIN_WIDTH,
      TERRAIN_HEIGHT,
      VERTEX_SUBDIVISIONS,
      VERTEX_SUBDIVISIONS,
    )
    terrainGeo.rotateX(-Math.PI / 2) // Orientar horizontalmente en el plano XZ

    const posAttr = terrainGeo.attributes.position as Float32BufferAttribute
    const count = posAttr.count

    // Desplazar vértices con elevaciones numéricas reales
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

    // Generar textura inicial de albedo óptico
    const initialTex = generateTerrainTexture('optical', REGION_BOUNDS)
    const terrainMat = new MeshStandardMaterial({
      map: initialTex,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: false,
    })

    const terrainMesh = new Mesh(terrainGeo, terrainMat)
    terrainMeshRef.current = terrainMesh
    scene.add(terrainMesh)

    // Grupo para balizas científicas
    const beaconsGroup = new Group()
    beaconsGroupRef.current = beaconsGroup
    scene.add(beaconsGroup)

    // Agregar balizas 3D de los descubrimientos de Curiosity
    GALE_DISCOVERIES.forEach((disc) => {
      const { x, z } = geoToTerrainPosition(disc.coordinates.lon, disc.coordinates.lat)
      const y = (disc.elevationMeters + 4500) * ELEVATION_SCALE + 0.5

      const pinGroup = new Group()
      pinGroup.position.set(x, y, z)
      pinGroup.name = `discovery-${disc.id}`

      // Cilindro vertical holográfico
      const stemGeo = new CylinderGeometry(0.3, 0.3, 4, 12)
      stemGeo.translate(0, 2, 0)
      const stemMat = new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 })
      const stem = new Mesh(stemGeo, stemMat)
      pinGroup.add(stem)

      // Anillo horizontal pulsante en la base
      const ringGeo = new RingGeometry(1.2, 1.8, 24)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 })
      const ring = new Mesh(ringGeo, ringMat)
      pinGroup.add(ring)

      // Esfera superior brillante
      const headGeo = new CylinderGeometry(1.2, 0, 1.8, 6)
      headGeo.translate(0, 4.5, 0)
      const headMat = new MeshBasicMaterial({ color: 0xffffff })
      const head = new Mesh(headGeo, headMat)
      pinGroup.add(head)

      beaconsGroup.add(pinGroup)
    })

    // Grupo de la ruta EVA 3D
    const routeGroup = new Group()
    routeGroupRef.current = routeGroup
    scene.add(routeGroup)

    // Raycaster para interactividad de cursor
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

    // Ajuste responsive
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

    // Variables de animación
    let clockTime = 0
    let flyAngle = 0

    // Bucle de renderizado a 60 FPS
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate)
      clockTime += 0.016

      // Pulso de balizas científicas
      beaconsGroup.children.forEach((beacon, index) => {
        const pulse = Math.sin(clockTime * 3 + index * 1.5) * 0.15 + 1
        beacon.scale.set(pulse, 1, pulse)
      })

      const currentMode = cameraModeRef.current

      if (currentMode === 'fly') {
        flyAngle += 0.003
        const radius = 95
        const camX = Math.sin(flyAngle) * radius + 15
        const camZ = Math.cos(flyAngle) * radius - 15
        const u = (camX / TERRAIN_WIDTH) + 0.5
        const v = (camZ / TERRAIN_HEIGHT) + 0.5
        const lon = REGION_BOUNDS.minLon + u * (REGION_BOUNDS.maxLon - REGION_BOUNDS.minLon)
        const lat = REGION_BOUNDS.maxLat - v * (REGION_BOUNDS.maxLat - REGION_BOUNDS.minLat)
        const groundY = (getGaleElevation(lon, lat) + 4500) * ELEVATION_SCALE
        camera.position.set(camX, groundY + 16, camZ)
        camera.lookAt(20, 25, -20)
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
      terrainGeo.dispose()
      terrainMat.dispose()
      scene.clear()
      renderer.dispose()
    }
  }, [])

  // Cambio de capa científica: regenera textura dinámicamente
  useEffect(() => {
    if (!terrainMeshRef.current) return
    const mesh = terrainMeshRef.current
    const mat = mesh.material as MeshStandardMaterial
    const oldMap = mat.map
    const newTex = generateTerrainTexture(activeLayer, REGION_BOUNDS)
    mat.map = newTex
    mat.needsUpdate = true
    if (oldMap) oldMap.dispose()
  }, [activeLayer])

  // Actualización de la Ruta EVA 3D sobre el terreno
  useEffect(() => {
    if (!routeGroupRef.current) return
    const group = routeGroupRef.current
    // Limpiar geometrías previas
    while (group.children.length > 0) {
      const child = group.children[0] as Mesh
      if (child.geometry) child.geometry.dispose()
      group.remove(child)
    }

    if (routePointsList.length < 2) return

    // Muestreo de puntos geodésicos a lo largo de los segmentos para adaptar al relieve
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

    // Agregar balizas de parada A, P, B
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
      controls.target.set(10, 8, -10)
    } else if (mode === 'pan') {
      controls.enabled = true
      controls.enablePan = true
      controls.enableRotate = false
    } else if (mode === 'firstPerson') {
      // Astronaut eye level near Pontours
      controls.enabled = false
      const { x, z } = geoToTerrainPosition(137.404, -4.652)
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

  // Secuencia de descenso orbital cinemático de ARES
  const playCinematicEntry = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    setIsCinematicPlaying(true)
    controls.enabled = false

    // Estado inicial en órbita alta
    camera.position.set(-180, 240, 260)
    camera.lookAt(15, 10, -10)

    let progress = 0
    const durationMs = 3800
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      progress = Math.min(1, elapsed / durationMs)
      // Easing cúbico natural
      const ease = 1 - Math.pow(1 - progress, 3)

      const targetPos = new Vector3(-45, 75, 110)
      camera.position.lerpVectors(new Vector3(-180, 240, 260), targetPos, ease)
      camera.lookAt(15, 12, -15)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setIsCinematicPlaying(false)
        controls.enabled = true
        controls.target.set(15, 12, -15)
        controls.update()
      }
    }

    requestAnimationFrame(step)
  }, [])

  return (
    <div className="ares-terrain-container" aria-label="Explorador 3D de Gale Crater y Mount Sharp">
      {/* Contenedor del Canvas de Three.js */}
      <div className="ares-canvas-host" ref={containerRef} />

      {/* Banner de Secuencia Cinemática de Entrada Orbital */}
      {isCinematicPlaying && (
        <div className="ares-cinematic-overlay" role="status">
          <div className="cinematic-hud">
            <span className="cinematic-badge">[MANIOBRA ORBITAL]</span>
            <h3>DESCENSO A SUPERFICIE // GALE CRATER</h3>
            <p>Trayectoria hiperbólica · Inclinación 25.2° · Altura Areoide: 4.8 km</p>
          </div>
          <button
            type="button"
            className="cinematic-skip-btn"
            onClick={() => setIsCinematicPlaying(false)}
          >
            SALTEAR ANIMACIÓN ⏭
          </button>
        </div>
      )}

      {/* Barra de Telemetría Superior del Escenario 3D */}
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
            className="ares-btn-secondary"
            onClick={playCinematicEntry}
            title="Reproducir maniobra de entrada orbital cinematográfica a Gale Crater"
          >
            🎬 Entrada Orbital
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
