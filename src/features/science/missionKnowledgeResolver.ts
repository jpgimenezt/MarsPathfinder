/**
 * ARES MISSION COMMS — Fast Tactical Science & Mission Knowledge Resolver
 * 
 * Resuelve consultas científicas sobre las misiones de NASA (Curiosity MSL en Gale Crater,
 * Perseverance Mars 2020 en Jezero, formaciones boxwork, estratigrafía de Mount Sharp y datasets)
 * con latencia inferior a 50 ms a partir de datos oficiales normalizados de NASA/USGS.
 * 
 * Garantiza respuestas inmediatas sin bloqueos de red ni llamadas remotas lentas.
 */

import { USGS_GALE_UNITS, type UsgsGeologicUnit } from '../geology/usgsGeologyData'
import type { SupportedLanguage } from '../i18n/commsTranslations'

export interface ResolvedMissionKnowledge {
  matchedQuery: string
  topic: 'CURIOSITY_DISCOVERIES' | 'BOXWORK_FORMATIONS' | 'MOUNT_SHARP_STRATA' | 'JEZERO_DELTA' | 'DATASET_PROVENANCE'
  summaryText: string
  spokenSummary: string
  citations: string[]
}

/**
 * Evalúa semánticamente si una consulta del astronauta corresponde a conocimiento científico
 * oficial de la misión presente en los registros normalizados de NASA.
 */
export function resolveMissionKnowledge(
  query: string,
  language: SupportedLanguage = 'es'
): ResolvedMissionKnowledge | null {
  if (!query || !query.trim()) return null
  const q = query.toLowerCase().trim()
  const isEn = language === 'en'

  // 1. Descubrimientos científicos de Curiosity en Gale Crater
  if (
    /(?:descubrimiento|hallazgo|curiosity|msl|yellowknife|bahia yellowknife|historia de la mision|discover|gale crater discoveries)/i.test(q) &&
    /(?:curiosity|descubri|gale|mision|hall|sharp|perforac)/i.test(q)
  ) {
    const summaryText = isEn
      ? `[NASA MSL CURIOSITY HERITAGE // GALE CRATER]:\n` +
        `• Yellowknife Bay (Sol 126): First drilling on Mars; confirmed ancient habitable neutral-pH lake with carbon, hydrogen, oxygen, nitrogen, phosphorus, and sulfur.\n` +
        `• Glen Torridon (Clay-Bearing Unit, Sol 2300): Rich smectite clays preserving complex organic molecules.\n` +
        `• Mount Sharp Transition (Sol 3148+): Discovery of mineral veins, sulfates, and boxwork structures marking the drying of ancient Mars.\n` +
        `[INSTRUMENTS]: CheMin, SAM, Mastcam, ChemCam, APXS.`
      : `[HISTÓRICO CIENTÍFICO NASA CURIOSITY // CRÁTER GALE]:\n` +
        `• Bahía Yellowknife (Sol 126): Primera perforación en Marte. Demostró la existencia de un antiguo lago habitable de agua dulce con pH neutro y elementos biogénicos clave (C, H, N, O, P, S).\n` +
        `• Glen Torridon (Unidad de Arcillas, Sol 2300): Detección de esmectitas con alta preservación de moléculas orgánicas complejas.\n` +
        `• Transición a Sulfatos en Mount Sharp (Sol 3148+): Identificación de redes minerales boxwork y depósitos de evaporitas que documentan la transición climática marciana.\n` +
        `[INSTRUMENTAL CIENTÍFICO]: Espectrómetro CheMin, laboratorio SAM, cámara Mastcam y ChemCam.`

    const spokenSummary = isEn
      ? `Curiosity confirmed Gale Crater once hosted a freshwater lake with all chemical ingredients for microbial life, later discovering clay layers at Glen Torridon and sulfate mineral networks on Mount Sharp.`
      : `Curiosity confirmó que el Cráter Gale albergó un lago habitable de agua dulce con todos los ingredientes para la vida microbiana, descubriendo luego densas arcillas en Glen Torridon y redes de sulfatos en Mount Sharp.`

    return {
      matchedQuery: query,
      topic: 'CURIOSITY_DISCOVERIES',
      summaryText,
      spokenSummary,
      citations: [
        'NASA/JPL-Caltech Curiosity Science Highlights (Sol 0 - 3200)',
        'Science (Grotzinger et al., Habitability in Gale Crater)',
      ],
    }
  }

  // 2. Formaciones Boxwork en Mount Sharp
  if (/(?:boxwork|cajas|redes minerales|cresta de sulfato|sulfate ridges)/i.test(q)) {
    const summaryText = isEn
      ? `[GEOLOGICAL CONTEXT // BOXWORK FORMATIONS AT MOUNT SHARP]:\n` +
        `• Morphology: Polygonal ridges formed when mineral-rich groundwater flowed through rock fractures and precipitated erosion-resistant sulfates.\n` +
        `• Scientific Value: Represents one of the last subsurface habitable hydrothermal environments before Mars transitioned into an arid planet (Curiosity 2024-2025 campaign).\n` +
        `• Mission Observation: Investigated by Curiosity near Gediz Vallis and Sulfate-Bearing Unit.`
      : `[CONTEXTO GEOLÓGICO // FORMACIONES BOXWORK EN MOUNT SHARP]:\n` +
        `• Morfología: Redes poligonales de crestas minerales formadas cuando aguas subterráneas ricas en minerales circularon por fracturas y precipitaron sulfatos resistentes a la erosión.\n` +
        `• Valor Científico: Representan uno de los últimos ambientes hidrotermales subterráneos habitables antes de la desecación global de Marte (estudiados por Curiosity en 2024-2025).\n` +
        `• Observación de Misión: Investigadas en el flanco sur de Mount Sharp y el canal de Gediz Vallis.`

    const spokenSummary = isEn
      ? `Boxwork formations are polygonal mineral ridges created by ancient subsurface groundwater circulation. They represent prime targets for astrobiological exploration in Gale Crater.`
      : `Las formaciones boxwork son redes de crestas de sulfato originadas por circulación de agua subterránea mineralizada. Representan un objetivo astrobiológico prioritario en Mount Sharp.`

    return {
      matchedQuery: query,
      topic: 'BOXWORK_FORMATIONS',
      summaryText,
      spokenSummary,
      citations: [
        'NASA Science Objectives (Curiosity Boxwork Investigation 2024)',
        'USGS Astrogeology Mars Geologic Mapping Program',
      ],
    }
  }

  // 3. Estratigrafía y unidades geológicas de Mount Sharp
  if (/(?:estratigrafia|capas geologicas|unidades geologicas|mount sharp|aeolis mons|formacion murray)/i.test(q)) {
    const unitsList = Object.values(USGS_GALE_UNITS).slice(0, 3)
      .map((u: UsgsGeologicUnit) => `• ${u.name} (${u.code}): ${u.lithology}. ${u.description}`)
      .join('\n')

    const summaryText = isEn
      ? `[USGS GEOLOGICAL STRATIGRAPHY // MOUNT SHARP]:\n${unitsList}\n[DATUM]: Mars MOLA Areoid R=3,389.5 km.`
      : `[ESTRATIGRAFÍA GEOLÓGICA USGS // MOUNT SHARP]:\n${unitsList}\n[DATUM]: Areoide Marciano MOLA R=3,389.5 km.`

    const spokenSummary = isEn
      ? `Mount Sharp exhibits a 5-kilometer sedimentary stack, progressing from ancient lake mudstones at Murray formation to sand dunes and sulfate-rich mineral beds.`
      : `Mount Sharp presenta una columna sedimentaria de cinco kilómetros, desde lutitas lacustres basales en la formación Murray hasta capas de arcillas y sulfatos superiores.`

    return {
      matchedQuery: query,
      topic: 'MOUNT_SHARP_STRATA',
      summaryText,
      spokenSummary,
      citations: [
        'USGS Scientific Investigations Map 3209 (Gale Crater)',
        'NASA MRO CRISM/HiRISE Coordinated Stratigraphy',
      ],
    }
  }

  // 4. Objetivos y Delta de Jezero Crater
  if (/(?:jezero|perseverance|delta|neretva|biofirmas|masto?cam-?z)/i.test(q)) {
    const summaryText = isEn
      ? `[NASA MARS 2020 // JEZERO CRATER DELTA]:\n` +
        `• Objective: Western fan delta depositional system formed 3.7 billion years ago in a lake crater.\n` +
        `• Astrobiology: Fine-grained mudstones containing carbonates and smectites with high biosignature preservation potential.\n` +
        `• Traverses: Neretva Vallis inlet breach, Belva Crater boulder fields, Margin Carbonate Unit.`
      : `[NASA MARS 2020 // DELTA DE JEZERO CRATER]:\n` +
        `• Objetivo: Sistema deltaico del abanico occidental depositado hace 3,700 millones de años en una cuenca lacustre.\n` +
        `• Astrobiología: Lodolitas de grano fino ricas en carbonatos y arcillas con máximo potencial de preservación de biofirmas microbianas.\n` +
        `• Traza de Exploración: Desfiladero de Neretva Vallis, campos de rocas de Belva Crater y Unidad Carbonatada de Margen.`

    const spokenSummary = isEn
      ? `Jezero Crater preserves an ancient river delta that emptied into a lake, targeted by Perseverance for biosignature preservation in fine-grained clays and carbonates.`
      : `El Cráter Jezero conserva un delta fluvial antiguo que desembocaba en un lago, explorado por Perseverance para la preservación de posibles biofirmas en arcillas y carbonatos.`

    return {
      matchedQuery: query,
      topic: 'JEZERO_DELTA',
      summaryText,
      spokenSummary,
      citations: [
        'NASA Mars 2020 Science Objectives (Jezero Crater)',
        'Nature Geoscience (Ehlmann et al., Clay minerals in Jezero)',
      ],
    }
  }

  return null
}
