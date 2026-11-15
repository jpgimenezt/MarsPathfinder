import { useState } from 'react'
import { useLanguage } from '../features/i18n/appI18n'

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

const EN_STEPS: Record<string, Pick<GuidedTourStep, 'title' | 'subtitle' | 'description' | 'actionHint'>> = {
  'stage-planetary-view': {
    title: 'STAGE 1 — PLANETARY VIEW AND 3D EXPLORER', subtitle: 'Explore Mars in three dimensions',
    description: 'This Gale Crater scene is an approximate procedural terrain reconstruction, not a measured local DEM. Drag to rotate, right-drag to pan, and scroll to zoom.',
    actionHint: 'Rotate to inspect the illustrative flanks of Mount Sharp and Gale’s crater walls.',
  },
  'stage-camera-modes': {
    title: 'STAGE 2 — CAMERA NAVIGATION', subtitle: 'Orbit, pan, first person and flight',
    description: 'Use the Camera tab to change between orbital, pan, simulated eye-level and flight views. Camera altitude is not operational terrain data.',
    actionHint: 'Try first-person mode for an approximate sense of scale.',
  },
  'stage-scientific-layers': {
    title: 'STAGE 3 — SCIENTIFIC LAYERS', subtitle: 'Orbital imagery and geologic context',
    description: 'Compare CTX imagery, USGS geologic context and THEMIS historical infrared imagery. Procedural Gale elevation, slope and radiation overlays are simulations, not validated local measurements.',
    actionHint: 'Compare CTX visual imagery with regional USGS geologic context.',
  },
  'stage-scientific-discoveries': {
    title: 'STAGE 4 — CURIOSITY SCIENCE', subtitle: 'Science landmarks and historical traverse',
    description: 'Inspect selected Curiosity science locations, including Yellowknife Bay, Bagnold Dunes and Vera Rubin Ridge. Tour positions and camera viewpoints are illustrative and require independent spatial validation.',
    actionHint: 'Select a landmark for its documented scientific context.',
  },
  'stage-mission-routes': {
    title: 'STAGE 5 — EXPLORATORY EVA PLANNING', subtitle: 'Mars distances and uncertainty',
    description: 'Set A, P and B to compare proposed paths. Distances use Martian geometry; modeled Gale slopes and walkback thresholds are not validated NASA EVA safety criteria.',
    actionHint: 'Open route details and inspect what remains unassessed.',
  },
  'stage-mars-habitat': {
    title: 'STAGE 6 — CONCEPTUAL HABITAT', subtitle: 'Educational Base Alpha simulation',
    description: 'Explore simulated habitat modules. Crew, energy and resource figures are conceptual, not measured mission operations or approved designs.',
    actionHint: 'Open the Base Alpha tab to explore conceptual facilities.',
  },
  'stage-mission-control': {
    title: 'STAGE 7 — MISSION DATA AND SOURCES', subtitle: 'Scientific data, images and ARES',
    description: 'Inspect dataset provenance, browse mission imagery and ask ARES about uncertainty. This prototype does not provide live operational navigation.',
    actionHint: 'Finish the tutorial and explore the sources and limitations.',
  },
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function AresGuidedTour({ isOpen, onClose, onComplete }: Props) {
  const { language } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true)

  if (!isOpen) return null

  const originalStep = GUIDED_TOUR_STEPS[currentStepIndex]
  const step = language === 'en' ? { ...originalStep, ...EN_STEPS[originalStep.id] } : originalStep
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
    <div className="ares-tour-backdrop" role="dialog" aria-modal="true" aria-label={ui('ARES guided tour', 'Recorrido Guiado ARES')}>
      {/* Pantalla de Bienvenida Inicial */}
      {isWelcomeScreen ? (
        <div className="ares-tour-welcome-card">
          <div className="welcome-tag">{ui('[PLANETARY EXPLORATION PROTOTYPE // ARES]', '[PROTOTIPO DE EXPLORACIÓN PLANETARIA // ARES]')}</div>
          <h2 className="welcome-title">ARES / MARS EXPLORATION SYSTEM</h2>
          <p className="welcome-lead">
            {ui('Welcome to the Mars research explorer. Examine mission imagery and scientific sources, then plan exploratory routes while keeping uncertainty visible.', 'Bienvenido al explorador marciano. Examiná imágenes y fuentes científicas, y planificá rutas exploratorias sin ocultar la incertidumbre.')}
          </p>
          <div className="welcome-feature-list">
            <div className="welcome-feature-item">
              <strong>{ui('NASA / USGS DATA:', 'DATOS NASA / USGS:')}</strong>
              <span>{ui('CTX imagery, regional geology and visual MOLA shaded relief. The Gale 3D terrain is an educational simulation.', 'Imágenes CTX, geología regional y relieve visual MOLA. El terreno 3D de Gale es una simulación educativa.')}</span>
            </div>
            <div className="welcome-feature-item">
              <strong>{ui('CURIOSITY SCIENCE:', 'CIENCIA CURIOSITY:')}</strong>
              <span>{ui('Historical traverse and documented geological context near Mount Sharp.', 'Travesía histórica y contexto geológico documentado cerca de Mount Sharp.')}</span>
            </div>
            <div className="welcome-feature-item">
              <strong>{ui('EXPLORATORY EVA PLANNING:', 'PLANIFICACIÓN EVA EXPLORATORIA:')}</strong>
              <span>{ui('Martian distances and clearly identified modeled or unknown hazards. No operational safety certification.', 'Distancias marcianas y peligros modelados o desconocidos identificados. Sin certificación de seguridad operacional.')}</span>
            </div>
          </div>
          <div className="welcome-actions">
            <button type="button" className="hud-btn highlight welcome-btn" onClick={handleStartTour}>
              {ui('[START TOUR]', '[INICIAR RECORRIDO]')}
            </button>
            <button type="button" className="hud-btn welcome-btn-secondary" onClick={onClose}>
              {ui('[SKIP INTRODUCTION]', '[OMITIR INTRODUCCIÓN]')}
            </button>
          </div>
        </div>
      ) : (
        /* Tarjeta de Etapas Guiadas Paso a Paso */
        <div className="ares-tour-step-card">
          <header className="tour-step-header">
            <div>
              <span className="tour-step-tag">
                {ui('STAGE', 'ETAPA')} {step.stageNumber} {ui('OF', 'DE')} {totalSteps} // ARES
              </span>
              <h3 className="tour-step-title">{step.title}</h3>
              <p className="tour-step-subtitle">{step.subtitle}</p>
            </div>
            <button type="button" className="tour-close-btn" onClick={onClose} aria-label={ui('Close tutorial', 'Cerrar tutorial')}>
              {ui('[EXIT]', '[SALIR]')}
            </button>
          </header>

          <div className="tour-step-body">
            <p className="tour-step-desc">{step.description}</p>
            {step.actionHint && (
              <div className="tour-action-hint">
                <strong>{ui('SUGGESTED ACTION:', 'ACCIÓN SUGERIDA:')}</strong> {step.actionHint}
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
                {ui('[PREVIOUS]', '[ANTERIOR]')}
              </button>
              <div className="tour-step-indicator">
                {ui('STEP', 'PASO')} {currentStepIndex + 1} / {totalSteps}
              </div>
              <button
                type="button"
                className="hud-btn highlight"
                onClick={handleNext}
              >
                {currentStepIndex === totalSteps - 1 ? ui('[FINISH]', '[FINALIZAR]') : ui('[NEXT]', '[SIGUIENTE]')}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
