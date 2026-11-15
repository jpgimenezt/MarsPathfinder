import { useState } from 'react'
import {
  SURFACE_INTELLIGENCE_GALLERY,
  type SurfaceObservationImage,
} from '../features/science/surfaceIntelligenceCatalog'
import { resolveAssetUrl } from '../utils/assetUrl'

interface Props {
  isOpen: boolean
  onClose: () => void
  onFocusCoordinates?: (coords: { lon: number; lat: number }, title: string) => void
}

export function MarsSurfaceIntelligenceModal({ isOpen, onClose, onFocusCoordinates }: Props) {
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
        aria-label="Galería de Inteligencia de Superficie Marciana"
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">[OBSERVACIONES DE CAMPO // NASA RAW IMAGES]</span>
            <h2 className="modal-title">MARS SURFACE INTELLIGENCE</h2>
            <p className="modal-subtitle">
              Galería de fotografías ópticas y microscópicas de las misiones Curiosity (Gale Crater) y Perseverance (Jezero Crater - Análogo comparativo).
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [CERRAR]
          </button>
        </header>

        {/* Barra de Filtros */}
        <div className="surface-filter-bar">
          <div className="filter-group">
            <label>MISIÓN ESPACIAL:</label>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedMission('ALL')}
              >
                TODAS
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'Curiosity' ? 'active' : ''}`}
                onClick={() => setSelectedMission('Curiosity')}
              >
                CURIOSITY (CRÁTER GALE · LOCAL)
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedMission === 'Perseverance' ? 'active' : ''}`}
                onClick={() => setSelectedMission('Perseverance')}
              >
                PERSEVERANCE (CRÁTER JEZERO · ANÁLOGO)
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>TIPO DE IMAGEN:</label>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedType === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedType('ALL')}
              >
                TODOS
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'SURFACE_LANDSCAPE' ? 'active' : ''}`}
                onClick={() => setSelectedType('SURFACE_LANDSCAPE')}
              >
                PAISAJE
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'CLOSEUP_GEOLOGY' ? 'active' : ''}`}
                onClick={() => setSelectedType('CLOSEUP_GEOLOGY')}
              >
                GEOLOGÍA DE CERCA
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'DRILL_HOLE' ? 'active' : ''}`}
                onClick={() => setSelectedType('DRILL_HOLE')}
              >
                PERFORACIÓN
              </button>
              <button
                type="button"
                className={`filter-chip ${selectedType === 'ATMOSPHERE_SKY' ? 'active' : ''}`}
                onClick={() => setSelectedType('ATMOSPHERE_SKY')}
              >
                ATMÓSFERA Y CIELO
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
                    alt={img.title}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = resolveAssetUrl('data/curiosity/bradbury-landing.jpg')
                    }}
                  />
                  <span className={`mission-tag ${img.mission.toLowerCase()}`}>
                    {img.roverName}
                  </span>
                </div>
                <div className="surface-card-body">
                  <span className="card-sol">SOL {img.sol} · {img.camera}</span>
                  <h4 className="card-title">{img.title}</h4>
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
                  alt={inspectedImage.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = resolveAssetUrl('data/curiosity/bradbury-landing.jpg')
                  }}
                />
                <span className="inspect-credit">{inspectedImage.nasaCredit}</span>
              </div>

              <div className="inspect-info-body">
                <div className="inspect-header-row">
                  <span className={`inspect-mission-pill ${inspectedImage.mission.toLowerCase()}`}>
                    {inspectedImage.roverName}
                  </span>
                  <span className="inspect-sol-pill">SOL {inspectedImage.sol}</span>
                  <span className="inspect-cam-pill">{inspectedImage.camera}</span>
                </div>

                <h3 className="inspect-title">{inspectedImage.title}</h3>
                <p className="inspect-region">{inspectedImage.targetRegion}</p>

                {inspectedImage.mission === 'Perseverance' && (
                  <div className="inspect-analog-alert">
                    <strong>AVISO GEOGRÁFICO:</strong> Esta observación pertenece a Cráter Jezero (a 3,700 km de distancia). Se presenta exclusivamente como inteligencia de superficie comparativa y análogo astrobiológico.
                  </div>
                )}

                <div className="inspect-meta-grid">
                  <div>
                    <label>FECHA TERRESTRE</label>
                    <span>{inspectedImage.earthDate}</span>
                  </div>
                  <div>
                    <label>SISTEMA ÓPTICO</label>
                    <span>{inspectedImage.camera}</span>
                  </div>
                  <div className="full-col">
                    <label>CONTEXTO GEOLÓGICO</label>
                    <span>{inspectedImage.geologicalContext}</span>
                  </div>
                  {inspectedImage.filtersUsed && (
                    <div className="full-col">
                      <label>FILTRO / CALIBRACIÓN</label>
                      <span>{inspectedImage.filtersUsed}</span>
                    </div>
                  )}
                </div>

                <div className="inspect-summary-block">
                  <strong>Interpretación Científica:</strong>
                  <p>{inspectedImage.scienceSummary}</p>
                </div>

                <div className="inspect-actions">
                  <a
                    href={inspectedImage.highResUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hud-btn highlight"
                  >
                    [DESCARGAR ALTA RESOLUCIÓN NASA]
                  </a>
                  {inspectedImage.mission === 'Curiosity' && inspectedImage.coordinates && onFocusCoordinates && (
                    <button
                      type="button"
                      className="hud-btn primary"
                      onClick={() => {
                        onFocusCoordinates(inspectedImage.coordinates!, inspectedImage.title)
                        onClose()
                      }}
                    >
                      [CENTRAR EN MAPA 3D]
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
