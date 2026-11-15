/**
 * ARES MISSION COMMS - Bilingual Command Registry & Language Detector
 * Mapeo canónico de intenciones operativas y detección de cambio de idioma
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
      en: ['focus on mount sharp', 'look at mount sharp', 'center on mount sharp', 'mount sharp'],
      es: ['enfocá mount sharp', 'enfoca mount sharp', 'mirar mount sharp', 'centrar en mount sharp', 'monte sharp'],
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
      en: ['show geological layers', 'show geology', 'activate geology layer', 'geology on'],
      es: ['mostrá las capas geológicas', 'mostrar capas geológicas', 'activar geología', 'capas geológicas'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'themis', enabled: true },
    phrases: {
      en: ['activate themis', 'show thermal layer', 'enable themis', 'themis thermal layer'],
      es: ['activá themis', 'activa themis', 'activá la capa térmica', 'mostrar themis', 'capa térmica'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'mola', enabled: true },
    phrases: {
      en: ['activate mola', 'show elevation relief', 'enable mola', 'mola elevation'],
      es: ['activá mola', 'activa mola', 'mostrar relieve mola', 'activar elevación mola'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'ctx', enabled: true },
    phrases: {
      en: ['activate ctx', 'show ctx mosaic', 'enable ctx imagery'],
      es: ['activá ctx', 'activa ctx', 'mostrar mosaico ctx', 'activar ctx'],
    },
  },
  {
    tool: 'previewEVARoute',
    params: { mode: 'FOOT' },
    phrases: {
      en: ['plan an eva route', 'plan eva route', 'calculate route', 'generate eva path'],
      es: ['planificá una ruta eva', 'planifica una ruta eva', 'calcular ruta', 'trazar ruta eva'],
    },
  },
  {
    tool: 'compareMissionRoutes',
    params: { showModal: true },
    phrases: {
      en: ['compare both routes', 'compare routes', 'open route comparison', 'curiosity vs eva'],
      es: ['compará las dos rutas', 'compara las dos rutas', 'comparar rutas', 'curiosity contra eva'],
    },
  },
  {
    tool: 'startDiscoveryTour',
    params: { startIndex: 0 },
    phrases: {
      en: ['start mission simulation', 'start tour', 'begin discovery tour', 'launch simulation'],
      es: ['iniciá la simulación de misión', 'iniciar simulación de misión', 'iniciar recorrido', 'comenzar tour'],
    },
  },
  {
    tool: 'pauseDiscoveryTour',
    params: {},
    phrases: {
      en: ['pause mission', 'pause tour', 'stop tour', 'resume tour'],
      es: ['pausá la misión', 'pausa la misión', 'pausar recorrido', 'detener tour'],
    },
  },
  {
    tool: 'explainSelectedRegion',
    params: {},
    phrases: {
      en: ['what are the geological features', 'explain this region', 'geological summary', 'science targets'],
      es: ['qué características geológicas tiene esta región', 'explicar esta región', 'resumen geológico'],
    },
  },
]

/**
 * Detecta comandos de cambio de idioma explícitos
 */
export function checkLanguageSwitchCommand(text: string): SupportedLanguage | null {
  const clean = text.toLowerCase().trim()

  const toEnglishPatterns = [
    /\b(switch|change)\s+(to\s+)?(the\s+)?english\b/i,
    /\bspeak\s+english\b/i,
    /\btalk\s+(in\s+)?english\b/i,
    /\bin\s+english\b/i,
    /\bhabl[aá]\s+en\s+ingl[eé]s\b/i,
    /\bcambia(r)?\s+(a|al)\s+ingl[eé]s\b/i,
    /\bingl[eé]s\s+por\s+favor\b/i,
  ]

  const toSpanishPatterns = [
    /\b(switch|change)\s+(to\s+)?(the\s+)?spanish\b/i,
    /\bspeak\s+spanish\b/i,
    /\btalk\s+(in\s+)?spanish\b/i,
    /\bin\s+spanish\b/i,
    /\bhabl[aá]\s+en\s+español\b/i,
    /\bcambia(r)?\s+(a|al|el\s+idioma\s+a)\s+español\b/i,
    /\bespañol\s+por\s+favor\b/i,
    /\ben\s+español\b/i,
  ]

  for (const pat of toEnglishPatterns) {
    if (pat.test(clean)) return 'en'
  }

  for (const pat of toSpanishPatterns) {
    if (pat.test(clean)) return 'es'
  }

  return null
}

/**
 * Infiere el idioma de un texto basándose en marcadores léxicos comunes
 */
export function detectTextLanguage(text: string): SupportedLanguage {
  const clean = text.toLowerCase().trim()

  // Marcadores característicos del español
  const spanishMarkers = [
    'el', 'la', 'los', 'las', 'de', 'en', 'para', 'con', 'por', 'que', 'qué',
    'cómo', 'donde', 'dónde', 'activar', 'activa', 'activá', 'mostrá', 'mostrar',
    'enfocá', 'enfoca', 'ruta', 'misión', 'monte', 'hola', 'gracias', 'capa'
  ]

  // Marcadores característicos del inglés
  const englishMarkers = [
    'the', 'is', 'at', 'which', 'on', 'for', 'with', 'show', 'activate', 'enable',
    'focus', 'look', 'what', 'where', 'how', 'route', 'mission', 'mount', 'sharp',
    'hello', 'hey', 'switch', 'please', 'layer', 'thermal'
  ]

  const tokens = clean.split(/\s+/)
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
 */
export function resolveBilingualTool(text: string): { tool: string; params?: Record<string, unknown> } | null {
  const clean = text.toLowerCase().trim()

  for (const mapping of BILINGUAL_MISSION_COMMANDS) {
    const allPhrases = [...mapping.phrases.en, ...mapping.phrases.es]
    for (const phrase of allPhrases) {
      if (clean === phrase || clean.includes(phrase)) {
        return {
          tool: mapping.tool,
          params: mapping.params,
        }
      }
    }
  }

  return null
}

