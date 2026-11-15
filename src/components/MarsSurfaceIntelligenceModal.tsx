import { useState } from 'react'
import {
  SURFACE_INTELLIGENCE_GALLERY,
  localizedSurfaceImage,
  type SurfaceObservationImage,
} from '../features/science/surfaceIntelligenceCatalog'
import { resolveAssetUrl } from '../utils/assetUrl'
import { useLanguage } from '../features/i18n/appI18n'

interface Props {
  isOpen: boolean
  onClose: () => void
  onFocusCoordinates?: (coords: { lon: number; lat: number }, title: string) => void
}

export function MarsSurfaceIntelligenceModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  const image = (record: SurfaceObservationImage) => localizedSurfaceImage(record, language)
  const [selectedMission, setSelectedMission] = useState<'ALL' | 'Curiosity' | 'Perseverance'>('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [inspectedImage, setInspectedImage] = useState<SurfaceObservationImage | null>(
    SURFACE_INTELLIGENCE_GALLERY[0] || null
  )

  if (!isOpen) return null

  const filteredImages = SURFACE_INTELLIGENCE_GALLERY.filter((img) => {
    const matchMission = selectedMission === 'ALL' || img.mission === selectedMission
    const matchType = selectedType === 'ALL' || img.imageType === selectedType
    return matchMission && matchType
  })

  return (
    <div className="ares-modal-backdrop" onClick={onClose}>
      <div
        className="ares-modal-container surface-intelligence-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={ui('Mars surface image gallery', 'Galería de imágenes de superficie marciana')}
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">{ui('[MISSION IMAGES // LOCATION NOT VERIFIED]', '[IMÁGENES DE MISIÓN // UBICACIÓN SIN VERIFICAR]')}</span>
            <h2 className="modal-title">MARS SURFACE INTELLIGENCE</h2>
            <p className="modal-subtitle">
              {ui('Contextual Curiosity (Gale) and Perseverance (Jezero) imagery. Individual image identity, sol, camera and coordinates have not been checked against the linked NASA records.', 'Imágenes de contexto de Curiosity (Gale) y Perseverance (Jezero). Identidad, sol, cámara y coordenadas de cada imagen no se verificaron contra los registros NASA enlazados.')}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            {ui('[CLOSE]', '[CERRAR]')}
          </button>
        </header>

        {/* Barra de Filtros */}
        <div className="surface-filter-bar">
          <div className="filter-group">
            <label>{ui('MISSION:', 'MISIÓN:')}</label>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedMission('ALL')}
              >
                {ui('ALL', 'TODAS')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'Curiosity' ? 'active' : ''}`}
                onClick={() => setSelectedMission('Curiosity')}
              >
                {ui('CURIOSITY (GALE · CONTEXT)', 'CURIOSITY (GALE · CONTEXTO)')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'Perseverance' ? 'active' : ''}`}
                onClick={() => setSelectedMission('Perseverance')}
              >
                {ui('PERSEVERANCE (JEZERO · DIFFERENT SITE)', 'PERSEVERANCE (JEZERO · OTRO SITIO)')}
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>{ui('IMAGE TYPE:', 'TIPO DE IMAGEN:')}</label>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedType === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedType('ALL')}
              >
                {ui('ALL', 'TODOS')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'SURFACE_LANDSCAPE' ? 'active' : ''}`}
                onClick={() => setSelectedType('SURFACE_LANDSCAPE')}
              >
                {ui('LANDSCAPE', 'PAISAJE')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'CLOSEUP_GEOLOGY' ? 'active' : ''}`}
                onClick={() => setSelectedType('CLOSEUP_GEOLOGY')}
              >
                {ui('GEOLOGY CLOSE-UP', 'GEOLOGÍA DE CERCA')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'DRILL_HOLE' ? 'active' : ''}`}
                onClick={() => setSelectedType('DRILL_HOLE')}
              >
                {ui('DRILL HOLE', 'PERFORACIÓN')}
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'ATMOSPHERE_SKY' ? 'active' : ''}`}
                onClick={() => setSelectedType('ATMOSPHERE_SKY')}
              >
                {ui('ATMOSPHERE & SKY', 'ATMÓSFERA Y CIELO')}
              </button>
            </div>
          </div>
        </div>

        <div className="surface-gallery-layout">
          {/* Grilla de Miniaturas */}
          <div className="surface-grid-container">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                className={`surface-card ${inspectedImage?.id === img.id ? 'active' : ''}`}
                onClick={() => setInspectedImage(img)}
              >
                <div className="surface-card-img-wrap">
                  <img
                    src={resolveAssetUrl(img.imageUrl)}
                     alt={image(img).title}
                    loading="lazy"
                     onError={(e) => {
                       e.currentTarget.hidden = true // Never substitute an unrelated mission photograph.
                    }}
                  />
                  <span className={`mission-tag ${img.mission.toLowerCase()}`}>
                    {img.roverName}
                  </span>
                </div>
                <div className="surface-card-body">
                   <span className="card-sol">{ui('Metadata unverified', 'Metadatos sin verificar')}</span>
                   <h4 className="card-title">{image(img).title}</h4>
                </div>
              </div>
            ))}
          </div>

          {/* Panel Lateral de Inspección de Imagen */}
          {inspectedImage && (
            <aside className="surface-inspect-panel">
              <div className="inspect-photo-display">
                <img
                  src={resolveAssetUrl(inspectedImage.imageUrl)}
                   alt={image(inspectedImage).title}
                   onError={(e) => {
                     e.currentTarget.hidden = true
                  }}
                />
                <span className="inspect-credit">{inspectedImage.nasaCredit}</span>
              </div>

              <div className="inspect-info-body">
                <div className="inspect-header-row">
                  <span className={`inspect-mission-pill ${inspectedImage.mission.toLowerCase()}`}>
                    {inspectedImage.roverName}
                  </span>
                   <span className="inspect-sol-pill">{ui('UNVERIFIED', 'SIN VERIFICAR')}</span>
                </div>

                 <h3 className="inspect-title">{image(inspectedImage).title}</h3>
                 <p className="inspect-region">{image(inspectedImage).targetRegion}</p>

                {inspectedImage.mission === 'Perseverance' && (
                  <div className="inspect-analog-alert">
                     <strong>{ui('LOCATION:', 'UBICACIÓN:')}</strong> {ui('Jezero imagery must not be treated as Gale surface evidence.', 'Las imágenes de Jezero no son evidencia de condiciones en Gale.')}
                  </div>
                )}

                <div className="inspect-meta-grid">
                  <div>
                     <label>{ui('ACQUISITION DATE', 'FECHA DE ADQUISICIÓN')}</label>
                     <span>{ui('Unverified; see source', 'Sin verificar; consultar fuente')}</span>
                  </div>
                  <div>
                     <label>{ui('CAMERA', 'CÁMARA')}</label>
                     <span>{ui('Unverified; see source', 'Sin verificar; consultar fuente')}</span>
                  </div>
                  <div className="full-col">
                     <label>{ui('GEOLOGICAL CONTEXT', 'CONTEXTO GEOLÓGICO')}</label>
                     <span>{language === 'en' ? image(inspectedImage).geologicalContext : 'La correspondencia entre foto y sitio no está verificada independientemente.'}</span>
                  </div>
                  {inspectedImage.filtersUsed && (
                    <div className="full-col">
                       <label>{ui('FILTER / CALIBRATION', 'FILTRO / CALIBRACIÓN')}</label>
                       <span>{ui('See original record', 'Consultar registro original')}</span>
                    </div>
                  )}
                </div>

                <div className="inspect-summary-block">
                   <strong>{ui('Scientific limitations:', 'Límites científicos:')}</strong>
                   <p>{ui('Context image only. Check the original NASA record for identity, camera, date and location. Do not infer local slope or safety.', 'Imagen de contexto. Verificá identidad, cámara, fecha y ubicación en el registro NASA original. No inferir pendiente ni seguridad local.')}</p>
                </div>

                <div className="inspect-actions">
                  <a
                    href={inspectedImage.highResUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hud-btn highlight"
                  >
                     {ui('[OPEN NASA IMAGE RECORD]', '[ABRIR IMAGEN NASA]')}
                  </a>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
