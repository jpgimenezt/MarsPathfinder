import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SupportedLanguage } from './commsTranslations'

export const LANGUAGE_STORAGE_KEY = 'aresroute.language'

export function savedLanguage(storage: Pick<Storage, 'getItem'> | null): SupportedLanguage {
  try {
    return storage?.getItem(LANGUAGE_STORAGE_KEY) === 'es' ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

const en = {
  language: 'Language',
  home: 'Return to home (3D globe)',
  globe: 'ORBITAL GLOBE',
  globeTitle: '3D globe of Mars (MGS MOLA / Viking)',
  galeTitle: 'Gale Crater and Mount Sharp 3D terrain viewer',
  jezeroTitle: 'Jezero Crater 2D map with scientific layers',
  scientificLayers: 'Scientific layers',
  routePlanner: 'Route Planner',
  science: 'Science',
  start: 'Starting Point',
  scienceStop: 'Science Stop',
  destination: 'Destination',
  noData: 'Insufficient Data',
  undo: 'Undo',
  reset: 'Reset',
  routeWarning: 'Exploratory route based on DEM-derived slope estimates. Not suitable for operational navigation.',
  terrainWarning: 'Insufficient terrain data. Route safety cannot be assessed.',
  greenWarning: 'Relatively favorable terrain — not a guarantee of safety.',
  galeWarning: 'Approximate procedural terrain reconstruction for educational purposes. Elevation and slope estimates are not independently validated measurements.',
  demTitle: 'CTX DEM alternatives · exploratory',
  demDescription: 'USGS Mars 2020 Science Investigation CTX DEM Mosaic: 20 m/pixel numerical elevations aggregated into 80 m cells. Slopes are proxies; the exact vertical reference, small obstacles and alignment with CTX WMTS have not been validated.',
  demSource: 'USGS source and provenance ↗',
  demLoading: 'Computing off the main thread…',
  demIdle: 'Place A and P to evaluate the DEM.',
  demReady: 'Derived results; the manual route remains available.',
  demGlobal: 'OUT_OF_COVERAGE · Jezero only',
  demDuplicate: ' · same path',
  demMissing: 'missing points',
  demUnevaluable: 'not assessable',
  demDistance: 'Route length: {distance} · theoretical time: {time}',
  demSlope: 'Maximum slope proxy: {slope} · ascent/descent: {ascent} / {descent} m',
  demCoverage: 'Coverage: {coverage}. Detour: {detour}.',
  demFullCoverage: '100% of sampled cells along the path; no sub-cell assessment',
  demIncomplete: 'Incomplete: no complete route can be inferred',
  demDetour: 'slope/ascent penalties and NoData or threshold blocks',
  demLonger: 'longer than straight-line distance',
  demNoDetour: 'no measurable detour',
  demMax: 'Maximum allowed {degrees}°: a code-configurable assumption, NOT a NASA limit.',
  demSpeed: 'Hypothetical speed (km/h, not a validated EVA pace)',
  demLegend: 'Legend · local DEM slope proxy, not safety',
  demGreen: 'Relatively favorable: <{degrees}° — not a guarantee of safety.',
  demYellow: 'Caution: {from}–{to}°',
  demRed: 'Elevated estimated risk: ≥{degrees}°',
  demBlack: 'Black dashed outline: manual leg without an assessable DEM route.',
  demCaution: 'Caution threshold (°)',
  demElevated: 'Elevated-risk threshold (°)',
  demManual: 'Manual',
  demShort: 'Shortest Route',
  demBalanced: 'Balanced Route',
  demCautious: 'Lower Estimated Exposure',
  demShortExplanation: 'Minimizes distance across admitted cells.',
  demBalancedExplanation: 'Penalizes relative slope and ascent.',
  demCautiousExplanation: 'Avoids higher slopes under illustrative assumptions, not measured hazards.',
  manualNote: 'Points are user proposals. Distances use a Martian sphere of mean radius 3,389,500 m; they do not include terrain or obstacles.',
  unitsHours: '{value} h',
} as const

type TranslationKey = keyof typeof en
const es: Partial<Record<TranslationKey, string>> = {
  language: 'Idioma', home: 'Ir al inicio (globo 3D)', globe: 'GLOBO ORBITAL',
  globeTitle: 'Globo 3D de Marte (MGS MOLA / Viking)',
  galeTitle: 'Visualizador 3D de Gale Crater y Mount Sharp',
  jezeroTitle: 'Mapa 2D de Jezero Crater con capas científicas',
  scientificLayers: 'Capas científicas', routePlanner: 'Planificador de ruta', science: 'Ciencia',
  start: 'Punto de inicio', scienceStop: 'Parada científica', destination: 'Destino',
  noData: 'Información insuficiente', undo: 'Deshacer', reset: 'Restablecer',
  routeWarning: 'Ruta exploratoria basada en estimaciones de pendiente derivadas del DEM. No apta para navegación operacional.',
  terrainWarning: 'Datos de terreno insuficientes. No es posible evaluar la seguridad de la ruta.',
  greenWarning: 'Terreno relativamente favorable; no garantiza seguridad.',
  galeWarning: 'Reconstrucción topográfica procedural aproximada con fines educativos. Las estimaciones de altura y pendiente no son mediciones validadas independientemente.',
  demTitle: 'Alternativas con DEM CTX · exploratorias',
  demDescription: 'USGS Mars 2020 Science Investigation CTX DEM Mosaic: elevaciones numéricas de 20 m/píxel agregadas a celdas de 80 m. Las pendientes son proxies; la referencia vertical exacta, obstáculos pequeños y alineación con CTX WMTS no están validados.',
  demSource: 'Ficha y procedencia USGS ↗',
  demLoading: 'Calculando fuera del hilo principal…', demIdle: 'Colocá A y P para evaluar el DEM.',
  demReady: 'Resultados derivados; la ruta manual permanece disponible.',
  demGlobal: 'OUT_OF_COVERAGE · Solo Jezero', demDuplicate: ' · mismo trazado',
  demMissing: 'faltan puntos', demUnevaluable: 'no evaluable',
  demDistance: 'Recorrido: {distance} · tiempo teórico: {time}',
  demSlope: 'Pendiente máxima proxy: {slope} · ascenso/descenso: {ascent} / {descent} m',
  demCoverage: 'Cobertura: {coverage}. Desvío: {detour}.',
  demFullCoverage: '100 % de celdas muestreadas en el trazado; sin evaluación subcelda',
  demIncomplete: 'Incompleta: no se puede inferir un recorrido total',
  demDetour: 'penalización de pendiente/ascenso y bloqueos NoData o >umbral',
  demLonger: 'más largo que la línea recta', demNoDetour: 'sin desvío medible',
  demMax: 'Máximo permitido {degrees}°: supuesto configurable en código, NO límite NASA.',
  demSpeed: 'Velocidad hipotética (km/h, no ritmo EVA validado)',
  demLegend: 'Leyenda · proxy de pendiente local del DEM, no seguridad',
  demGreen: 'Relativamente favorable: <{degrees}° — no garantiza seguridad.',
  demYellow: 'Precaución: {from}–{to}°', demRed: 'Riesgo elevado estimado: ≥{degrees}°',
  demBlack: 'Negro discontinuo con contorno: tramo manual sin ruta DEM evaluable.',
  demCaution: 'Umbral de precaución (°)', demElevated: 'Umbral de riesgo elevado (°)',
  demManual: 'Manual', demShort: 'Ruta más corta', demBalanced: 'Ruta equilibrada',
  demCautious: 'Menor exposición estimada',
  demShortExplanation: 'Minimiza la distancia entre celdas admitidas.',
  demBalancedExplanation: 'Penaliza pendiente y ascenso relativos.',
  demCautiousExplanation: 'Evita pendientes mayores según supuestos ilustrativos, no peligros medidos.',
  manualNote: 'Los puntos son propuestas del usuario. Distancias con esfera marciana de radio medio 3 389 500 m; no incluyen relieve ni obstáculos.',
  unitsHours: '{value} h',
}

export function translate(language: SupportedLanguage, key: TranslationKey, params: Record<string, string | number> = {}): string {
  const template: string = (language === 'es' && es[key]) || en[key]
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match)
}

interface I18nContextValue {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  number: (value: number, maximumFractionDigits?: number) => string
  date: (value: Date | string) => string
  distance: (meters: number | null) => string
}
const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>(() =>
    savedLanguage(typeof window === 'undefined' ? null : window.localStorage))
  useEffect(() => {
    document.documentElement.lang = language
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language) } catch { /* storage disabled */ }
  }, [language])
  const value = useMemo<I18nContextValue>(() => ({
    language, setLanguage,
    t: (key, params) => translate(language, key, params),
    number: (value, maximumFractionDigits = 2) => new Intl.NumberFormat(language, { maximumFractionDigits }).format(value),
    date: value => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)),
    distance: meters => meters === null ? translate(language, 'noData') :
      `${new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meters / 1000)} km`,
  }), [language])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useLanguage(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('LanguageProvider is required')
  return context
}
