/**
 * ARES MISSION COMMS — ADAPTIVE FLOATING ASSISTANT
 * Compact UI · Voice Orb · Non-blocking Interaction
 * 
 * - Idioma predeterminado: ESPAÑOL (es-US) en UI, motor de voz y system prompt.
 * - Reconocimiento bilingüe continuo con comprensión semántica y normalización léxica.
 * - Sesión conversacional persistente: multi-turno continuo sin reactivar "Hola ARES" tras cada respuesta.
 * - Soporte de interrupciones (Barge-In) con vaciado inmediato de buffers de audio.
 * - Conmutación fluida entre inglés y español sin destruir la sesión de Nova Sonic.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import type { MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'
import {
  type VoiceState,
  type ConnectionState,
  type ConversationState,
  type PresentationMode,
  type InteractionMode,
  type TranscriptEvent,
} from '../features/voice/voiceProvider'
import {
  AudioCaptureService,
  type RealtimeAudioMetrics,
  type AudioCaptureTelemetry,
} from '../features/voice/audioCaptureService'
import { AmazonNovaSonicProvider } from '../features/voice/amazonNovaSonicProvider'
import {
  ToolExecutionEngine,
  type AppActionHandlers,
  type ToolExecutionRequest,
} from '../features/agent/toolExecutionEngine'
import { buildCompactMissionContext, type MissionContextInput } from '../features/agent/missionContext'
import { JarvisAiCore } from './AresAgentChat'
import { queryMarsAgent } from '../features/agent/marsAgentService'
import {
  COMMS_TRANSLATIONS,
  type SupportedLanguage,
  type LanguageSelection,
} from '../features/i18n/commsTranslations'
import {
  LocalWakeWordDetector,
  type WakeWordEvent,
  speakLocalSpeech,
} from '../features/voice/wakeWordDetector'
import {
  checkLanguageSwitchCommand,
  resolveBilingualTool,
  repairAcousticHallucinations,
} from '../features/voice/bilingualCommandRegistry'
import { resolveMissionKnowledge } from '../features/science/missionKnowledgeResolver'
import '../styles/missionComms.css'

interface PendingConfirmationState {
  id: string
  tool: string
  message: string
  securityLevel: number
}

interface AresMissionCommsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  appHandlers: AppActionHandlers
  contextInput: MissionContextInput
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
}

// Iconografía vectorial SVG aeroespacial
const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const StopSquareIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
)

export function AresMissionCommsModal({
  isOpen,
  onClose,
  onOpen,
  appHandlers,
  contextInput,
  currentStops,
}: AresMissionCommsModalProps) {
  // 1. Separación clara de estados (Sección 8)
  const [presentationMode, setPresentationMode] = useState<PresentationMode>(isOpen ? 'compact' : 'orb')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected')
  const [conversationState, setConversationState] = useState<ConversationState>('standby')
  const [voiceState, setVoiceState] = useState<VoiceState>('LISTENING')

  // 2. Idioma predeterminado: ESPAÑOL en todos los niveles (Sección 1 y 3)
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>('es')
  const [responseLanguage, setResponseLanguage] = useState<SupportedLanguage>('es')
  const [uiLanguage, setUiLanguage] = useState<SupportedLanguage>('es')
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection>('es')

  // 3. Voces naturales de Amazon Nova 2.5 Sonic (carlos para español, matthew para inglés)
  const [selectedVoice, setSelectedVoice] = useState<'carlos' | 'lupe' | 'matthew' | 'tiffany'>('carlos')
  const [isWakeWordActive, setIsWakeWordActive] = useState<boolean>(true)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('HANDS_FREE')
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [inputMessage, setInputMessage] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmationState | null>(null)

  // Subtítulo / caption flotante holográfico para el orbe
  const [floatingSubtitle, setFloatingSubtitle] = useState<{
    text: string
    role: 'user' | 'assistant'
    timestamp: number
  } | null>(null)

  // Información de ejecución activa para el modo minimizado
  const [currentExecutionInfo, setCurrentExecutionInfo] = useState<{
    action: string
    description: string
  } | null>(null)

  // Telemetría acústica de Web Audio API en tiempo real (RMS, Peak, VAD y Osciloscopio)
  const [audioMetrics, setAudioMetrics] = useState<RealtimeAudioMetrics>({
    rms: 0,
    peak: 0,
    db: -60,
    isVoiceActive: false,
    timeDomainData: new Uint8Array(128),
    frequencyData: new Uint8Array(32),
    source: 'idle',
    smoothedLevel: 0,
  })
  const [telemetry, setTelemetry] = useState<AudioCaptureTelemetry | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false)

  const t = COMMS_TRANSLATIONS[uiLanguage]

  // Historial conversacional inicializado en español por defecto
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      text: COMMS_TRANSLATIONS.es.welcomeMessage,
      isFinal: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ])

  const providerRef = useRef<AmazonNovaSonicProvider | null>(null)
  const toolEngineRef = useRef<ToolExecutionEngine | null>(null)
  const wakeWordDetectorRef = useRef<LocalWakeWordDetector | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const transcriptsEndRef = useRef<HTMLDivElement | null>(null)
  const textInputRef = useRef<HTMLInputElement | null>(null)
  const subtitleTimeoutRef = useRef<any>(null)
  const inputId = useId()

  // Referencias estables para evitar re-render thrashing en el detector de voz
  const transcriptsRef = useRef<TranscriptEvent[]>(transcripts)
  transcriptsRef.current = transcripts
  const responseLanguageRef = useRef<SupportedLanguage>(responseLanguage)
  responseLanguageRef.current = responseLanguage
  const executeCommandRef = useRef<((cmd: string) => Promise<void>) | null>(null)
  const handleInterruptRef = useRef<() => void>(() => {})
  const handleDisconnectRef = useRef<() => void>(() => {})
  const showSubtitleRef = useRef<(text: string, role?: 'user' | 'assistant', durationMs?: number) => void>(() => {})

  // Sincronizar isOpen de props con el modo de presentación
  useEffect(() => {
    if (isOpen && presentationMode === 'orb') {
      setPresentationMode('compact')
    }
  }, [isOpen])

  // Desvanecer subtítulo flotante tras periodo de silencio
  const showSubtitle = useCallback((text: string, role: 'user' | 'assistant' = 'assistant', durationMs = 5000) => {
    if (!text || !text.trim()) return
    setFloatingSubtitle({ text, role, timestamp: Date.now() })
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current)
    subtitleTimeoutRef.current = setTimeout(() => {
      setFloatingSubtitle(null)
    }, durationMs)
  }, [])
  showSubtitleRef.current = showSubtitle

  // =========================================================================
  // COMPUERTA DE PRIORIDAD INTELIGENTE (SMART AUDIO PRIORITY GATE)
  // =========================================================================
  const isNovaSonicOnline = useCallback(() => {
    return Boolean(
      providerRef.current &&
      connectionState === 'connected' &&
      voiceState !== 'VOICE_OFFLINE' &&
      voiceState !== 'ERROR'
    )
  }, [connectionState, voiceState])

  /**
   * Compuerta de Prioridad Inteligente:
   * Cuando Nova Sonic está en línea y conectado, speakLocalSpeech SE SILENCIA AL 100%.
   * De esta forma, SOLO la voz natural de Nova Sonic (Carlos/Matthew) habla en la cabina.
   * speakLocalSpeech queda estrictamente reservada como contingencia offline cuando Bedrock no está disponible.
   */
  const dispatchAresSpeech = useCallback(
    (
      text: string,
      lang: SupportedLanguage,
      callbacks?: {
        onStart?: () => void
        onEnd?: () => void
        onError?: () => void
      },
      options?: {
        sendToNovaSonicIfOnline?: boolean
      }
    ) => {
      const novaOnline = isNovaSonicOnline()

      if (novaOnline) {
        console.log(`[PRIORITY GATE] Nova Sonic activo. Síntesis local silenciada para: "${text.slice(0, 35)}..."`)
        if (options?.sendToNovaSonicIfOnline && providerRef.current) {
          providerRef.current.sendTextMessage(text).catch(() => {})
        }
        callbacks?.onStart?.()
        callbacks?.onEnd?.()
        return
      }

      // Modo Contingencia Offline: solo cuando Bedrock/Gateway están desconectados
      speakLocalSpeech(text, lang, callbacks)
    },
    [isNovaSonicOnline]
  )

  // Inicializar motor de herramientas con los handlers reales de la aplicación
  useEffect(() => {
    toolEngineRef.current = new ToolExecutionEngine(appHandlers)
  }, [appHandlers])

  // Interrupción inmediata (Barge-In)
  const handleInterrupt = useCallback(() => {
    console.log('[ARES COMMS] Interrupción solicitada por usuario (Barge-In)')
    providerRef.current?.interrupt()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setConversationState('interrupted')
    setTimeout(() => {
      setConversationState('listening')
      wakeWordDetectorRef.current?.setCommandMode(true)
    }, 150)
  }, [])
  handleInterruptRef.current = handleInterrupt

  // Cierre ordenado de comunicaciones (FRASES CORTAS)
  const handleDisconnect = useCallback(() => {
    console.log('[ARES COMMS] Cierre ordenado de sesión de comunicaciones')
    handleInterrupt()
    providerRef.current?.disconnect()
    setConnectionState('disconnected')
    setConversationState('standby')
    setVoiceState('VOICE_OFFLINE')
    setPresentationMode('orb')

    const closeNotice = responseLanguage === 'en'
      ? 'Comms closed. Standing by.'
      : 'Enlace cerrado. En espera.'

    showSubtitle(closeNotice, 'assistant', 3000)
    dispatchAresSpeech(closeNotice, responseLanguage)
    onClose()
  }, [handleInterrupt, responseLanguage, showSubtitle, dispatchAresSpeech, onClose])
  handleDisconnectRef.current = handleDisconnect

  // ==========================================
  // EJECUCIÓN DIRECTA Y MULTITURNO DE COMANDOS
  // ==========================================
  const executeTacticalCommand = useCallback(
    async (commandText: string) => {
      // 0. Reparar alucinaciones acústicas y distorsiones fonéticas de términos de NASA/Marte
      // (ej: "la capa mamá no soy psicópata" -> "la capa mosaico CTX")
      const cleanedCommand = repairAcousticHallucinations(commandText)
      console.log(`[ARES CONVERSATIONAL ENGINE] Turno de usuario recibido: "${commandText}" -> normalizado a: "${cleanedCommand}"`)

      // 1. Registrar mensaje del usuario en el historial
      const userEvt: TranscriptEvent = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: cleanedCommand,
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
      setTranscripts(prev => [...prev, userEvt])
      showSubtitle(cleanedCommand, 'user', 3500)
      setConversationState('processing')

      // 2. Verificar comando explícito de cambio de idioma (Sección 3)
      const requestedLang = checkLanguageSwitchCommand(cleanedCommand)
      if (requestedLang) {
        setResponseLanguage(requestedLang)
        setUiLanguage(requestedLang)
        setActiveLanguage(requestedLang)
        setLanguageSelection(requestedLang)
        wakeWordDetectorRef.current?.setLanguage(requestedLang)

        const nextVoice = requestedLang === 'en' ? 'matthew' : 'carlos'
        setSelectedVoice(nextVoice)
        // Informar a Nova Sonic con la voz natural correspondiente al idioma
        providerRef.current?.updateConfig({ language: requestedLang, voiceId: nextVoice })

        const switchMsg = requestedLang === 'en'
          ? 'Language: English. Ready.'
          : 'Idioma: Español. Listo.'

        setTranscripts(prev => [
          ...prev,
          {
            id: `ai-sw-${Date.now()}`,
            role: 'assistant',
            text: `[SISTEMA]: ${switchMsg}`,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])
        showSubtitle(switchMsg, 'assistant', 3500)
        dispatchAresSpeech(switchMsg, requestedLang, {
          onStart: () => setConversationState('speaking'),
          onEnd: () => setConversationState('awaiting_user'),
        })
        return
      }

      // 3. Resolución semántica y ejecución de herramientas bilingües (Sección 2 y 5)
      const resolved = resolveBilingualTool(cleanedCommand)
      if (resolved && toolEngineRef.current) {
        // Modo minimizado para ver maniobra en el mapa 3D sin obstruir
        setPresentationMode('minimized')
        setConversationState('executing_tool')
        setCurrentExecutionInfo({
          action: resolved.tool,
          description: `Ejecutando ${resolved.tool}...`,
        })

        const req: ToolExecutionRequest = {
          tool: resolved.tool,
          input: resolved.params || {},
        }
        const res = await toolEngineRef.current.executeTool(req)

        const actionText = res.success
          ? res.actionPerformed || (responseLanguage === 'en' ? `Command '${resolved.tool}' completed.` : `Comando '${resolved.tool}' completado.`)
          : (responseLanguage === 'en' ? `Could not execute '${resolved.tool}': ${res.output.error || 'Notice'}` : `No se pudo ejecutar '${resolved.tool}': ${res.output.error || 'Aviso táctico'}`)

        setCurrentExecutionInfo({
          action: resolved.tool,
          description: actionText,
        })

        setTranscripts(prev => [
          ...prev,
          {
            id: `tool-${Date.now()}`,
            role: 'assistant',
            text: `[${responseLanguage === 'en' ? 'TACTICAL ACTION' : 'ACCIÓN TÁCTICA'}]: ${actionText}`,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])

        showSubtitle(actionText, 'assistant', 4000)

        // Síntesis auditiva con compuerta de prioridad (silencia TTS local si Nova Sonic está en línea)
        wakeWordDetectorRef.current?.setSpeakingLock(true)
        dispatchAresSpeech(actionText, responseLanguage, {
          onStart: () => {
            setConversationState('speaking')
            wakeWordDetectorRef.current?.setSpeakingLock(true)
          },
          onEnd: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
            setPresentationMode('orb')
            setCurrentExecutionInfo(null)
          },
          onError: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
            setPresentationMode('orb')
            setCurrentExecutionInfo(null)
          },
        })

        return
      }

      // 4. Resolución científica rápida de NASA / Curiosity / Gale / Boxwork (< 50ms)
      const missionScience = resolveMissionKnowledge(commandText, responseLanguageRef.current)
      if (missionScience) {
        setPresentationMode('orb')
        setConversationState('speaking')

        setTranscripts(prev => [
          ...prev,
          {
            id: `science-${Date.now()}`,
            role: 'assistant',
            text: missionScience.summaryText,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])

        showSubtitle(
          missionScience.spokenSummary.slice(0, 160) + (missionScience.spokenSummary.length > 160 ? '...' : ''),
          'assistant',
          6000
        )

        wakeWordDetectorRef.current?.setSpeakingLock(true)
        dispatchAresSpeech(missionScience.spokenSummary, responseLanguageRef.current, {
          onStart: () => {
            setConversationState('speaking')
            wakeWordDetectorRef.current?.setSpeakingLock(true)
          },
          onEnd: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
            wakeWordDetectorRef.current?.setCommandMode(true)
          },
          onError: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
          },
        })
        return
      }

      // 5. Si Nova Sonic está activo en streaming, enviar por WebSocket
      if (providerRef.current && voiceState === 'LISTENING') {
        try {
          await providerRef.current.sendTextMessage(commandText)
          return
        } catch {}
      }

      // 6. Fallback a agente serverless con timeout táctico de 30s para razonamiento multimisión
      showSubtitle(responseLanguage === 'en' ? 'Consulting orbital satellite telemetry...' : 'Consultando telemetría de satélite en órbita...', 'assistant', 3000)

      try {
        const historyPayload = transcriptsRef.current
          .filter(t => t.id !== 'init-msg')
          .slice(-6)
          .map(t => ({ role: t.role, content: t.text }))

        const res = await queryMarsAgent(commandText, historyPayload, 30000)
        const cleanReply = (res.reply || '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

        setTranscripts(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text: cleanReply,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])

        showSubtitle(cleanReply.slice(0, 160) + (cleanReply.length > 160 ? '...' : ''), 'assistant', 6500)
        wakeWordDetectorRef.current?.setSpeakingLock(true)
        dispatchAresSpeech(cleanReply, responseLanguageRef.current, {
          onStart: () => {
            setConversationState('speaking')
            wakeWordDetectorRef.current?.setSpeakingLock(true)
          },
          onEnd: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
          },
          onError: () => {
            wakeWordDetectorRef.current?.setSpeakingLock(false)
            setConversationState('awaiting_user')
          },
        })
      } catch {
        setConversationState('standby')
      }
    },
    [responseLanguage, voiceState, showSubtitle, dispatchAresSpeech]
  )

  // Mantener referencia actualizada de executeTacticalCommand para el detector sin causar remounts
  executeCommandRef.current = executeTacticalCommand

  // ==========================================
  // CONFIGURAR DETECTOR DE VOZ CONTINUA (STABLE LIFECYCLE)
  // Desacoplado de la pantalla para mantener presencia activa en Gale 3D y Globo
  // ==========================================
  useEffect(() => {
    if (!wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current = new LocalWakeWordDetector()
    }
    const detector = wakeWordDetectorRef.current

    // Despertar con "Hey, ARES" o "Hola, ARES"
    const unsubscribeWake = detector.subscribe((event: WakeWordEvent) => {
      console.log(`[WAKE ACTIVATION] Frase: "${event.phrase}". Comando adjunto: "${event.trailingCommand || ''}"`)

      // El despertar NO altera el idioma de respuesta elegido por el usuario
      setPresentationMode('orb')
      setConversationState('listening')
      setConnectionState('connected')

      const curLang = responseLanguageRef.current
      showSubtitleRef.current(
        curLang === 'en' ? '● ARES Listening... Ask your question or command.' : '● ARES a la escucha... Di tu orden o pregunta.',
        'assistant',
        3500
      )

      // Si el usuario dijo el comando en la misma frase ("Hola ARES, enfocar Mount Sharp...")
      if (event.trailingCommand && event.trailingCommand.trim().length > 1) {
        executeCommandRef.current?.(event.trailingCommand.trim())
      } else {
        // Respuesta vocal inmediata de ARES al detectar el saludo de activación (FRASES CORTAS)
        const ackText = curLang === 'en'
          ? 'ARES online. Standing by.'
          : 'ARES en línea. A la escucha.'

        setTranscripts(prev => [
          ...prev,
          {
            id: `ai-wake-${Date.now()}`,
            role: 'assistant',
            text: ackText,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])
        showSubtitleRef.current(ackText, 'assistant', 3000)

        // Compuerta de prioridad anti-eco: silencia TTS local si Nova Sonic está en línea
        detector.setSpeakingLock(true)
        dispatchAresSpeech(
          ackText,
          curLang,
          {
            onStart: () => {
              setConversationState('speaking')
              detector.setSpeakingLock(true)
            },
            onEnd: () => {
              detector.setSpeakingLock(false)
              setConversationState('listening')
              detector.setCommandMode(true)
            },
            onError: () => {
              detector.setSpeakingLock(false)
              setConversationState('listening')
              detector.setCommandMode(true)
            },
          },
          { sendToNovaSonicIfOnline: true }
        )
      }
    })

    // Interrupción por comando vocal ("detener", "para", "stop", "silencio")
    const unsubscribeInterrupt = detector.subscribeInterrupt(() => {
      console.log('[ARES COMMS] Interrupción vocal recibida (Barge-In)')
      handleInterruptRef.current()
    })

    // Escucha continua de comandos
    const unsubscribeCommand = detector.subscribeCommand((command: string) => {
      console.log(`[CONTINUOUS VOICE COMMAND CAPTURED] "${command}"`)
      executeCommandRef.current?.(command)
    })

    // Desconexión explícita por voz ("Cerrar comunicaciones")
    const unsubscribeDisconnect = detector.subscribeDisconnect(() => {
      handleDisconnectRef.current()
    })

    if (isWakeWordActive) {
      detector.start()
    } else {
      detector.stop()
    }

    return () => {
      unsubscribeWake()
      unsubscribeInterrupt()
      unsubscribeCommand()
      unsubscribeDisconnect()
      detector.stop()
    }
  }, [isWakeWordActive, dispatchAresSpeech])

  // Inicializar proveedor de voz Nova Sonic (en segundo plano)
  useEffect(() => {
    const provider = new AmazonNovaSonicProvider({
      voiceId: selectedVoice,
      language: responseLanguage,
      interactionMode,
      volume,
      isMuted,
    })

    providerRef.current = provider

    const unsubscribe = provider.subscribe({
      onStateChange: state => {
        setVoiceState(state)
        if (state === 'SPEAKING') {
          wakeWordDetectorRef.current?.setSpeakingLock(true)
        } else if (state === 'LISTENING' || state === 'VOICE_OFFLINE') {
          wakeWordDetectorRef.current?.setSpeakingLock(false)
        }
      },
      onConnectionStateChange: connState => {
        setConnectionState(connState)
      },
      onConversationStateChange: convState => {
        setConversationState(convState)
      },
      onBargeIn: () => {
        console.log('[ARES COMMS] Barge-In confirmado desde el servidor de voz')
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        setConversationState('interrupted')
        setConversationState('listening')
      },
      onCompletionEnd: () => {
        console.log('[ARES COMMS] Turno de respuesta finalizado. Sesión persistente lista para el siguiente turno.')
        setConversationState('awaiting_user')
      },
      onTranscript: evt => {
        if (!evt.text || !evt.text.trim()) return

        showSubtitle(evt.text, evt.role === 'user' ? 'user' : 'assistant')

        setTranscripts(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === evt.role && !last.isFinal) {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...last,
              text: last.text + evt.text,
              isFinal: evt.isFinal,
            }
            return updated
          }
          return [...prev, evt]
        })
      },
      onAudioLevel: () => {
        // Monitoreado de forma unificada a 60 FPS por AudioCaptureService
      },
      onToolCall: async (tool, input, toolUseId) => {
        if (!toolEngineRef.current) return { error: 'TOOL_ENGINE_NOT_READY' }

        // Minimizar al orbe automáticamente durante la ejecución (Sección 2 C)
        setPresentationMode('minimized')
        setConversationState('executing_tool')
        setCurrentExecutionInfo({ action: tool, description: `Ejecutando ${tool}...` })

        const req: ToolExecutionRequest = { tool, input, toolUseId }
        const res = await toolEngineRef.current.executeTool(req)

        const summaryText = res.success
          ? res.actionPerformed || `Comando '${tool}' completado.`
          : `No se pudo ejecutar '${tool}': ${res.output.error || 'Operación abortada'}`

        setCurrentExecutionInfo({ action: tool, description: summaryText })
        showSubtitle(summaryText, 'assistant', 5000)

        setTranscripts(prev => [
          ...prev,
          {
            id: `tool-${Date.now()}`,
            role: 'assistant',
            text: `[ACCIÓN TÁCTICA]: ${summaryText}`,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])

        return res.output
      },
      onError: err => {
        console.warn('[MISSION COMMS PROVIDER] Nota:', err.message)
      },
    })

    return () => {
      unsubscribe()
      provider.disconnect()
    }
  }, [selectedVoice, responseLanguage, interactionMode, volume, isMuted, showSubtitle])

  // Sincronizar contexto compacto del mapa con ARES
  useEffect(() => {
    if (providerRef.current) {
      const compact = buildCompactMissionContext(contextInput)
      providerRef.current.updateMissionContext(compact as unknown as Record<string, unknown>)
    }
  }, [contextInput])

  // Scroll automático en transcripciones
  useEffect(() => {
    if (presentationMode === 'compact') {
      transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcripts, presentationMode])

  // ==========================================
  // RENDERER DEL VISUALIZADOR DE AUDIO (60 FPS)
  // ==========================================
  const drawWaveform = useCallback(
    (metrics: RealtimeAudioMetrics) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const centerY = height / 2

      const pcm = metrics.timeDomainData
      const isUser = metrics.source === 'user' || conversationState === 'listening'
      const isAssistant = metrics.source === 'assistant' || conversationState === 'speaking'

      if (isUser && metrics.isVoiceActive) {
        // Voz humana activa capturada del micrófono en tiempo real
        ctx.strokeStyle = '#E87A5D'
        ctx.lineWidth = 2.5
        ctx.shadowColor = '#FF6B4A'
        ctx.shadowBlur = 8
        ctx.beginPath()
        const sliceWidth = width / pcm.length
        let x = 0
        for (let i = 0; i < pcm.length; i++) {
          const v = pcm[i] / 128.0
          const y = centerY + (v - 1.0) * (height * 0.45)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += sliceWidth
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (isAssistant) {
        // Voz sintetizada de ARES (24kHz Nova Sonic)
        ctx.strokeStyle = '#63D4E5'
        ctx.lineWidth = 2.2
        ctx.shadowColor = '#63D4E5'
        ctx.shadowBlur = 10
        ctx.beginPath()
        const freq = metrics.frequencyData
        const sliceWidth = width / freq.length
        let x = 0
        for (let i = 0; i < freq.length; i++) {
          const v = freq[i] / 128.0
          const y = centerY + (v - 1.0) * (height * 0.45)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += sliceWidth
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (conversationState === 'processing' || conversationState === 'executing_tool') {
        const now = Date.now() / 200
        ctx.strokeStyle = '#E9B85C'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        for (let x = 0; x < width; x += 3) {
          const y = centerY + Math.sin(x * 0.08 + now) * 7
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      } else {
        // Reposo con respiración ambiental sutil
        ctx.strokeStyle = 'rgba(99, 212, 229, 0.45)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        const now = Date.now() / 600
        for (let x = 0; x < width; x += 4) {
          const ambientWave = Math.sin(x * 0.04 + now) * 1.5
          const y = centerY + ambientWave
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    },
    [conversationState]
  )

  // Suscripción unificada a AudioCaptureService para telemetría acústica en tiempo real (60 FPS)
  useEffect(() => {
    const audioService = AudioCaptureService.getInstance()
    audioService.startCapture().catch(e => {
      console.warn('[ARES COMMS] Captura de audio esperando interacción:', e)
    })

    const unsubMetrics = audioService.subscribeMetrics(metrics => {
      setAudioMetrics(metrics)
      drawWaveform(metrics)
    })

    const unsubTelemetry = audioService.subscribeTelemetry(t => {
      setTelemetry(t)
    })

    return () => {
      unsubMetrics()
      unsubTelemetry()
    }
  }, [drawWaveform])

  // ==========================================
  // MANEJADORES DE UI
  // ==========================================
  const handleToggleDemoMode = () => {
    const nextLang: SupportedLanguage = responseLanguage === 'en' ? 'es' : 'en'
    const nextVoice = nextLang === 'en' ? 'matthew' : 'carlos'
    setResponseLanguage(nextLang)
    setUiLanguage(nextLang)
    setActiveLanguage(nextLang)
    setLanguageSelection(nextLang)
    setSelectedVoice(nextVoice)
    providerRef.current?.updateConfig({ language: nextLang, voiceId: nextVoice })

    const msg =
      nextLang === 'en'
        ? 'ARES online in English.'
        : 'ARES en línea en español.'

    setTranscripts(prev => [
      ...prev,
      {
        id: `demo-${Date.now()}`,
        role: 'assistant',
        text: `[SISTEMA]: ${msg}`,
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ])
    showSubtitle(msg, 'assistant', 3000)
    dispatchAresSpeech(msg, nextLang)
  }

  const handleOrbClick = () => {
    if (presentationMode === 'compact') {
      setPresentationMode('orb')
    } else {
      setPresentationMode('compact')
      onOpen()
    }
  }

  // Posicionamiento interactivo y libre arrastre del orbe holográfico
  const [orbPosition, setOrbPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('ares_orb_pos')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed
        }
      }
    } catch {
      // Ignorar fallback en entornos restringidos
    }
    return null
  })

  const dragTrackingRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null)

  const handleOrbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    dragTrackingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      moved: false,
    }
    try {
      target.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handleOrbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTrackingRef.current) return
    const dx = e.clientX - dragTrackingRef.current.startX
    const dy = e.clientY - dragTrackingRef.current.startY
    if (!dragTrackingRef.current.moved && Math.hypot(dx, dy) > 5) {
      dragTrackingRef.current.moved = true
    }
    if (dragTrackingRef.current.moved) {
      const orbSize = 66
      const minX = 12
      const maxX = Math.max(12, window.innerWidth - orbSize - 12)
      const minY = 56
      const maxY = Math.max(56, window.innerHeight - orbSize - 60)
      const nextX = Math.min(Math.max(dragTrackingRef.current.initX + dx, minX), maxX)
      const nextY = Math.min(Math.max(dragTrackingRef.current.initY + dy, minY), maxY)
      setOrbPosition({ x: nextX, y: nextY })
    }
  }

  const handleOrbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTrackingRef.current) return
    const wasMoved = dragTrackingRef.current.moved
    dragTrackingRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (wasMoved) {
      if (orbPosition) {
        try {
          localStorage.setItem('ares_orb_pos', JSON.stringify(orbPosition))
        } catch {
          // ignore
        }
      }
    } else {
      handleOrbClick()
    }
  }

  const handleOrbDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOrbPosition(null)
    try {
      localStorage.removeItem('ares_orb_pos')
    } catch {
      // ignore
    }
  }

  const handleResolveConfirmation = async (proceed: boolean) => {
    if (!pendingConfirm || !toolEngineRef.current) return
    const confId = pendingConfirm.id
    setPendingConfirm(null)
    const result = await toolEngineRef.current.confirmPendingAction(confId, proceed)

    setTranscripts(prev => [
      ...prev,
      {
        id: `conf-res-${Date.now()}`,
        role: 'assistant',
        text: proceed
          ? `[CONFIRMADO]: ${result.actionPerformed || 'Operación completada.'}`
          : '[ACCION ABORTADA POR ASTRONAUTA]',
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ])
  }

  return (
    <div
      className={`ares-comms-overlay screen-${contextInput.screen || 'terrain3d'} presentation-${presentationMode}`}
      role="region"
      aria-label="Ares Copilot Voice Assistant"
    >
      {/* ========================================================
          MODO A: PANEL COMPACTO FLOTANTE (COMPACT PANEL MODE)
          ======================================================== */}
      {presentationMode === 'compact' && (
        <div className="ares-comms-panel" role="dialog" aria-modal="false" aria-labelledby="comms-title">
          {/* Retícula FUI de esquinas */}
          <div className="ares-comms-corner top-left" aria-hidden="true" />
          <div className="ares-comms-corner top-right" aria-hidden="true" />
          <div className="ares-comms-corner bottom-left" aria-hidden="true" />
          <div className="ares-comms-corner bottom-right" aria-hidden="true" />

          {/* Header Compacto */}
          <header className="ares-comms-header">
            <div className="ares-comms-header-title-block">
              <div
                className="ares-comms-logo-ring"
                aria-hidden="true"
                style={{
                  transform: `scale(${1 + Math.min(audioMetrics.smoothedLevel * 0.8, 0.35)})`,
                  boxShadow: (audioMetrics.source === 'user' && audioMetrics.isVoiceActive)
                    ? '0 0 16px rgba(232, 122, 93, 0.85)'
                    : (audioMetrics.source === 'assistant' || conversationState === 'speaking')
                    ? '0 0 16px rgba(99, 212, 229, 0.85)'
                    : undefined,
                  transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
                }}
              >
                <JarvisAiCore size={22} withOuterOrbits={false} />
              </div>
              <div>
                <div className="ares-comms-eyebrow">NASA 2026 // COPILOT // {connectionState.toUpperCase()}</div>
                <h3 id="comms-title" className="ares-comms-title" style={{ fontSize: '0.95rem' }}>
                  ARES <span>COPILOT</span>
                </h3>
              </div>
            </div>

            <div className="ares-comms-header-actions">
              {/* Toggle Diagnóstico de Audio */}
              <button
                type="button"
                className={`ares-demo-badge-btn ${showDiagnostics ? 'demo-active' : ''}`}
                onClick={() => setShowDiagnostics(prev => !prev)}
                title="Abrir / Cerrar Diagnóstico Acústico (Web Audio API & RMS)"
              >
                📊 DIAG
              </button>

              {/* Selector Demo Internacional */}
              <button
                type="button"
                className="ares-demo-badge-btn"
                onClick={handleToggleDemoMode}
                title={responseLanguage === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              >
                {responseLanguage === 'en' ? '🌐 EN' : '🇦🇷 ES'}
              </button>

              {/* Botón Minimizar al Orbe */}
              <button
                type="button"
                className="ares-comms-close-btn"
                onClick={() => setPresentationMode('orb')}
                aria-label="Minimizar a Orbe Flotante"
                title="Minimizar a Orbe (convive con mapa 3D)"
              >
                <MinimizeIcon />
              </button>

              {/* Botón Cerrar / Desconectar */}
              <button
                type="button"
                className="ares-comms-close-btn"
                onClick={handleDisconnect}
                aria-label="Cerrar comunicaciones"
                title="Cerrar comunicaciones"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          {/* Panel Diagnóstico de Audio Acústico (Web Audio API & RMS) */}
          {showDiagnostics && telemetry && (
            <div className="ares-comms-diagnostics-card" role="region" aria-label="Diagnóstico de Audio">
              <div className="ares-diag-header">
                <span className="ares-diag-title">📡 TELEMETRÍA DE AUDIO EN VIVO // WEB AUDIO API</span>
                <span className="ares-diag-status">{telemetry.trackState.toUpperCase()}</span>
              </div>
              <div className="ares-diag-grid">
                <div className="ares-diag-item">
                  <span className="ares-diag-label">Dispositivo:</span>
                  <span className="ares-diag-val" title={telemetry.deviceLabel}>{telemetry.deviceLabel.slice(0, 22)}...</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">Permiso:</span>
                  <span className="ares-diag-val">{telemetry.permissionState.toUpperCase()}</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">AudioContext:</span>
                  <span className="ares-diag-val">{telemetry.audioContextState} ({telemetry.sampleRate} Hz)</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">Procesador:</span>
                  <span className="ares-diag-val">{telemetry.workletActive ? 'AudioWorklet (16kHz)' : telemetry.workletFallback ? 'ScriptProcessor' : 'Idle'}</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">RMS Actual:</span>
                  <span className="ares-diag-val">{audioMetrics.rms.toFixed(4)} ({audioMetrics.db} dBFS)</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">Pico Máximo:</span>
                  <span className="ares-diag-val">{audioMetrics.peak.toFixed(4)}</span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">VAD (Voz):</span>
                  <span className={`ares-diag-val ${audioMetrics.isVoiceActive ? 'vad-active' : 'vad-idle'}`}>
                    {audioMetrics.isVoiceActive ? '🟢 VOZ DETECTADA' : '⚪ SILENCIO'}
                  </span>
                </div>
                <div className="ares-diag-item">
                  <span className="ares-diag-label">Enlace Gateway:</span>
                  <span className="ares-diag-val">{voiceState}</span>
                </div>
              </div>
              <div className="ares-diag-meter-bar">
                <div
                  className="ares-diag-meter-fill"
                  style={{
                    width: `${Math.min(100, Math.round(audioMetrics.rms * 250))}%`,
                    backgroundColor: audioMetrics.isVoiceActive ? '#E87A5D' : '#63D4E5',
                  }}
                />
              </div>
            </div>
          )}

          {/* Barra de Controles de Voz */}
          <div className="ares-comms-controls-bar">
            <div className="ares-comms-btn-group" role="toolbar" aria-label="Controles principales de voz">
              <button
                type="button"
                className={`ares-comms-action-btn primary ${conversationState === 'listening' ? 'active-listening' : ''}`}
                onClick={() => {
                  if (conversationState === 'listening') {
                    setConversationState('standby')
                  } else {
                    setConversationState('listening')
                    wakeWordDetectorRef.current?.setCommandMode(true)
                    showSubtitle(
                      responseLanguage === 'en' ? '● Listening for command...' : '● A la escucha... Di tu orden o pregunta.',
                      'assistant',
                      3500
                    )
                  }
                }}
                aria-label={conversationState === 'listening' ? 'A la escucha' : 'Hablar con ARES (escucha activa)'}
                title="Hablar (Activa escucha manos libres continua)"
              >
                <MicIcon />
                <span>{conversationState === 'listening' ? 'A LA ESCUCHA...' : '🎤 HABLAR'}</span>
              </button>

              <button
                type="button"
                className="ares-comms-action-btn stop"
                onClick={handleInterrupt}
                aria-label="Interrumpir respuesta (Barge-In)"
                title="Interrumpir respuesta (Barge-In)"
              >
                <StopSquareIcon />
              </button>

              {/* Silenciar micrófono */}
              <button
                type="button"
                className={`ares-comms-action-btn toggle ${isMuted ? 'active' : ''}`}
                onClick={() => {
                  const next = !isMuted
                  setIsMuted(next)
                  providerRef.current?.mute(next)
                }}
                aria-label={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </button>

              {/* Modo Manos Libres */}
              <button
                type="button"
                className={`ares-comms-action-btn toggle ${interactionMode === 'HANDS_FREE' ? 'active' : ''}`}
                onClick={() => {
                  const nextMode: InteractionMode = interactionMode === 'HANDS_FREE' ? 'PUSH_TO_TALK' : 'HANDS_FREE'
                  setInteractionMode(nextMode)
                  providerRef.current?.updateConfig({ interactionMode: nextMode })
                }}
                aria-label={interactionMode === 'HANDS_FREE' ? 'Modo Manos Libres continuo' : 'Modo Push to talk'}
                title="Modo Manos Libres continuo"
              >
                <span>{interactionMode === 'HANDS_FREE' ? 'MANOS LIBRES' : 'PTT'}</span>
              </button>

              {/* Wake Word Toggle */}
              <button
                type="button"
                className={`ares-comms-action-btn toggle ${isWakeWordActive ? 'active wake-active' : ''}`}
                onClick={() => setIsWakeWordActive(prev => !prev)}
                aria-label={isWakeWordActive ? 'Wake Word Activo ("Hola ARES" / "Hey ARES")' : 'Wake Word Desactivado'}
                title={isWakeWordActive ? 'Wake Word Activo ("Hola ARES" / "Hey ARES")' : 'Wake Word Desactivado'}
              >
                <span>{isWakeWordActive ? '👂 WAKE: ON' : '👂 WAKE: OFF'}</span>
              </button>
            </div>

            <div className="ares-comms-btn-group" role="toolbar" aria-label="Configuración de voz y síntesis">
              {/* Selector de Idioma */}
              <div className="ares-comms-setting-item">
                <select
                  className="ares-comms-select"
                  value={languageSelection}
                  onChange={e => {
                    const next = e.target.value as LanguageSelection
                    setLanguageSelection(next)
                    if (next === 'en' || next === 'es') {
                      const nextVoice = next === 'es' ? 'carlos' : 'matthew'
                      setResponseLanguage(next)
                      setUiLanguage(next)
                      setActiveLanguage(next)
                      setSelectedVoice(nextVoice)
                      providerRef.current?.updateConfig({ language: next, voiceId: nextVoice })
                    }
                  }}
                  aria-label="Selector de idioma de respuesta"
                  title="Selector de idioma de respuesta"
                >
                  <option value="es">ES (Español)</option>
                  <option value="en">EN (English)</option>
                  <option value="auto">AUTO</option>
                </select>
              </div>

              {/* Selector de Voces Naturales de Amazon Nova 2.5 Sonic */}
              <div className="ares-comms-setting-item voice-select-item">
                <select
                  className="ares-comms-select"
                  value={selectedVoice}
                  onChange={e => {
                    const next = e.target.value as 'carlos' | 'lupe' | 'matthew' | 'tiffany'
                    setSelectedVoice(next)
                    providerRef.current?.updateConfig({ voiceId: next })
                  }}
                  style={{ width: '100%' }}
                  aria-label="Voz natural de Amazon Nova Sonic"
                  title="Voz natural de Amazon Nova Sonic"
                >
                  <option value="carlos">Carlos (ES · Natural Masculina)</option>
                  <option value="lupe">Lupe (ES · Natural Femenina)</option>
                  <option value="matthew">Matthew (EN · Natural Masculina)</option>
                  <option value="tiffany">Tiffany (EN · Natural Femenina)</option>
                </select>
              </div>

              <div className="ares-comms-setting-item">
                <VolumeIcon />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setVolume(v)
                    providerRef.current?.setVolume(v)
                  }}
                  className="ares-comms-volume-slider"
                  aria-label={`Control de volumen: ${Math.round(volume * 100)}%`}
                  title={`Volumen: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>

          {/* Visualizador de Onda */}
          <div className="ares-comms-visualizer-container">
            <canvas ref={canvasRef} width={420} height={28} className="ares-comms-waveform-canvas" />
          </div>

          {/* Historial de Conversación */}
          <div className="ares-comms-body" role="log" aria-live="polite">
            {transcripts
              .filter(tr => tr.text && tr.text.trim().length > 0)
              .map(tr => (
                <div key={tr.id} className={`ares-comms-msg-row ${tr.role}`}>
                  <div className="ares-comms-avatar">{tr.role === 'user' ? 'A' : 'AI'}</div>
                  <div className="ares-comms-bubble">
                    <div className="ares-comms-msg-meta">
                      <span className="ares-comms-msg-sender">
                        {tr.role === 'user' ? '[ASTRONAUTA]' : '[ARES // COPILOTO]'}
                      </span>
                      <span>{tr.timestamp}</span>
                    </div>
                    <div>
                      {tr.text.split('\n').map((line, idx) => (
                        <p key={idx} style={{ margin: '2px 0' }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

            {/* Confirmación táctica */}
            {pendingConfirm && (
              <div className="ares-comms-confirmation-card" role="alert">
                <div className="ares-confirmation-header">
                  <span>⚠️ [CONFIRMACIÓN TÁCTICA // NIVEL {pendingConfirm.securityLevel}]</span>
                </div>
                <div className="ares-confirmation-prompt">{pendingConfirm.message}</div>
                <div className="ares-confirmation-actions">
                  <button type="button" className="ares-confirm-btn" onClick={() => handleResolveConfirmation(true)}>
                    {t.confirmButton}
                  </button>
                  <button type="button" className="ares-abort-btn" onClick={() => handleResolveConfirmation(false)}>
                    {t.abortButton}
                  </button>
                </div>
              </div>
            )}
            <div ref={transcriptsEndRef} />
          </div>

          {/* Chips de Sugerencias */}
          <div className="ares-comms-suggestions-bar">
            {t.suggestedCommands.slice(0, 5).map(cmd => (
              <button
                key={cmd.text}
                type="button"
                className="ares-suggestion-chip"
                onClick={() => executeTacticalCommand(cmd.text)}
                title={cmd.text}
              >
                {cmd.label}
              </button>
            ))}
          </div>

          {/* Entrada de Texto */}
          <form
            className="ares-comms-input-bar"
            onSubmit={e => {
              e.preventDefault()
              if (inputMessage.trim()) {
                const msg = inputMessage.trim()
                setInputMessage('')
                executeTacticalCommand(msg)
              }
            }}
          >
            <div className="ares-comms-input-wrapper">
              <span className="ares-comms-prefix" aria-hidden="true">❯</span>
              <input
                ref={textInputRef}
                id={inputId}
                type="text"
                className="ares-comms-input"
                placeholder={t.inputPlaceholder}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                aria-label="Escribe tu instrucción de voz o texto para ARES"
              />
            </div>
            <button
              type="submit"
              className="ares-comms-send-btn"
              disabled={!inputMessage.trim()}
              aria-label="Transmitir orden a ARES"
              title="Transmitir orden a ARES"
            >
              <SendIcon />
            </button>
          </form>

          {/* Footer Compacto */}
          <footer className="ares-comms-footer" style={{ padding: '6px 14px', fontSize: '0.62rem' }}>
            <span>
              {currentStops?.A ? `A: [${currentStops.A[1].toFixed(2)}°N, ${currentStops.A[0].toFixed(2)}°E]` : `ARES COPILOT [${activeLanguage.toUpperCase()}] // ${selectedVoice.toUpperCase()}`}
            </span>
            <span className={`ares-status-badge ${conversationState}`} style={{ padding: '2px 6px', fontSize: '0.6rem' }}>
              {conversationState.toUpperCase()}
            </span>
          </footer>
        </div>
      )}

      {/* ========================================================
          MODOS B & C: FLOATING ORB MODE & MINIMIZED EXECUTION
          ======================================================== */}
      {presentationMode !== 'compact' && (
        <div
          className="ares-floating-orb-wrapper"
          style={
            orbPosition
              ? {
                  position: 'fixed',
                  left: `${orbPosition.x}px`,
                  top: `${orbPosition.y}px`,
                  right: 'auto',
                  bottom: 'auto',
                }
              : undefined
          }
        >
          {/* Subtítulo Holográfico / Caption flotante */}
          {floatingSubtitle && (
            <div className="ares-orb-subtitle-pill" role="status">
              <span className={`ares-orb-subtitle-sender ${floatingSubtitle.role}`}>
                {floatingSubtitle.role === 'user' ? '🧑‍🚀 [ASTRONAUTA]' : '🛰️ [ARES // COPILOTO]'}
              </span>
              <span>{floatingSubtitle.text}</span>
            </div>
          )}

          {/* Tarjeta de Ejecución Minimizada */}
          {presentationMode === 'minimized' && currentExecutionInfo && (
            <div className="ares-orb-exec-card" role="alert">
              <div className="ares-orb-exec-text">
                <span className="ares-pulse-ring" aria-hidden="true" />
                <span>⚙️ {currentExecutionInfo.description}</span>
              </div>
              <div className="ares-orb-exec-actions">
                <button
                  type="button"
                  className="ares-orb-mini-btn"
                  onClick={() => setPresentationMode('compact')}
                  title="Expandir panel de misión"
                >
                  <ExpandIcon />
                </button>
                <button
                  type="button"
                  className="ares-orb-mini-btn"
                  onClick={() => {
                    handleInterrupt()
                    setPresentationMode('orb')
                  }}
                  title="Detener acción"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Cuadro de texto / Callout badge para activación por voz */}
          {!floatingSubtitle && !currentExecutionInfo && (
            <div
              className="ares-orb-callout-badge"
              onClick={handleOrbClick}
              role="button"
              tabIndex={0}
              title="Actívame con 'Hey ARES' o haz clic aquí para abrir la consola"
            >
              <span className="ares-orb-callout-pulse" aria-hidden="true" />
              <span className="ares-orb-callout-text">
                Actívame con <strong className="ares-orb-callout-keyword">"Hey ARES"</strong>
              </span>
            </div>
          )}

          {/* Orbe Holográfico Interactivo con Reacción Acústica Real */}
          {(() => {
            const orbScale = 1.0 + Math.min(audioMetrics.smoothedLevel * 0.9, 0.45)
            const orbGlow = 14 + Math.min(audioMetrics.smoothedLevel * 60, 48)
            const isSpeakingUser = audioMetrics.source === 'user' && audioMetrics.isVoiceActive
            const isSpeakingAssistant = audioMetrics.source === 'assistant' || conversationState === 'speaking'

            const glowColor = isSpeakingAssistant
              ? 'rgba(99, 212, 229, 0.9)'
              : isSpeakingUser
              ? 'rgba(232, 122, 93, 0.92)'
              : conversationState === 'processing' || conversationState === 'executing_tool'
              ? 'rgba(233, 184, 92, 0.8)'
              : 'rgba(99, 212, 229, 0.35)'

            const borderColor = isSpeakingAssistant
              ? '#63D4E5'
              : isSpeakingUser
              ? '#E87A5D'
              : conversationState === 'processing' || conversationState === 'executing_tool'
              ? '#E9B85C'
              : undefined

            return (
              <div
                className={`ares-floating-orb orb-${conversationState}`}
                onPointerDown={handleOrbPointerDown}
                onPointerMove={handleOrbPointerMove}
                onPointerUp={handleOrbPointerUp}
                onDoubleClick={handleOrbDoubleClick}
                role="button"
                tabIndex={0}
                aria-label={`Ares Copilot Orb (${conversationState}). Arrastra para reposicionar o haz clic para abrir.`}
                title="Ares Copilot // Clic para abrir · Arrastra para mover libremente · Doble clic para restablecer posición"
                style={{
                  transform: `scale(${orbScale})`,
                  boxShadow: `0 0 ${orbGlow}px ${glowColor}, inset 0 0 ${Math.round(orbGlow / 2)}px ${glowColor}`,
                  borderColor,
                  transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
                }}
              >
                {/* Anillos orbitales animados que reaccionan a la amplitud de voz */}
                <div
                  className="ares-orb-ring ring-outer"
                  aria-hidden="true"
                  style={{
                    transform: `scale(${1 + audioMetrics.smoothedLevel * 0.35})`,
                    borderColor: isSpeakingUser ? 'rgba(232, 122, 93, 0.5)' : undefined,
                  }}
                />
                <div
                  className="ares-orb-ring ring-middle"
                  aria-hidden="true"
                  style={{
                    transform: `scale(${1 + audioMetrics.smoothedLevel * 0.2})`,
                    borderColor: isSpeakingUser ? 'rgba(232, 122, 93, 0.4)' : undefined,
                  }}
                />

                {/* Núcleo central animado */}
                <div className="ares-orb-core-wrap">
                  <JarvisAiCore size={32} withOuterOrbits={false} />
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
