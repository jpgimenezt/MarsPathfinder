import { useEffect } from 'react'
import { localizedDiscoveryStop, type TourStop } from '../features/tour/missionDiscoveryTourData'
import { resolveAssetUrl } from '../utils/assetUrl'
import { useLanguage } from '../features/i18n/appI18n'

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
  const { language } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  const stop = localizedDiscoveryStop(currentStop, language)
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
    <div className="ares-discovery-tour-overlay" role="region" aria-label={ui('Educational 3D science flyover', 'Sobrevuelo científico educativo 3D')}>
      {/* Barra de telemetría de vuelo superior */}
      <header className="tour-top-telemetry">
        <div className="telemetry-badge">
          <span className="telemetry-pulse" />
          {ui('[EDUCATIONAL 3D FLYOVER // GALE LANDMARKS]', '[SOBREVUELO EDUCATIVO 3D // HITOS DE GALE]')}
        </div>

        {/* Puntos de ruta interactivos en la parte superior */}
        <nav className="tour-stop-tabs" aria-label={ui('Select flyover landmark', 'Seleccionar hito de sobrevuelo')}>
          {Array.from({ length: totalStops }).map((_, idx) => (
            <button
              key={`stop-tab-${idx}`}
              type="button"
              className={`tour-tab-dot ${idx === currentStopIndex ? 'active' : ''} ${idx < currentStopIndex ? 'visited' : ''}`}
              onClick={() => onJumpToStop(idx)}
              title={`${ui('Landmark', 'Hito')} ${idx + 1}`}
              aria-label={`${ui('Go to landmark', 'Ir a hito')} ${idx + 1}`}
            >
              <span className="dot-index">{idx + 1}</span>
            </button>
          ))}
        </nav>

        <div className="telemetry-flight-status">
          <span className="status-label">{ui('CAMERA STATE:', 'ESTADO DE CÁMARA:')}</span>
          <span className={`status-val ${isPaused ? 'paused' : 'flying'}`}>
            {isPaused ? ui('[PAUSED AT LANDMARK]', '[EN PAUSA EN EL HITO]') : ui('[CAMERA FLYOVER]', '[SOBREVUELO DE CÁMARA]')}
          </span>
          <button type="button" className="tour-exit-btn" onClick={onExit} title={ui('End flyover (Esc)', 'Finalizar sobrevuelo (Esc)')}>
            {ui('[EXIT FLYOVER]', '[SALIR DEL SOBREVUELO]')}
          </button>
        </div>
      </header>

      {/* Tarjeta flotante del Hito Científico (FUI Aeroespacial) */}
      <article className="tour-science-card" aria-label={stop.title}>
        <div className="card-header-bar">
          <span className="card-stage-tag">
            {ui('LANDMARK', 'HITO')} {currentStopIndex + 1} {ui('OF', 'DE')} {totalStops} // SOL {stop.sol} ({stop.earthDate})
          </span>
          <span className="card-mola-cota">{ui('ELEVATION: UNVERIFIED MODEL', 'ALTITUD: MODELO SIN VALIDAR')}</span>
        </div>

        <h2 className="card-target-title">{stop.title}</h2>
        <p className="card-target-subtitle">{stop.subtitle}</p>

        {/* Imagen de contexto de NASA si existe */}
        {currentStop.imageUrl && (
          <div className="card-nasa-visual">
            <img
              src={resolveAssetUrl(currentStop.imageUrl)}
              alt={stop.title}
              className="card-nasa-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.hidden = true // An unrelated fallback photo would imply false provenance.
              }}
            />
            <span className="card-nasa-credit">{currentStop.imageCredit}</span>
          </div>
        )}

        {/* Ficha técnica geológica y astrobiológica */}
        <div className="card-geological-strip">
          <div className="geo-strip-item">
            <span className="geo-label">{ui('REGIONAL GEOLOGIC CONTEXT:', 'CONTEXTO GEOLÓGICO REGIONAL:')}</span>
            <strong className="geo-value">{stop.geologicalUnit}</strong>
          </div>
          <div className="geo-strip-item">
            <span className="geo-label">{ui('ILLUSTRATIVE TOUR COORDINATES:', 'COORDENADAS ILUSTRATIVAS DEL RECORRIDO:')}</span>
            <span className="geo-value monospace">
              {Math.abs(currentStop.coordinates.lat).toFixed(4)}°S · {currentStop.coordinates.lon.toFixed(4)}°E
            </span>
          </div>
        </div>

        <div className="card-scientific-rationale">
          <span className="rationale-label">{ui('SCIENTIFIC CONTEXT:', 'CONTEXTO CIENTÍFICO:')}</span>
          <p className="rationale-text">{stop.scientificValue}</p>
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
            title={ui('Previous landmark (Left Arrow)', 'Hito anterior (Flecha Izquierda)')}
          >
            {ui('[PREVIOUS]', '[ANTERIOR]')}
          </button>

          <button
            type="button"
            className={`hud-btn ${isPaused ? 'highlight' : ''}`}
            onClick={onTogglePause}
            title={ui('Pause to rotate or resume flyover (Space)', 'Pausar para rotar o reanudar (Espacio)')}
          >
            {isPaused ? ui('[RESUME]', '[REANUDAR]') : ui('[PAUSE CAMERA]', '[PAUSAR CÁMARA]')}
          </button>

          <button
            type="button"
            className="hud-btn highlight"
            onClick={onNext}
            title={ui('Next landmark (Right Arrow)', 'Siguiente hito (Flecha Derecha)')}
          >
            {currentStopIndex === totalStops - 1 ? ui('[FINISH]', '[FINALIZAR]') : ui('[NEXT]', '[SIGUIENTE]')}
          </button>
        </div>

        <div className="card-shortcuts-hint">
          <span>{ui('SHORTCUTS: [SPACE] Pause/Resume · [←/→] Previous/Next · [ESC] Exit', 'ATAJOS: [ESPACIO] Pausar/Reanudar · [←/→] Anterior/Siguiente · [ESC] Salir')}</span>
        </div>
      </article>
    </div>
  )
}
