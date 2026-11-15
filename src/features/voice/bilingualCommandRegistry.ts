/**
 * ARES MISSION COMMS - Bilingual Command Registry & Semantic Normalizer
 * Mapeo canónico de intenciones operativas, normalización fonética/léxica
 * y detección robusta de cambios de idioma.
 */

import type { SupportedLanguage } from '../i18n/commsTranslations'

export interface CommandMapping {
  tool: string
  params?: Record<string, unknown>
  phrases: {
    en: string[]
    es: string[]
  }
}

export const BILINGUAL_MISSION_COMMANDS: CommandMapping[] = [
  {
    tool: 'focusGeographicTarget',
    params: { targetName: 'Mount Sharp' },
    phrases: {
      en: ['focus on mount sharp', 'look at mount sharp', 'center on mount sharp', 'mount sharp', 'aeolis mons'],
      es: ['enfocá mount sharp', 'enfoca mount sharp', 'mirar mount sharp', 'centrar en mount sharp', 'monte sharp', 'aeolis mons'],
    },
  },
  {
    tool: 'focusGeographicTarget',
    params: { targetName: 'Delta de Jezero' },
    phrases: {
      en: ['focus on jezero delta', 'look at jezero', 'jezero delta', 'go to jezero'],
      es: ['enfocá el delta de jezero', 'ir a jezero', 'delta de jezero', 'mirar jezero'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'geology', enabled: true },
    phrases: {
      en: ['show geological layers', 'show geology', 'activate geology layer', 'geology on', 'geological map'],
      es: ['mostrá las capas geológicas', 'mostrar capas geológicas', 'activar geología', 'capas geológicas', 'mapa geológico'],
    },
  },
  {
    tool: 'getCurrentMissionContext',
    params: {},
    phrases: {
      en: ['where are we', 'where are we located', 'current location', 'mission context', 'what is our position', 'where am i'],
      es: ['donde estamos', 'dónde estamos', 'donde estamos ubicados', 'dónde estamos ubicados', 'ubicación actual', 'ubicacion actual', 'cuál es nuestra posición', 'cual es nuestra posicion', 'contexto de misión', 'contexto de mision'],
    },
  },
  {
    tool: 'getMissionObservations',
    params: {},
    phrases: {
      en: ['scientific observations', 'scientific data', 'open data center', 'query observations', 'what observations exist', 'scientific observations exist'],
      es: ['qué observaciones científicas existen', 'que observaciones cientificas existen', 'qué observaciones existen', 'que observaciones existen', 'observaciones científicas', 'datos científicos', 'abrir centro de datos', 'observaciones disponibles'],
    },
  },
  {
    tool: 'openSurfaceIntelligence',
    params: {},
    phrases: {
      en: ['surface intelligence', 'surface catalog', 'open surface catalog', 'open the surface intelligence catalog', 'mars surface targets'],
      es: ['catálogo de inteligencia de superficie', 'catalogo de inteligencia de superficie', 'abrir el catálogo de inteligencia de superficie', 'inteligencia de superficie', 'catálogo de superficie', 'abrir catálogo de superficie', 'objetivos de superficie'],
    },
  },
  {
    tool: 'activateMissionSimulation',
    params: { scenario: 'DESCENT_EDL' },
    phrases: {
      en: ['start mission simulation', 'simulate edl descent', 'edl descent simulation', 'simulate landing'],
      es: ['iniciar simulación de descenso edl', 'iniciar simulacion de descenso edl', 'simulación de descenso edl', 'simular descenso', 'descenso edl'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'themis', enabled: true },
    phrases: {
      en: ['activate themis', 'show thermal layer', 'enable themis', 'activate themis thermal layer', 'themis thermal layer', 'thermal inertia'],
      es: ['activá themis', 'activa themis', 'activar themis', 'activar capa themis', 'activá la capa térmica themis', 'activar la capa termica themis', 'activá la capa térmica', 'mostrar themis', 'capa térmica', 'inercia térmica'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'mola', enabled: true },
    phrases: {
      en: ['activate mola', 'show elevation relief', 'enable mola', 'show mola elevation', 'mola elevation', 'topographic relief'],
      es: ['activá mola', 'activa mola', 'activar mola', 'mostrar relieve mola', 'activar elevación mola', 'mostrá la elevación mola', 'mostrar la elevación mola', 'relieve topográfico'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'ctx', enabled: true },
    phrases: {
      en: ['activate ctx', 'show ctx mosaic', 'enable ctx imagery', 'orbital context'],
      es: ['activá ctx', 'activa ctx', 'mostrar mosaico ctx', 'activar ctx', 'contexto orbital'],
    },
  },
  {
    tool: 'previewEVARoute',
    params: { mode: 'FOOT' },
    phrases: {
      en: ['plan an eva route', 'plan eva route', 'calculate route', 'generate eva path', 'calculate an alternative route', 'plan eva route to sulfate ridge'],
      es: ['planificá una ruta eva', 'planifica una ruta eva', 'planificar ruta eva', 'calcular ruta', 'trazar ruta eva', 'calculá una ruta alternativa', 'calcula una ruta', 'planificar ruta eva hacia la cresta de sulfatos'],
    },
  },
  {
    tool: 'compareMissionRoutes',
    params: { showModal: true },
    phrases: {
      en: ['compare both routes', 'compare routes', 'open route comparison', 'curiosity vs eva', 'compare with curiosity traverse'],
      es: ['compará las dos rutas', 'compara las dos rutas', 'comparar rutas', 'curiosity contra eva', 'comparar con curiosity', 'comparar con el trayecto de curiosity'],
    },
  },
  {
    tool: 'startDiscoveryTour',
    params: { startIndex: 0 },
    phrases: {
      en: ['start mission simulation', 'start tour', 'begin discovery tour', 'launch simulation', 'explore gale crater'],
      es: ['iniciá la simulación de misión', 'iniciar simulación de misión', 'iniciar recorrido', 'comenzar tour', 'explorar cráter gale'],
    },
  },
  {
    tool: 'pauseDiscoveryTour',
    params: {},
    phrases: {
      en: ['pause mission', 'pause tour', 'stop tour', 'resume tour'],
      es: ['pausá la misión', 'pausa la misión', 'pausar recorrido', 'detener tour', 'reanudar tour'],
    },
  },
  {
    tool: 'getHabitatStatus',
    params: {},
    phrases: {
      en: ['habitat status', 'base status', 'life support telemetry', 'power levels', 'check habitat telemetry', 'habitat telemetry', 'base ares alpha telemetry'],
      es: ['estado del hábitat', 'estado del habitat', 'estado de la base', 'telemetría de soporte vital', 'telemetria de soporte vital', 'niveles de energía', 'niveles de energia', 'consultar telemetría del hábitat', 'consultar telemetria del habitat', 'consultar telemetría de la base ares alpha', 'consultar telemetria de la base ares alpha', 'telemetría de la base', 'telemetria de la base'],
    },
  },
  {
    tool: 'explainSelectedRegion',
    params: {},
    phrases: {
      en: ['what are the geological features', 'explain this region', 'geological summary', 'science targets'],
      es: ['qué características geológicas tiene esta región', 'explicar esta región', 'resumen geológico', 'objetivos científicos'],
    },
  },
]

/**
 * Normaliza texto de entrada eliminando acentos, puntuación, contracciones y coloquialismos
 */
export function normalizeCommandText(raw: string): string {
  if (!raw) return ''
  let text = raw.toLowerCase().trim()

  // 1. Eliminar acentos y diacríticos (á -> a, é -> e, etc.)
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // 2. Normalizar contracciones habituales del inglés
  text = text
    .replace(/\blet's\b/g, 'let us')
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bwhere's\b/g, 'where is')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bit's\b/g, 'it is')

  // 3. Normalizar variaciones imperativas y coloquiales del español
  text = text
    .replace(/\b(enfocame|enfocate|enfocame|centrame|centrate)\b/g, 'enfoca')
    .replace(/\b(mostrame|mostrate)\b/g, 'mostra')
    .replace(/\b(activame|habilitame)\b/g, 'activa')
    .replace(/\b(calculame|trazame)\b/g, 'calcula')
    .replace(/\b(explicame|describime)\b/g, 'explica')

  // 4. Limpiar signos de puntuación y espacios redundantes
  text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!]/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Detecta comandos explícitos de cambio de idioma
 */
export function checkLanguageSwitchCommand(text: string): SupportedLanguage | null {
  const norm = normalizeCommandText(text)

  const toEnglishPatterns = [
    /\b(switch|change)\s+(to\s+)?(the\s+)?english\b/i,
    /\bspeak\s+english\b/i,
    /\btalk\s+(in\s+)?english\b/i,
    /\bin\s+english\b/i,
    /\bhabla\s+en\s+ingles\b/i,
    /\bcambia(r)?\s+(a|al)\s+ingles\b/i,
    /\bingles\s+por\s+favor\b/i,
  ]

  const toSpanishPatterns = [
    /\b(switch|change)\s+(to\s+)?(the\s+)?spanish\b/i,
    /\bspeak\s+spanish\b/i,
    /\btalk\s+(in\s+)?spanish\b/i,
    /\bin\s+spanish\b/i,
    /\bhabla\s+en\s+espanol\b/i,
    /\bcambia(r)?\s+(a|al|el\s+idioma\s+a)\s+espanol\b/i,
    /\bespanol\s+por\s+favor\b/i,
    /\ben\s+espanol\b/i,
  ]

  for (const pat of toEnglishPatterns) {
    if (pat.test(norm)) return 'en'
  }

  for (const pat of toSpanishPatterns) {
    if (pat.test(norm)) return 'es'
  }

  return null
}

/**
 * Infiere el idioma de un texto basándose en marcadores léxicos
 */
export function detectTextLanguage(text: string): SupportedLanguage {
  const norm = normalizeCommandText(text)

  const spanishMarkers = [
    'el', 'la', 'los', 'las', 'de', 'en', 'para', 'con', 'por', 'que',
    'como', 'donde', 'activar', 'activa', 'mostra', 'mostrar', 'mostrame',
    'enfoca', 'enfocame', 'ruta', 'mision', 'monte', 'hola', 'gracias', 'capa'
  ]

  const englishMarkers = [
    'the', 'is', 'at', 'which', 'on', 'for', 'with', 'show', 'activate', 'enable',
    'focus', 'look', 'what', 'where', 'how', 'route', 'mission', 'mount', 'sharp',
    'hello', 'hey', 'switch', 'please', 'layer', 'thermal'
  ]

  const tokens = norm.split(/\s+/)
  let esScore = 0
  let enScore = 0

  for (const token of tokens) {
    if (spanishMarkers.includes(token)) esScore++
    if (englishMarkers.includes(token)) enScore++
  }

  return enScore > esScore ? 'en' : 'es'
}

/**
 * Resuelve una frase hablada o escrita en cualquier idioma al comando y parámetros correspondientes
 * empleando normalización léxica y comprensión semántica.
 */
export function resolveBilingualTool(rawText: string): { tool: string; params?: Record<string, unknown> } | null {
  const norm = normalizeCommandText(rawText)

  // 1. Coincidencia exacta o por subcadena sobre el registro bilingüe
  for (const mapping of BILINGUAL_MISSION_COMMANDS) {
    const allPhrases = [...mapping.phrases.en, ...mapping.phrases.es]
    for (const phrase of allPhrases) {
      const normPhrase = normalizeCommandText(phrase)
      if (norm === normPhrase || norm.includes(normPhrase)) {
        return {
          tool: mapping.tool,
          params: mapping.params,
        }
      }
    }
  }

  // 2. Comprensión semántica por combinaciones de palabras clave
  // Mount Sharp
  if ((norm.includes('mount') || norm.includes('monte') || norm.includes('aeolis')) && norm.includes('sharp')) {
    return { tool: 'focusGeographicTarget', params: { targetName: 'Mount Sharp' } }
  }

  // Jezero Delta
  if (norm.includes('jezero') || norm.includes('delta')) {
    return { tool: 'focusGeographicTarget', params: { targetName: 'Delta de Jezero' } }
  }

  // Capas geológicas
  if (norm.includes('geolog')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'geology', enabled: true } }
  }

  // Capa térmica / THEMIS
  if (norm.includes('themis') || norm.includes('temis') || norm.includes('termic')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'themis', enabled: true } }
  }

  // Relieve MOLA / Elevación
  if (norm.includes('mola') || norm.includes('relieve') || norm.includes('altimetr') || (norm.includes('elevacion') && !norm.includes('que'))) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'mola', enabled: true } }
  }

  // Mosaico CTX
  if (norm.includes('ctx') || norm.includes('mosaico')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'ctx', enabled: true } }
  }

  // Simulación / Tour
  if ((norm.includes('inici') || norm.includes('start') || norm.includes('comenz') || norm.includes('lanz')) &&
      (norm.includes('simula') || norm.includes('tour') || norm.includes('recorr'))) {
    return { tool: 'startDiscoveryTour', params: { startIndex: 0 } }
  }

  // Pausar Tour
  if ((norm.includes('paus') || norm.includes('deten') || norm.includes('stop')) &&
      (norm.includes('tour') || norm.includes('recorr') || norm.includes('simula'))) {
    return { tool: 'pauseDiscoveryTour', params: {} }
  }

  // Planificar / Calcular Ruta EVA
  if ((norm.includes('plan') || norm.includes('calcul') || norm.includes('traz') || norm.includes('gener')) &&
      (norm.includes('ruta') || norm.includes('route') || norm.includes('eva') || norm.includes('camino'))) {
    return { tool: 'previewEVARoute', params: { mode: 'FOOT' } }
  }

  // Comparar rutas
  if ((norm.includes('compar') || norm.includes('curiosity')) &&
      (norm.includes('ruta') || norm.includes('route') || norm.includes('ambas') || norm.includes('both'))) {
    return { tool: 'compareMissionRoutes', params: { showModal: true } }
  }

  // Estado del Hábitat
  if ((norm.includes('habitat') || norm.includes('base')) &&
      (norm.includes('estado') || norm.includes('status') || norm.includes('soporte') || norm.includes('energia') || norm.includes('power'))) {
    return { tool: 'getHabitatStatus', params: {} }
  }

  return null
}
