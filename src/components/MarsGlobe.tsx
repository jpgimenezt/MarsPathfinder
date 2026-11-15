import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera,
  Raycaster, Scene, SphereGeometry, SRGBColorSpace, TextureLoader, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { isFrontFacing, isSurfaceClick, JEZERO_CRATER, surfacePoint } from '../features/globe/globeCoordinates'

const MIN_DISTANCE = 2.25
const MAX_DISTANCE = 5.8
const initialPosition = surfacePoint(...JEZERO_CRATER, 3.15)

interface Props {
  onJezero: () => void
  onFailure: () => void
}

export function MarsGlobe({ onJezero, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const actions = useRef<{ rotate: (degrees: number) => void; zoom: (factor: number) => void } | null>(null)

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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation: { from: Vector3; to: Vector3; started: number } | null = null
    let start: { x: number; y: number; id: number; moved: boolean } | null = null
    const activePointers = new Set<number>()
    let frame = 0
    let disposed = false
    let texture: ReturnType<TextureLoader['load']> | null = null

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
      if (!button) return
      const visible = isFrontFacing(markerPoint, camera.position, 1.025)
      const projected = markerPoint.clone().project(camera)
      button.hidden = !visible || Math.abs(projected.x) > 0.94 || Math.abs(projected.y) > 0.9
      if (!button.hidden) {
        button.style.left = `${(projected.x + 1) * 50}%`
        button.style.top = `${(1 - projected.y) * 50}%`
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
    new TextureLoader().load(`${import.meta.env.BASE_URL}data/mars-mola-global-1024.jpg`,
      image => {
        if (disposed) { image.dispose(); return }
        texture = image
        // La muestra USGS va de -180°E (izquierda) a +180°E (derecha).
        image.colorSpace = SRGBColorSpace
        material.map = image
        material.needsUpdate = true
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
      texture?.dispose()
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
      <span className="eyebrow">EXPLORACIÓN PLANETARIA · MGS MOLA</span>
      <h2>Marte, antes de<br /><em>dar el primer paso.</em></h2>
      <p>Girá el planeta y explorá sus regiones. Jezero te lleva al mapa científico 2D, donde permanece tu plan de recorrido.</p>
      <button type="button" className="globe-primary" onClick={onJezero}>Explorar Jezero <span aria-hidden="true">↗</span></button>
      <p className="globe-warning">Relieve sombreado visual NASA/USGS · no representa pendientes ni seguridad de una ruta.</p>
    </div>
    <div className="globe-viewport">
      <div className="globe-canvas" ref={host} aria-label="Esfera de Marte; arrastrá para girar, usá la rueda para acercar, tocá una región para centrarla." />
      {status === 'loading' && <span className="globe-loading" role="status">Cargando textura MOLA…</span>}
      {status === 'ready' && <button type="button" className="globe-marker" ref={marker} onClick={onJezero}
        aria-label="Jezero Crater, 18.41 grados norte, 77.69 grados este. Abrir mapa científico 2D">
        <span className="globe-arrow" aria-hidden="true">⌄</span><span>Jezero Crater</span>
      </button>}
    </div>
    <div className="globe-controls" aria-label="Controles del globo">
      <button type="button" onClick={() => actions.current?.rotate(-20)} aria-label="Girar Marte a la izquierda">←</button>
      <button type="button" onClick={() => actions.current?.rotate(20)} aria-label="Girar Marte a la derecha">→</button>
      <button type="button" onClick={() => actions.current?.zoom(0.82)} aria-label="Acercar Marte">+</button>
      <button type="button" onClick={() => actions.current?.zoom(1.22)} aria-label="Alejar Marte">−</button>
    </div>
    <div className="globe-credit"><a href="https://astrogeology.usgs.gov/search/map/mars_mgs_mola_global_color_shaded_relief_463m" target="_blank" rel="noreferrer">NASA / USGS · MGS MOLA · relieve sombreado ↗</a> · Imagen global reducida a 1024×512 px</div>
  </section>
}
