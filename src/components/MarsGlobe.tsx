import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera,
  Raycaster, Scene, SphereGeometry, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GALE_CRATER, isFrontFacing, isSurfaceClick, JEZERO_CRATER, surfacePoint } from '../features/globe/globeCoordinates'
import { MolaElevationLegend } from './MolaElevationLegend'

const MIN_DISTANCE = 2.25
const MAX_DISTANCE = 5.8
const initialPosition = surfacePoint(...JEZERO_CRATER, 3.15)
type GlobeTexture = 'mola' | 'viking'
const textureFiles: Record<GlobeTexture, string> = {
  mola: 'data/mars-mola-global-1024.jpg',
  viking: 'data/mars-viking-global-2048.webp',
}
const sourceUrls: Record<GlobeTexture, string> = {
  mola: 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m',
  viking: 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m',
}

interface Props {
  onJezero: () => void
  onGaleTerrain?: () => void
  onFailure: () => void
}

export function MarsGlobe({ onJezero, onGaleTerrain, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLButtonElement>(null)
  const galeMarker = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeTexture, setActiveTexture] = useState<GlobeTexture>('mola')
  const [vikingLoading, setVikingLoading] = useState(false)
  const [vikingError, setVikingError] = useState(false)
  const actions = useRef<{ rotate: (degrees: number) => void; zoom: (factor: number) => void } | null>(null)
  const selectTexture = useRef<(texture: GlobeTexture) => void>(() => {})

  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      setStatus('error')
      onFailure()
      return
    }
    const scene = new Scene()
    const camera = new PerspectiveCamera(42, 1, 0.1, 30)
    camera.position.copy(initialPosition)
    camera.lookAt(0, 0, 0)
    const geometry = new SphereGeometry(1, 96, 64)
    const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 1 })
    const sphere = new Mesh(geometry, material)
    scene.add(sphere, new AmbientLight(0xffffff, 2))
    const sun = new DirectionalLight(0xffffff, 1.8)
    sun.position.set(3, 4, 5)
    scene.add(sun)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    container.append(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = MIN_DISTANCE
    controls.maxDistance = MAX_DISTANCE
    controls.target.set(0, 0, 0)
    controls.mouseButtons.LEFT = 0 // ROTATE
    renderer.domElement.style.touchAction = 'none'
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    const markerPoint = surfacePoint(...JEZERO_CRATER, 1.025)
    const galeMarkerPoint = surfacePoint(...GALE_CRATER, 1.025)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation: { from: Vector3; to: Vector3; started: number } | null = null
    let start: { x: number; y: number; id: number; moved: boolean } | null = null
    const activePointers = new Set<number>()
    let frame = 0
    let disposed = false
    const textures: Partial<Record<GlobeTexture, Texture>> = {}
    let requestedTexture: GlobeTexture = 'mola'
    let vikingPending = false
    const loader = new TextureLoader()

    function select(next: GlobeTexture) {
      requestedTexture = next
      setVikingError(false)
      if (next === 'mola') {
        if (textures.mola) {
          material.map = textures.mola
          material.needsUpdate = true
          setActiveTexture('mola')
        }
        setVikingLoading(false)
        return
      }
      if (textures.viking) {
        material.map = textures.viking
        material.needsUpdate = true
        setActiveTexture('viking')
        setVikingLoading(false)
        return
      }
      setVikingLoading(true)
      if (vikingPending) return
      vikingPending = true
      loader.load(`${import.meta.env.BASE_URL}${textureFiles.viking}`,
        image => {
          if (disposed) { image.dispose(); return }
          vikingPending = false
          image.colorSpace = SRGBColorSpace
          textures.viking = image
          if (requestedTexture === 'viking') select('viking')
        },
        undefined,
        () => {
          if (disposed) return
          vikingPending = false
          if (requestedTexture === 'viking') {
            requestedTexture = 'mola'
            setVikingLoading(false)
            setVikingError(true)
          }
        },
      )
    }
    selectTexture.current = select

    function fit() {
      const width = container!.clientWidth
      const height = container!.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    function updateMarker() {
      const button = marker.current
      if (button) {
        const visible = isFrontFacing(markerPoint, camera.position, 1.025)
        const projected = markerPoint.clone().project(camera)
        button.hidden = !visible || Math.abs(projected.x) > 0.94 || Math.abs(projected.y) > 0.9
        if (!button.hidden) {
          button.style.left = `${(projected.x + 1) * 50}%`
          button.style.top = `${(1 - projected.y) * 50}%`
        }
      }

      const galeBtn = galeMarker.current
      if (galeBtn) {
        const visibleGale = isFrontFacing(galeMarkerPoint, camera.position, 1.025)
        const projectedGale = galeMarkerPoint.clone().project(camera)
        galeBtn.hidden = !visibleGale || Math.abs(projectedGale.x) > 0.94 || Math.abs(projectedGale.y) > 0.9
        if (!galeBtn.hidden) {
          galeBtn.style.left = `${(projectedGale.x + 1) * 50}%`
          galeBtn.style.top = `${(1 - projectedGale.y) * 50}%`
        }
      }
    }
    function render(time: number) {
      if (animation) {
        const elapsed = Math.min(1, (time - animation.started) / 850)
        const eased = 1 - Math.pow(1 - elapsed, 3)
        camera.position.copy(animation.from).lerp(animation.to, eased)
        camera.lookAt(0, 0, 0)
        if (elapsed >= 1) {
          animation = null
          controls.enabled = true
        }
      } else controls.update()
      updateMarker()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    function focus(point: Vector3) {
      const to = point.clone().normalize().multiplyScalar(Math.max(MIN_DISTANCE + 0.4, camera.position.length() * 0.76))
      if (reduceMotion.matches) {
        camera.position.copy(to)
        camera.lookAt(0, 0, 0)
        controls.update()
      } else {
        controls.enabled = false
        animation = { from: camera.position.clone(), to, started: performance.now() }
      }
    }
    function down(event: PointerEvent) {
      activePointers.add(event.pointerId)
      if (activePointers.size > 1) { start = null; return }
      if (event.button !== 0) return
      animation = null
      controls.enabled = true
      start = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false }
    }
    function move(event: PointerEvent) {
      if (start?.id === event.pointerId && !isSurfaceClick(start.x, start.y, event.clientX, event.clientY)) start.moved = true
    }
    function up(event: PointerEvent) {
      activePointers.delete(event.pointerId)
      if (!start || event.pointerId !== start.id) return
      const selection = start
      start = null
      if (selection.moved || !isSurfaceClick(selection.x, selection.y, event.clientX, event.clientY)) return
      const bounds = renderer.domElement.getBoundingClientRect()
      pointer.set(
        (event.clientX - bounds.left) / bounds.width * 2 - 1,
        -(event.clientY - bounds.top) / bounds.height * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(sphere)[0]
      if (hit) focus(hit.point)
    }
    function lostContext(event: Event) {
      event.preventDefault()
      setStatus('error')
      onFailure()
    }
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    const cancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); start = null }
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('webglcontextlost', lostContext)
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    fit()
    frame = requestAnimationFrame(render)
    loader.load(`${import.meta.env.BASE_URL}${textureFiles.mola}`,
      image => {
        if (disposed) { image.dispose(); return }
        textures.mola = image
        // La muestra USGS va de -180°E (izquierda) a +180°E (derecha).
        image.colorSpace = SRGBColorSpace
        if (requestedTexture === 'mola') {
          material.map = image
          material.needsUpdate = true
        }
        setStatus('ready')
      },
      undefined,
      () => { if (!disposed) { setStatus('error'); onFailure() } },
    )
    actions.current = {
      rotate: degrees => {
        animation = null
        controls.enabled = true
        camera.position.applyAxisAngle(new Vector3(0, 1, 0), degrees * Math.PI / 180)
        camera.lookAt(0, 0, 0)
        controls.update()
      },
      zoom: factor => {
        animation = null
        controls.enabled = true
        camera.position.setLength(Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, camera.position.length() * factor)))
        camera.lookAt(0, 0, 0)
        controls.update()
      },
    }
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('webglcontextlost', lostContext)
      controls.dispose()
      actions.current = null
      selectTexture.current = () => {}
      Object.values(textures).forEach(image => image.dispose())
      geometry.dispose()
      material.dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [onFailure])

  return <section className="globe-stage" aria-label="Exploración global de Marte en 3D">
    <div className="globe-copy">
      <span className="eyebrow">EXPLORACIÓN PLANETARIA · {activeTexture === 'mola' ? 'MGS MOLA' : 'VIKING MDIM 2.1'}</span>
      <h2>Marte, antes de<br /><em>dar el primer paso.</em></h2>
      <p>Girá el planeta y explorá sus regiones. Ingresá a Gale Crater para el relieve 3D con elevaciones reales o a Jezero para el mapa 2D.</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {onGaleTerrain && (
          <button type="button" className="globe-primary" onClick={onGaleTerrain} style={{ background: 'linear-gradient(135deg, #00f0ff, #0284c7)', color: '#04090e', fontWeight: 800 }}>
            [01] GALE CRATER 3D <span aria-hidden="true">↗</span>
          </button>
        )}
        <button type="button" className="globe-primary" onClick={onJezero}>
          [03] JEZERO 2D <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className="globe-warning">{activeTexture === 'mola' ? 'Relieve sombreado visual NASA/USGS' :
        'Mosaico Viking colorizado por NASA Ames / USGS, no color natural exacto'} · no representa pendientes ni seguridad de una ruta.</p>
    </div>
    <div className="globe-data">
      <fieldset className="globe-texture-options" aria-label="Textura del planeta" disabled={status !== 'ready'}>
        <legend>VISUALIZACIÓN DEL PLANETA</legend>
        <button type="button" aria-pressed={activeTexture === 'mola'} className={activeTexture === 'mola' ? 'selected' : ''}
          onClick={() => selectTexture.current('mola')}>Relieve MOLA</button>
        <button type="button" aria-pressed={activeTexture === 'viking'} className={activeTexture === 'viking' ? 'selected' : ''}
          onClick={() => selectTexture.current('viking')}>Color de superficie</button>
      </fieldset>
      {vikingLoading && <p className="texture-status" role="status">Cargando mosaico Viking…</p>}
      {vikingError && <p className="texture-error" role="alert">No se pudo cargar Viking. Sigue visible MOLA; podés reintentar «Color de superficie».</p>}
      {activeTexture === 'mola' && <MolaElevationLegend />}
    </div>
    <div className="globe-viewport">
      <div className="globe-canvas" ref={host} aria-label="Esfera de Marte; arrastrá para girar, usá la rueda para acercar, tocá una región para centrarla." />
      {status === 'loading' && <span className="globe-loading" role="status">Cargando textura MOLA…</span>}
      {status === 'ready' && (
        <>
          <button type="button" className="globe-marker" ref={marker} onClick={onJezero}
            aria-label="Jezero Crater, 18.41 grados norte, 77.69 grados este. Abrir mapa científico 2D">
            <span className="globe-arrow" aria-hidden="true">⌄</span><span>Jezero Crater</span>
          </button>
          {onGaleTerrain && (
            <button type="button" className="globe-marker gale-marker" ref={galeMarker} onClick={onGaleTerrain}
              style={{ borderColor: '#00f0ff', color: '#00f0ff' }}
              aria-label="Gale Crater, 5.37 grados sur, 137.44 grados este. Abrir visor 3D de terreno y Mount Sharp">
              <span className="globe-arrow" aria-hidden="true" style={{ color: '#00f0ff' }}>⌄</span><span>Gale Crater (Mount Sharp)</span>
            </button>
          )}
        </>
      )}
    </div>
    <div className="globe-controls" aria-label="Controles del globo">
      <button type="button" onClick={() => actions.current?.rotate(-20)} aria-label="Girar Marte a la izquierda">←</button>
      <button type="button" onClick={() => actions.current?.rotate(20)} aria-label="Girar Marte a la derecha">→</button>
      <button type="button" onClick={() => actions.current?.zoom(0.82)} aria-label="Acercar Marte">+</button>
      <button type="button" onClick={() => actions.current?.zoom(1.22)} aria-label="Alejar Marte">−</button>
    </div>
    <div className="globe-credit"><a href={sourceUrls[activeTexture]} target="_blank" rel="noreferrer">
      {activeTexture === 'mola' ? 'NASA / USGS · MGS MOLA · relieve sombreado' :
        'NASA Ames / USGS · Viking MDIM 2.1 · mosaico colorizado'} ↗</a> · Imagen global {activeTexture === 'viking' ? '2048×1024 px' : '1024×512 px'}</div>
  </section>
}
