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
import Modify from 'ol/interaction/Modify.js'
import Translate from 'ol/interaction/Translate.js'
import Polygon from 'ol/geom/Polygon.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { sources, vikingBase, type LayerId } from '../data/sourceManifest'
import { FALLBACK_EXTENT, ROI, marsProjection } from '../features/map/marsProjection'
import { handleCoordinates, inRegion, regionRing, resizeRegion, shiftRegion,
  validRegion, type Region, type RegionHandle } from '../features/map/planningRegion'
import { WmtsLayerManager, type LayerState } from '../features/map/wmtsLayerManager'
import { loadWmts } from '../features/map/wmtsSources'
import { changeZoom, createGlobalView, createJezeroView, fitCtx, fitGlobal, fitInitialJezero, fitJezero, fitPlanningRegion, zoomAvailability } from '../features/map/viewNavigation'
import { STOP_ORDER, type StopId, type Stops } from '../features/route/routePlan'
import type { MarsPoint } from '../features/route/marsDistance'
import { calculateObstacleAvoidanceRoute, type TerrainMissionRoute, type TerrainRouteResult } from '../features/route/terrainPathfinder'

export type { LayerState } from '../features/map/wmtsLayerManager'
export type MapMode = { type: 'explore' | 'edit-region' } | { type: 'place' | 'move'; id: StopId }
export type MapScope = 'jezero' | 'global'

interface Props {
  scope: MapScope
  enabled: Record<LayerId, boolean>
  opacity: Record<LayerId, number>
  stops: Stops
  mode: MapMode
  region: Region
  panelOpen: boolean
  onRegionChange: (region: Region) => void
  onPlace: (id: StopId, point: MarsPoint) => void
  onMove: (id: StopId, point: MarsPoint) => void
  onInvalid: () => void
  onLayerState: (id: LayerId, state: LayerState) => void
  onBaseState: (state: 'cargando' | 'visible' | 'parcial' | 'error') => void
  baseRetry: number
  suggestedRoute: TerrainMissionRoute | null
  riskThresholds: { caution: number; elevated: number }
}

const markers: Record<StopId, { color: string; text: string }> = {
  A: { color: '#65ddc7', text: 'Origen propuesto' },
  P: { color: '#ffc784', text: 'Parada propuesta' },
  B: { color: '#ff8f77', text: 'Destino propuesto' },
}

export function MapView({ scope, enabled, opacity, stops, mode, region, panelOpen, onRegionChange, onPlace, onMove, onInvalid, onLayerState, onBaseState, baseRetry, suggestedRoute, riskThresholds }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const fallback = useRef<ImageLayer<ImageStatic> | null>(null)
  const baseLayer = useRef(new TileLayer<WMTS>())
  const baseHandler = useRef(onBaseState)
  baseHandler.current = onBaseState
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
  const suggestedVectors = useRef(new VectorSource())
  const suggestedLayer = useRef<VectorLayer<VectorSource> | null>(null)
  const points = useRef(new VectorSource())
  const pointFeatures = useRef(new globalThis.Map<StopId, Feature<Point>>())
  const regionFeature = useRef(new Feature({ geometry: new Polygon([regionRing(region)]) }))
  const regionHandles = useRef(new VectorSource<Feature<Point>>())
  const handleFeatures = useRef(new globalThis.Map<RegionHandle, Feature<Point>>())
  const regionLayer = useRef<VectorLayer<VectorSource> | null>(null)
  const handlesLayer = useRef<VectorLayer<VectorSource<Feature<Point>>> | null>(null)
  const regionRef = useRef(region)
  regionRef.current = region
  const panelRef = useRef(panelOpen)
  panelRef.current = panelOpen
  const routeLayer = useRef<VectorLayer<VectorSource> | null>(null)
  const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const roiLayer = useRef<VectorLayer<VectorSource> | null>(null)
  const modify = useRef<Modify | null>(null)
  const handleModify = useRef<Modify | null>(null)
  const regionTranslate = useRef<Translate | null>(null)
  const regionChangeHandler = useRef(onRegionChange)
  regionChangeHandler.current = onRegionChange
  const dragOrigin = useRef<MarsPoint | null>(null)
  const skipClick = useRef(false)
  const handler = useRef(onPlace)
  const moveHandler = useRef(onMove)
  const invalidHandler = useRef(onInvalid)
  const stateHandler = useRef(onLayerState)
  const modeRef = useRef(mode)
  const previousEdit = useRef(false)
  const [regionError, setRegionError] = useState(false)
  const [zoom, setZoom] = useState({ in: true, out: true })
  handler.current = onPlace
  moveHandler.current = onMove
  invalidHandler.current = onInvalid
  stateHandler.current = onLayerState
  modeRef.current = mode

  function reportState(id: LayerId, state: LayerState) {
    if (scopeRef.current === 'global') {
      if (id !== 'mola' && state !== 'apagada') return
    } else if (!enabledRef.current[id] && state !== 'apagada') return
    stateHandler.current(id, state)
  }
  const reportHandler = useRef(reportState)
  reportHandler.current = reportState

  useEffect(() => {
    if (!element.current) return
    // Miniatura USGS usada por el globo: solo contexto global de baja
    // resolución, nunca reemplaza detalles de CTX ni se estira sobre Jezero.
    const vikingFallback = new ImageLayer({
      source: new ImageStatic({
        url: `${import.meta.env.BASE_URL}data/mars-viking-global-1024.webp`,
        projection: marsProjection,
        imageExtent: [-180, -90, 180, 90],
        attributions: 'Respaldo global colorizado de baja resolución (≈21 km/píxel ecuatorial): NASA Ames/USGS · Viking MDIM 2.1',
      }),
    })
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
    const suggested = new VectorLayer({ source: suggestedVectors.current })
    suggestedLayer.current = suggested
    const markerLayer = new VectorLayer({ source: points.current })
    const regionVector = new VectorSource({ features: [regionFeature.current] })
    const regionOutline = new VectorLayer({ source: regionVector,
      style: new Style({ fill: new Fill({ color: '#ffc78411' }),
        stroke: new Stroke({ color: '#ffbf77', width: 3, lineDash: [9, 6] }) }) })
    regionLayer.current = regionOutline
    const handles = new VectorLayer({ source: regionHandles.current,
      style: new Style({ image: new CircleStyle({ radius: 11, fill: new Fill({ color: '#f1b776' }),
        stroke: new Stroke({ color: '#17262a', width: 3 }) }) }) })
    handlesLayer.current = handles
    routeLayer.current = route
    markerLayerRef.current = markerLayer
    const border = new VectorLayer({
      source: new VectorSource({ features: [new Feature({
        geometry: new Polygon([regionRing(ROI)]),
      })] }),
      style: new Style({ stroke: new Stroke({ color: '#79e9e0', width: 3, lineDash: [3, 5] }) }),
    })
    roiLayer.current = border
    function redrawRoute() {
      vectors.current.clear()
      for (const [from, to] of [['A', 'P'], ['P', 'B']] as [StopId, StopId][]) {
        const first = pointFeatures.current.get(from)?.getGeometry()?.getCoordinates() as MarsPoint | undefined
        const last = pointFeatures.current.get(to)?.getGeometry()?.getCoordinates() as MarsPoint | undefined
        if (!first || !last) continue
        const curvedCoords = calculateObstacleAvoidanceRoute(first, last, 28)
        const segment = new Feature({ geometry: new LineString(curvedCoords.map(p => [p[0], p[1]])) })
        segment.setStyle([
          new Style({ stroke: new Stroke({ color: '#0f172a', width: 8, lineCap: 'round', lineJoin: 'round' }) }),
          new Style({ stroke: new Stroke({ color: '#f59e0b', width: 4.5, lineCap: 'round', lineJoin: 'round' }) }),
          new Style({ stroke: new Stroke({ color: '#00f0ff', width: 1.8, lineCap: 'round', lineJoin: 'round' }) }),
        ])
        vectors.current.addFeature(segment)
      }
    }
    points.current.on('changefeature', redrawRoute)
    const jezero = createJezeroView()
    localView.current = jezero
    const instance = new Map({
      target: element.current,
      layers: [vikingFallback, baseLayer.current, local, layers.current.ctx, layers.current.mola, layers.current.themis,
        border, regionOutline, route, suggested, markerLayer, handles],
      view: jezero,
      controls: defaultControls({ zoom: false, rotate: false }),
    })
    manager.current = new WmtsLayerManager(layers.current, (id, state) => reportHandler.current(id, state))
    const drag = new Modify({ source: points.current, hitDetection: markerLayer, pixelTolerance: 18,
      style: new Style({ image: new CircleStyle({ radius: 18, fill: new Fill({ color: '#263a42' }),
        stroke: new Stroke({ color: '#fff0ba', width: 3 }) }) }) })
    modify.current = drag
    instance.addInteraction(drag)
    // El editor de región tiene interacciones independientes: solo sus
    // manejadores modifican esquinas/lados; el interior traslada el rectángulo.
    let original: Region | null = null
    let activeHandle: RegionHandle | null = null
    const refreshRegion = (bounds: Region) => {
      (regionFeature.current.getGeometry() as Polygon).setCoordinates([regionRing(bounds)])
      for (const [id, coord] of Object.entries(handleCoordinates(bounds)) as [RegionHandle, number[]][]) {
        const feature = handleFeatures.current.get(id)
        if (feature) feature.getGeometry()!.setCoordinates(coord)
      }
    }
    const editHandles = new Modify({ source: regionHandles.current, hitDetection: handles, pixelTolerance: 18,
      style: new Style({ image: new CircleStyle({ radius: 13, fill: new Fill({ color: '#f1b776' }),
        stroke: new Stroke({ color: '#fff', width: 3 }) }) }) })
    handleModify.current = editHandles
    const moveRegion = new Translate({ layers: [regionOutline], hitTolerance: 0 })
    regionTranslate.current = moveRegion
    instance.addInteraction(moveRegion)
    instance.addInteraction(editHandles) // más reciente: prioridad sobre Translate
    editHandles.on('modifystart', event => {
      original = [...regionRef.current] as Region
      activeHandle = event.features.item(0)?.getId() as RegionHandle | null
      skipClick.current = true
    })
    regionHandles.current.on('changefeature', event => {
      if (!original || !activeHandle || !event.feature || event.feature.getId() !== activeHandle) return
      const coord = (event.feature.getGeometry() as Point | undefined)?.getCoordinates()
      if (!coord) return
      const candidate = resizeRegion(original, activeHandle, coord)
      if (validRegion(candidate)) (regionFeature.current.getGeometry() as Polygon).setCoordinates([regionRing(candidate)])
    })
    editHandles.on('modifyend', event => {
      if (!original || !activeHandle) return
      const coord = (event.features.item(0)?.getGeometry() as Point | undefined)?.getCoordinates()
      const next = coord ? resizeRegion(original, activeHandle, coord) : original
      refreshRegion(validRegion(next) ? next : original)
      if (validRegion(next) && next.some((value, i) => value !== original![i])) regionChangeHandler.current(next)
      else if (!validRegion(next)) setRegionError(true)
      original = null
      activeHandle = null
    })
    let moveStart: Region | null = null
    moveRegion.on('translatestart', () => { moveStart = [...regionRef.current] as Region; skipClick.current = true })
    moveRegion.on('translating', event => {
      if (!moveStart) return
      const next = shiftRegion(moveStart, event.coordinate[0] - event.startCoordinate[0],
        event.coordinate[1] - event.startCoordinate[1])
      if (validRegion(next)) refreshRegion(next)
    })
    moveRegion.on('translateend', event => {
      if (!moveStart) return
      const next = shiftRegion(moveStart, event.coordinate[0] - event.startCoordinate[0],
        event.coordinate[1] - event.startCoordinate[1])
      refreshRegion(validRegion(next) ? next : moveStart)
      if (validRegion(next) && next.some((value, i) => value !== moveStart![i])) regionChangeHandler.current(next)
      else if (!validRegion(next)) setRegionError(true)
      moveStart = null
    })
    drag.on('modifystart', event => {
      const feature = event.features.item(0)
      const coordinate = (feature?.getGeometry() as Point | undefined)?.getCoordinates()
      dragOrigin.current = coordinate ? [coordinate[0], coordinate[1]] : null
      skipClick.current = true
    })
    const resetClickGuard = () => { skipClick.current = false }
    element.current.addEventListener('pointerdown', resetClickGuard)
    drag.on('modifyend', event => {
      const feature = event.features.item(0)
      const coordinate = (feature?.getGeometry() as Point | undefined)?.getCoordinates()
      const origin = dragOrigin.current
      dragOrigin.current = null
      window.setTimeout(() => { skipClick.current = false }, 500)
      if (!feature || !coordinate || !origin) return
      if (coordinate[0] === origin[0] && coordinate[1] === origin[1]) return
      if (scopeRef.current !== 'jezero' || !inRegion(coordinate, regionRef.current) ||
          !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])) {
        (feature.getGeometry() as Point).setCoordinates([...origin])
        invalidHandler.current()
        return
      }
      moveHandler.current(feature.getId() as StopId, [coordinate[0], coordinate[1]])
    })
    instance.updateSize()
    fitInitialJezero(jezero, instance.getSize() ?? [900, 650], panelRef.current)
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
      if (skipClick.current) { skipClick.current = false; return }
      if (scopeRef.current !== 'jezero' || selection.type === 'explore' || selection.type === 'edit-region') return
      if (instance.hasFeatureAtPixel(event.pixel, { layerFilter: layer => layer === markerLayer })) return
      if (!inRegion(event.coordinate, regionRef.current)) { invalidHandler.current(); return }
      if (selection.type === 'place' || selection.type === 'move') handler.current(selection.id, [event.coordinate[0], event.coordinate[1]])
    })
    map.current = instance
    return () => {
      observer.disconnect()
      element.current?.removeEventListener('pointerdown', resetClickGuard)
      points.current.un('changefeature', redrawRoute)
      manager.current?.dispose()
      instance.removeInteraction(drag)
      instance.removeInteraction(editHandles)
      instance.removeInteraction(moveRegion)
      modify.current = null
      handleModify.current = null
      regionTranslate.current = null
      manager.current = null
      instance.setTarget(undefined)
      instance.dispose()
      map.current = null
      fallback.current = null
      localView.current = null
      globalView.current = null
      routeLayer.current = null
      suggestedLayer.current = null
      markerLayerRef.current = null
      roiLayer.current = null
      regionLayer.current = null
      handlesLayer.current = null
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let good = 0
    let failed = 0
    baseHandler.current('cargando')
    baseLayer.current.setSource(null)
    loadWmts(vikingBase, controller.signal).then(wmts => {
      if (controller.signal.aborted) return
      wmts.on('tileloadend', () => {
        good++
        baseHandler.current(failed ? 'parcial' : 'visible')
      })
      wmts.on('tileloaderror', () => {
        failed++
        baseHandler.current(good ? 'parcial' : 'error')
      })
      baseLayer.current.setSource(wmts)
    }).catch(error => {
      if (controller.signal.aborted) return
      baseHandler.current('error')
      console.warn('Fondo Viking WMTS:', error)
    })
    return () => { controller.abort(); baseLayer.current.setSource(null) }
  }, [baseRetry])

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
    baseLayer.current.setVisible(scope === 'jezero')
    const fallbackLayer = map.current.getLayers().item(0)
    fallbackLayer?.setVisible(scope === 'jezero')
    routeLayer.current?.setVisible(scope === 'jezero')
    suggestedLayer.current?.setVisible(scope === 'jezero')
    markerLayerRef.current?.setVisible(scope === 'jezero')
    roiLayer.current?.setVisible(scope === 'jezero')
    regionLayer.current?.setVisible(scope === 'jezero' && modeRef.current.type !== 'explore')
    handlesLayer.current?.setVisible(scope === 'jezero' && modeRef.current.type === 'edit-region')
    modify.current?.setActive(scope === 'jezero' && modeRef.current.type !== 'edit-region')
    handleModify.current?.setActive(scope === 'jezero' && modeRef.current.type === 'edit-region')
    regionTranslate.current?.setActive(scope === 'jezero' && modeRef.current.type === 'edit-region')
    for (const source of sources) manager.current?.setEnabled(source.id, scope === 'global' ? source.id === 'mola' : enabled[source.id])
    setZoom(zoomAvailability(map.current.getView()))
  }, [enabled, scope])

  useEffect(() => {
    suggestedVectors.current.clear()
    routeLayer.current?.setVisible(scope === 'jezero' && !suggestedRoute)
    if (!suggestedRoute) return
    function addLine(points: MarsPoint[], color: string, dashed = false) {
      if (points.length < 2) return
      const feature = new Feature({ geometry: new LineString(points.map(point => [...point])) })
      feature.setStyle([
        new Style({ stroke: new Stroke({ color: dashed ? '#f4e8d6' : '#0e1b20', width: 9 }) }),
        new Style({ stroke: new Stroke({ color, width: 4, lineDash: dashed ? [7, 7] : undefined }) }),
      ])
      suggestedVectors.current.addFeature(feature)
    }
    function leg(result: TerrainRouteResult | null, from: MarsPoint | undefined, to: MarsPoint | undefined) {
      if (!from || !to) return
      if (!result?.ok) {
        // No data do not become a fictional computed path; straight dashed
        // line is only the user's original manual connection.
        addLine([from, to], '#101315', true)
        return
      }
      let run: MarsPoint[] = []
      let previous = ''
      for (let i = 0; i < result.points.length - 1; i++) {
        const slope = result.segmentSlopeDegrees[i]
        const color = slope >= riskThresholds.elevated ? '#f27c6c' :
          slope >= riskThresholds.caution ? '#f3ca73' : '#67d59b'
        if (color !== previous && run.length) {
          addLine(run, previous)
          run = []
        }
        if (!run.length) run.push(result.points[i])
        run.push(result.points[i + 1])
        previous = color
      }
      addLine(run, previous)
    }
    leg(suggestedRoute.first, stops.A, stops.P)
    leg(suggestedRoute.second, stops.P, stops.B)
  }, [suggestedRoute, stops, riskThresholds, scope])

  useEffect(() => {
    (regionFeature.current.getGeometry() as Polygon).setCoordinates([regionRing(region)])
    const positions = handleCoordinates(region)
    for (const [id, coord] of Object.entries(positions) as [RegionHandle, number[]][]) {
      let feature = handleFeatures.current.get(id)
      if (!feature) {
        feature = new Feature({ geometry: new Point(coord) })
        feature.setId(id)
        handleFeatures.current.set(id, feature)
        regionHandles.current.addFeature(feature)
      } else feature.getGeometry()!.setCoordinates(coord)
    }
  }, [region])

  useEffect(() => {
    const edit = scope === 'jezero' && mode.type === 'edit-region'
    let frame = 0
    if (edit && !previousEdit.current && map.current) {
      // El modo exploración enfoca CTX; al editar debe verse TODA la región,
      // incluso si fue ampliada o movida por el usuario.
      frame = requestAnimationFrame(() => {
        const instance = map.current
        if (!instance) return
        instance.updateSize()
        fitPlanningRegion(instance.getView(), regionRef.current, instance.getSize() ?? [900, 650])
      })
    }
    previousEdit.current = edit
    regionLayer.current?.setVisible(scope === 'jezero' && mode.type !== 'explore')
    regionLayer.current?.setStyle(new Style({
      fill: new Fill({ color: edit ? '#ffc78411' : '#ffc78404' }),
      stroke: new Stroke({ color: edit ? '#ffbf77' : '#ffa95788', width: edit ? 3 : 1.5,
        lineDash: edit ? [9, 6] : [5, 7] }),
    }))
    handlesLayer.current?.setVisible(edit)
    modify.current?.setActive(scope === 'jezero' && !edit)
    handleModify.current?.setActive(edit)
    regionTranslate.current?.setActive(edit)
    return () => cancelAnimationFrame(frame)
  }, [mode, scope])

  useEffect(() => {
    for (const source of sources) layers.current[source.id].setOpacity(opacity[source.id])
  }, [opacity])

  useEffect(() => {
    for (const id of STOP_ORDER) {
      const point = stops[id]
      let feature = pointFeatures.current.get(id)
      if (!point) {
        if (feature) { points.current.removeFeature(feature); pointFeatures.current.delete(id) }
        continue
      }
      if (!feature) {
        feature = new Feature({ geometry: new Point([...point]) })
        feature.setId(id)
        pointFeatures.current.set(id, feature)
        points.current.addFeature(feature)
      } else {
        const coordinate = feature.getGeometry()!.getCoordinates()
        if (coordinate[0] !== point[0] || coordinate[1] !== point[1]) feature.getGeometry()!.setCoordinates([...point])
      }
      feature.setStyle(new Style({
        image: new CircleStyle({
          radius: mode.type === 'move' && mode.id === id ? 17 : 15,
          fill: new Fill({ color: '#162a32' }),
          stroke: new Stroke({ color: markers[id].color, width: 4 }),
        }),
        text: new Text({ text: id, fill: new Fill({ color: '#fff' }), font: 'bold 14px sans-serif' }),
      }))
    }
  }, [stops, mode, scope])

  return (
    <div className="map-shell">
      <div className={`map ${scope === 'jezero' && mode.type !== 'explore' && mode.type !== 'edit-region' ? 'map--placing' : ''}`} ref={element}
        role="application" aria-label={scope === 'global' ? 'Vista 2D global de Marte: relieve visual MOLA, sin planificación de rutas.' :
           'Mapa de Jezero: región manual naranja, cobertura CTX comprobada turquesa. La imagen fuera de CTX puede no estar disponible.'} />
      <div className="nav-tools" aria-label="Controles de navegación del mapa">
        <button type="button" aria-label="Acercar mapa" title="Acercar" disabled={!zoom.in}
          onClick={() => { if (map.current) changeZoom(map.current.getView(), 0.75) }}>+</button>
        <button type="button" aria-label="Alejar mapa" title="Alejar" disabled={!zoom.out}
          onClick={() => { if (map.current) changeZoom(map.current.getView(), -0.75) }}>−</button>
        <button type="button" className="nav-home"
          aria-label={scope === 'global' ? 'Reencuadrar Marte global' : 'Ver Jezero completo'}
          onClick={() => { if (map.current) (scope === 'global' ? fitGlobal : fitJezero)(
            map.current.getView(), map.current.getSize() ?? [900, 650], panelRef.current) }}>
          {scope === 'global' ? '◎' : 'Ver Jezero completo'}</button>
        {scope === 'jezero' && <button type="button" className="nav-preset" onClick={() => {
          if (map.current) fitCtx(map.current.getView(), map.current.getSize() ?? [900, 650], panelRef.current)
        }}>Ver sector CTX</button>}
      </div>
      <div className="map-hint" aria-live="polite">
        {scope === 'global' ? 'Contexto MOLA global · no disponible para planificación' :
          mode.type === 'edit-region' ? 'Región manual naranja · arrastrá esquinas, bordes o el interior' :
           mode.type === 'explore' ? 'Viking: contexto global · CTX turquesa: detalle auditado · editá región desde Ruta' :
          `${mode.type === 'move' ? 'Mover' : 'Colocar'} ${'id' in mode ? mode.id : ''} · tocá la región manual. También podés arrastrar marcadores existentes.`}
      </div>
      {regionError && <div className="region-error" role="alert">Región no modificada: tamaño mínimo o límite del editor en Jezero.
        <button type="button" onClick={() => setRegionError(false)} aria-label="Cerrar aviso de región">×</button></div>}
    </div>
  )
}
