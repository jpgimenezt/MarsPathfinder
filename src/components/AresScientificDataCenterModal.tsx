import { useState } from 'react'
import {
  ARES_SCIENTIFIC_REGISTRY,
  ARES_DISCLAIMER_NOTICE,
  type AresDatasetMetadata,
} from '../features/science/scientificDataCenter'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AresScientificDataCenterModal({ isOpen, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeDataset, setActiveDataset] = useState<AresDatasetMetadata | null>(
    ARES_SCIENTIFIC_REGISTRY[0] || null
  )

  if (!isOpen) return null

  const categories = [
    { id: 'ALL', label: 'TODAS LAS FUENTES' },
    { id: 'CARTOGRAPHY', label: 'CARTOGRAFÍA' },
    { id: 'GEOLOGY', label: 'GEOLOGÍA' },
    { id: 'MISSION_HERITAGE', label: 'HERENCIA DE MISIÓN' },
    { id: 'SURFACE_IMAGERY', label: 'IMÁGENES DE SUPERFICIE' },
    { id: 'TERRAIN_ANALYSIS', label: 'ANÁLISIS DE TERRENO' },
  ]

  const filteredDatasets = ARES_SCIENTIFIC_REGISTRY.filter((ds) => {
    const matchesCat = selectedCategory === 'ALL' || ds.category === selectedCategory
    const matchesQuery =
      searchQuery === '' ||
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.instrument.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.mission.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesQuery
  })

  return (
    <div className="ares-modal-backdrop" onClick={onClose}>
      <div
        className="ares-modal-container scientific-center-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Centro de Fuentes Científicas ARES"
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">[SISTEMA CARTOGRÁFICO & MULTIMISIÓN]</span>
            <h2 className="modal-title">ARES SCIENTIFIC DATA CENTER</h2>
            <p className="modal-subtitle">
              Catálogo centralizado de fuentes oficiales, metadatos espaciales y trazabilidad de datos de la NASA / USGS / PDS.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [CERRAR]
          </button>
        </header>

        <div className="ares-data-center-layout">
          {/* Columna Izquierda: Filtros y Lista de Datasets */}
          <aside className="dataset-sidebar">
            <div className="dataset-search-wrap">
              <input
                type="text"
                placeholder="Buscar por instrumento, misión o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dataset-search-input"
              />
            </div>

            <div className="dataset-cat-filters">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`dataset-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="dataset-items-list">
              {filteredDatasets.map((ds) => (
                <button
                  key={ds.datasetId}
                  type="button"
                  className={`dataset-list-item ${activeDataset?.datasetId === ds.datasetId ? 'active' : ''}`}
                  onClick={() => setActiveDataset(ds)}
                >
                  <div className="ds-item-header">
                    <span className={`ds-status-badge ${ds.availabilityStatus.toLowerCase()}`}>
                      {ds.availabilityStatus}
                    </span>
                    <span className="ds-datatype-badge">{ds.dataType}</span>
                  </div>
                  <strong className="ds-item-name">{ds.name}</strong>
                  <span className="ds-item-meta">{ds.instrument} · {ds.mission}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Columna Derecha: Detalle Completo de Metadatos (14 Campos Obligatorios) */}
          <main className="dataset-detail-panel">
            {activeDataset ? (
              <div className="dataset-detail-content">
                <div className="ds-detail-header">
                  <div className="ds-badges-row">
                    <span className="ds-category-badge">{activeDataset.category}</span>
                    <span className="ds-datatype-badge">{activeDataset.dataType}</span>
                    <span className={`ds-status-badge ${activeDataset.availabilityStatus.toLowerCase()}`}>
                      ESTADO: {activeDataset.availabilityStatus}
                    </span>
                  </div>
                  <h3 className="ds-detail-title">{activeDataset.name}</h3>
                  <p className="ds-detail-desc">{activeDataset.description}</p>
                </div>

                <div className="ds-metadata-table-grid">
                  <div className="ds-meta-cell">
                    <label>DATASET ID</label>
                    <code>{activeDataset.datasetId}</code>
                  </div>
                  <div className="ds-meta-cell">
                    <label>ORGANIZACIÓN RESPONSABLE</label>
                    <span>{activeDataset.organization}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>MISIÓN ESPACIAL</label>
                    <span>{activeDataset.mission}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>INSTRUMENTO CIENTÍFICO</label>
                    <span>{activeDataset.instrument}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>FECHA DE ADQUISICIÓN</label>
                    <span>{activeDataset.acquisitionDate}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>FECHA DE PUBLICACIÓN</label>
                    <span>{activeDataset.publicationDate}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>RESOLUCIÓN ESPACIAL</label>
                    <span>{activeDataset.resolution}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>SISTEMA DE COORDENADAS (CRS)</label>
                    <span>{activeDataset.crs}</span>
                  </div>
                  <div className="ds-meta-cell full-width">
                    <label>EXTENSIÓN GEOGRÁFICA</label>
                    <span>{activeDataset.geographicExtent}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>UNIDAD DE MEDIDA</label>
                    <span>{activeDataset.unitOfMeasure}</span>
                  </div>
                  <div className="ds-meta-cell">
                    <label>CONDICIONES DE USO / LICENCIA</label>
                    <span>{activeDataset.license}</span>
                  </div>
                  <div className="ds-meta-cell full-width">
                    <label>CRÉDITOS Y ATRIBUCIÓN OFICIAL</label>
                    <span>{activeDataset.credits}</span>
                  </div>
                </div>

                <div className="ds-limitations-box">
                  <strong>LIMITACIONES CIENTÍFICAS Y REGLAS DE USO:</strong>
                  <p>{activeDataset.limitations}</p>
                </div>

                <div className="ds-actions-bar">
                  <a
                    href={activeDataset.originUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hud-btn highlight"
                  >
                    [VER FUENTE OFICIAL NASA / PDS]
                  </a>
                </div>
              </div>
            ) : (
              <div className="ds-empty-state">
                Selecciona un conjunto de datos del listado para inspeccionar su ficha técnica.
              </div>
            )}
          </main>
        </div>

        <footer className="ares-modal-footer">
          <p className="disclaimer-text">
            <strong>AVISO INSTITUCIONAL:</strong> {ARES_DISCLAIMER_NOTICE}
          </p>
        </footer>
      </div>
    </div>
  )
}
