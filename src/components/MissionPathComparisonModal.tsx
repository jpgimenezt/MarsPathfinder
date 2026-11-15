import { compareCuriosityWithEva } from '../features/science/curiosityPathData'
import { useLanguage } from '../features/i18n/appI18n'

interface Props {
  isOpen: boolean
  onClose: () => void
  evaDistanceKm: number
  evaHours: number
}

export function MissionPathComparisonModal({ isOpen, onClose, evaDistanceKm, evaHours }: Props) {
  const { language, number } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  if (!isOpen) return null

  const comparison = compareCuriosityWithEva(evaDistanceKm, evaHours)

  return (
    <div className="ares-modal-backdrop" onClick={onClose}>
      <div
        className="ares-modal-container comparison-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={ui('Mission comparison: Curiosity vs hypothetical EVA', 'Comparación de misiones: Curiosity y EVA hipotética')}
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">{ui('[HISTORICAL CURIOSITY TRAVERSE VS HYPOTHETICAL EVA]', '[TRAVESÍA HISTÓRICA CURIOSITY Y EVA HIPOTÉTICA]')}</span>
            <h2 className="modal-title">MISSION PATH COMPARISON</h2>
            <p className="modal-subtitle">
              {ui('Conceptual comparison between Curiosity’s historical rover traverse and an illustrative human EVA scenario. Not an operational travel plan.', 'Comparación conceptual entre la travesía histórica de Curiosity y un escenario EVA humano ilustrativo. No es un plan operacional.')}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            {ui('[CLOSE]', '[CERRAR]')}
          </button>
        </header>

        <div className="comparison-content">
          <div className="comparison-cards-grid">
            {/* Tarjeta Curiosity */}
            <div className="comp-card rover-card">
              <div className="comp-card-badge">{ui('HISTORICAL ROBOTIC MISSION (NASA MSL)', 'MISIÓN ROBÓTICA HISTÓRICA (NASA MSL)')}</div>
              <h3 className="comp-mission-title">{comparison.roverTraverse.mission}</h3>
              <p className="comp-vehicle">{ui('Curiosity rover', comparison.roverTraverse.vehicle)}</p>

              <div className="comp-stat-list">
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('TRAVERSE DISTANCE', 'DISTANCIA RECORRIDA')}</span>
                  <strong className="stat-val amber">{number(comparison.roverTraverse.cumulativeDistanceKm)} km</strong>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('ELAPSED TIME (HISTORICAL CONTEXT)', 'TIEMPO TRANSCURRIDO (CONTEXTO HISTÓRICO)')}</span>
                  <span className="stat-val">{comparison.roverTraverse.durationYears} {ui('Earth years', 'años terrestres')} (4,100+ Sols)</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('ILLUSTRATIVE AVERAGE SPEED', 'VELOCIDAD MEDIA ILUSTRATIVA')}</span>
                  <span className="stat-val">{number(comparison.roverTraverse.averageSpeedKmh)} km/h</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('SLOPE LIMIT', 'LÍMITE DE PENDIENTE')}</span>
                  <span className="stat-val">{ui('Not verified for this comparison', 'No verificado para esta comparación')}</span>
                </div>
              </div>

              <div className="comp-text-section">
                <label>{ui('HISTORICAL CONTEXT:', 'CONTEXTO HISTÓRICO:')}</label>
                <p>{ui('Autonomous rover operations with mission-team supervision.', comparison.roverTraverse.operationalMode)}</p>
              </div>

              <div className="comp-text-section">
                <label>{ui('LIMITATION:', 'LIMITACIÓN:')}</label>
                <p className="constraint-text amber">{ui('A rover traverse cannot establish human EVA travel time or safety.', comparison.roverTraverse.primaryConstraint)}</p>
              </div>
            </div>

            {/* Tarjeta Plan Humano ARES */}
            <div className="comp-card human-card">
              <div className="comp-card-badge cyan">{ui('ILLUSTRATIVE CREWED EVA (ARES)', 'EVA TRIPULADA ILUSTRATIVA (ARES)')}</div>
              <h3 className="comp-mission-title">{ui('ARES — hypothetical crewed exploration', comparison.humanEvaPlan.mission)}</h3>
              <p className="comp-vehicle">{ui('Simulated human exploration scenario', comparison.humanEvaPlan.operator)}</p>

              <div className="comp-stat-list">
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('PROPOSED DISTANCE', 'DISTANCIA PROPUESTA')}</span>
                  <strong className="stat-val cyan">{number(comparison.humanEvaPlan.plannedDistanceKm)} km</strong>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('THEORETICAL DURATION', 'DURACIÓN TEÓRICA')}</span>
                  <span className="stat-val">{number(comparison.humanEvaPlan.durationHours)} {ui('hours at assumed speed', 'horas con velocidad supuesta')}</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('ASSUMED SPEED', 'VELOCIDAD SUPUESTA')}</span>
                  <span className="stat-val">{number(comparison.humanEvaPlan.averageSpeedKmh)} km/h</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">{ui('EVA SLOPE LIMIT', 'LÍMITE DE PENDIENTE EVA')}</span>
                  <span className="stat-val">{ui('Not assessed; no verified NASA limit', 'Sin evaluar; sin límite NASA verificado')}</span>
                </div>
              </div>

              <div className="comp-text-section">
                <label>{ui('SCENARIO:', 'ESCENARIO:')}</label>
                <p>{ui('Hypothetical crewed activity, not an operational mission plan.', comparison.humanEvaPlan.operationalMode)}</p>
              </div>

              <div className="comp-text-section">
                <label>{ui('LIMITATION:', 'LIMITACIÓN:')}</label>
                <p className="constraint-text cyan">{ui('Small obstacles, verified walkback capability and local conditions remain unknown.', comparison.humanEvaPlan.primaryConstraint)}</p>
              </div>
            </div>
          </div>

          <div className="comparison-insights-box">
            <h4>{ui('SCIENTIFIC COMPARISON — LIMITATIONS:', 'COMPARACIÓN CIENTÍFICA — LIMITACIONES:')}</h4>
            <p>
              {ui('Curiosity’s historical rover traverse and a hypothetical EVA cannot be compared as equivalent journeys. The assumed travel time does not include terrain validation, logistics or human factors. No published NASA walkback limit or safe return distance has been verified for this scenario.', 'La travesía histórica del rover Curiosity y una EVA hipotética no son recorridos equivalentes. El tiempo supuesto no incluye validación del terreno, logística ni factores humanos. No se verificó un límite NASA de retorno seguro para este escenario.')}
            </p>
          </div>
        </div>

        <footer className="ares-modal-footer">
          <button type="button" className="hud-btn primary" onClick={onClose}>
            {ui('[CLOSE COMPARISON]', '[CERRAR COMPARACIÓN]')}
          </button>
        </footer>
      </div>
    </div>
  )
}
