import { useEffect } from 'react'
import type { TourStop } from '../features/tour/missionDiscoveryTourData'

interface MissionDiscoveryTourOverlayProps {
  currentStopIndex: number
  totalStops: number
  currentStop: TourStop
  isPaused: boolean
  onNext: () => void
  onPrev: () => void
  onTogglePause: () => void
  onExit: () => void
  onJumpToStop: (index: number) => void
}

export function MissionDiscoveryTourOverlay({
  currentStopIndex,
  totalStops,
  currentStop,
  isPaused,
  onNext,
  onPrev,
  onTogglePause,
  onExit,
  onJumpToStop,
}: MissionDiscoveryTourOverlayProps) {
  // Manejo de atajos de teclado para navegación cinemática
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'KeyN') {
        onNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyP') {
        onPrev()
      } else if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault()
        onTogglePause()
      } else if (e.key === 'Escape') {
        onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNext, onPrev, onTogglePause, onExit])

  return (
    <div className="ares-discovery-tour-overlay" role="region" aria-label="Sobrevuelo Científico 3D">
      {/* Barra de telemetría de vuelo superior */}
      <header className="tour-top-telemetry">
        <div className="telemetry-badge">
          <span className="telemetry-pulse" />
          [SOBREVUELO CIENTÍFICO 3D // HITOS DE GALE CRATER]
        </div>

        {/* Puntos de ruta interactivos en la parte superior */}
        <nav className="tour-stop-tabs" aria-label="Seleccionar hito de sobrevuelo">
          {Array.from({ length: totalStops }).map((_, idx) => (
            <button
              key={`stop-tab-${idx}`}
              type="button"
              className={`tour-tab-dot ${idx === currentStopIndex ? 'active' : ''} ${idx < currentStopIndex ? 'visited' : ''}`}
              onClick={() => onJumpToStop(idx)}
              title={`Hito ${idx + 1}`}
              aria-label={`Ir a hito ${idx + 1}`}
            >
              <span className="dot-index">{idx + 1}</span>
            </button>
          ))}
        </nav>

        <div className="telemetry-flight-status">
          <span className="status-label">ESTADO DE CÁMARA:</span>
          <span className={`status-val ${isPaused ? 'paused' : 'flying'}`}>
            {isPaused ? '[ORBITANDO EN SITIO // PAUSA]' : '[EN VUELO CONTINUO]'}
          </span>
          <button type="button" className="tour-exit-btn" onClick={onExit} title="Finalizar sobrevuelo (Esc)">
            [SALIR DEL SOBREVUELO]
          </button>
        </div>
      </header>

      {/* Tarjeta flotante del Hito Científico (FUI Aeroespacial) */}
      <article className="tour-science-card" aria-label={currentStop.title}>
        <div className="card-header-bar">
          <span className="card-stage-tag">
            HITO {currentStopIndex + 1} DE {totalStops} // SOL {currentStop.sol} ({currentStop.earthDate})
          </span>
          <span className="card-mola-cota">COTA: {currentStop.elevationMeters} M (MOLA)</span>
        </div>

        <h2 className="card-target-title">{currentStop.title}</h2>
        <p className="card-target-subtitle">{currentStop.subtitle}</p>

        {/* Imagen de contexto de NASA si existe */}
        {currentStop.imageUrl && (
          <div className="card-nasa-visual">
            <img
              src={currentStop.imageUrl}
              alt={currentStop.title}
              className="card-nasa-img"
              loading="lazy"
            />
            <span className="card-nasa-credit">{currentStop.imageCredit}</span>
          </div>
        )}

        {/* Ficha técnica geológica y astrobiológica */}
        <div className="card-geological-strip">
          <div className="geo-strip-item">
            <span className="geo-label">UNIDAD ESTRATIGRÁFICA (USGS):</span>
            <strong className="geo-value">{currentStop.geologicalUnit}</strong>
          </div>
          <div className="geo-strip-item">
            <span className="geo-label">COORDENADAS AREOCÉNTRICAS:</span>
            <span className="geo-value monospace">
              {Math.abs(currentStop.coordinates.lat).toFixed(4)}°S · {currentStop.coordinates.lon.toFixed(4)}°E
            </span>
          </div>
        </div>

        <div className="card-scientific-rationale">
          <span className="rationale-label">RELEVANCIA CIENTÍFICA / EXPLORACIÓN:</span>
          <p className="rationale-text">{currentStop.scientificValue}</p>
        </div>

        {/* Barra de progreso de la parada actual */}
        <div className="tour-playback-progress">
          <div
            className="tour-progress-bar-fill"
            style={{ width: `${((currentStopIndex + 1) / totalStops) * 100}%` }}
          />
        </div>

        {/* Controles de navegación de vuelo */}
        <div className="card-tour-controls">
          <button
            type="button"
            className="hud-btn"
            onClick={onPrev}
            disabled={currentStopIndex === 0}
            title="Hito anterior (Flecha Izquierda)"
          >
            [ANTERIOR]
          </button>

          <button
            type="button"
            className={`hud-btn ${isPaused ? 'highlight' : ''}`}
            onClick={onTogglePause}
            title="Pausar para rotar o reanudar sobrevuelo (Espacio)"
          >
            {isPaused ? '[REANUDAR VUELO]' : '[PAUSAR CÁMARA]'}
          </button>

          <button
            type="button"
            className="hud-btn highlight"
            onClick={onNext}
            title="Siguiente hito (Flecha Derecha)"
          >
            {currentStopIndex === totalStops - 1 ? '[FINALIZAR]' : '[SIGUIENTE]'}
          </button>
        </div>

        <div className="card-shortcuts-hint">
          <span>ATAJOS: [ESPACIO] Pausar/Reanudar · [←/→] Anterior/Siguiente · [ESC] Salir</span>
        </div>
      </article>
    </div>
  )
}
