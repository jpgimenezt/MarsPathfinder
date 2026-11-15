import { useState } from 'react'

export interface GuidedTourStep {
  id: string
  stageNumber: number
  title: string
  subtitle: string
  description: string
  targetSelector?: string
  actionHint?: string
}

export const GUIDED_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'stage-planetary-view',
    stageNumber: 1,
    title: 'ETAPA 1 — VISTA PLANETARIA Y VISOR 3D',
    subtitle: 'Navegación Espacial en Tres Dimensiones',
    description: 'El visor 3D renderiza una reconstrucción topográfica de Gale Crater referenciada al Areoide marciano de MGS MOLA (radio medio RM = 3,389,500 m). Podés rotar la cámara manteniendo presionado el botón izquierdo del ratón, desplazarte con el botón derecho y acercarte con la rueda de desplazamiento.',
    actionHint: 'Rotá libremente para observar los flancos sedimentarios de Mount Sharp y las murallas de impacto.',
  },
  {
    id: 'stage-camera-modes',
    stageNumber: 2,
    title: 'ETAPA 2 — NAVEGACIÓN Y PERSPECTIVAS DE CÁMARA',
    subtitle: 'Modos Tácticos: Órbita, Pan, 1ª Persona y Vuelo',
    description: 'En la pestaña "CÁMARA" de la consola táctica izquierda podés alternar entre la vista cenital orbital, el paneo horizontal, la perspectiva de primera persona a escala de astronauta (1.8 m) y el vuelo panorámico aéreo continuo.',
    targetSelector: '.dock-nav-tabs',
    actionHint: 'Cambiá al modo 1ª Persona para experimentar la escala real del terreno marciano.',
  },
  {
    id: 'stage-scientific-layers',
    stageNumber: 3,
    title: 'ETAPA 3 — CAPAS CIENTÍFICAS MULTIMISIÓN',
    subtitle: 'Cartografía Oficial, Geología USGS y Topografía Hipsométrica',
    description: 'Accedé a imágenes orbitales ópticas MRO CTX a 6 m/píxel (mosaico controlado Gale_CTX_BlockAdj_dd), el mapa geológico unificado USGS SIM 3292 con unidades estratigráficas, inercia térmica THEMIS y análisis de pendientes estimadas del modelo.',
    targetSelector: '.layer-selection-list',
    actionHint: 'Alterná entre el Mosaico CTX y la Geología USGS para ver los estratos enriquecidos.',
  },
  {
    id: 'stage-scientific-discoveries',
    stageNumber: 4,
    title: 'ETAPA 4 — DESCUBRIMIENTOS Y HERENCIA CURIOSITY',
    subtitle: 'Hitos Geológicos y Travesía Histórica de 32 km',
    description: 'Hacé clic sobre las balizas tácticas en el mapa o en el carrusel inferior para inspeccionar campañas científicas reales de MSL Curiosity: Bahía Yellowknife (lago habitable), Dunas de Bagnold, Vera Rubin Ridge y grietas de lodo fósiles en Pontours.',
    targetSelector: '.hud-waypoints-carousel',
    actionHint: 'La travesía de Curiosity aparece trazada en ámbar sobre el relieve real de Gale.',
  },
  {
    id: 'stage-mission-routes',
    stageNumber: 5,
    title: 'ETAPA 5 — PLANIFICACIÓN DE EXCURSIONES EVA',
    subtitle: 'Trazado Geodésico y Regla de Walkback Limit',
    description: 'Al fijar un origen (Base A), parada científica (P) y destino (B), el sistema calcula la distancia tridimensional exacta con corrección topográfica y evalúa el límite de retorno seguro a pie (Walkback Limit nominal ≤ 8.0 km).',
    targetSelector: '.hud-bottom-eva',
    actionHint: 'Presioná [VER TRAZABILIDAD] para examinar el desglose tramo a tramo.',
  },
  {
    id: 'stage-mars-habitat',
    stageNumber: 6,
    title: 'ETAPA 6 — HÁBITAT Y COLONIA MARCIANA (BASE ALFA)',
    subtitle: 'Infraestructura Humana Conceptual de Próxima Generación',
    description: 'Inspeccioná los módulos 3D situados en la elipse norte de aterrizaje LZ-1: Módulo de Descenso HLS, Núcleo Habitable protegido con berma de regolito, Invernadero Bioregenerativo CELSS, Laboratorio y Rover Presurizado 6x6.',
    targetSelector: '.dock-nav-tabs',
    actionHint: 'Activá la pestaña "BASE ALFA" para recorrer cada instalación y sus subsistemas.',
  },
  {
    id: 'stage-mission-control',
    stageNumber: 7,
    title: 'ETAPA 7 — CONTROL DE MISIÓN Y DATOS NASA',
    subtitle: 'Centro de Datos, Inteligencia de Superficie y Copiloto',
    description: 'Utilizá el [CENTRO CIENTÍFICO ARES] para consultar las fichas de metadatos espaciales normalizados, abrí [FOTOS RAW] para examinar la galería fotográfica de Curiosity y Perseverance, y conversá con el [COPILOTO TÁCTICO] para asistencia en tiempo real.',
    targetSelector: '.dock-action-buttons',
    actionHint: 'Presioná [FINALIZAR TUTORIAL] para comenzar a explorar Marte con total libertad.',
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function AresGuidedTour({ isOpen, onClose, onComplete }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true)

  if (!isOpen) return null

  const step = GUIDED_TOUR_STEPS[currentStepIndex]
  const totalSteps = GUIDED_TOUR_STEPS.length

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleStartTour = () => {
    setIsWelcomeScreen(false)
    setCurrentStepIndex(0)
  }

  return (
    <div className="ares-tour-backdrop" role="dialog" aria-modal="true" aria-label="Recorrido Guiado ARES">
      {/* Pantalla de Bienvenida Inicial */}
      {isWelcomeScreen ? (
        <div className="ares-tour-welcome-card">
          <div className="welcome-tag">[SISTEMA DE EXPLORACIÓN PLANETARIA // ARES]</div>
          <h2 className="welcome-title">ARES / MARS EXPLORATION SYSTEM</h2>
          <p className="welcome-lead">
            Bienvenido al sistema de exploración planetaria. Descubrí el terreno marciano, analizá datos científicos y planificá futuras expediciones humanas.
          </p>
          <div className="welcome-feature-list">
            <div className="welcome-feature-item">
              <strong>CARTOGRAFÍA OFICIAL NASA / USGS:</strong>
              <span>Mosaico orbital CTX a 6 m/px, mapas geológicos SIM 3292 y modelo hipsométrico.</span>
            </div>
            <div className="welcome-feature-item">
              <strong>HERENCIA DE EXPLORACIÓN CURIOSITY:</strong>
              <span>Travesía histórica de 32 km en Mount Sharp y comparación con caminatas humanas.</span>
            </div>
            <div className="welcome-feature-item">
              <strong>PLANIFICACIÓN TÁCTICA EVA:</strong>
              <span>Cálculo de trayectos con geodesia marciana y límite de soporte vital (Walkback Limit).</span>
            </div>
          </div>
          <div className="welcome-actions">
            <button type="button" className="hud-btn highlight welcome-btn" onClick={handleStartTour}>
              [INICIAR EXPLORACIÓN]
            </button>
            <button type="button" className="hud-btn welcome-btn-secondary" onClick={onClose}>
              [OMITIR INTRODUCCIÓN]
            </button>
          </div>
        </div>
      ) : (
        /* Tarjeta de Etapas Guiadas Paso a Paso */
        <div className="ares-tour-step-card">
          <header className="tour-step-header">
            <div>
              <span className="tour-step-tag">
                ETAPA {step.stageNumber} DE {totalSteps} // ARES ONBOARDING
              </span>
              <h3 className="tour-step-title">{step.title}</h3>
              <p className="tour-step-subtitle">{step.subtitle}</p>
            </div>
            <button type="button" className="tour-close-btn" onClick={onClose} aria-label="Cerrar tutorial">
              [SALIR]
            </button>
          </header>

          <div className="tour-step-body">
            <p className="tour-step-desc">{step.description}</p>
            {step.actionHint && (
              <div className="tour-action-hint">
                <strong>ACCIÓN SUGERIDA:</strong> {step.actionHint}
              </div>
            )}
          </div>

          <footer className="tour-step-footer">
            <div className="tour-progress-bar-wrap">
              <div
                className="tour-progress-fill"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>

            <div className="tour-step-controls">
              <button
                type="button"
                className="hud-btn"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
              >
                [ANTERIOR]
              </button>
              <div className="tour-step-indicator">
                PASO {currentStepIndex + 1} / {totalSteps}
              </div>
              <button
                type="button"
                className="hud-btn highlight"
                onClick={handleNext}
              >
                {currentStepIndex === totalSteps - 1 ? '[FINALIZAR]' : '[SIGUIENTE]'}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
