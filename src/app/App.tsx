import { lazy, Suspense, useCallback, useReducer, useState, useMemo } from 'react'
import { MapView, type LayerState, type MapMode, type MapScope } from '../components/MapView'
import { GlobeBoundary } from '../components/GlobeBoundary'
import { AresMissionCommsModal } from '../components/AresMissionCommsModal'
import { localizedSources, localizedVikingBase, type LayerId } from '../data/sourceManifest'
import { ROI, insideAnyActiveRoi, insideRoi } from '../features/map/marsProjection'
import { JEZERO_CONTEXT, inRegion, segmentCoverage, validRegion, type Region } from '../features/map/planningRegion'
import { initialRoutePlan, routeLegs, routePlanReducer, STOP_ORDER, type StopId } from '../features/route/routePlan'
import type { MarsPoint } from '../features/route/marsDistance'
import { buildCompactMissionContext } from '../features/agent/missionContext'
import type { AppActionHandlers } from '../features/agent/toolExecutionEngine'
import type { TerrainLayerType } from '../features/terrain/terrainShaderUtils'
import { estimateDurationHours, ROUTING_PROFILES, type AlternativeId } from '../features/route/terrainAlternatives'
import { useTerrainRoutes } from '../features/route/useTerrainRoutes'
import { useLanguage } from '../features/i18n/appI18n'
import '../styles/agentChat.css'
import '../styles/terrain3D.css'

type AppScreen = 'terrain3d' | 'globe' | 'map'
type Panel = 'route' | 'layers' | 'science'

const MarsGlobe = lazy(() => import('../components/MarsGlobe').then(module => ({ default: module.MarsGlobe })))
const MarsTerrain3D = lazy(() => import('../components/MarsTerrain3D').then(module => ({ default: module.MarsTerrain3D })))

const initialEnabled: Record<LayerId, boolean> = { ctx: true, mola: false, themis: false }
const initialOpacity: Record<LayerId, number> = { ctx: 1, mola: 0.75, themis: 0.75 }
const formatPoint = (point: MarsPoint) =>
  `${point[1] >= 0 ? `${point[1].toFixed(5)}°N` : `${Math.abs(point[1]).toFixed(5)}°S`} · ${point[0].toFixed(5)}°E`

export function App() {
  const { language, setLanguage, t, number, distance } = useLanguage()
  const ui = (english: string, spanish: string) => language === 'en' ? english : spanish
  const layerStateLabel = (state: string) => ({
    cargando: ui('loading', 'cargando'),
    apagada: ui('off', 'apagada'),
    parcial: ui('partial', 'parcial'),
    'sin cobertura': ui('out of coverage', 'sin cobertura'),
  }[state] ?? state)
  const sources = localizedSources(language)
  const vikingBase = localizedVikingBase(language)
  const stops: Record<StopId, { title: string; sub: string }> = {
    A: { title: t('start'), sub: ui('Proposed start', 'Inicio propuesto') },
    P: { title: t('scienceStop'), sub: ui('Proposed investigation', 'Investigación propuesta') },
    B: { title: t('destination'), sub: ui('Proposed finish', 'Final propuesto') },
  }
  const [screen, setScreen] = useState<AppScreen>('globe')
  const [autoTriggerDive, setAutoTriggerDive] = useState(false)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [states, setStates] = useState<Record<LayerId, LayerState>>({
    ctx: 'cargando',
    mola: 'apagada',
    themis: 'apagada',
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
  const [isCommsOpen, setIsCommsOpen] = useState(false)

  const handleOpenComms = useCallback(() => setIsCommsOpen(true), [])
  const handleCloseComms = useCallback(() => setIsCommsOpen(false), [])

  // Estados de control remoto para ARES MISSION COMMS sobre el mapa 3D y capas
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lon: number; height?: number } | null>(null)
  const [activeLayer3DOverride, setActiveLayer3DOverride] = useState<TerrainLayerType | null>(null)
  const [isComparisonOpenOverride, setIsComparisonOpenOverride] = useState<boolean | null>(null)
  const [isDataCenterOpenOverride, setIsDataCenterOpenOverride] = useState<boolean | null>(null)
  const [isTourActiveOverride, setIsTourActiveOverride] = useState<boolean | null>(null)
  const [tourStatus, setTourStatus] = useState<{ active: boolean; paused: boolean; stopIdx: number }>({
    active: false,
    paused: false,
    stopIdx: 0,
  })
  const [tacticalCommand3D, setTacticalCommand3D] = useState<{ id: number; action: string; params?: Record<string, unknown> } | null>(null)

  const [selectedRoute, setSelectedRoute] = useState<AlternativeId | 'manual'>('manual')
  const [speedKmh, setSpeedKmh] = useState(2)
  const [riskThresholds, setRiskThresholds] = useState({ caution: 5, elevated: 10 })
  const terrain = useTerrainRoutes(plan.stops)
  const chosen = terrain.alternatives.find(item => item.id === selectedRoute)
  const suggestedRoute = terrain.status === 'ready' && selectedRoute !== 'manual' ? chosen?.route ?? null : null
  const source = sources.find(item => item.id === selected)!
  const legs = routeLegs(plan.stops)
  const count = STOP_ORDER.filter(id => plan.stops[id]).length
  const outsideStops = STOP_ORDER.filter(id => plan.stops[id] && !inRegion(plan.stops[id]!, region))

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

  const goHome = useCallback(() => {
    setScreen('globe')
    setMode({ type: 'explore' })
  }, [])

  function place(id: StopId, point: MarsPoint) {
    if (scope !== 'jezero' || (mode.type !== 'place' && mode.type !== 'move') || mode.id !== id) return
    if (!inRegion(point, region)) {
      setRouteNotice(ui('Outside the selected region: point unchanged. Expand the region or choose another position.', 'Fuera de la región elegida: el punto no cambió. Podés ampliar la región o seleccionar otra posición.'))
      return
    }
    dispatch({ type: 'set', id, point, region })
    setRouteNotice(null)
    setMode({ type: 'explore' })
  }

  function movePoint(id: StopId, point: MarsPoint) {
    if (scope !== 'jezero' || !plan.stops[id]) return
    if (!inRegion(point, region)) {
      setRouteNotice(ui('Outside the selected region: point unchanged. Expand the region or move it inside.', 'Fuera de la región elegida: el punto no cambió. Podés ampliar la región o moverlo adentro.'))
      return
    }
    dispatch({ type: 'set', id, point, region })
    setRouteNotice(null)
  }

  function changeRegion(next: Region) {
    if (!validRegion(next)) {
      setRouteNotice(ui('Region unchanged: keep the minimum size and stay within the Jezero area.', 'Región no modificada: respetá el tamaño mínimo y el entorno local de Jezero.'))
      return
    }
    setRegion(next)
    setRouteNotice(null)
  }

  function coverageLabel(first: StopId, second: StopId) {
    const a = plan.stops[first]
    const b = plan.stops[second]
    if (!a || !b) return null
    const coverage = segmentCoverage(a, b, ROI)
    return coverage === 'complete'
      ? ui('CTX coverage verified along the drawn leg', 'CTX verificado en el tramo dibujado')
      : coverage === 'partial'
      ? ui('Partial CTX; sections lack detailed imagery', 'CTX parcial; sectores sin imagen detallada')
      : ui('No detailed CTX image', 'Sin imagen CTX detallada')
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
        onClick={() => {
          if (mode.type === 'edit-region') setMode({ type: 'explore' })
          setPanel(current => (current === id ? null : id))
        }}
      >
        {label}
      </button>
    )
  }

  const appHandlers = useMemo<AppActionHandlers>(() => {
    return {
      focusCamera: ({ lat, lon, height }) => {
        setScreen('terrain3d')
        setFocusTarget({ lat, lon, height })
      },
      toggleLayer: (layerId, enabledVal) => {
        setScreen('terrain3d')
        const idLower = layerId.toLowerCase()
        if (idLower === 'ctx' || idLower === 'mola' || idLower === 'themis') {
          setEnabled(prev => ({ ...prev, [idLower as LayerId]: enabledVal }))
        }
        if (idLower === 'optical' || idLower === 'satellite' || idLower === 'real') {
          setActiveLayer3DOverride('optical')
        } else if (idLower === 'themis' || idLower === 'thermal' || idLower === 'inercia') {
          setActiveLayer3DOverride(enabledVal ? 'thermal' : 'optical')
        } else if (idLower === 'mola' || idLower === 'dem' || idLower === 'elevation') {
          setActiveLayer3DOverride(enabledVal ? 'dem' : 'optical')
        } else if (idLower === 'ctx' || idLower === 'ctx_mosaic') {
          setActiveLayer3DOverride(enabledVal ? 'ctx_mosaic' : 'optical')
        } else if (idLower === 'geology') {
          setActiveLayer3DOverride(enabledVal ? 'geology' : 'optical')
        } else if (idLower === 'spectral' || idLower === 'crism') {
          setActiveLayer3DOverride(enabledVal ? 'spectral' : 'optical')
        } else if (idLower === 'slope') {
          setActiveLayer3DOverride(enabledVal ? 'slope' : 'optical')
        } else if (idLower === 'radiation') {
          setActiveLayer3DOverride(enabledVal ? 'radiation' : 'optical')
        }
      },
      switchScreen: (screenMode: 'terrain3d' | 'globe' | 'map') => {
        if (screenMode === 'map') {
          openJezero()
        } else {
          setScreen(screenMode)
        }
      },
      setWaypoint: (id, point) => {
        dispatch({ type: 'set', id, point })
      },
      previewRoute: () => {
        setPanel('route')
      },
      openComparisonModal: open => {
        setScreen('terrain3d')
        setIsComparisonOpenOverride(open)
        setTacticalCommand3D({ id: Date.now(), action: 'COMPARAR_MISIONES', params: { open } })
      },
      openDataCenterModal: open => {
        setScreen('terrain3d')
        setIsDataCenterOpenOverride(open)
        setTacticalCommand3D({ id: Date.now(), action: 'DATOS_NASA', params: { open } })
      },
      openSurfaceIntelligenceModal: open => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'FOTOS_RAW', params: { open } })
      },
      openGuidedTour: (open = true) => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'GUIDED_TOUR', params: { open } })
      },
      triggerEdlDescent: () => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'DESCENSO_EDL' })
      },
      triggerOrbitAscent: () => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'ORBITA' })
      },
      focusBaseLZ1: () => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'BASE_LZ1' })
      },
      triggerPanoramaColony: () => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'PANORAMA' })
      },
      setCleanViewMode: (active = true) => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'LIMPIAR', params: { active } })
      },
      setRouteViewMode: (mode = 'toggle') => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'ROUTE_VIEW_MODE', params: { mode } })
      },
      setTacticalDockCollapsed: (collapsed = 'toggle') => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'TOGGLE_DOCK', params: { collapsed } })
      },
      setTacticalDockTab: tab => {
        setScreen('terrain3d')
        setTacticalCommand3D({ id: Date.now(), action: 'SET_DOCK_TAB', params: { tab } })
      },
      startTour: (startIndex = 0) => {
        setScreen('terrain3d')
        setIsTourActiveOverride(true)
        setTacticalCommand3D({ id: Date.now(), action: 'SOBREVUELO', params: { startIndex } })
      },
      pauseTour: () => {
        setIsTourActiveOverride(prev => !prev)
      },
      getContextSnapshot: () => {
        return buildCompactMissionContext({
          screen,
          scope,
          currentStops: plan.stops,
          enabledLayers: enabled,
          isDiscoveryTourActive: tourStatus.active,
          isDiscoveryPaused: tourStatus.paused,
          currentDiscoveryStopIndex: tourStatus.stopIdx,
        })
      },
    }
  }, [screen, scope, plan.stops, enabled, tourStatus, openJezero])

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="brand brand-button"
          onClick={goHome}
          aria-label={t('home')}
          title={t('home')}
        >
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
        </button>

        {/* Selector Central Segmentado FUI */}
        <nav className="header-nav-modes" aria-label={language === 'en' ? 'ARES view selector' : 'Selector de visualizador ARES'}>
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'terrain3d' ? 'active' : ''}`}
            onClick={() => openGaleTerrain(true)}
            title={t('galeTitle')}
          >
            <span className="nav-btn-code">01</span>
            <span className="nav-btn-text">GALE 3D</span>
          </button>
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'globe' ? 'active' : ''}`}
            onClick={() => setScreen('globe')}
            title={t('globeTitle')}
          >
            <span className="nav-btn-code">02</span>
            <span className="nav-btn-text">{t('globe')}</span>
          </button>
          <button
            type="button"
            className={`nav-mode-btn ${screen === 'map' ? 'active' : ''}`}
            onClick={() => {
              setScope('jezero')
              setScreen('map')
            }}
            title={t('jezeroTitle')}
          >
            <span className="nav-btn-code">03</span>
            <span className="nav-btn-text">JEZERO 2D</span>
          </button>
        </nav>

        <div className="header-right">
          <label className="language-switch" htmlFor="app-language">{t('language')}
            <select id="app-language" aria-label={t('language')} value={language}
              onChange={event => setLanguage(event.target.value as 'en' | 'es')}>
              <option value="en">EN</option><option value="es">ES</option>
            </select>
          </label>
          <div className="telemetry-block">
            <span className="telemetry-micro">MET CLOCK</span>
            <span className="telemetry-clock">SOL 3148 · 14:22 UTC-M</span>
          </div>
          <span className="header-location">
            <span className="status-dot" />
            {screen === 'terrain3d'
              ? 'GALE CRATER // 3D'
              : screen === 'globe'
              ? language === 'en' ? 'MARS GLOBAL // 3D' : 'MARTE GLOBAL // 3D'
              : scope === 'global'
              ? language === 'en' ? 'MARS GLOBAL // 2D' : 'MARTE GLOBAL // 2D'
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
              focusTarget={focusTarget}
              activeLayerOverride={activeLayer3DOverride}
              onLayerChange={layer => setActiveLayer3DOverride(layer)}
              isComparisonOpenOverride={isComparisonOpenOverride}
              isDataCenterOpenOverride={isDataCenterOpenOverride}
              onDataCenterClose={() => setIsDataCenterOpenOverride(null)}
              onComparisonClose={() => setIsComparisonOpenOverride(null)}
              isTourActiveOverride={isTourActiveOverride}
              onTourStateChange={(active, paused, stopIdx) => setTourStatus({ active, paused, stopIdx })}
              tacticalCommand={tacticalCommand3D}
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
                  {ui('Preparing 3D exploration…', 'Preparando exploración 3D…')}{' '}
                  <button type="button" onClick={openJezero}>
                    {ui('Explore Jezero in 2D', 'Explorar Jezero en 2D')}
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
                {scope === 'global' ? ui('PLANETARY CONTEXT · MOLA', 'CONTEXTO PLANETARIO · MOLA') : ui('RESEARCH REGION', 'REGIÓN DE INVESTIGACIÓN')}
              </span>
              <strong>{scope === 'global' ? ui('Global Mars', 'Marte global') : 'Jezero Crater'}</strong>
              <span>
                {scope === 'global'
                  ? ui('Visual relief · no routes or numerical elevations', 'Relieve visual · sin rutas ni altitudes numéricas')
                  : `${ui('Manual region', 'Región manual')}: ${number(region[0])}–${number(region[2])}°E · ${number(region[1])}–${number(region[3])}°N`}
              </span>
            </div>
            <nav className="tabs" aria-label={ui('Exploration panels', 'Paneles de exploración')}>
              {panelButton('route', t('routePlanner'))}
              {panelButton('layers', t('scientificLayers'))}
              {panelButton('science', ui('Science & risks', 'Ciencia y riesgos'))}
              <button
                type="button"
                className={`tab tab-agent ${isCommsOpen ? 'active' : ''}`}
                aria-pressed={isCommsOpen}
                onClick={() => setIsCommsOpen(prev => !prev)}
                title={ui('Ares Copilot // Voice and exploration assistant with Amazon Nova 2.5 Sonic', 'Ares Copilot // Asistente táctico y de voz con Amazon Nova 2.5 Sonic')}
              >
                <span className="tab-agent-indicator" aria-hidden="true" />
                Ares Copilot
              </button>
            </nav>
            {mode.type === 'edit-region' && (
              <div className="edit-shortcuts" aria-label={ui('Region controls', 'Controles de región')}>
                <button
                  type="button"
                  onClick={() => {
                    setMode({ type: 'explore' })
                    setPanel('route')
                  }}
                >
                  {ui('Finish editing', 'Terminar edición')}
                </button>
                <button type="button" onClick={() => changeRegion(JEZERO_CONTEXT)}>
                  {ui('Reset region', 'Restablecer región')}
                </button>
                <button type="button" onClick={() => changeRegion(ROI)}>
                  {ui('Use verified CTX sector', 'Usar sector CTX verificado')}
                </button>
              </div>
            )}
            <button
              type="button"
              className="scope-toggle"
              onClick={() => {
                setScope(current => (current === 'jezero' ? 'global' : 'jezero'))
                setMode({ type: 'explore' })
              }}
            >
              {scope === 'global' ? ui('↙ Back to Jezero', '↙ Volver a Jezero') : ui('◌ Global Mars', '◌ Marte global')}
            </button>
            <button
              type="button"
              className="scope-toggle terrain-return"
              onClick={() => {
                setScreen('terrain3d')
              }}
            >
              {ui('[01] GALE 3D TERRAIN', '[01] TERRENO 3D GALE')}
            </button>
            <button
              type="button"
              className="scope-toggle globe-return"
              onClick={() => {
                setMode({ type: 'explore' })
                setScreen('globe')
              }}
            >
              {ui('◉ Back to 3D globe', '◉ Volver al globo 3D')}
            </button>
          </div>

          <section
            className={`map-stage${panel ? ' map-stage--panel' : ''}${mode.type === 'edit-region' ? ' map-stage--editing' : ''}`}
            aria-label={scope === 'global' ? ui('Global 2D view of Mars', 'Vista 2D global de Marte') : ui('Jezero 2D explorer', 'Explorador 2D de Jezero')}
          >
            <MapView
              scope={scope}
              enabled={enabled}
              opacity={opacity}
              stops={plan.stops}
              mode={mode}
              panelOpen={panel !== null}
              baseRetry={baseRetry}
              onBaseState={setBaseState}
              suggestedRoute={suggestedRoute}
              riskThresholds={riskThresholds}
              region={region}
              onRegionChange={changeRegion}
              onPlace={place}
              onMove={movePoint}
              onInvalid={() =>
                setRouteNotice(
                  ui('Outside the selected region: point unchanged. Expand the region or choose a position inside.', 'Fuera de la región elegida: el punto no cambió. Ampliá la región o elegí una posición dentro.')
                )
              }
              onLayerState={(id, state) =>
                setStates(current => (current[id] === state ? current : { ...current, [id]: state }))
              }
            />
            {scope === 'jezero' && (
              <div className="base-status" role="status">
                <a href={vikingBase.sourceUrl} target="_blank" rel="noreferrer">
                  {ui('Viking · context ↗', 'Viking · contexto ↗')}
                </a>
                <span>
                  WMTS {layerStateLabel(baseState)}
                  {baseState !== 'visible' ? ui(' · local preview', ' · miniatura local') : ''}
                </span>
                {baseState === 'error' && (
                  <button type="button" onClick={() => setBaseRetry(current => current + 1)}>
                    {ui('Retry', 'Reintentar')}
                  </button>
                )}
              </div>
            )}
            {scope === 'jezero' && routeNotice && (
              <div className="roi-notice" role="alert">
                {routeNotice} {ui('A boundary does not establish whether terrain is hazardous or safe.', 'Ningún límite indica que una zona sea peligrosa o segura.')}
                <button type="button" onClick={() => setRouteNotice(null)} aria-label={ui('Dismiss notice', 'Cerrar aviso')}>
                  ×
                </button>
              </div>
            )}
            {panel && (
              <aside
                className="drawer"
                aria-label={
                  panel === 'route'
                    ? t('routePlanner')
                    : panel === 'layers'
                    ? t('scientificLayers')
                    : ui('Science & risks', 'Ciencia y riesgos')
                }
              >
                <div className="drawer-header">
                  <span className="eyebrow">
                    {panel === 'route'
                      ? ui('MANUAL ROUTE', 'TRAZADO MANUAL')
                      : panel === 'layers'
                      ? ui('ORBITAL DATA', 'DATOS ORBITALES')
                      : ui('SCIENTIFIC CONTEXT', 'CONTEXTO CIENTÍFICO')}
                  </span>
                  <button
                    type="button"
                    className="close-button"
                    aria-label={ui('Close panel', 'Cerrar panel')}
                    onClick={() => setPanel(null)}
                  >
                    ×
                  </button>
                </div>

                {panel === 'route' && (
                  <>
                    <h2>
                      {ui('Your', 'Tu')} {ui('exploratory route', 'recorrido exploratorio')}
                    </h2>
                    {scope === 'global' && (
                      <div className="notice">
                        <b>OUT_OF_COVERAGE · {ui('Planning unavailable', 'Planificación desactivada')}</b>
                        <br />
                        {ui('Your Jezero plan is retained, but the global view only shows regional MOLA relief. Return to Jezero to edit the route.', 'El plan de Jezero se conserva, pero en Marte global solo se muestra el relieve MOLA regional. Volvé a Jezero para editar la ruta.')}
                      </div>
                    )}
                    <p className="intro">
                      {ui('Place A/P/B or drag their markers. The editable region appears when you place points or edit it; the turquoise outline identifies audited CTX coverage. Viking provides only global context. None establishes traversability.', 'Elegí A/P/B o arrastrá sus marcadores. La región manual aparece al colocar puntos o al editarla; el contorno turquesa identifica CTX auditado. Viking es solo contexto global. Ninguno garantiza transitabilidad.')}
                    </p>
                    <div className="region-actions">
                      <button
                        type="button"
                        disabled={scope === 'global'}
                        aria-pressed={mode.type === 'edit-region'}
                        onClick={() => {
                          if (mode.type === 'edit-region') setMode({ type: 'explore' })
                          else {
                            setPanel(null)
                            setMode({ type: 'edit-region' })
                          }
                        }}
                      >
                        {mode.type === 'edit-region' ? ui('Finish editing', 'Terminar edición') : ui('Edit region', 'Editar región')}
                      </button>
                      <button
                        type="button"
                        disabled={scope === 'global'}
                        onClick={() => changeRegion(JEZERO_CONTEXT)}
                      >
                        {ui('Reset region', 'Restablecer región')}
                      </button>
                      <button
                        type="button"
                        disabled={scope === 'global'}
                        onClick={() => changeRegion(ROI)}
                      >
                        {ui('Use verified CTX sector', 'Usar sector CTX verificado')}
                      </button>
                    </div>
                    {mode.type === 'edit-region' && (
                      <p className="notice">
                        {ui('Drag the corners, sides or interior to adjust the rectangle. During editing, markers and the map inside the rectangle do not move.', 'Arrastrá las esquinas, los lados o el interior para ajustar el rectángulo. Durante esta edición no se mueven los puntos ni el mapa dentro del rectángulo.')}
                      </p>
                    )}
                    {outsideStops.length > 0 && (
                      <div className="notice" role="status">
                        <b>OUT_OF_COVERAGE · {ui('Manual region', 'Región manual')}</b>
                        <br />
                        {outsideStops.join(', ')} {ui('outside the selected region. The plan is retained: expand the region or move each point inside. Distances remain geometric, not risk assessments.', 'fuera de la región elegida. El plan se conserva: ampliá la región o mové cada punto adentro; las distancias siguen siendo geométricas, no una evaluación de riesgo.')}
                      </div>
                    )}
                    {scope === 'jezero' && (!enabled.ctx || states.ctx !== 'visible') && (
                      <div className="notice">
                        <b>CTX {enabled.ctx ? layerStateLabel(states.ctx) : ui('off', 'apagada')} · {ui('imagery unavailable or not currently confirmed', 'imagen no disponible o no confirmada en este momento')}</b>
                        <br />
                        {ui('The static fallback covers only the earlier sector; elsewhere imagery depends on WMTS. Audited coverage does not confirm that a tile has loaded now. The route is a proposal, not a terrain assessment.', 'El respaldo estático cubre solo el sector anterior; fuera de él la imagen depende del servicio WMTS. La cobertura auditada no acredita que una tesela haya cargado ahora. La ruta es una propuesta, no una evaluación del terreno.')}
                      </div>
                    )}
                    <div className="mode-strip">
                      <button
                        type="button"
                        disabled={scope === 'global'}
                        aria-pressed={mode.type === 'explore'}
                        className={mode.type === 'explore' ? 'mode-active' : ''}
                        onClick={() => setMode({ type: 'explore' })}
                      >
                        ✥ &nbsp; {ui('Explore map', 'Explorar mapa')}
                      </button>
                    </div>
                    <ol className="stop-list">
                      {STOP_ORDER.map((id, index) => {
                        const point = plan.stops[id]
                        const previous = index === 0 || !!plan.stops[STOP_ORDER[index - 1]]
                        const active = (mode.type === 'place' || mode.type === 'move') && mode.id === id
                        return (
                          <li className={active ? 'stop active-stop' : 'stop'} key={id}>
                            <span className={`stop-symbol stop-${id.toLowerCase()}`} aria-hidden="true">
                              {id}
                            </span>
                            <div className="stop-info">
                              <strong>{stops[id].title}</strong>
                              <small>{point ? formatPoint(point) : stops[id].sub}</small>
                              {point && !inRegion(point, region) && <small>{ui('OUTSIDE REGION · adjust point', 'FUERA DE REGIÓN · corregir')}</small>}
                              {point && (
                                <small>
                                  {insideRoi(point) ? ui('CTX audited at this point', 'CTX auditado en este punto') : ui('No detailed CTX image', 'Sin imagen CTX detallada')}
                                </small>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={scope === 'global' || !previous}
                              aria-pressed={active}
                              aria-label={`${point ? ui('Move', 'Mover') : ui('Place', 'Colocar')} ${stops[id].title} ${id}`}
                              onClick={() =>
                                setMode(active ? { type: 'explore' } : { type: point ? 'move' : 'place', id })
                              }
                            >
                              {active ? ui('Cancel', 'Cancelar') : point ? ui('Move', 'Mover') : ui('Place', 'Colocar')}
                            </button>
                            {index === 1 && (
                              <span className="leg-detail">
                                A → P <strong>{distance(legs.first)}</strong>
                                {coverageLabel('A', 'P') && <small>{coverageLabel('A', 'P')}</small>}
                              </span>
                            )}
                            {index === 2 && (
                              <span className="leg-detail">
                                P → B <strong>{distance(legs.second)}</strong>
                                {coverageLabel('P', 'B') && <small>{coverageLabel('P', 'B')}</small>}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                    <div className="route-total">
                      <span>{ui('Planned distance', 'Distancia trazada')} {count < 3 && count > 0 ? ui('· partial', '· parcial') : ''}</span>
                      <strong>{distance(legs.total)}</strong>
                      <small>{ui('Approximate straight legs, not a verified trail.', 'Tramos rectos aproximados, no sendero verificado.')}</small>
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
                        ↶ {t('undo')}
                      </button>
                      <button
                        type="button"
                        disabled={scope === 'global' || !count}
                        onClick={() => {
                          dispatch({ type: 'reset' })
                          setMode({ type: 'explore' })
                        }}
                      >
                        {ui('Reset route', 'Restablecer ruta')}
                      </button>
                    </div>
                    <p className="fine-print">
                      {t('manualNote')}
                    </p>
              <section className="terrain-planner" aria-label={t('demTitle')}>
                <h3>{t('demTitle')}</h3>
                <p>{t('demDescription')} {t('routeWarning')}</p>
                <a href="https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic" target="_blank" rel="noreferrer">{t('demSource')}</a>
                <p role="status">{scope === 'global' ? t('demGlobal') :
                  terrain.status === 'loading' ? t('demLoading') :
                  terrain.status === 'error' ? `${t('terrainWarning')} · ${terrain.error}` :
                  terrain.status === 'idle' ? t('demIdle') : t('demReady')}</p>
                <div className="terrain-options">
                  <button type="button" aria-pressed={selectedRoute === 'manual'} onClick={() => setSelectedRoute('manual')}>{t('demManual')}</button>
                  {terrain.alternatives.map(item => <button type="button" key={item.id}
                    aria-pressed={selectedRoute === item.id}
                    disabled={scope === 'global' || !item.route.first || (!item.distinct && Boolean(item.route.points))}
                    onClick={() => setSelectedRoute(item.id)}>{t(item.id === 'short' ? 'demShort' : item.id === 'balanced' ? 'demBalanced' : 'demCautious')}{!item.distinct && item.route.points ? t('demDuplicate') : ''}</button>)}
                </div>
                {terrain.alternatives.map(item => {
                  const first = item.route.first
                  const second = item.route.second
                  const okFirst = first?.ok ? first : null
                  const okSecond = second?.ok ? second : null
                  const routeDistance = item.route.distanceMeters
                  const hours = routeDistance === null ? null : estimateDurationHours(routeDistance, speedKmh)
                  return <div className="terrain-comparison" key={item.id}>
                    <strong>{t(item.id === 'short' ? 'demShort' : item.id === 'balanced' ? 'demBalanced' : 'demCautious')}{!item.distinct && item.route.points ? t('demDuplicate') : ''}</strong>
                    <small>{t(item.id === 'short' ? 'demShortExplanation' : item.id === 'balanced' ? 'demBalancedExplanation' : 'demCautiousExplanation')} {t('demMax', { degrees: ROUTING_PROFILES[item.id].options.maxSlopeDegrees ?? 0 })}</small>
                    <span>A→P: {first ? first.ok ? distance(first.distanceMeters) : `${t('demUnevaluable')} (${first.reason})` : t('demMissing')} ·
                      P→B: {second ? second.ok ? distance(second.distanceMeters) : `${t('demUnevaluable')} (${second.reason})` : t('demMissing')}</span>
                    <span>{t('demDistance', { distance: distance(routeDistance), time: hours === null ? t('noData') : t('unitsHours', { value: number(hours, 1) }) })}</span>
                    <span>{t('demSlope', { slope: okFirst ? `${number(Math.max(okFirst.maximumSlopeDegrees, okSecond?.maximumSlopeDegrees ?? 0), 1)}°` : t('noData'), ascent: okFirst ? number(okFirst.ascentMeters + (okSecond?.ascentMeters ?? 0), 0) : t('noData'), descent: okFirst ? number(okFirst.descentMeters + (okSecond?.descentMeters ?? 0), 0) : t('noData') })}</span>
                    <small>{t('demCoverage', { coverage: item.route.points ? t('demFullCoverage') : t('demIncomplete'), detour: okFirst ? `${t('demDetour')}; ${((routeDistance ?? okFirst.distanceMeters) - okFirst.directMeters - (okSecond?.directMeters ?? 0) > 0 ? t('demLonger') : t('demNoDetour'))}` : t('noData') })}</small>
                  </div>
                })}
                <label>{t('demSpeed')}
                  <input type="number" min="0.1" max="10" step="0.1" value={speedKmh}
                    onChange={event => { const value = Number(event.target.value); if (value >= 0.1 && value <= 10) setSpeedKmh(value) }} />
                </label>
                <div className="terrain-legend" aria-label={t('demLegend')}>
                  <b>{t('demLegend')}</b>
                  <span>🟢 {t('demGreen', { degrees: riskThresholds.caution })}</span>
                  <span>🟡 {t('demYellow', { from: riskThresholds.caution, to: riskThresholds.elevated })}</span>
                  <span>🔴 {t('demRed', { degrees: riskThresholds.elevated })}</span>
                  <span>⚫ {t('demBlack')}</span>
                  <label>{t('demCaution')} <input type="number" min="1" max="29" value={riskThresholds.caution}
                    onChange={event => { const value = Number(event.target.value); if (value >= 1 && value < riskThresholds.elevated) setRiskThresholds(current => ({ ...current, caution: value })) }} /></label>
                  <label>{t('demElevated')} <input type="number" min="2" max="30" value={riskThresholds.elevated}
                    onChange={event => { const value = Number(event.target.value); if (value > riskThresholds.caution && value <= 30) setRiskThresholds(current => ({ ...current, elevated: value })) }} /></label>
                </div>
              </section>
                  </>
                )}

                {panel === 'layers' && (
                  <>
                    <h2>{t('scientificLayers')}</h2>
                    <p className="intro">
                      {scope === 'global'
                        ? ui('Only MOLA has global coverage in this view. Jezero CTX and THEMIS selections are retained for the local view.', 'Solo MOLA tiene cobertura global en esta vista. CTX Jezero y THEMIS se conservan para el modo local.')
                        : ui('Three missions. Toggle and compare imagery; a visual layer is not a safety measurement.', 'Tres misiones. Activá y compará imágenes; una capa visual no equivale a una medición de seguridad.')}
                    </p>
                    {scope === 'jezero' && (
                      <section className="notice" aria-label={ui('Viking basemap source', 'Origen del mapa base Viking')}>
                        <b>{ui('Basemap · Viking MDIM 2.1 colorized', 'Mapa base · Viking MDIM 2.1 colorizado')}</b>
                        <br />
                        NASA Ames/USGS · Viking. {vikingBase.resolution}. {vikingBase.coverage}. {vikingBase.acquisitionDate}. {vikingBase.limitations}{' '}
                        <a href={vikingBase.sourceUrl} target="_blank" rel="noreferrer">
                          {ui('Official GetCapabilities ↗', 'GetCapabilities oficial ↗')}
                        </a>
                        <br />
                        WMTS: {baseState}; {ui('when unavailable, a local preview appears, not detailed CTX.', 'cuando no carga, se ve una miniatura local, no detalle CTX.')}
                      </section>
                    )}
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
                          <span
                            className={`status ${states[item.id] === 'error' ? 'bad' : ''}`}
                            aria-live="polite"
                          >
                            {layerStateLabel(states[item.id])}
                          </span>
                        </label>
                        <small>
                          {item.mission} · {item.kind}
                        </small>
                        <label className="opacity">
                          {ui('Opacity', 'Opacidad')} {Math.round(opacity[item.id] * 100)} %
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity[item.id] * 100}
                            disabled={!enabled[item.id]}
                            onChange={event =>
                              setOpacity(current => ({
                                ...current,
                                [item.id]: Number(event.target.value) / 100,
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setSelected(item.id)}
                        >
                          {ui('View source and legend →', 'Ver ficha y leyenda →')}
                        </button>
                      </div>
                    ))}
                    <section className="source-details" aria-label={ui('Source details', 'Ficha de fuente')}>
                      <span className="eyebrow">{ui('PROVENANCE', 'PROVENIENCIA')} · {source.kind}</span>
                      <h3>{source.title}</h3>
                      <p>
                        <b>{ui('Legend:', 'Leyenda:')}</b> {source.legend}
                      </p>
                      <dl>
                        <dt>{ui('Product', 'Producto')}</dt>
                        <dd>{source.productId}</dd>
                        <dt>{ui('Resolution', 'Resolución')}</dt>
                        <dd>{source.resolution}</dd>
                        <dt>{ui('Published coverage', 'Cobertura publicada')}</dt>
                        <dd>{source.coverage}</dd>
                        <dt>{ui('Acquisition', 'Adquisición')}</dt>
                        <dd>{source.acquisitionDate}</dd>
                        <dt>{ui('Credits', 'Créditos')}</dt>
                        <dd>{source.attribution}</dd>
                      </dl>
                      <p>
                        <b>{ui('Limitations:', 'Límite:')}</b> {source.limitations}
                      </p>
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {ui('Official GetCapabilities ↗', 'GetCapabilities oficial ↗')}
                      </a>
                    </section>
                  </>
                )}

                {panel === 'science' && (
                  <>
                    <h2>{ui('Why Jezero?', '¿Por qué Jezero?')}</h2>
                    <p>
                      {ui('NASA describes an ancient lake and river delta at Jezero. These deposits may preserve evidence of past environments. Exploring them is scientifically valuable;', 'NASA describe un antiguo sistema de lago y delta fluvial en Jezero. Sus depósitos podrían preservar indicios del ambiente antiguo. Explorarlos tiene valor científico;')}{' '}
                      <b>{ui('it does not mean life has been discovered', 'no implica haber descubierto vida')}</b>.
                    </p>
                    <a
                      href="https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ui('Perseverance science objectives · NASA ↗', 'Objetivos de Perseverance · NASA ↗')}
                    </a>
                    <h3>{ui('Risks and evidence', 'Riesgos y evidencia')}</h3>
                    <div className="notice">
                      <b>UNVERIFIED · {ui('DEM slope estimates', 'Estimaciones de pendiente DEM')}</b>
                      <br />
                      {ui('The USGS numerical CTX DEM (20 m/pixel) has valid samples in a limited sector. Exact vertical reference and independent alignment with the displayed layers are not validated; derived slopes and ascent are exploratory proxies, not operational assessments.', 'El DEM CTX numérico USGS de 20 m/píxel tiene muestras válidas en un sector limitado. La referencia vertical exacta y el registro independiente con estas capas no están validados; las pendientes y ascensos derivados son proxies exploratorios, no evaluaciones operacionales.')}{' '}
                      <a href="https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic" target="_blank" rel="noreferrer">
                        {ui('USGS DEM source ↗', 'Ficha DEM USGS ↗')}
                      </a>
                    </div>
                    <div className="notice">
                      <b>LOW_RESOLUTION · MOLA</b>
                      <br />
                      {ui('Regional shaded relief cannot detect individual rocks or steps.', 'El relieve visual regional no permite detectar rocas o escalones.')}
                    </div>
                    <div className="notice">
                      <b>UNVERIFIED · {ui('Route', 'Ruta')}</b>
                      <br />
                      {ui('Traversability, small obstacles, local weather and radiation are unassessed. Selected stops are user proposals, not verified sampling sites.', 'Transitabilidad, obstáculos pequeños, clima y radiación locales no evaluados. Las paradas elegidas son propuestas del usuario, no sitios de muestreo verificados.')}
                    </div>
                  </>
                )}
              </aside>
            )}

            <div className="map-counter" aria-live="polite">
              <span className="eyebrow">{suggestedRoute ? ui('DEM-DERIVED · NON-OPERATIONAL', 'DERIVADO DEM · NO OPERACIONAL') : ui('MANUAL PLAN', 'PLAN MANUAL')}</span>
              <strong>{scope === 'global' ? 'Jezero' : distance(suggestedRoute ? suggestedRoute.distanceMeters : legs.total)}</strong>
              <small>
                {scope === 'global'
                  ? `${count}/3 ${ui('points retained · context only', 'puntos conservados · solo contexto')}`
                  : `${count}/3 ${ui('points', 'puntos')} · ${count < 3 ? ui('incomplete route', 'trayecto incompleto') : ui('route drawn', 'trazado completo')}`}
              </small>
            </div>
          </section>
        </main>
      )}

      {screen !== 'terrain3d' && (
        <footer className="footer">
          <div className="footer-status-left">
            <span className="footer-status-badge">● DSN ONLINE</span>
            <span className="footer-datum">{ui('MARS MEAN-RADIUS SPHERE', 'ESFERA DE RADIO MEDIO MARCIANO')}: 3,389,500 M</span>
          </div>
          <div className="footer-status-center">
            <span>
              {screen === 'globe'
                ? ui('SPHERICAL GLOBE: MGS MOLA NASA/USGS + VIKING MDIM 2.1 (NASA Ames/USGS)', 'GLOBO ESFÉRICO: MGS MOLA NASA/USGS + VIKING MDIM 2.1 (NASA Ames/USGS)')
                : 'ORBITAL GIS: MRO CTX + MGS MOLA + MARS ODYSSEY THEMIS (NASA/JPL/ASU/USGS)'}
            </span>
          </div>
          <div className="footer-status-right">
            <strong>{ui('INDEPENDENT PROTOTYPE // NOT CERTIFIED FOR FLIGHT', 'PROTOTIPO INDEPENDIENTE // NO CERTIFICADO PARA VUELO')}</strong>
          </div>
        </footer>
      )}

      <AresMissionCommsModal
        isOpen={isCommsOpen}
        onOpen={handleOpenComms}
        onClose={handleCloseComms}
        appHandlers={appHandlers}
        contextInput={{
          screen,
          scope,
          currentStops: plan.stops,
          enabledLayers: enabled,
          isDiscoveryTourActive: tourStatus.active,
          isDiscoveryPaused: tourStatus.paused,
          currentDiscoveryStopIndex: tourStatus.stopIdx,
        }}
        currentStops={plan.stops}
      />    </div>
  )
}
