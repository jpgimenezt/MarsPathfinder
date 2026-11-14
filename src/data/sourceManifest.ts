export type LayerId = 'ctx' | 'mola' | 'themis'
export interface SourceRecord {
  id: LayerId
  title: string
  mission: string
  instrument: string
  productId: string
  sourceUrl: string
  attribution: string
  resolution: string
  coverage: string
  acquisitionDate: string
  kind: 'OBSERVED' | 'DERIVED' | 'HISTORICAL'
  limitations: string
  legend: string
}

const root = 'https://trek.nasa.gov/tiles/Mars/EQ/'
export const sources: SourceRecord[] = [
  {
    id: 'ctx', title: 'CTX · imagen orbital controlada de Jezero',
    mission: 'Mars Reconnaissance Orbiter', instrument: 'CTX',
    productId: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
    sourceUrl: root + 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA/JPL-Caltech/USGS · MRO CTX · Mars Trek',
    resolution: '≈6 m/píxel del mosaico original; escala visible variable',
    coverage: '77.1604655–77.6991776°E; 18.2110274–18.7211945°N (bbox publicado)',
    acquisitionDate: 'Sin datos por imagen; registro del catálogo: 2020-08-03',
    kind: 'OBSERVED', legend: 'Tonos grises: reflectancia de imagen visible (sin escala física).',
    limitations: 'Mosaico visual, no DEM ni mapa de obstáculos; el recorte local de respaldo es una sola tesela a zoom 10.',
  },
  {
    id: 'mola', title: 'MOLA · relieve sombreado en color',
    mission: 'Mars Global Surveyor', instrument: 'MOLA',
    productId: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    sourceUrl: root + 'Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA/JPL-Caltech · MGS MOLA · Mars Trek',
    resolution: '≈463 m/píxel del producto; escala visible variable',
    coverage: 'Global (bbox publicada: −180 a 179.998°; −89.999 a 90°)',
    acquisitionDate: 'Mediciones 1999–2001 según catálogo; mosaico: sin fecha individual',
    kind: 'DERIVED', legend: 'Colores y sombras: relieve representado; NO alturas numéricas.',
    limitations: 'Imagen de relieve, no DEM numérico. Insuficiente para pendientes u obstáculos de EVA.',
  },
  {
    id: 'themis', title: 'THEMIS · mosaico infrarrojo diurno',
    mission: 'Mars Odyssey', instrument: 'THEMIS-IR',
    productId: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
    sourceUrl: root + 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
    attribution: 'NASA/JPL-Caltech/ASU · Mars Odyssey THEMIS · Mars Trek',
    resolution: '≈100 m/píxel del mosaico original; escala visible variable',
    coverage: 'Aproximadamente 65°S–65°N; bbox publicado en catálogo',
    acquisitionDate: 'Mosaico versión octubre de 2018; adquisición local: sin datos',
    kind: 'HISTORICAL', legend: 'Grises: intensidad infrarroja diurna; NO temperatura actual.',
    limitations: 'Mosaico histórico; no sirve para estimar temperatura instantánea ni seguridad térmica.',
  },
]
