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
    params: { targetName: 'Bradbury Landing' },
    phrases: {
      en: ['focus bradbury landing', 'look at lz-1', 'center on base alpha', 'lz-1 base', 'bradbury landing'],
      es: ['enfoca bradbury landing', 'enfocar base lz 1', 'ir a bradbury', 'centrar en la base', 'base lz-1', 'sitio de aterrizaje bradbury'],
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
    tool: 'focusGeographicTarget',
    params: { targetName: 'Cresta Vera Rubin' },
    phrases: {
      en: ['focus vera rubin ridge', 'look at vera rubin', 'hematite ridge', 'vera rubin'],
      es: ['enfoca cresta vera rubin', 'ver cresta de hematita', 'cresta vera rubin', 'cresta de hematita'],
    },
  },
  {
    tool: 'switchScreenView',
    params: { screen: 'terrain3d' },
    phrases: {
      en: ['switch to gale 3d', 'show 3d terrain', 'view gale crater', 'gale 3d view', '3d terrain'],
      es: ['cambiar a gale 3d', 'ver terreno 3d', 'ir a gale 3d', 'terreno 3d', 'vista 3d de gale', 'volver al terreno 3d'],
    },
  },
  {
    tool: 'switchScreenView',
    params: { screen: 'globe' },
    phrases: {
      en: ['switch to globe', 'orbital globe view', 'view mars globe', 'planet globe', '3d globe'],
      es: ['cambiar a globo orbital', 'globo orbital', 'ver globo', 'planeta marte 3d', 'globo 3d', 'vista global'],
    },
  },
  {
    tool: 'switchScreenView',
    params: { screen: 'map' },
    phrases: {
      en: ['switch to jezero 2d', 'jezero map', '2d map view', 'jezero crater 2d'],
      es: ['cambiar a jezero 2d', 'mapa 2d', 'ir a jezero', 'mapa de jezero', 'vista 2d'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'optical', enabled: true },
    phrases: {
      en: ['show real satellite photo', 'orbital satellite photo', 'optical layer', 'satellite imagery', 'show optical photography', 'real satellite photo', 'previous layer', 'back to previous', 'reset layer', 'base layer'],
      es: ['mostrar fotografia satelital real', 'fotografia satelital real', 'activar fotografia orbital', 'capa optica', 'foto satelital', 'fotografia orbital', 'mostrar foto real', 'activar foto satelital', 'foto orbital satelital', 'volver a la anterior', 'capa anterior', 'volver a la foto real', 'quitar capa', 'sacar capa', 'restablecer capa', 'volver al mapa original', 'capa base'],
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
    tool: 'toggleScientificLayer',
    params: { layerId: 'spectral', enabled: true },
    phrases: {
      en: ['mineral units', 'spectral composition', 'crism spectral layer', 'minerals', 'show mineralogical units'],
      es: ['unidades mineralogicas', 'composicion espectral', 'capa espectral', 'minerales crism', 'mostrar minerales', 'mostrar unidades mineralogicas'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'slope', enabled: true },
    phrases: {
      en: ['slope analysis', 'slope map', 'slope safety', 'hazard map', 'steep terrain'],
      es: ['analisis de pendientes', 'mapa de pendientes', 'seguridad de pendientes', 'pendientes y riesgo', 'mostrar pendientes'],
    },
  },
  {
    tool: 'toggleScientificLayer',
    params: { layerId: 'radiation', enabled: true },
    phrases: {
      en: ['radiation dosimetry', 'radiation map', 'surface radiation', 'rad sensor'],
      es: ['dosimetria de radiacion', 'mapa de radiacion', 'radiacion en superficie', 'mostrar radiacion'],
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
      en: ['activate ctx', 'show ctx mosaic', 'enable ctx imagery', 'orbital context', 'ctx layer', 'ctx mosaic'],
      es: [
        'activá ctx',
        'activa ctx',
        'mostrar mosaico ctx',
        'activar ctx',
        'contexto orbital',
        'la capa mosaico ctx',
        'capa mosaico ctx',
        'mosaico ctx',
        'capa ctx',
        'mosaico controlado ctx',
      ],
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
 * Corrige alucinaciones acústicas y distorsiones fonéticas frecuentes
 * producidas por motores de reconocimiento de voz del navegador (Web Speech API)
 * ante términos técnicos de NASA y cartografía de Marte.
 * 
 * Ejemplo crítico reportado:
 * "la capa mosaico CTX" -> transcripto erróneamente como "la capa mamá no soy psicópata"
 */
export function repairAcousticHallucinations(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

  // 1. Corrección específica para "mosaico CTX" y derivados:
  // "mamá no soy psicópata" / "mama no soy psicopata" -> "mosaico CTX"
  text = text.replace(/\b(?:la\s+)?capa\s+mam[aá]\s+no\s+soy\s+psic[oó]pata\b/gi, 'la capa mosaico CTX')
  text = text.replace(/\bmam[aá]\s+no\s+soy\s+psic[oó]pata\b/gi, 'mosaico CTX')
  text = text.replace(/\bmam[aá]\s+no\s+soy\b/gi, 'mosaico')

  // Fonemas de CTX ("se te equis", "cete equis", "ce te equis", "c t x", "psicópata" tras capa/mosaico/activar)
  text = text.replace(/(?<=(?:capa|mosaico|activ[aá]|mostr[aá]|ver)\s+)psic[oó]pata\b/gi, 'CTX')
  text = text.replace(/\b(?:se\s+te\s+equis|ce\s+te\s+equis|cete\s+equis|c\s+t\s+x|setequis|cetequis|cetex|setex|se\s+te\s+x|ct\s+x)\b/gi, 'CTX')

  // 2. Correcciones para THEMIS (térmica):
  // "inercia térmica tenis", "capa tenis", "témis", "temis", "te mis"
  text = text.replace(/(?<=(?:capa|inercia\s+t[eé]rmica|activ[aá]|mostr[aá])\s+)(?:tenis|tennis|denis)\b/gi, 'THEMIS')
  text = text.replace(/\b(?:inercia\s+t[eé]rmica\s+tenis|capa\s+tenis)\b/gi, 'capa THEMIS')
  text = text.replace(/\b(?:t[eé]mis|temis|te\s+mis)\b/gi, 'THEMIS')

  // 3. Correcciones para MOLA (altimetría/elevación):
  text = text.replace(/(?<=(?:capa|relieve|elevaci[oó]n|altimetr[ií]a|activ[aá]|mostr[aá])\s+)(?:molar|moda|bola)\b/gi, 'MOLA')

  // 4. Correcciones para Mount Sharp / Aeolis Mons:
  text = text.replace(/\b(?:mon\s+char|mont\s+char|monte\s+shar|mon\s+sharp|mount\s+sharpe|moun\s+sharp|montes\s+harp)\b/gi, 'Mount Sharp')

  // 5. Correcciones para CRISM:
  text = text.replace(/(?<=(?:mineral(?:es)?|unidades|capa|espectral)\s+)(?:crisim|cris|prism|prisma)\b/gi, 'CRISM')

  // 6. Correcciones para Jezero:
  text = text.replace(/\b(?:yesero|yezero|gesero|gezero|je\s+cero|ye\s+zero)\b/gi, 'Jezero')

  // 7. Correcciones para Bradbury:
  text = text.replace(/\b(?:brad\s+buri|brad\s+bur\s+y|badbury)\b/gi, 'Bradbury')

  // 8. Correcciones para Curiosity / Perseverance:
  text = text.replace(/(?<=(?:ruta|comparar|vs|versus|trayecto)\s+)(?:curiositi|curiosite|curiosidad)\b/gi, 'Curiosity')
  text = text.replace(/(?<=(?:misi[oó]n|rover|fotos|delta)\s+)(?:perseverans|perseverancia)\b/gi, 'Perseverance')

  return text
}

/**
 * Normaliza texto de entrada eliminando acentos, puntuación, contracciones y coloquialismos
 */
export function normalizeCommandText(raw: string): string {
  if (!raw) return ''
  let text = repairAcousticHallucinations(raw).toLowerCase().trim()

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

  // Fotografía satelital real / óptica / volver a la anterior
  if (
    norm.includes('satelit') ||
    norm.includes('orbital') ||
    norm.includes('foto real') ||
    norm.includes('optic') ||
    norm.includes('volver a la anterior') ||
    norm.includes('capa anterior') ||
    norm.includes('volver a la foto') ||
    norm.includes('sacar capa') ||
    norm.includes('quitar capa') ||
    norm.includes('mapa base') ||
    norm.includes('capa base')
  ) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'optical', enabled: true } }
  }

  // Desactivar / apagar capas explícitamente
  const isDeactivation = norm.includes('desactiv') || norm.includes('apag') || norm.includes('quit') || norm.includes('ocult')

  // Capa térmica / THEMIS
  if (norm.includes('themis') || norm.includes('temis') || norm.includes('termic')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'themis', enabled: !isDeactivation } }
  }

  // Relieve MOLA / Elevación
  if (norm.includes('mola') || norm.includes('relieve') || norm.includes('altimetr') || (norm.includes('elevacion') && !norm.includes('que'))) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'mola', enabled: !isDeactivation } }
  }

  // Mosaico CTX
  if (norm.includes('ctx') || norm.includes('mosaico')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'ctx', enabled: !isDeactivation } }
  }

  // Capas geológicas
  if (norm.includes('geolog')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'geology', enabled: !isDeactivation } }
  }

  // Minerales / Espectral / CRISM
  if (norm.includes('mineral') || norm.includes('espectral') || norm.includes('crism')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'spectral', enabled: !isDeactivation } }
  }

  // Pendientes / Riesgo
  if (norm.includes('pendient') || norm.includes('slope')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'slope', enabled: !isDeactivation } }
  }

  // Radiación
  if (norm.includes('radiac') || norm.includes('dosimetr')) {
    return { tool: 'toggleScientificLayer', params: { layerId: 'radiation', enabled: !isDeactivation } }
  }

  // Bradbury Landing / Base LZ-1
  if (norm.includes('bradbury') || norm.includes('lz-1') || norm.includes('lz 1') || norm.includes('base alfa')) {
    return { tool: 'focusGeographicTarget', params: { targetName: 'Bradbury Landing' } }
  }

  // Vera Rubin Ridge / Hematita
  if (norm.includes('vera rubin') || norm.includes('hematit')) {
    return { tool: 'focusGeographicTarget', params: { targetName: 'Cresta Vera Rubin' } }
  }

  // Cambiar a Globo Orbital
  if (norm.includes('globo') || norm.includes('globe') || norm.includes('planeta 3d')) {
    return { tool: 'switchScreenView', params: { screen: 'globe' } }
  }

  // Cambiar a Terreno Gale 3D
  if ((norm.includes('gale') || norm.includes('terreno')) && (norm.includes('3d') || norm.includes('volver'))) {
    return { tool: 'switchScreenView', params: { screen: 'terrain3d' } }
  }

  // Cambiar a Jezero 2D
  if ((norm.includes('jezero') || norm.includes('mapa')) && (norm.includes('2d') || norm.includes('mapa'))) {
    return { tool: 'switchScreenView', params: { screen: 'map' } }
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
