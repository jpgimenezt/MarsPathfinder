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
    tool: 'focusBaseLZ1',
    params: {},
    phrases: {
      en: ['base', 'go to base', 'open base', 'focus base', 'center on base', 'lz-1 base', 'base lz-1', 'lz1 base', 'lz-1', 'lz1', 'landing site lz-1', 'bradbury base', 'base alpha', 'focus bradbury landing'],
      es: ['base', 'ir a la base', 'abrir base', 'centrar en la base', 'ver base', 'lz-1 base', 'lz-1', 'lz 1', 'base lz-1', 'base lz 1', 'lz1 base', 'sitio base', 'volver a la base', 'base alfa', 'enfocar base lz-1', 'enfocar base lz 1', 'sitio de aterrizaje bradbury', 'bradbury landing'],
    },
  },
  {
    tool: 'focusGeographicTarget',
    params: { targetName: 'Delta de Jezero' },
    phrases: {
      en: ['focus on jezero delta', 'look at jezero delta', 'jezero delta', 'mineral delta'],
      es: ['enfocá el delta de jezero', 'delta de jezero', 'mirar delta de jezero', 'minerales del delta'],
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
      en: ['switch to gale 3d', 'gale 3d', 'gale', 'open gale 3d', 'open 3d terrain', 'show 3d terrain', 'view gale crater', 'gale 3d view', '3d terrain', 'terrain 3d'],
      es: ['gale 3d', 'gale', 'abrir gale 3d', 'abrir gale', 'ir a gale 3d', 'ir a gale', 'cambiar a gale 3d', 'ver terreno 3d', 'ir a terreno 3d', 'terreno 3d', 'vista 3d de gale', 'volver al terreno 3d', 'volver a 3d'],
    },
  },
  {
    tool: 'switchScreenView',
    params: { screen: 'globe' },
    phrases: {
      en: ['switch to globe', 'globe 3d', 'globe', 'open globe', 'open 3d globe', 'view mars globe', 'orbital globe view', 'planet globe', '3d globe'],
      es: ['globo 3d', 'globo', 'abrir globo 3d', 'abrir globo', 'ir a globo 3d', 'ir al globo', 'ver globo', 'ver globo 3d', 'cambiar a globo orbital', 'globo orbital', 'planeta marte 3d', 'vista global', 'pantalla globo', 'modo globo'],
    },
  },
  {
    tool: 'switchScreenView',
    params: { screen: 'map' },
    phrases: {
      en: ['switch to jezero 2d', 'jezero 2d', 'jezero', 'open jezero 2d', 'open jezero', 'go to jezero 2d', 'jezero map', '2d map view', 'jezero crater 2d', '2d map', 'open map'],
      es: ['jezero 2d', 'jezero', 'abrir jezero 2d', 'abrir jezero', 'ir a jezero 2d', 'ir a jezero', 'mapa jezero', 'mapa jezero 2d', 'cambiar a jezero 2d', 'mapa 2d', 'mapa de jezero', 'vista 2d', 'ver jezero 2d', 'ver jezero', 'pantalla jezero', 'abrir mapa'],
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
    tool: 'triggerEDLDescent',
    params: {},
    phrases: {
      en: ['start mission simulation', 'simulate edl descent', 'edl descent simulation', 'simulate landing', 'edl descent'],
      es: ['iniciar simulación de descenso edl', 'iniciar simulacion de descenso edl', 'simulación de descenso edl', 'simular descenso', 'descenso edl', 'aterrizaje edl'],
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
    tool: 'openGuidedTour',
    params: { open: true },
    phrases: {
      en: ['open guide', 'start guide', 'guided tour', 'interactive guide', 'help tour', 'start tutorial', 'guide'],
      es: ['abrir guia', 'abrir guía', 'iniciar guia', 'iniciar guía', 'guia interactiva', 'guía interactiva', 'recorrido guiado', 'tour guiado', 'guia', 'guía', 'tutorial', 'ayuda interactiva'],
    },
  },
  {
    tool: 'triggerEDLDescent',
    params: {},
    phrases: {
      en: ['edl descent', 'start edl descent', 'simulate landing', 'landing descent', 'simulate edl', 'descent sequence', 'entry descent landing'],
      es: ['descenso edl', 'iniciar descenso edl', 'descenso', 'iniciar descenso', 'simular aterrizaje', 'secuencia de descenso', 'aterrizaje edl', 'simulacion de descenso', 'simulación de descenso'],
    },
  },
  {
    tool: 'triggerOrbitAscent',
    params: {},
    phrases: {
      en: ['orbit view', 'orbit', 'ascend to orbit', 'space orbit', 'high orbit camera'],
      es: ['orbita', 'órbita', 'vista orbita', 'vista órbita', 'ascender a orbita', 'ascender a órbita', 'camara orbita', 'cámara órbita', 'ver orbita', 'ver órbita', 'volver a orbita'],
    },
  },
  {
    tool: 'triggerPanoramaColony',
    params: {},
    phrases: {
      en: ['panorama', 'panoramic view', 'colony panorama', 'tour colony', '360 panorama', 'base panorama'],
      es: ['panorama', 'vista panorama', 'panoramica', 'panorámica', 'recorrido panoramico', 'recorrido panorámico', 'ver panorama', 'panorama de la base', 'panorama 360'],
    },
  },
  {
    tool: 'openDataCenter',
    params: { open: true },
    phrases: {
      en: ['nasa data', 'data', 'open data', 'open nasa data', 'show data', 'ares scientific data center', 'scientific data center', 'open data center', 'scientific center'],
      es: ['datos nasa', 'datos', 'abrir datos', 'abrir datos nasa', 'mostrar datos', 'ver datos', 'ver datos nasa', 'fuentes nasa', 'catalogo nasa', 'catálogo nasa', 'centro cientifico ares', 'centro científico ares', 'centro cientifico', 'centro científico', 'abrir centro cientifico', 'abrir centro científico', 'centro de datos', 'abrir centro de datos'],
    },
  },
  {
    tool: 'openSurfaceIntelligence',
    params: { open: true },
    phrases: {
      en: ['raw photos', 'open raw photos', 'raw images', 'surface intelligence', 'surface catalog', 'curiosity raw photos', 'perseverance photos'],
      es: ['fotos raw', 'ver fotos raw', 'abrir fotos raw', 'fotografias raw', 'fotografías raw', 'imagenes raw', 'imágenes raw', 'inteligencia de superficie', 'abrir inteligencia de superficie', 'catalogo de superficie', 'catálogo de superficie'],
    },
  },
  {
    tool: 'setCleanViewMode',
    params: { active: true },
    phrases: {
      en: ['clean view', 'clear screen', 'clean screen', 'clear hud', 'hide interface', 'clean hud'],
      es: ['limpiar', 'pantalla limpia', 'limpiar pantalla', 'modo limpio', 'limpiar hud', 'ocultar interfaz', 'ocultar paneles', 'limpiar vista'],
    },
  },
  {
    tool: 'setRouteViewMode',
    params: { mode: 'both' },
    phrases: {
      en: ['show both routes', 'both routes view', 'all routes', 'view both routes'],
      es: ['vista ambas rutas', 'ver ambas rutas', 'ambas rutas', 'mostrar ambas rutas', 'todas las rutas'],
    },
  },
  {
    tool: 'setRouteViewMode',
    params: { mode: 'eva' },
    phrases: {
      en: ['only eva route', 'eva route only', 'show eva route', 'only ares route'],
      es: ['solo ruta eva', 'solo ruta ares', 'ver ruta eva', 'ver solo ares', 'solo eva', 'solo ares'],
    },
  },
  {
    tool: 'setRouteViewMode',
    params: { mode: 'curiosity' },
    phrases: {
      en: ['only curiosity', 'curiosity route only', 'show curiosity traverse'],
      es: ['solo curiosity', 'ver solo curiosity', 'solo ruta curiosity', 'ver trayectoria curiosity'],
    },
  },
  {
    tool: 'setRouteViewMode',
    params: { mode: 'toggle' },
    phrases: {
      en: ['toggle routes', 'toggle route view', 'switch routes view'],
      es: ['alternar rutas', 'cambiar vista de rutas', 'cambiar ruta', 'alternar ruta'],
    },
  },
  {
    tool: 'setTacticalDockCollapsed',
    params: { collapsed: true },
    phrases: {
      en: ['collapse dock', 'collapse tactical dock', 'hide tactical console', 'close tactical dock', 'collapse console'],
      es: ['colapsar consola', 'cerrar consola', 'ocultar consola tactica', 'ocultar consola táctica', 'colapsar panel tactico', 'colapsar panel táctico', 'cerrar panel tactico', 'cerrar panel táctico', 'colapsar consola tactica', 'colapsar consola táctica'],
    },
  },
  {
    tool: 'setTacticalDockCollapsed',
    params: { collapsed: false },
    phrases: {
      en: ['expand dock', 'expand tactical dock', 'show tactical console', 'open tactical dock', 'expand console'],
      es: ['expandir consola', 'abrir consola', 'mostrar consola tactica', 'mostrar consola táctica', 'expandir panel tactico', 'expandir panel táctico', 'abrir panel tactico', 'abrir panel táctico', 'expandir consola tactica', 'expandir consola táctica'],
    },
  },
  {
    tool: 'setTacticalDockTab',
    params: { tab: 'layers' },
    phrases: {
      en: ['layers tab', 'scientific layers tab', 'show layers tab', 'open layers tab'],
      es: ['pestana capas', 'pestaña capas', 'pestana capas cientificas', 'pestaña capas científicas', 'capas cientificas', 'capas científicas', 'ver capas cientificas', 'ver capas científicas', 'abrir capas'],
    },
  },
  {
    tool: 'setTacticalDockTab',
    params: { tab: 'camera' },
    phrases: {
      en: ['camera tab', 'camera controls tab', 'show camera tab', 'open camera tab'],
      es: ['pestana camara', 'pestaña cámara', 'controles de camara', 'controles de cámara', 'ajustes de camara', 'ajustes de cámara', 'abrir camara', 'abrir cámara'],
    },
  },
  {
    tool: 'setTacticalDockTab',
    params: { tab: 'colony' },
    phrases: {
      en: ['base alpha tab', 'colony tab', 'base alpha 3d tab', 'habitat modules tab'],
      es: ['pestana base alfa', 'pestaña base alfa', 'base alfa 3d', 'panel base alfa', 'modulos de base alfa', 'módulos de base alfa', 'ver colonia 3d'],
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

  // 9. Correcciones para EDL (Descenso):
  text = text.replace(/\b(?:e\s*d\s*l|e\s+de\s+ele|ede\s*ele|e\s+d\s+l|edel)\b/gi, 'EDL')

  // 10. Correcciones para LZ-1 Base:
  text = text.replace(/\b(?:l\s*z\s*1|l\s*z\s*-?\s*1|ele\s*zeta\s*(?:uno|1)|elce\s*uno|elezeta\s*(?:uno|1))\b/gi, 'LZ-1')

  // 11. Correcciones para Sobrevuelo y Panorama:
  text = text.replace(/\bsobre\s+vuelo(s)?\b/gi, 'sobrevuelo')

  // 12. Correcciones para pantallas y modos:
  text = text.replace(/\b(?:globo\s+(?:tres\s+d(?:e)?|3\s*d(?:e)?))\b/gi, 'globo 3d')
  text = text.replace(/\b(?:jezero\s+(?:dos\s+d(?:e)?|2\s*d(?:e)?))\b/gi, 'jezero 2d')
  text = text.replace(/\b(?:gale\s+(?:tres\s+d(?:e)?|3\s*d(?:e)?))\b/gi, 'gale 3d')

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

  // 1. Prioridad absoluta: Pestañas de la consola táctica si el usuario dice 'pestaña' o 'tab'
  if (norm.includes('pestana') || norm.includes('tab')) {
    if (norm.includes('capa')) return { tool: 'setTacticalDockTab', params: { tab: 'layers' } }
    if (norm.includes('camara') || norm.includes('camera')) return { tool: 'setTacticalDockTab', params: { tab: 'camera' } }
    if (norm.includes('base') || norm.includes('coloni') || norm.includes('alfa')) return { tool: 'setTacticalDockTab', params: { tab: 'colony' } }
  }

  // 2. Coincidencia exacta sobre el registro bilingüe
  for (const mapping of BILINGUAL_MISSION_COMMANDS) {
    const allPhrases = [...mapping.phrases.en, ...mapping.phrases.es]
    for (const phrase of allPhrases) {
      const normPhrase = normalizeCommandText(phrase)
      if (norm === normPhrase) {
        return {
          tool: mapping.tool,
          params: mapping.params,
        }
      }
    }
  }

  // 3. Coincidencia por subcadena ordenada (frases más largas primero)
  const sortedMappings = [...BILINGUAL_MISSION_COMMANDS].sort((a, b) => {
    const maxA = Math.max(...[...a.phrases.en, ...a.phrases.es].map(p => normalizeCommandText(p).length))
    const maxB = Math.max(...[...b.phrases.en, ...b.phrases.es].map(p => normalizeCommandText(p).length))
    return maxB - maxA
  })
  for (const mapping of sortedMappings) {
    const allPhrases = [...mapping.phrases.en, ...mapping.phrases.es].sort((p1, p2) => p2.length - p1.length)
    for (const phrase of allPhrases) {
      const normPhrase = normalizeCommandText(phrase)
      if (norm.includes(normPhrase)) {
        return {
          tool: mapping.tool,
          params: mapping.params,
        }
      }
    }
  }

  // 2. Comprensión semántica por combinaciones de palabras clave
  // Cambiar pantallas (Globo 3D, Jezero 2D, Gale 3D)
  if (norm.includes('globo') || norm.includes('globe') || norm.includes('planeta 3d')) {
    return { tool: 'switchScreenView', params: { screen: 'globe' } }
  }
  if (norm.includes('jezero') || (norm.includes('mapa') && !norm.includes('mola')) || norm.includes('2d')) {
    return { tool: 'switchScreenView', params: { screen: 'map' } }
  }
  if ((norm.includes('gale') || norm.includes('terreno')) && (norm.includes('3d') || norm.includes('volver') || norm.includes('ir'))) {
    return { tool: 'switchScreenView', params: { screen: 'terrain3d' } }
  }

  // Mount Sharp
  if ((norm.includes('mount') || norm.includes('monte') || norm.includes('aeolis')) && norm.includes('sharp')) {
    return { tool: 'focusGeographicTarget', params: { targetName: 'Mount Sharp' } }
  }

  // Jezero Delta (solo enfoque geológico específico si no es solicitud de pantalla mapa)
  if (norm.includes('delta') && !norm.includes('jezero 2d') && !norm.includes('mapa')) {
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

  // Base LZ-1 Bradbury / Base Alfa / Bradbury Landing
  if (norm.includes('base') || norm.includes('lz-1') || norm.includes('lz 1') || norm.includes('lz1') || norm.includes('bradbury')) {
    return { tool: 'focusBaseLZ1', params: {} }
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
  if ((norm.includes('gale') || norm.includes('terreno')) && (norm.includes('3d') || norm.includes('volver') || norm.includes('ir'))) {
    return { tool: 'switchScreenView', params: { screen: 'terrain3d' } }
  }

  // Cambiar a Jezero 2D
  if (norm.includes('jezero') || ((norm.includes('mapa') || norm.includes('2d')) && !norm.includes('mola'))) {
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

  // Simulación / Tour / Sobrevuelo
  if (norm.includes('sobrevuelo') || norm.includes('flyover') || norm.includes('tour') || norm.includes('recorrido')) {
    return { tool: 'startDiscoveryTour', params: { startIndex: 0 } }
  }

  // Guía interactiva
  if (norm.includes('guia') || norm.includes('guide') || norm.includes('tutorial')) {
    return { tool: 'openGuidedTour', params: { open: true } }
  }

  // Descenso EDL
  if (norm.includes('edl') || (norm.includes('descens') && !norm.includes('ascens')) || norm.includes('aterrizaj')) {
    return { tool: 'triggerEDLDescent', params: {} }
  }

  // Ascenso a Órbita / Vista Órbita
  if ((norm.includes('orbit') || norm.includes('orbita')) && !norm.includes('satelit') && !norm.includes('globo')) {
    return { tool: 'triggerOrbitAscent', params: {} }
  }

  // Pestañas de la consola táctica (debe evaluarse antes que Base LZ-1)
  if (norm.includes('pestana') || norm.includes('tab')) {
    if (norm.includes('capa')) return { tool: 'setTacticalDockTab', params: { tab: 'layers' } }
    if (norm.includes('camara') || norm.includes('camera')) return { tool: 'setTacticalDockTab', params: { tab: 'camera' } }
    if (norm.includes('base') || norm.includes('coloni') || norm.includes('alfa')) return { tool: 'setTacticalDockTab', params: { tab: 'colony' } }
  }

  // Panorama 360 / Colonia
  if (norm.includes('panorama') || norm.includes('panoramic')) {
    return { tool: 'triggerPanoramaColony', params: {} }
  }

  // Datos NASA / Centro Científico ARES
  if (norm.includes('datos') || (norm.includes('centro') && norm.includes('cientific'))) {
    return { tool: 'openDataCenter', params: { open: true } }
  }

  // Fotos RAW / Inteligencia de Superficie
  if ((norm.includes('foto') && norm.includes('raw')) || (norm.includes('inteligencia') && norm.includes('superficie')) || norm.includes('catalogo de superficie')) {
    return { tool: 'openSurfaceIntelligence', params: { open: true } }
  }

  // Modo Limpiar / Pantalla limpia
  if (norm.includes('limpiar') || norm.includes('pantalla limpia') || norm.includes('modo limpio') || norm.includes('clean view') || norm.includes('clear screen')) {
    return { tool: 'setCleanViewMode', params: { active: true } }
  }

  // Modos de vista de rutas (Ambas / Solo EVA / Solo Curiosity)
  if (norm.includes('ambas rutas') || norm.includes('both routes') || norm.includes('ver ambas rutas') || norm.includes('vista ambas rutas')) {
    return { tool: 'setRouteViewMode', params: { mode: 'both' } }
  }
  if (norm.includes('solo ruta eva') || norm.includes('solo eva') || norm.includes('solo ares') || norm.includes('solo ruta ares') || norm.includes('ver solo ares') || norm.includes('ver ruta eva')) {
    return { tool: 'setRouteViewMode', params: { mode: 'eva' } }
  }
  if (norm.includes('solo curiosity') || norm.includes('solo ruta curiosity') || norm.includes('ver solo curiosity')) {
    return { tool: 'setRouteViewMode', params: { mode: 'curiosity' } }
  }
  if (norm.includes('alternar ruta') || norm.includes('cambiar vista de ruta') || norm.includes('toggle route')) {
    return { tool: 'setRouteViewMode', params: { mode: 'toggle' } }
  }

  // Colapsar o expandir consola de control táctico
  if ((norm.includes('colaps') || norm.includes('cerrar') || norm.includes('ocultar')) && (norm.includes('consola') || norm.includes('panel tactico') || norm.includes('dock'))) {
    return { tool: 'setTacticalDockCollapsed', params: { collapsed: true } }
  }
  if ((norm.includes('expand') || norm.includes('abrir') || norm.includes('mostrar')) && (norm.includes('consola') || norm.includes('panel tactico') || norm.includes('dock'))) {
    return { tool: 'setTacticalDockCollapsed', params: { collapsed: false } }
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

  // Comparar misiones / rutas
  if (norm.includes('compar') || (norm.includes('curiosity') && (norm.includes('ruta') || norm.includes('vs')))) {
    return { tool: 'compareMissionRoutes', params: { showModal: true } }
  }

  // Estado del Hábitat
  if ((norm.includes('habitat') || norm.includes('base')) &&
      (norm.includes('estado') || norm.includes('status') || norm.includes('soporte') || norm.includes('energia') || norm.includes('power'))) {
    return { tool: 'getHabitatStatus', params: {} }
  }

  return null
}
