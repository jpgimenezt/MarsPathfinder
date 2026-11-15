import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map.js'
import ImageLayer from 'ol/layer/Image.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import WMTS from 'ol/source/WMTS.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import Style from 'ol/style/Style.js'
import Stroke from 'ol/style/Stroke.js'
import Fill from 'ol/style/Fill.js'
import CircleStyle from 'ol/style/Circle.js'
import Text from 'ol/style/Text.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { sources, type LayerId } from '../data/sourceManifest'
import { FALLBACK_EXTENT, insideRoi, marsProjection } from '../features/map/marsProjection'
import { WmtsLayerManager, type LayerState } from '../features/map/wmtsLayerManager'
import { changeZoom, createGlobalView, createJezeroView, fitGlobal, fitJezero, zoomAvailability } from '../features/map/viewNavigation'
import { STOP_ORDER, type StopId, type Stops } from '../features/route/routePlan'
import type { MarsPoint } from '../features/route/marsDistance'

export type { LayerState } from '../features/map/wmtsLayerManager'
export type MapMode = { type: 'explore' } | { type: 'place' | 'move'; id: StopId }
export type MapScope = 'jezero' | 'global'

interface Props {
  scope: MapScope
  enabled: Record<LayerId, boolean>
  opacity: Record<LayerId, number>
  stops: Stops
  mode: MapMode
  onPlace: (id: StopId, point: MarsPoint) => void
  onLayerState: (id: LayerId, state: LayerState) => void
}

const markers: Record<StopId, { color: string; text: string }> = {
  A: { color: '#65ddc7', text: 'Origen propuesto' },
  P: { color: '#ffc784', text: 'Parada propuesta' },
  B: { color: '#ff8f77', text: 'Destino propuesto' },
}

export function MapView({ scope, enabled, opacity, stops, mode, onPlace, onLayerState }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const fallback = useRef<ImageLayer<ImageStatic> | null>(null)
  const localView = useRef<ReturnType<typeof createJezeroView> | null>(null)
  const globalView = useRef<ReturnType<typeof createGlobalView> | null>(null)
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const layers = useRef<Record<LayerId, TileLayer<WMTS>>>({
    ctx: new TileLayer<WMTS>(), mola: new TileLayer<WMTS>(), themis: new TileLayer<WMTS>(),
  })
  const manager = useRef<WmtsLayerManager | null>(null)
  const vectors = useRef(new VectorSource())
  const handler = useRef(onPlace)
  const stateHandler = useRef(onLayerState)
  const modeRef = useRef(mode)
  const [zoom, setZoom] = useState({ in: true, out: true })
  handler.current = onPlace
  stateHandler.current = onLayerState
  modeRef.current = mode

  function reportState(id: LayerId, state: LayerState) {
    if (scopeRef.current === 'global') {
      if (id !== 'mola' && state !== 'apagada') return
    } else if (!enabledRef.current[id] && state !== 'apagada') return
    if (id === 'ctx') fallback.current?.setVisible(scopeRef.current === 'jezero' && enabledRef.current.ctx && state !== 'visible')
    stateHandler.current(id, state)
  }
  const reportHandler = useRef(reportState)
  reportHandler.current = reportState

  useEffect(() => {
    if (!element.current) return
    const local = new ImageLayer({
      source: new ImageStatic({
        url: `${import.meta.env.BASE_URL}data/ctx-jezero-tile-z10.png`,
        projection: marsProjection,
        imageExtent: FALLBACK_EXTENT,
        attributions: 'Respaldo estático: NASA/JPL-Caltech/USGS · MRO CTX · Mars Trek, tesela WMTS zoom 10',
      }),
    })
    fallback.current = local
    const route = new VectorLayer({ source: vectors.current })
    const jezero = createJezeroView()
    localView.current = jezero
    const instance = new Map({
      target: element.current,
      layers: [local, layers.current.ctx, layers.current.mola, layers.current.themis, route],
      view: jezero,
      controls: defaultControls({ zoom: false, rotate: false }),
    })
    manager.current = new WmtsLayerManager(layers.current, (id, state) => reportHandler.current(id, state))
    instance.updateSize()
    fitJezero(jezero, instance.getSize() ?? [900, 650])
    const updateZoom = () => setZoom(zoomAvailability(instance.getView()))
    instance.on('moveend', updateZoom)
    const observer = new ResizeObserver(() => {
      instance.updateSize()
      updateZoom()
    })
    observer.observe(element.current)
    updateZoom()
    instance.on('singleclick', event => {
      const selection = modeRef.current
      if (scopeRef.current !== 'jezero' || selection.type === 'explore' || !insideRoi(event.coordinate)) return
      handler.current(selection.id, [event.coordinate[0], event.coordinate[1]])
    })
    map.current = instance
    return () => {
      observer.disconnect()
      manager.current?.dispose()
      manager.current = null
      instance.setTarget(undefined)
      instance.dispose()
      map.current = null
      fallback.current = null
      localView.current = null
      globalView.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current) return
    if (scope === 'global') {
      globalView.current ??= createGlobalView()
      map.current.setView(globalView.current)
      if (!globalView.current.get('initialized')) {
        fitGlobal(globalView.current, map.current.getSize() ?? [900, 650])
        globalView.current.set('initialized', true)
      }
    } else if (localView.current) {
      map.current.setView(localView.current)
    }
    fallback.current?.setVisible(scope === 'jezero' && enabled.ctx)
    for (const source of sources) manager.current?.setEnabled(source.id, scope === 'global' ? source.id === 'mola' : enabled[source.id])
    setZoom(zoomAvailability(map.current.getView()))
  }, [enabled, scope])

  useEffect(() => {
    for (const source of sources) layers.current[source.id].setOpacity(opacity[source.id])
  }, [opacity])

  useEffect(() => {
    const features: Feature[] = []
    const legs: [StopId, StopId][] = [['A', 'P'], ['P', 'B']]
    for (const [from, to] of scope === 'global' ? [] : legs) {
      if (!stops[from] || !stops[to]) continue
      const segment = new Feature({ geometry: new LineString([[...stops[from]!], [...stops[to]!]]) })
      segment.setStyle([
        new Style({ stroke: new Stroke({ color: '#17242c', width: 9, lineCap: 'round', lineJoin: 'round' }) }),
        new Style({ stroke: new Stroke({ color: '#ffcb84', width: 4, lineCap: 'round', lineJoin: 'round' }) }),
      ])
      features.push(segment)
    }
    for (const id of scope === 'global' ? [] : STOP_ORDER) {
      const point = stops[id]
      if (!point) continue
      const feature = new Feature({ geometry: new Point([...point]) })
      feature.setStyle(new Style({
        image: new CircleStyle({
          radius: mode.type === 'move' && mode.id === id ? 17 : 15,
          fill: new Fill({ color: '#162a32' }),
          stroke: new Stroke({ color: markers[id].color, width: 4 }),
        }),
        text: new Text({ text: id, fill: new Fill({ color: '#fff' }), font: 'bold 14px sans-serif' }),
      }))
      features.push(feature)
    }
    vectors.current.clear()
    vectors.current.addFeatures(features)
  }, [stops, mode, scope])

  return (
    <div className="map-shell">
      <div className={`map ${scope === 'jezero' && mode.type !== 'explore' ? 'map--placing' : ''}`} ref={element}
        role="application" aria-label={scope === 'global' ? 'Vista 2D global de Marte: relieve visual MOLA, sin planificación de rutas.' :
          'Mapa orbital de Jezero, Marte. En modo explorar, arrastrá para navegar; elegí un punto en el panel de ruta para colocarlo.'} />
      <div className="nav-tools" aria-label="Controles de navegación del mapa">
        <button type="button" aria-label="Acercar mapa" title="Acercar" disabled={!zoom.in}
          onClick={() => { if (map.current) changeZoom(map.current.getView(), 0.75) }}>+</button>
        <button type="button" aria-label="Alejar mapa" title="Alejar" disabled={!zoom.out}
          onClick={() => { if (map.current) changeZoom(map.current.getView(), -0.75) }}>−</button>
        <button type="button" className="nav-home"
          aria-label={scope === 'global' ? 'Reencuadrar Marte global' : 'Reencuadrar sector Jezero'}
          title={scope === 'global' ? 'Reencuadrar Marte global' : 'Reencuadrar Jezero'}
          onClick={() => { if (map.current) (scope === 'global' ? fitGlobal : fitJezero)(map.current.getView(), map.current.getSize() ?? [900, 650]) }}>◎</button>
      </div>
      <div className="map-hint" aria-live="polite">
        {scope === 'global' ? 'Contexto MOLA global · no disponible para planificación' : mode.type === 'explore' ? 'Modo explorar · arrastrá para navegar' :
          `${mode.type === 'move' ? 'Mover' : 'Colocar'} ${mode.id} · tocá el sector delimitado. Navegar no marcará otros puntos.`}
      </div>
    </div>
  )
}
