import { describe, it, expect } from 'vitest'
import {
  BILINGUAL_MISSION_COMMANDS,
  checkLanguageSwitchCommand,
  detectTextLanguage,
  resolveBilingualTool,
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
})
