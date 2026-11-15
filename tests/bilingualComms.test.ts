import { describe, it, expect } from 'vitest'
import {
  BILINGUAL_MISSION_COMMANDS,
  checkLanguageSwitchCommand,
  detectTextLanguage,
  resolveBilingualTool,
  repairAcousticHallucinations,
} from '../src/features/voice/bilingualCommandRegistry'
import { COMMS_TRANSLATIONS } from '../src/features/i18n/commsTranslations'

describe('Bilingual Mission Comms & Language Detection', () => {
  it('contains valid command definitions for both English and Spanish', () => {
    expect(BILINGUAL_MISSION_COMMANDS.length).toBeGreaterThan(5)

    for (const cmd of BILINGUAL_MISSION_COMMANDS) {
      expect(cmd.tool).toBeDefined()
      expect(cmd.phrases.en.length).toBeGreaterThan(0)
      expect(cmd.phrases.es.length).toBeGreaterThan(0)
    }
  })

  it('detects spoken language switch requests accurately', () => {
    // English switch requests
    expect(checkLanguageSwitchCommand('Switch to English')).toBe('en')
    expect(checkLanguageSwitchCommand('ARES, speak English please')).toBe('en')
    expect(checkLanguageSwitchCommand('change to english language')).toBe('en')

    // Spanish switch requests
    expect(checkLanguageSwitchCommand('Cambiar a español')).toBe('es')
    expect(checkLanguageSwitchCommand('ARES, hablá en español')).toBe('es')
    expect(checkLanguageSwitchCommand('cambia el idioma a español')).toBe('es')

    // Normal command does not trigger language switch
    expect(checkLanguageSwitchCommand('Enfocá Mount Sharp')).toBeNull()
    expect(checkLanguageSwitchCommand('Show geological layers')).toBeNull()
  })

  it('infers text language using heuristic analysis', () => {
    expect(detectTextLanguage('Hello ARES focus on Mount Sharp and show elevation')).toBe('en')
    expect(detectTextLanguage('Hola ARES mostrá las capas geológicas y calculá la ruta')).toBe('es')
    expect(detectTextLanguage('Plan an EVA route to the ancient delta')).toBe('en')
    expect(detectTextLanguage('Activá la capa térmica THEMIS para ver variaciones')).toBe('es')
  })

  it('resolves bilingual spoken commands to corresponding tactical tools', () => {
    // English phrases
    const enFocus = resolveBilingualTool('Focus on Mount Sharp')
    expect(enFocus?.tool).toBe('focusGeographicTarget')
    expect(enFocus?.params).toEqual({ targetName: 'Mount Sharp' })

    const enThemis = resolveBilingualTool('activate themis')
    expect(enThemis?.tool).toBe('toggleScientificLayer')
    expect(enThemis?.params).toEqual({ layerId: 'themis', enabled: true })

    const enEva = resolveBilingualTool('plan an eva route')
    expect(enEva?.tool).toBe('previewEVARoute')

    // Spanish phrases
    const esFocus = resolveBilingualTool('Enfocá Mount Sharp')
    expect(esFocus?.tool).toBe('focusGeographicTarget')

    const esThemis = resolveBilingualTool('Activá themis')
    expect(esThemis?.tool).toBe('toggleScientificLayer')

    const esGeology = resolveBilingualTool('mostrá las capas geológicas')
    expect(esGeology?.tool).toBe('toggleScientificLayer')
    expect(esGeology?.params).toEqual({ layerId: 'geology', enabled: true })
  })

  it('repairs acoustic hallucinations and resolves distorted speech to correct tools', () => {
    // Caso reportado en producción: "la capa mamá no soy psicópata" -> "la capa mosaico CTX"
    const repairedCtx = repairAcousticHallucinations('la capa mamá no soy psicópata')
    expect(repairedCtx).toBe('la capa mosaico CTX')

    const resolvedCtx = resolveBilingualTool('la capa mamá no soy psicópata')
    expect(resolvedCtx?.tool).toBe('toggleScientificLayer')
    expect(resolvedCtx?.params).toEqual({ layerId: 'ctx', enabled: true })

    // "mosaico se te equis" -> "mosaico CTX"
    const repairedSeTeEquis = repairAcousticHallucinations('activar mosaico se te equis')
    expect(repairedSeTeEquis).toBe('activar mosaico CTX')
    const resolvedSeTeEquis = resolveBilingualTool('activar mosaico se te equis')
    expect(resolvedSeTeEquis?.tool).toBe('toggleScientificLayer')
    expect(resolvedSeTeEquis?.params).toEqual({ layerId: 'ctx', enabled: true })

    // THEMIS distorsión "inercia térmica tenis" -> "inercia térmica THEMIS"
    const repairedThemis = repairAcousticHallucinations('activar inercia térmica tenis')
    expect(repairedThemis).toBe('activar inercia térmica THEMIS')
    const resolvedThemis = resolveBilingualTool('activar inercia térmica tenis')
    expect(resolvedThemis?.tool).toBe('toggleScientificLayer')
    expect(resolvedThemis?.params).toEqual({ layerId: 'themis', enabled: true })
  })

  it('has complete dictionaries for both English and Spanish', () => {
    const en = COMMS_TRANSLATIONS.en
    const es = COMMS_TRANSLATIONS.es

    expect(en.headerTitle).toBe('ARES COPILOT')
    expect(es.headerTitle).toBe('ARES COPILOT')
    expect(en.suggestedCommands.length).toBeGreaterThan(4)
    expect(es.suggestedCommands.length).toBe(en.suggestedCommands.length)

    // Check states translation completeness
    const states = ['VOICE_OFFLINE', 'LISTENING', 'PROCESSING', 'SPEAKING', 'ERROR'] as const
    for (const st of states) {
      expect(en.states[st]).toBeDefined()
      expect(es.states[st]).toBeDefined()
    }
  })

  it('resolves voice commands for all top HUD actions and tactical dock buttons', () => {
    // 1. [GUÍA]
    expect(resolveBilingualTool('abrir guía')?.tool).toBe('openGuidedTour')
    expect(resolveBilingualTool('start guided tour')?.tool).toBe('openGuidedTour')

    // 2. [SOBREVUELO]
    expect(resolveBilingualTool('iniciar sobrevuelo')?.tool).toBe('startDiscoveryTour')
    expect(resolveBilingualTool('flyover mode')?.tool).toBe('startDiscoveryTour')

    // 3. [DESCENSO EDL]
    expect(resolveBilingualTool('descenso EDL')?.tool).toBe('triggerEDLDescent')
    expect(resolveBilingualTool('simulate landing descent')?.tool).toBe('triggerEDLDescent')

    // 4. [ÓRBITA]
    expect(resolveBilingualTool('ascender a órbita')?.tool).toBe('triggerOrbitAscent')
    expect(resolveBilingualTool('orbit view')?.tool).toBe('triggerOrbitAscent')

    // 5. [LZ-1 BASE]
    expect(resolveBilingualTool('enfocar base LZ-1')?.tool).toBe('focusBaseLZ1')
    expect(resolveBilingualTool('focus lz-1 base')?.tool).toBe('focusBaseLZ1')

    // 6. [PANORAMA]
    expect(resolveBilingualTool('ver panorama 360')?.tool).toBe('triggerPanoramaColony')
    expect(resolveBilingualTool('colony panorama')?.tool).toBe('triggerPanoramaColony')

    // 7. [DATOS NASA] / [CENTRO CIENTÍFICO ARES]
    expect(resolveBilingualTool('abrir datos NASA')?.tool).toBe('openDataCenter')
    expect(resolveBilingualTool('abrir centro científico ARES')?.tool).toBe('openDataCenter')

    // 8. [FOTOS RAW] / [INTELIGENCIA DE SUPERFICIE]
    expect(resolveBilingualTool('ver fotos raw')?.tool).toBe('openSurfaceIntelligence')
    expect(resolveBilingualTool('abrir inteligencia de superficie')?.tool).toBe('openSurfaceIntelligence')

    // 9. [GLOBO 3D] y [JEZERO 2D]
    expect(resolveBilingualTool('globo 3d')?.tool).toBe('switchScreenView')
    expect(resolveBilingualTool('jezero 2d')?.tool).toBe('switchScreenView')

    // 10. [LIMPIAR]
    expect(resolveBilingualTool('modo pantalla limpia')?.tool).toBe('setCleanViewMode')
    expect(resolveBilingualTool('clean hud view')?.tool).toBe('setCleanViewMode')

    // 11. [COMPARAR MISIONES]
    expect(resolveBilingualTool('comparar misiones')?.tool).toBe('compareMissionRoutes')

    // 12. [VISTA: AMBAS RUTAS]
    expect(resolveBilingualTool('ver ambas rutas')?.params).toEqual({ mode: 'both' })
    expect(resolveBilingualTool('solo ruta eva')?.params).toEqual({ mode: 'eva' })
    expect(resolveBilingualTool('solo curiosity')?.params).toEqual({ mode: 'curiosity' })
    expect(resolveBilingualTool('alternar rutas')?.params).toEqual({ mode: 'toggle' })

    // 13. [◀] / [▶] Consola de Control Táctico
    expect(resolveBilingualTool('colapsar consola táctica')?.params).toEqual({ collapsed: true })
    expect(resolveBilingualTool('expandir consola táctica')?.params).toEqual({ collapsed: false })

    // 14. Pestañas de la Consola Táctica
    expect(resolveBilingualTool('pestaña capas científicas')?.params).toEqual({ tab: 'layers' })
    expect(resolveBilingualTool('pestaña cámara')?.params).toEqual({ tab: 'camera' })
    expect(resolveBilingualTool('pestaña base alfa 3d')?.params).toEqual({ tab: 'colony' })

    // 15. Las 8 Capas Científicas completas
    expect(resolveBilingualTool('fotografía orbital satelital real')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('mosaico controlado CTX gale')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('inercia térmica superficial')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('contexto geológico y estratigrafía')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('unidades mineralógicas y espectrales')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('modelo digital de elevación hipsométrica')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('análisis de pendientes y seguridad de locomoción EVA')?.tool).toBe('toggleScientificLayer')
    expect(resolveBilingualTool('dosimetría de radiación en superficie')?.tool).toBe('toggleScientificLayer')
  })
})
