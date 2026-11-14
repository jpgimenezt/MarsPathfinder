import { useState } from 'react'
import { MapView, type LayerState } from '../components/MapView'
import { sources, type LayerId } from '../data/sourceManifest'
import { marsDistance, routeDistance, type MarsPoint } from '../features/route/marsDistance'
import { insideRoi } from '../features/map/marsProjection'

const initialEnabled: Record<LayerId, boolean> = { ctx: true, mola: false, themis: false }
const initialOpacity: Record<LayerId, number> = { ctx: 1, mola: 0.75, themis: 0.75 }
const names = ['A · inicio propuesto', 'P · parada científica propuesta', 'B · destino propuesto']
const formatPoint = (point: MarsPoint) => `${point[1].toFixed(5)}°N · ${point[0].toFixed(5)}°E`

export function App() {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [states, setStates] = useState<Record<LayerId, LayerState>>({
    ctx: 'cargando', mola: 'apagada', themis: 'apagada',
  })
  const [points, setPoints] = useState<MarsPoint[]>([])
  const [selected, setSelected] = useState<LayerId>('ctx')
  const [mode, setMode] = useState<number | null>(null)
  const nextPoint = mode ?? points.length
  const source = sources.find(item => item.id === selected)!

  function addPoint(point: MarsPoint) {
    if (!insideRoi(point)) return
    setPoints(current => {
      if (mode !== null) {
        const updated = [...current]
        updated[mode] = point
        return updated
      }
      return current.length < 3 ? [...current, point] : current
    })
    setMode(null)
  }

  return (
    <div className="app">
      <header className="header">
        <div><span className="eyebrow">EXPLORACIÓN MARCIANA · PROTOTIPO</span><h1>AresRoute <span>/ Jezero</span></h1></div>
        <p>Mapa 2D y ruta exploratoria · No apta para uso operacional</p>
      </header>
      <div className="workspace">
        <aside className="panel layers-panel" aria-label="Capas científicas">
          <h2>Capas científicas</h2>
          <p>Compará productos de tres misiones. Cada fuente se consulta directamente a Mars Trek.</p>
          {sources.map(item => (
            <div className="layer-card" key={item.id}>
              <label className="layer-toggle">
                <input type="checkbox" checked={enabled[item.id]} onChange={event => setEnabled(current => ({ ...current, [item.id]: event.target.checked }))} />
                <strong>{item.instrument}</strong>
                <span className={`status ${states[item.id] === 'error' ? 'bad' : ''}`} aria-live="polite">{states[item.id]}</span>
              </label>
              <small>{item.mission} · {item.kind}</small>
              <label className="opacity">Opacidad {Math.round(opacity[item.id] * 100)} %
                <input type="range" min="0" max="100" value={opacity[item.id] * 100} disabled={!enabled[item.id]}
                  onChange={event => setOpacity(current => ({ ...current, [item.id]: Number(event.target.value) / 100 }))} />
              </label>
              <button type="button" className="text-button" onClick={() => setSelected(item.id)}>Ficha y leyenda →</button>
            </div>
          ))}
          <section className="source-details" aria-label="Ficha de fuente">
            <h3>{source.title}</h3>
            <p><b>Leyenda:</b> {source.legend}</p>
            <dl>
              <dt>Producto</dt><dd>{source.productId}</dd>
              <dt>Resolución</dt><dd>{source.resolution}</dd>
              <dt>Cobertura publicada</dt><dd>{source.coverage}</dd>
              <dt>Adquisición</dt><dd>{source.acquisitionDate}</dd>
              <dt>Créditos</dt><dd>{source.attribution}</dd>
            </dl>
            <p><b>Límite:</b> {source.limitations}</p>
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">GetCapabilities oficial ↗</a>
          </section>
        </aside>
        <main className="map-panel">
          <div className="map-heading"><div><strong>Sector Jezero · Marte</strong><span>77.35–77.51°E · 18.30–18.45°N · coordenadas angulares marcianas</span></div><span>2D · NASA Mars Trek</span></div>
          <MapView enabled={enabled} opacity={opacity} points={points} nextPoint={nextPoint} onPoint={addPoint}
            onLayerState={(id, state) => setStates(current => current[id] === state ? current : { ...current, [id]: state })} />
          <div className="map-footer">Fondo local si falla la red: tesela real CTX Jezero (zoom 10), cobertura limitada. Blanco fuera del recorte = sin datos. Créditos: NASA/JPL-Caltech/USGS · MRO CTX; NASA/JPL-Caltech · MGS MOLA; NASA/JPL-Caltech/ASU · Mars Odyssey THEMIS · Mars Trek.</div>
        </main>
        <aside className="panel context-panel" aria-label="Ciencia y limitaciones">
          <h2>¿Por qué Jezero?</h2>
          <p>NASA describe un antiguo sistema de lago y delta fluvial en Jezero. Los depósitos podrían preservar indicios del ambiente antiguo: explorar su geología tiene valor científico, pero <b>no implica haber detectado vida</b>.</p>
          <a href="https://science.nasa.gov/mission/mars-2020-perseverance/science-objectives/" target="_blank" rel="noreferrer">Objetivos de Perseverance · NASA ↗</a>
          <h2>Riesgos y evidencia</h2>
          <div className="notice"><b>NO_DATA · Perfil y pendientes</b><br />Sin DEM numérico validado en este ROI. No se calculan alturas ni pendientes.</div>
          <div className="notice"><b>LOW_RESOLUTION · MOLA</b><br />El relieve visual regional no permite detectar rocas o escalones.</div>
          <div className="notice"><b>UNVERIFIED · Ruta</b><br />Transitabilidad, obstáculos pequeños, clima y radiación locales no evaluados. Las paradas elegidas son propuestas del usuario, no sitios de muestreo verificados.</div>
        </aside>
      </div>
      <section className="route-panel" aria-label="Planificador de ruta">
        <div><span className="eyebrow">PLAN MANUAL · DISTANCIA ESFÉRICA APROXIMADA</span><h2>Recorrido exploratorio</h2><p>Hacé clic en el mapa para marcar A → P → B. Para cambiar un punto, elegí «Mover» y luego hacé clic dentro del sector.</p></div>
        <div className="waypoints">
          {names.map((name, index) => <div className="waypoint" key={name}><strong>{name}</strong><span>{points[index] ? formatPoint(points[index]) : 'Sin marcar'}</span>
            {points[index] && <button type="button" onClick={() => setMode(index)} aria-pressed={mode === index}>Mover</button>}</div>)}
        </div>
        <div className="route-summary">
          <strong>{points.length > 1 ? `${(routeDistance(points) / 1000).toFixed(2)} km` : 'Sin distancia'}</strong>
          <span>{points.length === 3 ? `A–P ${(marsDistance(points[0], points[1]) / 1000).toFixed(2)} km · P–B ${(marsDistance(points[1], points[2]) / 1000).toFixed(2)} km` : 'Longitud de tramos rectos marcianos, no sendero transitable'}</span>
          <button type="button" onClick={() => { setPoints([]); setMode(null) }} disabled={!points.length}>Restablecer ruta</button>
        </div>
      </section>
      <footer className="disclaimer">Prototipo educativo independiente, sin aval de NASA. Distancias aproximadas con Marte esférico (radio medio 3 389 500 m); no incluye relieve. No apto para navegación ni seguridad operacional.</footer>
    </div>
  )
}
