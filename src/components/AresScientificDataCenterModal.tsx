import { useState } from 'react'
import {
  ARES_DISCLAIMER_NOTICE,
  EN_DISCLAIMER_NOTICE,
  localizedScientificRegistry,
  type AresDatasetMetadata,
} from '../features/science/scientificDataCenter'
import { useLanguage } from '../features/i18n/appI18n'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AresScientificDataCenterModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage()
  const ui = (en: string, es: string) => language === 'en' ? en : es
  const registry = localizedScientificRegistry(language)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeDatasetId, setActiveDatasetId] = useState<AresDatasetMetadata['datasetId'] | null>(
    registry[0]?.datasetId ?? null
  )

  if (!isOpen) return null

  const categories = [
    { id: 'ALL', label: ui('ALL SOURCES', 'TODAS LAS FUENTES') },
    { id: 'CARTOGRAPHY', label: ui('CARTOGRAPHY', 'CARTOGRAFÍA') },
    { id: 'GEOLOGY', label: ui('GEOLOGY', 'GEOLOGÍA') },
    { id: 'MISSION_HERITAGE', label: ui('MISSION HISTORY', 'HERENCIA DE MISIÓN') },
    { id: 'SURFACE_IMAGERY', label: ui('SURFACE IMAGERY', 'IMÁGENES DE SUPERFICIE') },
    { id: 'TERRAIN_ANALYSIS', label: ui('TERRAIN MODEL', 'MODELO DE TERRENO') },
  ]

  const activeDataset = registry.find(ds => ds.datasetId === activeDatasetId) ?? null
  const filteredDatasets = registry.filter((ds) => {
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
        aria-label={ui('ARES Scientific Data Center', 'Centro de Fuentes Científicas ARES')}
      >
        <header className="ares-modal-header">
          <div>
            <span className="modal-tag">{ui('[MULTI-MISSION SOURCE CATALOG]', '[CATÁLOGO DE FUENTES MULTIMISIÓN]')}</span>
            <h2 className="modal-title">ARES SCIENTIFIC DATA CENTER</h2>
            <p className="modal-subtitle">
              {ui('Research catalog of NASA / USGS / PDS sources and their limitations. Listed sources are not necessarily validated against the procedural Gale scene.', 'Catálogo de fuentes NASA / USGS / PDS y sus límites. Las fuentes enumeradas no están necesariamente validadas contra la escena procedural de Gale.')}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            {ui('[CLOSE]', '[CERRAR]')}
          </button>
        </header>

        <div className="ares-data-center-layout">
          {/* Columna Izquierda: Filtros y Lista de Datasets */}
          <aside className="dataset-sidebar">
            <div className="dataset-search-wrap">
              <input
                type="text"
                placeholder={ui('Search instrument, mission or name…', 'Buscar por instrumento, misión o nombre…')}
                aria-label={ui('Search data sources', 'Buscar fuentes de datos')}
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
                   onClick={() => setActiveDatasetId(ds.datasetId)}
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
                       {ui('STATUS', 'ESTADO')}: {activeDataset.availabilityStatus}
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
                     <label>{ui('RESPONSIBLE ORGANIZATION', 'ORGANIZACIÓN RESPONSABLE')}</label>
                    <span>{activeDataset.organization}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('MISSION', 'MISIÓN ESPACIAL')}</label>
                    <span>{activeDataset.mission}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('INSTRUMENT', 'INSTRUMENTO CIENTÍFICO')}</label>
                    <span>{activeDataset.instrument}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('ACQUISITION', 'FECHA DE ADQUISICIÓN')}</label>
                    <span>{activeDataset.acquisitionDate}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('PUBLICATION', 'FECHA DE PUBLICACIÓN')}</label>
                    <span>{activeDataset.publicationDate}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('SPATIAL RESOLUTION', 'RESOLUCIÓN ESPACIAL')}</label>
                    <span>{activeDataset.resolution}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('COORDINATE REFERENCE (CRS)', 'SISTEMA DE COORDENADAS (CRS)')}</label>
                    <span>{activeDataset.crs}</span>
                  </div>
                  <div className="ds-meta-cell full-width">
                     <label>{ui('GEOGRAPHIC EXTENT', 'EXTENSIÓN GEOGRÁFICA')}</label>
                    <span>{activeDataset.geographicExtent}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('UNIT OF MEASURE', 'UNIDAD DE MEDIDA')}</label>
                    <span>{activeDataset.unitOfMeasure}</span>
                  </div>
                  <div className="ds-meta-cell">
                     <label>{ui('USE / LICENSE', 'CONDICIONES DE USO / LICENCIA')}</label>
                    <span>{activeDataset.license}</span>
                  </div>
                  <div className="ds-meta-cell full-width">
                     <label>{ui('CREDITS / ATTRIBUTION', 'CRÉDITOS Y ATRIBUCIÓN')}</label>
                    <span>{activeDataset.credits}</span>
                  </div>
                </div>

                <div className="ds-limitations-box">
                   <strong>{ui('SCIENTIFIC LIMITATIONS:', 'LIMITACIONES CIENTÍFICAS:')}</strong>
                  <p>{activeDataset.limitations}</p>
                </div>

                <div className="ds-actions-bar">
                  <a
                    href={activeDataset.originUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hud-btn highlight"
                  >
                     {ui('[OPEN ORIGINAL SOURCE]', '[VER FUENTE ORIGINAL]')}
                  </a>
                </div>
              </div>
            ) : (
              <div className="ds-empty-state">
                 {ui('Select a data source to inspect its metadata.', 'Seleccioná una fuente de datos para ver sus metadatos.')}
              </div>
            )}
          </main>
        </div>

        <footer className="ares-modal-footer">
          <p className="disclaimer-text">
             <strong>{ui('INDEPENDENT PROJECT:', 'PROYECTO INDEPENDIENTE:')}</strong> {language === 'en' ? EN_DISCLAIMER_NOTICE : ARES_DISCLAIMER_NOTICE}
          </p>
        </footer>
      </div>
    </div>
  )
}
