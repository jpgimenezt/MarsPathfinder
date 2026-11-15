import { lazy, Suspense, useCallback, useReducer, useState } from 'react'
import { MapView, type LayerState, type MapMode, type MapScope } from '../components/MapView'
import { GlobeBoundary } from '../components/GlobeBoundary'
import { AresAgentChat } from '../components/AresAgentChat'
import { sources, type LayerId } from '../data/sourceManifest'
import { insideAnyActiveRoi, insideRoi } from '../features/map/marsProjection'
import { initialRoutePlan, routeLegs, routePlanReducer, STOP_ORDER, type StopId } from '../features/route/routePlan'
import type { MarsPoint } from '../features/route/marsDistance'
import '../styles/agentChat.css'
import '../styles/terrain3D.css'

type AppScreen = 'terrain3d' | 'globe' | 'map'
type Panel = 'route' | 'layers' | 'science'

const MarsGlobe = lazy(() => import('../components/MarsGlobe').then(module => ({ default: module.MarsGlobe })))
const MarsTerrain3D = lazy(() => import('../components/MarsTerrain3D').then(module => ({ default: module.MarsTerrain3D })))

const initialEnabled: Record<LayerId, boolean> = { ctx: true, mola: false, themis: false }
const initialOpacity: Record<LayerId, number> = { ctx: 1, mola: 0.75, themis: 0.75 }
const stops: Record<StopId, { title: string; sub: string }> = {
  A: { title: 'Origen', sub: 'Inicio propuesto' },
  P: { title: 'Parada', sub: 'Investigación propuesta' },
  B: { title: 'Destino', sub: 'Final propuesto' },
}

const formatPoint = (point: MarsPoint) =>
  `${point[1] >= 0 ? `${point[1].toFixed(5)}°N` : `${Math.abs(point[1]).toFixed(5)}°S`} · ${point[0].toFixed(5)}°E`

const formatKm = (meters: number | null) => (meters === null ? 'Sin datos' : `${(meters / 1000).toFixed(2)} km`)

export function App() {
  const [screen, setScreen] = useState<AppScreen>('globe')
  const [autoTriggerDive, setAutoTriggerDive] = useState(false)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [states, setStates] = useState<Record<LayerId, LayerState>>({
    ctx: 'cargando',
    mola: 'apagada',
    themis: 'apagada',
  })
  const [plan, dispatch] = useReducer(routePlanReducer, initialRoutePlan)
  const [selected, setSelected] = useState<LayerId>('ctx')
  const [mode, setMode] = useState<MapMode>({ type: 'explore' })
  const [scope, setScope] = useState<MapScope>('jezero')
  const [panel, setPanel] = useState<Panel | null>('route')
  const [isAgentOpen, setIsAgentOpen] = useState(false)

  const source = sources.find(item => item.id === selected)!
  const legs = routeLegs(plan.stops)
  const count = STOP_ORDER.filter(id => plan.stops[id]).length

  const openJezero = useCallback(() => {
    setScope('jezero')
    setMode({ type: 'explore' })
    setScreen('map')
  }, [])

  const openGaleTerrain = useCallback((dive = true) => {
    setAutoTriggerDive(dive)
    setScreen('terrain3d')
  }, [])

  const globeFailed = useCallback(() => {
    setScope('global')
    setScreen('map')
  }, [])

  function place(id: StopId, point: MarsPoint) {
    if (scope !== 'jezero' || mode.type === 'explore' || mode.id !== id || !insideRoi(point)) return
    dispatch({ type: 'set', id, point })
    setMode({ type: 'explore' })
  }

  function handleSelectScienceStopFrom3D(point: MarsPoint, _name: string) {
    if (!insideAnyActiveRoi(point)) return
    if (!plan.stops.A) {
      // Si aún no hay base A, fijar Yellowknife Bay como base
      dispatch({ type: 'set', id: 'A', point: [137.441, -4.589] })
    }
    dispatch({ type: 'set', id: 'P', point })
  }

  function panelButton(id: Panel, label: string) {
    return (
      <button
        type="button"
        className={panel === id ? 'tab active' : 'tab'}
        aria-pressed={panel === id}
        onClick={() => setPanel(current => (current === id ? null : id))}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="ares-insignia" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="28" height="28" className="ares-logo-svg">
              <polygon points="20,2 38,12 38,28 20,38 2,28 2,12" fill="none" stroke="#00f0ff" strokeWidth="2" />
              <polygon points="20,9 31,15 31,25 20,31 9,25 9,15" fill="rgba(0, 240, 255, 0.15)" stroke="#ff7300" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="3.5" fill="#ffffff" />
            </svg>
          </div>
          <div>
            <span className="eyebrow">NASA SPACE APPS 2026 // FLIGHT OPERATIONS</span>
            <h1 className="ares-brand-title">
              ARES<span>-NAV</span> <span className="ares-brand-sub">TACTICAL SYSTEM</span>
            </h1>
          </div>
        </div>

        {/* Selector Central Segmentado FUI */}
        <nav className="header-nav-modes" aria-label="Selector de visualizador ARES">
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'terrain3d' ? 'active' : ''}`}
            onClick={() => openGaleTerrain(true)}
            title="Visualizador 3D de terreno de Gale Crater y Mount Sharp con descenso continuo Google Earth"
          >
            <span className="nav-btn-code">01</span>
            <span className="nav-btn-text">GALE 3D</span>
          </button>
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'globe' ? 'active' : ''}`}
            onClick={() => setScreen('globe')}
            title="Globo 3D planetario de Marte (MGS MOLA / Viking)"
          >
            <span className="nav-btn-code">02</span>
            <span className="nav-btn-text">GLOBO ORBITAL</span>
          </button>
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'map' ? 'active' : ''}`}
            onClick={() => {
              setScope('jezero')
              setScreen('map')
            }}
            title="Mapa cartográfico 2D de Jezero Crater con capas WMTS"
          >
            <span className="nav-btn-code">03</span>
            <span className="nav-btn-text">JEZERO 2D</span>
          </button>
          <button
            type="button"
            className={`nav-mode-btn nav-mode-agent ${isAgentOpen ? 'active' : ''}`}
            onClick={() => setIsAgentOpen(prev => !prev)}
            title="Consola Táctica Copiloto ARES-NAV (IA con verificación geodésica)"
          >
            <span className="nav-mode-pulse" aria-hidden="true" />
            <span className="nav-btn-code">AI</span>
            <span className="nav-btn-text">COPILOTO</span>
          </button>
        </nav>

        <div className="header-right">
          <div className="telemetry-block">
            <span className="telemetry-micro">MET CLOCK</span>
            <span className="telemetry-clock">SOL 3148 · 14:22 UTC-M</span>
          </div>
          <span className="header-location">
            <span className="status-dot" />
            {screen === 'terrain3d'
              ? 'GALE CRATER // 3D'
              : screen === 'globe'
              ? 'MARTE GLOBAL // 3D'
              : scope === 'global'
              ? 'MARTE GLOBAL // 2D'
              : 'JEZERO CRATER // 2D'}
          </span>
        </div>
      </header>

      {/* Pantalla 1: Terreno 3D Georreferenciado de Gale Crater y Mount Sharp */}
      {screen === 'terrain3d' && (
        <main className="terrain-main">
          <Suspense
            fallback={
              <div className="globe-fallback" role="status">
                Cargando relieve 3D georreferenciado de Gale Crater y Mount Sharp…
                <button type="button" onClick={openJezero}>
                  Explorar Jezero en 2D
                </button>
              </div>
            }
          >
            <MarsTerrain3D
              currentStops={plan.stops}
              initialDive={autoTriggerDive}
              onSelectScienceStop={handleSelectScienceStopFrom3D}
              onSwitchToGlobal={() => setScreen('globe')}
              onSwitchToJezero2D={openJezero}
            />
          </Suspense>
        </main>
      )}

      {/* Pantalla 2: Globo 3D Planetario */}
      {screen === 'globe' && (
        <main className="globe-main">
          <GlobeBoundary onJezero={openJezero}>
            <Suspense
              fallback={
                <div className="globe-fallback" role="status">
                  Preparando exploración 3D…{' '}
                  <button type="button" onClick={openJezero}>
                    Explorar Jezero en 2D
                  </button>
                </div>
              }
            >
              <MarsGlobe
                onJezero={openJezero}
                onGaleTerrain={() => openGaleTerrain(true)}
                onFailure={globeFailed}
              />
            </Suspense>
          </GlobeBoundary>
        </main>
      )}

      {/* Pantalla 3: Mapa Cartográfico 2D GIS con OpenLayers y Capas WMTS */}
      {screen === 'map' && (
        <main>
          <div className="toolbar">
            <div className="toolbar-title">
              <span className="eyebrow">
                {scope === 'global' ? 'CONTEXTO PLANETARIO · MOLA' : 'REGIÓN DE INVESTIGACIÓN'}
              </span>
              <strong>{scope === 'global' ? 'Marte global' : 'Jezero Crater'}</strong>
              <span>
                {scope === 'global'
                  ? 'Relieve visual · sin rutas ni altitudes numéricas'
                  : '77.35–77.51°E · 18.30–18.45°N'}
              </span>
            </div>
            <nav className="tabs" aria-label="Paneles de exploración">
              {panelButton('route', 'Ruta')}
              {panelButton('layers', 'Capas')}
              {panelButton('science', 'Ciencia y riesgos')}
              <button
                type="button"
                className={`tab tab-agent ${isAgentOpen ? 'active' : ''}`}
                aria-pressed={isAgentOpen}
                onClick={() => setIsAgentOpen(prev => !prev)}
                title="Copiloto Táctico ARES-NAV (IA)"
              >
                <span className="tab-agent-indicator" aria-hidden="true" />
                Copiloto táctico
              </button>
            </nav>
            <button
              type="button"
              className="scope-toggle"
              onClick={() => {
                setScope(current => (current === 'jezero' ? 'global' : 'jezero'))
                setMode({ type: 'explore' })
              }}
            >
              {scope === 'global' ? '↙ Volver a Jezero' : '◌ Marte global'}
            </button>
            <button
              type="button"
              className="scope-toggle terrain-return"
              onClick={() => {
                setScreen('terrain3d')
              }}
            >
              [01] TERRENO 3D GALE
            </button>
            <button
              type="button"
              className="scope-toggle globe-return"
              onClick={() => {
                setMode({ type: 'explore' })
                setScreen('globe')
              }}
            >
              ◉ Volver al globo 3D
            </button>
          </div>

          <section
            className="map-stage"
            aria-label={scope === 'global' ? 'Vista 2D global de Marte' : 'Explorador 2D de Jezero'}
          >
            <MapView
              scope={scope}
              enabled={enabled}
              opacity={opacity}
              stops={plan.stops}
              mode={mode}
              onPlace={place}
              onLayerState={(id, state) =>
                setStates(current => (current[id] === state ? current : { ...current, [id]: state }))
              }
            />

            {panel && (
              <aside
                className="drawer"
                aria-label={
                  panel === 'route'
                    ? 'Planificador de ruta'
                    : panel === 'layers'
                    ? 'Capas científicas'
                    : 'Ciencia y riesgos'
                }
              >
                <div className="drawer-header">
                  <span className="eyebrow">
                    {panel === 'route'
                      ? 'TRAZADO MANUAL'
                      : panel === 'layers'
                      ? 'DATOS ORBITALES'
                      : 'CONTEXTO CIENTÍFICO'}
                  </span>
                  <button
                    type="button"
                    className="close-button"
                    aria-label="Cerrar panel"
                    onClick={() => setPanel(null)}
                  >
                    [CERRAR]
                  </button>
                </div>

                {panel === 'route' && (
                  <>
                    <h2>
                      Tu recorrido <span className="soft">exploratorio</span>
                    </h2>
                    {scope === 'global' && (
                      <div className="notice">
                        <b>OUT_OF_COVERAGE · Planificación desactivada</b>
                        <br />
                        El plan de Jezero se conserva, pero en Marte global solo se muestra el relieve MOLA
                        regional. Volvé a Jezero para editar la ruta.
                      </div>
                    )}
                    <p className="intro">
                      Elegí explícitamente un punto antes de tocar el mapa. En modo explorar, los toques no alteran el
                      plan.
                    </p>
                    <div className="mode-strip">
                      <button
                        type="button"
                        disabled={scope === 'global'}
                        aria-pressed={mode.type === 'explore'}
                        className={mode.type === 'explore' ? 'mode-active' : ''}
                        onClick={() => setMode({ type: 'explore' })}
                      >
                        [MODO EXPLORAR]
                      </button>
                    </div>
                    <ol className="stop-list">
                      {STOP_ORDER.map((id, index) => {
                        const point = plan.stops[id]
                        const previous = index === 0 || !!plan.stops[STOP_ORDER[index - 1]]
                        const active = mode.type !== 'explore' && mode.id === id
                        return (
                          <li className={active ? 'stop active-stop' : 'stop'} key={id}>
                            <span className={`stop-symbol stop-${id.toLowerCase()}`} aria-hidden="true">
                              {id}
                            </span>
                            <div className="stop-info">
                              <strong>{stops[id].title}</strong>
                              <small>{point ? formatPoint(point) : stops[id].sub}</small>
                            </div>
                            <button
                              type="button"
                              disabled={scope === 'global' || !previous}
                              aria-pressed={active}
                              aria-label={`${point ? 'Mover' : 'Colocar'} ${stops[id].title} ${id}`}
                              onClick={() =>
                                setMode(active ? { type: 'explore' } : { type: point ? 'move' : 'place', id })
                              }
                            >
                              {active ? 'Cancelar' : point ? 'Mover' : 'Colocar'}
                            </button>
                            {index === 1 && (
                              <span className="leg-detail">
                                A → P <strong>{formatKm(legs.first)}</strong>
                              </span>
                            )}
                            {index === 2 && (
                              <span className="leg-detail">
                                P → B <strong>{formatKm(legs.second)}</strong>
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                    <div className="route-total">
                      <span>Distancia trazada {count < 3 && count > 0 ? '· parcial' : ''}</span>
                      <strong>{formatKm(legs.total)}</strong>
                      <small>Tramos rectos aproximados, no sendero verificado.</small>
                    </div>
                    <div className="route-actions">
                      <button
                        type="button"
                        disabled={scope === 'global' || !plan.history.length}
                        onClick={() => {
                          dispatch({ type: 'undo' })
                          setMode({ type: 'explore' })
                        }}
                      >
                        ↶ Deshacer
                      </button>
                      <button
                        type="button"
                        disabled={scope === 'global' || !count}
                        onClick={() => {
                          dispatch({ type: 'reset' })
                          setMode({ type: 'explore' })
                        }}
                      >
                        Restablecer ruta
                      </button>
                    </div>
                    <p className="fine-print">
                      Los puntos son propuestas del usuario. Distancias con esfera marciana de radio medio 3 389 500 m;
                      no incluyen relieve ni obstáculos.
                    </p>
                  </>
                )}

                {panel === 'layers' && (
                  <>
                    <h2>Capas científicas</h2>
                    <p className="intro">
                      {scope === 'global'
                        ? 'Solo MOLA tiene cobertura global en esta vista. CTX Jezero y THEMIS se conservan para el modo local.'
                        : 'Tres misiones. Activá y compará imágenes; una capa visual no equivale a una medición de seguridad.'}
                    </p>
                    {sources.map(item => (
                      <div className="layer-card" key={item.id}>
                        <label className="layer-toggle">
                          <input
                            type="checkbox"
                            checked={scope === 'global' ? item.id === 'mola' : enabled[item.id]}
                            disabled={scope === 'global'}
                            onChange={event =>
                              setEnabled(current => ({ ...current, [item.id]: event.target.checked }))
                            }
                          />
                          <strong>{item.instrument}</strong>
                          <span className={`status ${states[item.id] === 'error' ? 'bad' : ''}`} aria-live="polite">
                            {states[item.id]}
                          </span>
                        </label>
                        <small>
                          {item.mission} · {item.kind}
                        </small>
                        <label className="opacity">
                          Opacidad {Math.round(opacity[item.id] * 100)} %
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity[item.id] * 100}
                            disabled={!enabled[item.id]}
                            onChange={event =>
                              setOpacity(current => ({ ...current, [item.id]: Number(event.target.value) / 100 }))
                            }
                          />
                        </label>
                        <button type="button" className="text-button" onClick={() => setSelected(item.id)}>
                          Ver ficha y leyenda →
                        </button>
                      </div>
                    ))}
                    <section className="source-details" aria-label="Ficha de fuente">
                      <span className="eyebrow">PROVENIENCIA · {source.kind}</span>
                      <h3>{source.title}</h3>
                      <p>
                        <b>Leyenda:</b> {source.legend}
                      </p>
                      <dl>
                        <dt>Producto</dt>
                        <dd>{source.productId}</dd>
                        <dt>Resolución</dt>
                        <dd>{source.resolution}</dd>
                        <dt>Cobertura publicada</dt>
                        <dd>{source.coverage}</dd>
                        <dt>Adquisición</dt>
                        <dd>{source.acquisitionDate}</dd>
                        <dt>Créditos</dt>
                        <dd>{source.attribution}</dd>
                      </dl>
                      <p>
                        <b>Límite:</b> {source.limitations}
                      </p>
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                        GetCapabilities oficial ↗
                      </a>
                    </section>
                  </>
                )}

                {panel === 'science' && (
                  <>
                    <h2>¿Por qué Jezero?</h2>
                    <p>
                      NASA describe un antiguo sistema de lago y delta fluvial en Jezero. Sus depósitos podrían
                      preservar indicios del ambiente antiguo. Explorarlos tiene valor científico;{' '}
                      <b>no implica haber descubierto vida</b>.
                    </p>
                    <a
                      href="https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Objetivos de Perseverance · NASA ↗
                    </a>
                    <h3>Riesgos y evidencia</h3>
                    <div className="notice">
                      <b>NO_DATA · Perfil y pendientes</b>
                      <br />
                      Sin DEM numérico validado en este ROI. No se calculan alturas ni pendientes.
                    </div>
                    <div className="notice">
                      <b>LOW_RESOLUTION · MOLA</b>
                      <br />
                      El relieve visual regional no permite detectar rocas o escalones.
                    </div>
                    <div className="notice">
                      <b>UNVERIFIED · Ruta</b>
                      <br />
                      Transitabilidad, obstáculos pequeños, clima y radiación locales no evaluados. Las paradas elegidas
                      son propuestas del usuario, no sitios de muestreo verificados.
                    </div>
                  </>
                )}
              </aside>
            )}

            <div className="map-counter" aria-live="polite">
              <span className="eyebrow">PLAN MANUAL</span>
              <strong>{scope === 'global' ? 'Jezero' : formatKm(legs.total)}</strong>
              <small>
                {scope === 'global'
                  ? `${count}/3 puntos conservados · solo contexto`
                  : `${count}/3 puntos · ${count < 3 ? 'trayecto incompleto' : 'trazado completo'}`}
              </small>
            </div>
          </section>
        </main>
      )}

      {screen !== 'terrain3d' && (
        <footer className="footer">
          <div className="footer-status-left">
            <span className="footer-status-badge">● DSN ONLINE</span>
            <span className="footer-datum">DATUM: AREOIDE 6.1 MBAR · ESFERA RM = 3,389,500 M</span>
          </div>
          <div className="footer-status-center">
            <span>
              {screen === 'globe'
                ? 'GLOBO ESFÉRICO: MGS MOLA NASA/USGS + VIKING MDIM 2.1 (NASA Ames/USGS)'
                : 'ORBITAL GIS: MRO CTX + MGS MOLA + MARS ODYSSEY THEMIS (NASA/JPL/ASU/USGS)'}
            </span>
          </div>
          <div className="footer-status-right">
            <strong>PROTOTIPO INDEPENDIENTE // NO CERTIFICADO PARA VUELO</strong>
          </div>
        </footer>
      )}

      <AresAgentChat
        isOpen={isAgentOpen}
        onOpen={() => setIsAgentOpen(true)}
        onClose={() => setIsAgentOpen(false)}
        currentStops={plan.stops}
        totalDistanceMeters={legs.total}
      />
    </div>
  )
}
