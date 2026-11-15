import { compareCuriosityWithEva } from '../features/science/curiosityPathData'

interface Props {
  isOpen: boolean
  onClose: () => void
  evaDistanceKm: number
  evaHours: number
}

export function MissionPathComparisonModal({ isOpen, onClose, evaDistanceKm, evaHours }: Props) {
  if (!isOpen) return null

  const comparison = compareCuriosityWithEva(evaDistanceKm, evaHours)

  return (
    <div className="ares-modal-backdrop" onClick={onClose}>
      <div
        className="ares-modal-container comparison-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Comparación de Misiones: Curiosity vs Excursión EVA"
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">[HERENCIA DE EXPLORACIÓN // TRAVESÍA CURIOSITY VS EVA]</span>
            <h2 className="modal-title">MISSION PATH COMPARISON</h2>
            <p className="modal-subtitle">
              Análisis comparativo entre el ascenso histórico del rover robótico MSL Curiosity (2012-2024) y la excursión táctica humana planificada en ARES.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [CERRAR]
          </button>
        </header>

        <div className="comparison-content">
          <div className="comparison-cards-grid">
            {/* Tarjeta Curiosity */}
            <div className="comp-card rover-card">
              <div className="comp-card-badge">MISIÓN ROBÓTICA HISTÓRICA (NASA MSL)</div>
              <h3 className="comp-mission-title">{comparison.roverTraverse.mission}</h3>
              <p className="comp-vehicle">{comparison.roverTraverse.vehicle}</p>

              <div className="comp-stat-list">
                <div className="comp-stat-row">
                  <span className="stat-label">DISTANCIA RECORRIDA</span>
                  <strong className="stat-val amber">{comparison.roverTraverse.cumulativeDistanceKm} km</strong>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">DURACIÓN OPERACIONAL</span>
                  <span className="stat-val">{comparison.roverTraverse.durationYears} años terrestres (4,100+ Sols)</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">VELOCIDAD MEDIA</span>
                  <span className="stat-val">{comparison.roverTraverse.averageSpeedKmh} km/h (Avance cauteloso)</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">TOLERANCIA MÁXIMA DE PENDIENTE</span>
                  <span className="stat-val">{comparison.roverTraverse.maxSlopeToleranceDeg}° (Robótica rígida)</span>
                </div>
              </div>

              <div className="comp-text-section">
                <label>MODO OPERACIONAL:</label>
                <p>{comparison.roverTraverse.operationalMode}</p>
              </div>

              <div className="comp-text-section">
                <label>RESTRICCIÓN CRÍTICA:</label>
                <p className="constraint-text amber">{comparison.roverTraverse.primaryConstraint}</p>
              </div>
            </div>

            {/* Tarjeta Plan Humano ARES */}
            <div className="comp-card human-card">
              <div className="comp-card-badge cyan">EXCURSIÓN TRIPULADA (ARES EVA)</div>
              <h3 className="comp-mission-title">{comparison.humanEvaPlan.mission}</h3>
              <p className="comp-vehicle">{comparison.humanEvaPlan.operator}</p>

              <div className="comp-stat-list">
                <div className="comp-stat-row">
                  <span className="stat-label">DISTANCIA PLANIFICADA</span>
                  <strong className="stat-val cyan">{comparison.humanEvaPlan.plannedDistanceKm} km</strong>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">DURACIÓN ESTIMADA</span>
                  <span className="stat-val">{comparison.humanEvaPlan.durationHours} horas de caminata</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">VELOCIDAD NOMINAL</span>
                  <span className="stat-val">{comparison.humanEvaPlan.averageSpeedKmh} km/h (Marcha humana)</span>
                </div>
                <div className="comp-stat-row">
                  <span className="stat-label">TOLERANCIA DE PENDIENTE</span>
                  <span className="stat-val">{comparison.humanEvaPlan.maxSlopeToleranceDeg}° (Con botas EVA y bastones)</span>
                </div>
              </div>

              <div className="comp-text-section">
                <label>MODO OPERACIONAL:</label>
                <p>{comparison.humanEvaPlan.operationalMode}</p>
              </div>

              <div className="comp-text-section">
                <label>RESTRICCIÓN CRÍTICA:</label>
                <p className="constraint-text cyan">{comparison.humanEvaPlan.primaryConstraint}</p>
              </div>
            </div>
          </div>

          <div className="comparison-insights-box">
            <h4>SÍNTESIS DE INGENIERÍA PARA PLANIFICACIÓN DE SUPERFICIE:</h4>
            <p>
              Mientras que MSL Curiosity requirió 12 años para recorrer 32 kilómetros ascendiendo gradualmente por las capas sedimentarias de Mount Sharp debido a la latencia de comunicaciones y al cuidado de sus ruedas, un equipo humano respaldado por un rover presurizado puede completar ese mismo recorrido científico en menos de 10 horas de actividad extravehicular. Sin embargo, el riesgo humano exige respetar estrictamente la regla de Walkback Limit (radio máximo de retorno seguro de 8.0 km a pie en caso de falla vehicular).
            </p>
          </div>
        </div>

        <footer className="ares-modal-footer">
          <button type="button" className="hud-btn primary" onClick={onClose}>
            [ENTENDIDO // CONTINUAR NAVEGACIÓN]
          </button>
        </footer>
      </div>
    </div>
  )
}
