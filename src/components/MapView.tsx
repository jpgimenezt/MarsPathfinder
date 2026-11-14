import { useEffect, useRef } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import ImageLayer from 'ol/layer/Image.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import ImageStatic from 'ol/source/ImageStatic.js'
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
import { loadWmts } from '../features/map/wmtsSources'
import { FALLBACK_EXTENT, insideRoi, marsProjection, ROI } from '../features/map/marsProjection'
import type { MarsPoint } from '../features/route/marsDistance'

export type LayerState = 'cargando' | 'visible' | 'error' | 'sin cobertura' | 'apagada'
interface Props {
  enabled: Record<LayerId, boolean>
  opacity: Record<LayerId, number>
  points: MarsPoint[]
  nextPoint: number
  onPoint: (point: MarsPoint) => void
  onLayerState: (id: LayerId, state: LayerState) => void
}

export function MapView({ enabled, opacity, points, nextPoint, onPoint, onLayerState }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const fallback = useRef<ImageLayer<ImageStatic> | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const layers = useRef<Record<LayerId, TileLayer>>({
    ctx: new TileLayer(), mola: new TileLayer(), themis: new TileLayer(),
  })
  const vectors = useRef(new VectorSource())
  const pointHandler = useRef(onPoint)
  const stateHandler = useRef(onLayerState)
  const nextHandler = useRef(nextPoint)
  pointHandler.current = onPoint
  stateHandler.current = onLayerState
  nextHandler.current = nextPoint
  function reportState(id: LayerId, state: LayerState) {
    if (!enabledRef.current[id] && state !== 'apagada') return
    if (id === 'ctx') fallback.current?.setVisible(enabledRef.current.ctx && state !== 'visible')
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
    const instance = new Map({
      target: element.current,
      layers: [local, layers.current.ctx, layers.current.mola, layers.current.themis, route],
      view: new View({ projection: marsProjection, center: [77.43, 18.38], zoom: 10, minZoom: 7, maxZoom: 13, extent: ROI }),
      controls: defaultControls({ rotate: false }),
    })
    instance.getView().fit(ROI, { padding: [24, 24, 24, 24], maxZoom: 11 })
    instance.on('singleclick', event => {
      if (nextHandler.current >= 3 || !insideRoi(event.coordinate)) return
      pointHandler.current([event.coordinate[0], event.coordinate[1]])
    })
    map.current = instance
    return () => { instance.setTarget(undefined); instance.dispose(); map.current = null; fallback.current = null }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    for (const source of sources) {
      const layer = layers.current[source.id]
      if (!enabled[source.id]) {
        layer.setVisible(false)
        reportHandler.current(source.id, 'apagada')
        continue
      }
      layer.setVisible(true)
      reportHandler.current(source.id, 'cargando')
      void loadWmts(source, controller.signal).then(wmts => {
        if (controller.signal.aborted) return
        let successes = 0
        let errors = 0
        const report = () => {
          if (controller.signal.aborted) return
          reportHandler.current(source.id, successes > 0 ? 'visible' : errors > 0 ? 'error' : 'cargando')
        }
        wmts.on('tileloadend', () => { successes++; report() })
        wmts.on('tileloaderror', () => { errors++; report() })
        layer.setSource(wmts)
      }).catch(error => {
        if (!controller.signal.aborted) {
          layer.setSource(null)
          reportHandler.current(source.id, 'error')
          console.warn(`Fuente ${source.id}:`, error)
        }
      })
    }
    return () => controller.abort()
  }, [enabled])

  useEffect(() => {
    for (const source of sources) layers.current[source.id].setOpacity(opacity[source.id])
  }, [opacity])

  useEffect(() => {
    const features: Feature[] = []
    if (points.length > 1) {
      features.push(new Feature({
        geometry: new LineString(points.map(point => [...point])),
      }))
      features[0].setStyle(new Style({ stroke: new Stroke({ color: '#ffcc67', width: 4 }) }))
    }
    points.forEach((point, index) => {
      const feature = new Feature({ geometry: new Point([...point]) })
      feature.setStyle(new Style({
        image: new CircleStyle({ radius: 11, fill: new Fill({ color: '#192b38' }), stroke: new Stroke({ color: '#ffcc67', width: 3 }) }),
        text: new Text({ text: ['A', 'P', 'B'][index], fill: new Fill({ color: '#fff' }), font: 'bold 12px sans-serif' }),
      }))
      features.push(feature)
    })
    vectors.current.clear()
    vectors.current.addFeatures(features)
  }, [points])

  return <div className="map" ref={element} role="application" aria-label="Mapa orbital de Jezero, Marte. Hacé clic para añadir puntos de la ruta." />
}
