import { lazy, Suspense, useCallback, useReducer, useState } from 'react'
import { MapView, type LayerState, type MapMode, type MapScope } from '../components/MapView'
import { GlobeBoundary } from '../components/GlobeBoundary'
import { sources, vikingBase, type LayerId } from '../data/sourceManifest'
import { ROI, insideRoi } from '../features/map/marsProjection'
import { JEZERO_CONTEXT, inRegion, segmentCoverage, validRegion, type Region } from '../features/map/planningRegion'
import { initialRoutePlan, routeLegs, routePlanReducer, STOP_ORDER, type StopId } from '../features/route/routePlan'
import type { MarsPoint } from '../features/route/marsDistance'

type Panel = 'route' | 'layers' | 'science'
const MarsGlobe = lazy(() => import('../components/MarsGlobe').then(module => ({ default: module.MarsGlobe })))
const initialEnabled: Record<LayerId, boolean> = { ctx: true, mola: false, themis: false }
const initialOpacity: Record<LayerId, number> = { ctx: 1, mola: 0.75, themis: 0.75 }
const stops: Record<StopId, { title: string; sub: string }> = {
  A: { title: 'Origen', sub: 'Inicio propuesto' },
  P: { title: 'Parada', sub: 'Investigación propuesta' },
  B: { title: 'Destino', sub: 'Final propuesto' },
}
const formatPoint = (point: MarsPoint) => `${point[1].toFixed(5)}°N · ${point[0].toFixed(5)}°E`
const formatKm = (meters: number | null) => meters === null ? 'Sin datos' : `${(meters / 1000).toFixed(2)} km`

export function App() {
  const [screen, setScreen] = useState<'globe' | 'map'>('globe')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [states, setStates] = useState<Record<LayerId, LayerState>>({
    ctx: 'cargando', mola: 'apagada', themis: 'apagada',
  })
  const [baseState, setBaseState] = useState<'cargando' | 'visible' | 'parcial' | 'error'>('cargando')
  const [baseRetry, setBaseRetry] = useState(0)
  const [plan, dispatch] = useReducer(routePlanReducer, initialRoutePlan)
  const [selected, setSelected] = useState<LayerId>('ctx')
  const [mode, setMode] = useState<MapMode>({ type: 'explore' })
  const [region, setRegion] = useState<Region>(JEZERO_CONTEXT)
  const [scope, setScope] = useState<MapScope>('jezero')
  const [panel, setPanel] = useState<Panel | null>('route')
  const [routeNotice, setRouteNotice] = useState<string | null>(null)
  const source = sources.find(item => item.id === selected)!
  const legs = routeLegs(plan.stops)
  const count = STOP_ORDER.filter(id => plan.stops[id]).length
  const outsideStops = STOP_ORDER.filter(id => plan.stops[id] && !inRegion(plan.stops[id]!, region))
  const openJezero = useCallback(() => {
    setScope('jezero')
    setMode({ type: 'explore' })
    setScreen('map')
  }, [])
  const globeFailed = useCallback(() => {
    setScope('global')
    setScreen('map')
  }, [])
  const goHome = useCallback(() => {
    setScreen('globe')
    setMode({ type: 'explore' })
  }, [])

  function place(id: StopId, point: MarsPoint) {
    if (scope !== 'jezero' || (mode.type !== 'place' && mode.type !== 'move') || mode.id !== id) return
    if (!inRegion(point, region)) { setRouteNotice('Fuera de la región elegida: el punto no cambió. Podés ampliar la región o seleccionar otra posición.'); return }
    dispatch({ type: 'set', id, point, region })
    setRouteNotice(null)
    setMode({ type: 'explore' })
  }
  function movePoint(id: StopId, point: MarsPoint) {
    if (scope !== 'jezero' || !plan.stops[id]) return
    if (!inRegion(point, region)) { setRouteNotice('Fuera de la región elegida: el punto no cambió. Podés ampliar la región o moverlo adentro.'); return }
    dispatch({ type: 'set', id, point, region })
    setRouteNotice(null)
  }
  function changeRegion(next: Region) {
    if (!validRegion(next)) {
      setRouteNotice('Región no modificada: respetá el tamaño mínimo y el entorno local de Jezero.')
      return
    }
    setRegion(next)
    setRouteNotice(null)
  }
  function coverageLabel(first: StopId, second: StopId) {
    const a = plan.stops[first], b = plan.stops[second]
    if (!a || !b) return null
    const coverage = segmentCoverage(a, b, ROI)
    return coverage === 'complete' ? 'CTX verificado en el tramo dibujado' :
      coverage === 'partial' ? 'CTX parcial; sectores sin imagen detallada' : 'Sin imagen CTX detallada'
  }

  function panelButton(id: Panel, label: string) {
    return <button type="button" className={panel === id ? 'tab active' : 'tab'} aria-pressed={panel === id}
      onClick={() => {
        if (mode.type === 'edit-region') setMode({ type: 'explore' })
        setPanel(current => current === id ? null : id)
      }}>{label}</button>
  }

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="brand brand-button"
          onClick={goHome}
          aria-label="Ir a la página de inicio (Globo 3D)"
          title="Ir a la página de inicio (Globo 3D)"
        >
          <span className="brand-mark" aria-hidden="true">⌾</span>
          <div>
            <span className="eyebrow">ATLAS DE EXPLORACIÓN MARCIANA</span>
            <h1>Ares<span>Route</span></h1>
          </div>
        </button>
        <div className="header-right">
          <span className="header-location"><span className="status-dot" /> {screen === 'globe' ? 'MARTE · GLOBO 3D' : scope === 'global' ? 'MARTE · VISTA GLOBAL' : 'JEZERO · MARTE'}</span>
          <span className="header-disclaimer">Prototipo educativo · No apto para uso operacional</span>
        </div>
      </header>

      {screen === 'globe' ? <main className="globe-main">
        <GlobeBoundary onJezero={openJezero}>
          <Suspense fallback={<div className="globe-fallback" role="status">Preparando exploración 3D… <button type="button" onClick={openJezero}>Explorar Jezero en 2D</button></div>}>
            <MarsGlobe onJezero={openJezero} onFailure={globeFailed} />
          </Suspense>
        </GlobeBoundary>
      </main> : <main>
        <div className="toolbar">
          <div className="toolbar-title"><span className="eyebrow">{scope === 'global' ? 'CONTEXTO PLANETARIO · MOLA' : 'REGIÓN DE INVESTIGACIÓN'}</span>
            <strong>{scope === 'global' ? 'Marte global' : 'Jezero Crater'}</strong>
             <span>{scope === 'global' ? 'Relieve visual · sin rutas ni altitudes numéricas' :
               `Región manual: ${region[0].toFixed(2)}–${region[2].toFixed(2)}°E · ${region[1].toFixed(2)}–${region[3].toFixed(2)}°N`}</span></div>
          <nav className="tabs" aria-label="Paneles de exploración">
            {panelButton('route', 'Ruta')}
            {panelButton('layers', 'Capas')}
            {panelButton('science', 'Ciencia y riesgos')}
          </nav>
          {mode.type === 'edit-region' && <div className="edit-shortcuts" aria-label="Controles de región">
            <button type="button" onClick={() => { setMode({ type: 'explore' }); setPanel('route') }}>Terminar edición</button>
            <button type="button" onClick={() => changeRegion(JEZERO_CONTEXT)}>Restablecer región</button>
            <button type="button" onClick={() => changeRegion(ROI)}>Usar sector CTX verificado</button>
          </div>}
          <button type="button" className="scope-toggle" onClick={() => {
            setScope(current => current === 'jezero' ? 'global' : 'jezero')
            setMode({ type: 'explore' })
          }}>{scope === 'global' ? '↙ Volver a Jezero' : '◌ Marte global'}</button>
          <button type="button" className="scope-toggle globe-return" onClick={() => {
            setMode({ type: 'explore' })
            setScreen('globe')
          }}>◉ Volver al globo 3D</button>
        </div>

        <section className={`map-stage${panel ? ' map-stage--panel' : ''}${mode.type === 'edit-region' ? ' map-stage--editing' : ''}`}
          aria-label={scope === 'global' ? 'Vista 2D global de Marte' : 'Explorador 2D de Jezero'}>
          <MapView scope={scope} enabled={enabled} opacity={opacity} stops={plan.stops} mode={mode} panelOpen={panel !== null}
            baseRetry={baseRetry} onBaseState={setBaseState}
            region={region} onRegionChange={changeRegion} onPlace={place}
            onMove={movePoint} onInvalid={() => setRouteNotice('Fuera de la región elegida: el punto no cambió. Ampliá la región o elegí una posición dentro.')}
            onLayerState={(id, state) => setStates(current => current[id] === state ? current : { ...current, [id]: state })} />
          {scope === 'jezero' && <div className="base-status" role="status">
            <a href={vikingBase.sourceUrl} target="_blank" rel="noreferrer">Viking · contexto ↗</a>
            <span>WMTS {baseState}{baseState !== 'visible' ? ' · miniatura local' : ''}</span>
            {baseState === 'error' && <button type="button" onClick={() => setBaseRetry(current => current + 1)}>Reintentar</button>}
          </div>}
          {scope === 'jezero' && routeNotice && <div className="roi-notice" role="alert">
            {routeNotice} Ningún límite indica que una zona sea peligrosa o segura.
            <button type="button" onClick={() => setRouteNotice(null)} aria-label="Cerrar aviso">×</button>
          </div>}

          {panel && <aside className="drawer" aria-label={panel === 'route' ? 'Planificador de ruta' : panel === 'layers' ? 'Capas científicas' : 'Ciencia y riesgos'}>
            <div className="drawer-header"><span className="eyebrow">{panel === 'route' ? 'TRAZADO MANUAL' : panel === 'layers' ? 'DATOS ORBITALES' : 'CONTEXTO CIENTÍFICO'}</span>
              <button type="button" className="close-button" aria-label="Cerrar panel" onClick={() => setPanel(null)}>×</button></div>

            {panel === 'route' && <>
              <h2>Tu recorrido <span className="soft">exploratorio</span></h2>
              {scope === 'global' && <div className="notice"><b>OUT_OF_COVERAGE · Planificación desactivada</b><br />
                El plan de Jezero se conserva, pero en Marte global solo se muestra el relieve MOLA regional. Volvé a Jezero para editar la ruta.</div>}
              <p className="intro">Elegí A/P/B o arrastrá sus marcadores. La región manual aparece al colocar puntos o al editarla; el contorno turquesa identifica CTX auditado. Viking es solo contexto global. Ninguno garantiza transitabilidad.</p>
              <div className="region-actions">
                <button type="button" disabled={scope === 'global'} aria-pressed={mode.type === 'edit-region'}
                  onClick={() => {
                    if (mode.type === 'edit-region') setMode({ type: 'explore' })
                    else { setPanel(null); setMode({ type: 'edit-region' }) }
                  }}>
                  {mode.type === 'edit-region' ? 'Terminar edición' : 'Editar región'}</button>
                <button type="button" disabled={scope === 'global'} onClick={() => changeRegion(JEZERO_CONTEXT)}>Restablecer región</button>
                <button type="button" disabled={scope === 'global'} onClick={() => changeRegion(ROI)}>Usar sector CTX verificado</button>
              </div>
              {mode.type === 'edit-region' && <p className="notice">Arrastrá las esquinas, los lados o el interior para ajustar el rectángulo. Durante esta edición no se mueven los puntos ni el mapa dentro del rectángulo.</p>}
              {outsideStops.length > 0 && <div className="notice" role="status"><b>OUT_OF_COVERAGE · Región manual</b><br />
                {outsideStops.join(', ')} {outsideStops.length === 1 ? 'quedó' : 'quedaron'} fuera de la región elegida. El plan se conserva: ampliá la región o mové cada punto adentro; las distancias siguen siendo geométricas, no una evaluación de riesgo.</div>}
              {scope === 'jezero' && (!enabled.ctx || states.ctx !== 'visible') &&
                <div className="notice"><b>CTX {enabled.ctx ? states.ctx : 'apagada'} · imagen no disponible o no confirmada en este momento</b><br />
                  El respaldo estático cubre solo el sector anterior; fuera de él la imagen depende del servicio WMTS. La cobertura auditada no acredita que una tesela haya cargado ahora. La ruta es una propuesta, no una evaluación del terreno.</div>}
              <div className="mode-strip">
                <button type="button" disabled={scope === 'global'} aria-pressed={mode.type === 'explore'} className={mode.type === 'explore' ? 'mode-active' : ''}
                  onClick={() => setMode({ type: 'explore' })}>✥ &nbsp; Explorar mapa</button>
              </div>
              <ol className="stop-list">
                {STOP_ORDER.map((id, index) => {
                  const point = plan.stops[id]
                  const previous = index === 0 || !!plan.stops[STOP_ORDER[index - 1]]
                  const active = (mode.type === 'place' || mode.type === 'move') && mode.id === id
                  return <li className={active ? 'stop active-stop' : 'stop'} key={id}>
                    <span className={`stop-symbol stop-${id.toLowerCase()}`} aria-hidden="true">{id}</span>
                    <div className="stop-info"><strong>{stops[id].title}</strong><small>{point ? formatPoint(point) : stops[id].sub}</small>
                      {point && !inRegion(point, region) && <small>FUERA DE REGIÓN · corregir</small>}
                      {point && <small>{insideRoi(point) ? 'CTX auditado en este punto' : 'Sin imagen CTX detallada'}</small>}</div>
                    <button type="button" disabled={scope === 'global' || !previous} aria-pressed={active}
                      aria-label={`${point ? 'Mover' : 'Colocar'} ${stops[id].title} ${id}`}
                      onClick={() => setMode(active ? { type: 'explore' } : { type: point ? 'move' : 'place', id })}>
                      {active ? 'Cancelar' : point ? 'Mover' : 'Colocar'}
                    </button>
                    {index === 1 && <span className="leg-detail">A → P <strong>{formatKm(legs.first)}</strong>{coverageLabel('A', 'P') && <small>{coverageLabel('A', 'P')}</small>}</span>}
                    {index === 2 && <span className="leg-detail">P → B <strong>{formatKm(legs.second)}</strong>{coverageLabel('P', 'B') && <small>{coverageLabel('P', 'B')}</small>}</span>}
                  </li>
                })}
              </ol>
              <div className="route-total"><span>Distancia trazada {count < 3 && count > 0 ? '· parcial' : ''}</span>
                <strong>{formatKm(legs.total)}</strong><small>Tramos rectos aproximados, no sendero verificado.</small></div>
              <div className="route-actions"><button type="button" disabled={scope === 'global' || !plan.history.length}
                onClick={() => { dispatch({ type: 'undo' }); setMode({ type: 'explore' }) }}>↶ Deshacer</button>
                <button type="button" disabled={scope === 'global' || !count}
                  onClick={() => { dispatch({ type: 'reset' }); setMode({ type: 'explore' }) }}>Restablecer ruta</button></div>
              <p className="fine-print">Los puntos son propuestas del usuario. Distancias con esfera marciana de radio medio 3 389 500 m; no incluyen relieve ni obstáculos.</p>
            </>}

            {panel === 'layers' && <>
              <h2>Capas científicas</h2>
              <p className="intro">{scope === 'global' ? 'Solo MOLA tiene cobertura global en esta vista. CTX Jezero y THEMIS se conservan para el modo local.' :
                'Tres misiones. Activá y compará imágenes; una capa visual no equivale a una medición de seguridad.'}</p>
              {scope === 'jezero' && <section className="notice" aria-label="Origen del mapa base Viking">
                <b>Mapa base · Viking MDIM 2.1 colorizado</b><br />
                NASA Ames/USGS · Viking. {vikingBase.resolution}. {vikingBase.coverage}. Imágenes históricas 1976–1980;
                fecha local: sin datos. {vikingBase.limitations}{' '}
                <a href={vikingBase.sourceUrl} target="_blank" rel="noreferrer">GetCapabilities oficial ↗</a>
                <br />WMTS: {baseState}; cuando no carga, se ve una miniatura local, no detalle CTX.
              </section>}
              {sources.map(item => <div className="layer-card" key={item.id}>
                <label className="layer-toggle"><input type="checkbox" checked={scope === 'global' ? item.id === 'mola' : enabled[item.id]}
                  disabled={scope === 'global'}
                  onChange={event => setEnabled(current => ({ ...current, [item.id]: event.target.checked }))} />
                  <strong>{item.instrument}</strong><span className={`status ${states[item.id] === 'error' ? 'bad' : ''}`} aria-live="polite">{states[item.id]}</span></label>
                <small>{item.mission} · {item.kind}</small>
                <label className="opacity">Opacidad {Math.round(opacity[item.id] * 100)} %
                  <input type="range" min="0" max="100" value={opacity[item.id] * 100} disabled={!enabled[item.id]}
                    onChange={event => setOpacity(current => ({ ...current, [item.id]: Number(event.target.value) / 100 }))} /></label>
                <button type="button" className="text-button" onClick={() => setSelected(item.id)}>Ver ficha y leyenda →</button>
              </div>)}
              <section className="source-details" aria-label="Ficha de fuente"><span className="eyebrow">PROVENIENCIA · {source.kind}</span>
                <h3>{source.title}</h3><p><b>Leyenda:</b> {source.legend}</p>
                <dl><dt>Producto</dt><dd>{source.productId}</dd><dt>Resolución</dt><dd>{source.resolution}</dd>
                  <dt>Cobertura publicada</dt><dd>{source.coverage}</dd><dt>Adquisición</dt><dd>{source.acquisitionDate}</dd>
                  <dt>Créditos</dt><dd>{source.attribution}</dd></dl>
                <p><b>Límite:</b> {source.limitations}</p>
                <a href={source.sourceUrl} target="_blank" rel="noreferrer">GetCapabilities oficial ↗</a>
              </section>
            </>}

            {panel === 'science' && <>
              <h2>¿Por qué Jezero?</h2><p>NASA describe un antiguo sistema de lago y delta fluvial en Jezero. Sus depósitos podrían preservar indicios del ambiente antiguo. Explorarlos tiene valor científico; <b>no implica haber descubierto vida</b>.</p>
              <a href="https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/" target="_blank" rel="noreferrer">Objetivos de Perseverance · NASA ↗</a>
              <h3>Riesgos y evidencia</h3>
              <div className="notice"><b>UNVERIFIED · Perfil y pendientes</b><br />
                El DEM CTX numérico USGS de 20 m/píxel tiene muestras válidas en un recorte anterior; su cobertura en la región manual, referencia vertical y registro con estas capas no están validados. No se publican cotas, desniveles ni pendientes.
                {' '}<a href="https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic" target="_blank" rel="noreferrer">Ficha DEM USGS ↗</a></div>
              <div className="notice"><b>LOW_RESOLUTION · MOLA</b><br />El relieve visual regional no permite detectar rocas o escalones.</div>
              <div className="notice"><b>UNVERIFIED · Ruta</b><br />Transitabilidad, obstáculos pequeños, clima y radiación locales no evaluados. Las paradas elegidas son propuestas del usuario, no sitios de muestreo verificados.</div>
            </>}
          </aside>}

          <div className="map-counter" aria-live="polite"><span className="eyebrow">PLAN MANUAL</span>
            <strong>{scope === 'global' ? 'Jezero' : formatKm(legs.total)}</strong>
            <small>{scope === 'global' ? `${count}/3 puntos conservados · solo contexto` :
              `${count}/3 puntos · ${count < 3 ? 'trayecto incompleto' : 'trazado completo'}`}</small></div>
        </section>
      </main>}
      <footer className="footer">
        <span>{screen === 'globe' ? 'Globo esférico: relieve MGS MOLA NASA/USGS o mosaico Viking MDIM 2.1 colorizado NASA Ames/USGS. Jezero: 18.41°N, 77.69°E (USGS/IAU); el centro del cráter no es un punto de ruta documentado.' :
          'Fondo Viking MDIM 2.1 colorizado: NASA Ames/USGS · Mars Trek (respaldo local global de baja resolución). CTX: NASA/JPL-Caltech/USGS · una sola tesela de respaldo local. MOLA: NASA/JPL-Caltech. THEMIS: NASA/JPL-Caltech/ASU. La región manual no indica cobertura científica.'}</span>
        <strong>Prototipo independiente · No apto para uso operacional.</strong>
      </footer>
    </div>
  )
}
