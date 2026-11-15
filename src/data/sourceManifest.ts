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
// Mapa de contexto, no cuarta familia científica ni detalle EVA.
export const vikingBase = {
  productId: 'Mars_Viking_MDIM21_ClrMosaic_global_232m',
  sourceUrl: root + 'Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
  attribution: 'NASA Ames/USGS · Viking MDIM 2.1 colorizado · Mars Trek',
  resolution: '≈232 m/píxel del producto original; respaldo local ≈21 km/píxel ecuatorial',
  coverage: 'Global; contexto visual, no imagen CTX de detalle',
  acquisitionDate: 'Imágenes Viking históricas (1976–1980); fecha del mosaico local: sin datos por píxel',
  limitations: 'Mosaico colorizado; no color natural exacto, DEM, imágenes actuales ni evidencia de obstáculos.',
} as const

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

// Scientific identifiers and URLs stay unchanged; only prose is localized.
import type { SupportedLanguage } from '../features/i18n/commsTranslations'

const vikingEnglish = {
  attribution: 'NASA Ames/USGS · Viking MDIM 2.1 colorized · Mars Trek',
  resolution: '≈232 m/pixel in original product; local fallback ≈21 km/pixel at equator',
  coverage: 'Global; visual context, not detailed CTX imagery',
  acquisitionDate: 'Historical Viking images (1976–1980); local mosaic has no per-pixel acquisition dates',
  limitations: 'Colorized mosaic, not exact natural color, a DEM, current imagery or evidence of obstacles.',
}
const sourceEnglish: Record<LayerId, Pick<SourceRecord, 'title' | 'resolution' | 'coverage' | 'acquisitionDate' | 'legend' | 'limitations'>> = {
  ctx: {
    title: 'CTX · controlled orbital image of Jezero',
    resolution: '≈6 m/pixel in the original mosaic; visible scale varies',
    coverage: '77.1604655–77.6991776°E; 18.2110274–18.7211945°N (published bounding box)',
    acquisitionDate: 'No per-image date; catalog entry: 2020-08-03',
    legend: 'Grayscale: visible-image reflectance (no physical color scale).',
    limitations: 'Visual mosaic, not a DEM or obstacle map; the local fallback crop is a single zoom-10 tile.',
  },
  mola: {
    title: 'MOLA · color-shaded relief',
    resolution: '≈463 m/pixel in the product; visible scale varies',
    coverage: 'Global (published bounding box: −180 to 179.998°; −89.999 to 90°)',
    acquisitionDate: 'Measurements from 1999–2001 per catalog; no individual mosaic date',
    legend: 'Colors and shading represent relief; NOT numerical elevations.',
    limitations: 'Shaded-relief image, not a numeric DEM. Insufficient to evaluate EVA slopes or obstacles.',
  },
  themis: {
    title: 'THEMIS · daytime infrared mosaic',
    resolution: '≈100 m/pixel in original mosaic; visible scale varies',
    coverage: 'Approximately 65°S–65°N; published catalog bounding box',
    acquisitionDate: 'October 2018 mosaic version; no local acquisition date available',
    legend: 'Grayscale: daytime infrared intensity; NOT current temperature.',
    limitations: 'Historical mosaic; cannot estimate instantaneous temperature or thermal safety.',
  },
}

export function localizedSources(language: SupportedLanguage): SourceRecord[] {
  return language === 'en' ? sources.map(source => ({ ...source, ...sourceEnglish[source.id] })) : sources
}

export function localizedVikingBase(language: SupportedLanguage) {
  return language === 'en' ? { ...vikingBase, ...vikingEnglish } : vikingBase
}
