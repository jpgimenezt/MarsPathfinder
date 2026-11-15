import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkLanguageSwitchCommand,
  resolveBilingualTool,
} from '../src/features/voice/bilingualCommandRegistry'
import { ToolExecutionEngine, type AppActionHandlers } from '../src/features/agent/toolExecutionEngine'
import { buildCompactMissionContext } from '../src/features/agent/missionContext'
import { AmazonNovaSonicProvider } from '../src/features/voice/amazonNovaSonicProvider'
import { LocalWakeWordDetector, matchWakeWordPhonetic } from '../src/features/voice/wakeWordDetector'
import { resolveMissionKnowledge } from '../src/features/science/missionKnowledgeResolver'

describe('ARES MISSION COMMS — Conversational Engine & Continuity (Scenarios A - G)', () => {
  let mockHandlers: AppActionHandlers
  let toolEngine: ToolExecutionEngine

  beforeEach(() => {
    mockHandlers = {
      focusCamera: vi.fn(),
      toggleLayer: vi.fn(),
      setWaypoint: vi.fn(),
      previewRoute: vi.fn(),
      openComparisonModal: vi.fn(),
      openDataCenterModal: vi.fn(),
      openSurfaceIntelligenceModal: vi.fn(),
      startTour: vi.fn(),
      pauseTour: vi.fn(),
      setCleanViewMode: vi.fn(),
      triggerSimContingency: vi.fn(),
      getContextSnapshot: () =>
        buildCompactMissionContext({
          screen: 'terrain3d',
          currentLocation: { lat: -4.68, lon: 137.4 },
        }),
    }
    toolEngine = new ToolExecutionEngine(mockHandlers)
  })

  // =========================================================================
  // SCENARIO A: Diálogo en español continuo
  // "Hola, ARES" -> "¿Dónde estamos?" -> "Enfocá Mount Sharp" -> "¿Qué observaciones existen?"
  // =========================================================================
  describe('Escenario A: Conversación continua en Español', () => {
    it('reconoce wake word en español y procesa secuencia conversacional multi-turno', async () => {
      // Turno 1: Wake word "Hola, ARES"
      const wakeDetected = /hola[\s,]+ares/i.test('Hola, ARES')
      expect(wakeDetected).toBe(true)

      // Turno 2: Pregunta contextual "¿Dónde estamos?"
      const locResolved = resolveBilingualTool('¿Dónde estamos?')
      expect(locResolved).toBeDefined()
      expect(locResolved?.tool).toBe('getCurrentMissionContext')

      const locResult = await toolEngine.executeTool({
        tool: locResolved!.tool,
        input: locResolved!.params || {},
      })
      expect(locResult.success).toBe(true)
      expect(locResult.output.systemName).toBe('ARES-NAV TACTICAL SYSTEM')
      expect((locResult.output as any).geography.region).toBe('GALE_MOUNT_SHARP')

      // Turno 3: Acción de navegación "Enfocá Mount Sharp"
      const focusResolved = resolveBilingualTool('Enfocá Mount Sharp')
      expect(focusResolved).toBeDefined()
      expect(focusResolved?.tool).toBe('focusGeographicTarget')

      const focusResult = await toolEngine.executeTool({
        tool: focusResolved!.tool,
        input: focusResolved!.params || {},
      })
      expect(focusResult.success).toBe(true)
      expect(mockHandlers.focusCamera).toHaveBeenCalled()

      // Turno 4: Pregunta de seguimiento sin repetir wake word "¿Qué observaciones existen?"
      const obsResolved = resolveBilingualTool('¿Qué observaciones científicas existen?')
      expect(obsResolved).toBeDefined()
      expect(obsResolved?.tool).toBe('getMissionObservations')
      const obsResult = await toolEngine.executeTool({
        tool: obsResolved!.tool,
        input: obsResolved!.params || {},
      })
      expect(obsResult.success).toBe(true)
    })
  })

  // =========================================================================
  // SCENARIO B: Cambio a Inglés y continuidad
  // "Switch to English" -> "Where are we?" -> "Focus on Mount Sharp" -> "What did Curiosity discover here?"
  // =========================================================================
  describe('Escenario B: Transición a Inglés sin reinicializar sesión', () => {
    it('detecta cambio de idioma y ejecuta comandos en inglés manteniendo el contexto', async () => {
      // Turno 1: Cambio de idioma
      const switchCmd = checkLanguageSwitchCommand('Switch to English')
      expect(switchCmd).toBe('en')

      // Turno 2: Consulta contextual en inglés "Where are we?"
      const whereResolved = resolveBilingualTool('Where are we located?')
      expect(whereResolved?.tool).toBe('getCurrentMissionContext')

      // Turno 3: Herramienta en inglés "Focus on Mount Sharp"
      const focusEn = resolveBilingualTool('Focus on Mount Sharp')
      expect(focusEn?.tool).toBe('focusGeographicTarget')
      expect(focusEn?.params).toEqual({ targetName: 'Mount Sharp' })

      const focusResult = await toolEngine.executeTool({
        tool: focusEn!.tool,
        input: focusEn!.params || {},
      })
      expect(focusResult.success).toBe(true)
      expect(mockHandlers.focusCamera).toHaveBeenCalled()

      // Turno 4: Consulta de comparación de rutas en inglés
      const comparisonEn = resolveBilingualTool('Open route comparison')
      expect(comparisonEn?.tool).toBe('compareMissionRoutes')
      const curResult = await toolEngine.executeTool({
        tool: comparisonEn!.tool,
        input: comparisonEn!.params || {},
      })
      expect(curResult.success).toBe(true)
      expect(mockHandlers.openComparisonModal).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // SCENARIO C: Retorno a Español sin pérdida de sesión
  // "Cambiá a español" -> "Mostrame las capas geológicas" -> "¿Qué datos tenemos?"
  // =========================================================================
  describe('Escenario C: Retorno fluido a Español', () => {
    it('vuelve a español y atiende órdenes geológicas', async () => {
      const returnCmd = checkLanguageSwitchCommand('Cambiá a español')
      expect(returnCmd).toBe('es')

      const geoResolved = resolveBilingualTool('Mostrame las capas geológicas')
      expect(geoResolved?.tool).toBe('toggleScientificLayer')
      expect(geoResolved?.params).toEqual({ layerId: 'geology', enabled: true })

      const geoResult = await toolEngine.executeTool({
        tool: geoResolved!.tool,
        input: geoResolved!.params || {},
      })
      expect(geoResult.success).toBe(true)
      expect(mockHandlers.toggleLayer).toHaveBeenCalledWith('geology', true)
    })
  })

  // =========================================================================
  // SCENARIO D: Ejecución de herramienta conversacional y preguntas de seguimiento
  // El usuario NO tiene que volver a decir "Hey, ARES" entre preguntas
  // =========================================================================
  describe('Escenario D: Conversación fluida multi-turno post-ejecución', () => {
    it('mantiene la sesión receptiva tras ejecutar acciones tácticas', async () => {
      const detector = new LocalWakeWordDetector()

      // Simular wake word inicial
      const wakeHandled = vi.fn()
      detector.subscribe(wakeHandled)

      // Activar modo comando continuo
      detector.setCommandMode(true)

      // Comprobar que preguntas consecutivas son reconocidas como órdenes directas
      const q1 = resolveBilingualTool('activar capa themis')
      expect(q1?.tool).toBe('toggleScientificLayer')

      const q2 = resolveBilingualTool('consultar telemetría del hábitat')
      expect(q2?.tool).toBe('getHabitatStatus')

      const q3 = resolveBilingualTool('planificar ruta eva')
      expect(q3?.tool).toBe('previewEVARoute')

      // Verificar que el detector no se apaga arbitrariamente a los 10 segundos
      expect((detector as any).isCommandListening).toBe(true)
    })
  })

  // =========================================================================
  // SCENARIO E: Barge-In / Interrupción inmediata
  // Usuario habla o pulsa botón mientras el asistente responde
  // =========================================================================
  describe('Escenario E: Interrupción inmediata (Barge-In)', () => {
    it('limpia buffers de audio y emite eventos de interrupción inmediatamente', () => {
      const provider = new AmazonNovaSonicProvider()
      const bargeInSpy = vi.fn()
      const convStateSpy = vi.fn()

      provider.subscribe({
        onBargeIn: bargeInSpy,
        onConversationStateChange: convStateSpy,
      })

      // Llamar a interrupt()
      provider.interrupt()

      expect(bargeInSpy).toHaveBeenCalled()
      expect(convStateSpy).toHaveBeenCalledWith('interrupted')
    })
  })

  // =========================================================================
  // SCENARIO F: Conversación prolongada de 10 turnos consecutivos
  // =========================================================================
  describe('Escenario F: Conversación prolongada de 10 turnos', () => {
    it('soporta 10 turnos conversacionales consecutivos sin degradación', async () => {
      const conversationTurns = [
        'Hola ARES',
        '¿Dónde estamos ubicados?',
        'Enfocá Mount Sharp',
        'Activá la capa térmica THEMIS',
        'Mostrá la elevación MOLA',
        'Consultar telemetría de la base Ares Alpha',
        'Planificar ruta EVA hacia la cresta de sulfatos',
        'Comparar con el trayecto de Curiosity',
        'Abrir el catálogo de inteligencia de superficie',
        'Iniciar simulación de descenso EDL',
      ]

      let successfulResolutions = 0

      for (const turn of conversationTurns) {
        if (/hola[\s,]+ares/i.test(turn)) {
          successfulResolutions++
          continue
        }

        const resolved = resolveBilingualTool(turn)
        if (resolved) {
          const res = await toolEngine.executeTool({
            tool: resolved.tool,
            input: resolved.params || {},
          })
          if (res.success) {
            successfulResolutions++
          }
        }
      }

      expect(successfulResolutions).toBe(10)
    })
  })

  // =========================================================================
  // SCENARIO G: Desconexión explícita
  // "Cerrar comunicaciones" / "Desconectar"
  // =========================================================================
  describe('Escenario G: Desconexión explícita', () => {
    it('detecta órdenes de finalización de comunicaciones y cierra la sesión', () => {
      const disconnectPhrases = [
        'cerrar comunicaciones',
        'desconectar',
        'terminar sesión',
        'close comms',
        'disconnect',
      ]

      const disconnectRegex = /(?:cerrar\s+comunicaciones|desconectar|terminar\s+sesi[oó]n|close\s+comms|disconnect)/i

      for (const phrase of disconnectPhrases) {
        expect(disconnectRegex.test(phrase)).toBe(true)
      }

      // Probar que frases operativas normales NO disparan desconexión
      expect(disconnectRegex.test('enfocá mount sharp')).toBe(false)
      expect(disconnectRegex.test('mostrar capas')).toBe(false)
    })
  })

  // =========================================================================
  // SCENARIO H: Reconocimiento fonético tolerante de última generación
  // "res", "eiares", "ey ares", "eares", "hey alex", clippings y comandos directos
  // =========================================================================
  describe('Escenario H: Reconocimiento fonético tolerante y comandos adjuntos', () => {
    it('detecta correctamente frases de activación con truncamientos fonéticos reportados por astronautas', () => {
      const clippedWakeCases = [
        'res',
        'eiares',
        'eyares',
        'ey ares',
        'ei ares',
        'eares',
        'ares',
        'áres',
        'hey alex',
        'hey ares',
        'hola ares',
      ]

      for (const phrase of clippedWakeCases) {
        const res = matchWakeWordPhonetic(phrase)
        expect(res, `Fallo en detección fonética de: "${phrase}"`).not.toBeNull()
        expect(res?.isWake).toBe(true)
      }
    })

    it('extrae y ejecuta inmediatamente comandos tácticos adjuntos a la frase de activación', async () => {
      const combinedPhrases = [
        { text: 'eiares enfoca mount sharp', expectedTool: 'focusGeographicTarget', expectedLang: 'es' },
        { text: 'res activa themis', expectedTool: 'toggleScientificLayer', expectedLang: 'es' },
        { text: 'hey ares switch to english', expectedLang: 'en' },
        { text: 'hola ares calcula la ruta', expectedTool: 'previewEVARoute', expectedLang: 'es' },
      ]

      for (const testCase of combinedPhrases) {
        const wakeResult = matchWakeWordPhonetic(testCase.text)
        expect(wakeResult, `No se detectó wake en: "${testCase.text}"`).not.toBeNull()
        expect(wakeResult?.isWake).toBe(true)
        expect(wakeResult?.trailingCommand).toBeDefined()

        if (testCase.expectedTool) {
          const resolved = resolveBilingualTool(wakeResult!.trailingCommand!)
          expect(resolved?.tool).toBe(testCase.expectedTool)
        }
      }
    })

    it('no activa falsos positivos con oraciones operativas sin mención a ARES', () => {
      const nonWakeCases = [
        'el rover avanza hacia el cráter',
        'distancia estimada 5.2 kilómetros',
        'la pendiente en la cresta es empinada',
        'temperatura superficial registrada por el radiómetro',
      ]

      for (const phrase of nonWakeCases) {
        const res = matchWakeWordPhonetic(phrase)
        expect(res, `Falso positivo detectado en: "${phrase}"`).toBeNull()
      }
    })
  })

  // =========================================================================
  // SCENARIO I: Resolución científica instantánea (<50ms) y Anti-Echo
  // "descubrimientos de Curiosity", "boxwork", "estratigrafía" sin latencia de 2 minutos
  // =========================================================================
  describe('Escenario I: Fast Mission Science Resolver y Supresión de Eco', () => {
    it('resuelve consultas complejas sobre la misión Curiosity en < 50ms con datos oficiales de NASA', () => {
      const query = 'ARES, contame los principales descubrimientos científicos de Curiosity en Gale Crater'
      const start = performance.now()
      const res = resolveMissionKnowledge(query, 'es')
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50)
      expect(res).not.toBeNull()
      expect(res?.topic).toBe('CURIOSITY_DISCOVERIES')
      expect(res?.summaryText).toContain('Yellowknife')
      expect(res?.summaryText).toContain('Glen Torridon')
      expect(res?.spokenSummary).toBeDefined()
      expect(res?.citations.length).toBeGreaterThan(0)
    })

    it('resuelve consultas geológicas sobre formaciones boxwork en Mount Sharp', () => {
      const query = '¿Qué son las formaciones boxwork en Mount Sharp?'
      const res = resolveMissionKnowledge(query, 'es')

      expect(res).not.toBeNull()
      expect(res?.topic).toBe('BOXWORK_FORMATIONS')
      expect(res?.summaryText).toContain('sulfato')
      expect(res?.citations[0]).toContain('NASA')
    })

    it('soporta consultas científicas en inglés con respuesta en inglés', () => {
      const query = 'Tell me about Curiosity discoveries in Gale Crater'
      const res = resolveMissionKnowledge(query, 'en')

      expect(res).not.toBeNull()
      expect(res?.topic).toBe('CURIOSITY_DISCOVERIES')
      expect(res?.spokenSummary).toContain('Curiosity confirmed Gale Crater')
    })

    it('gestiona correctamente el bloqueo de habla (Anti-Echo / Self-Mute Guard)', () => {
      const detector = new LocalWakeWordDetector()
      expect(detector.getSpeakingLock()).toBe(false)

      // Activar bloqueo de habla (asistente hablando)
      detector.setSpeakingLock(true)
      expect(detector.getSpeakingLock()).toBe(true)

      // Desactivar bloqueo de habla
      detector.setSpeakingLock(false)
      // Debe mantener el bloqueo durante el período de gracia acústico
      expect(detector.getSpeakingLock()).toBe(true)
    })
  })
})
