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
  type AudioVisualizerData,
} from '../features/voice/voiceProvider'
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
} from '../features/voice/bilingualCommandRegistry'
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
    setConversationState('listening')
  }, [])

  // Cierre ordenado de comunicaciones
  const handleDisconnect = useCallback(() => {
    console.log('[ARES COMMS] Cierre ordenado de sesión de comunicaciones')
    handleInterrupt()
    providerRef.current?.disconnect()
    setConnectionState('disconnected')
    setConversationState('standby')
    setVoiceState('VOICE_OFFLINE')
    setPresentationMode('orb')

    const closeNotice = responseLanguage === 'en'
      ? 'Communications channel closed. Standing by in passive mode.'
      : 'Canal de comunicaciones cerrado. Enlace en espera pasiva.'

    showSubtitle(closeNotice, 'assistant', 4000)
    speakLocalSpeech(closeNotice, responseLanguage)
    onClose()
  }, [handleInterrupt, responseLanguage, showSubtitle, onClose])

  // ==========================================
  // EJECUCIÓN DIRECTA Y MULTITURNO DE COMANDOS
  // ==========================================
  const executeTacticalCommand = useCallback(
    async (commandText: string) => {
      console.log(`[ARES CONVERSATIONAL ENGINE] Turno de usuario recibido: "${commandText}"`)

      // 1. Registrar mensaje del usuario en el historial
      const userEvt: TranscriptEvent = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: commandText,
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
      setTranscripts(prev => [...prev, userEvt])
      showSubtitle(commandText, 'user', 3500)
      setConversationState('processing')

      // 2. Verificar comando explícito de cambio de idioma (Sección 3)
      const requestedLang = checkLanguageSwitchCommand(commandText)
      if (requestedLang) {
        setResponseLanguage(requestedLang)
        setUiLanguage(requestedLang)
        setActiveLanguage(requestedLang)
        setLanguageSelection(requestedLang)

        const nextVoice = requestedLang === 'en' ? 'matthew' : 'carlos'
        setSelectedVoice(nextVoice)
        // Informar a Nova Sonic con la voz natural correspondiente al idioma
        providerRef.current?.updateConfig({ language: requestedLang, voiceId: nextVoice })

        const switchMsg = requestedLang === 'en'
          ? 'Switched to English. I will continue answering in English for all upcoming mission operations.'
          : 'Cambiado a español. Continuaré respondiendo en español para todas las operaciones de la misión.'

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
        showSubtitle(switchMsg, 'assistant', 5000)
        speakLocalSpeech(switchMsg, requestedLang, {
          onStart: () => setConversationState('speaking'),
          onEnd: () => setConversationState('awaiting_user'),
        })
        return
      }

      // 3. Resolución semántica y ejecución de herramientas bilingües (Sección 2 y 5)
      const resolved = resolveBilingualTool(commandText)
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

        showSubtitle(actionText, 'assistant', 5000)

        // Síntesis auditiva en el idioma de respuesta configurado
        speakLocalSpeech(actionText, responseLanguage, {
          onStart: () => setConversationState('speaking'),
          onEnd: () => {
            // Regresa a escuchar para preguntas de seguimiento consecutivas (Sección 5 y 6)
            setConversationState('awaiting_user')
            setPresentationMode('orb')
            setCurrentExecutionInfo(null)
          },
        })

        return
      }

      // 4. Si Nova Sonic está activo en streaming, enviar por WebSocket
      if (providerRef.current && voiceState === 'LISTENING') {
        try {
          await providerRef.current.sendTextMessage(commandText)
          return
        } catch {}
      }

      // 5. Fallback a agente serverless con contexto conversacional histórico completo
      showSubtitle(responseLanguage === 'en' ? 'Consulting mission telemetry...' : 'Consultando telemetría de misión...', 'assistant', 3000)

      try {
        const historyPayload = transcripts
          .filter(t => t.id !== 'init-msg')
          .slice(-8)
          .map(t => ({ role: t.role, content: t.text }))

        const res = await queryMarsAgent(commandText, historyPayload)
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
        speakLocalSpeech(cleanReply, responseLanguage, {
          onStart: () => setConversationState('speaking'),
          onEnd: () => setConversationState('awaiting_user'),
        })
      } catch {
        setConversationState('standby')
      }
    },
    [responseLanguage, transcripts, voiceState, showSubtitle]
  )

  // ==========================================
  // CONFIGURAR DETECTOR DE VOZ CONTINUA
  // ==========================================
  useEffect(() => {
    if (!wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current = new LocalWakeWordDetector()
    }
    const detector = wakeWordDetectorRef.current

    // Despertar con "Hey, ARES" o "Hola, ARES"
    const unsubscribeWake = detector.subscribe((event: WakeWordEvent) => {
      console.log(`[WAKE ACTIVATION] Frase: "${event.phrase}". Comando adjunto: "${event.trailingCommand || ''}"`)

      // El despertar NO altera el idioma de respuesta elegido por el usuario (Sección 3)
      setPresentationMode('orb')
      setConversationState('listening')
      setConnectionState('connected')

      showSubtitle(
        responseLanguage === 'en' ? '● ARES Listening... Ask your question or command.' : '● ARES a la escucha... Di tu orden o pregunta.',
        'assistant',
        4000
      )

      // Si el usuario dijo el comando en la misma frase ("Hey ARES, enfoca Mount Sharp")
      if (event.trailingCommand && event.trailingCommand.trim().length > 1) {
        executeTacticalCommand(event.trailingCommand.trim())
      }
    })

    // Escucha continua de comandos (no se corta tras 10 segundos, Sección 6)
    const unsubscribeCommand = detector.subscribeCommand((command: string) => {
      console.log(`[CONTINUOUS VOICE COMMAND CAPTURED] "${command}"`)
      executeTacticalCommand(command)
    })

    // Desconexión explícita por voz ("Cerrar comunicaciones", Sección 12 Escenario G)
    const unsubscribeDisconnect = detector.subscribeDisconnect(() => {
      handleDisconnect()
    })

    if (isWakeWordActive) {
      detector.start()
    } else {
      detector.stop()
    }

    return () => {
      unsubscribeWake()
      unsubscribeCommand()
      unsubscribeDisconnect()
      detector.stop()
    }
  }, [isWakeWordActive, responseLanguage, executeTacticalCommand, handleDisconnect, showSubtitle])

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
      onAudioLevel: data => {
        drawWaveform(data)
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
  // RENDERER DEL VISUALIZADOR DE AUDIO
  // ==========================================
  const drawWaveform = useCallback(
    (data: AudioVisualizerData) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const centerY = height / 2

      if (data.source === 'user' || conversationState === 'listening') {
        ctx.strokeStyle = '#E87A5D'
        ctx.lineWidth = 2
        ctx.beginPath()
        const pcm = data.timeDomainData || new Uint8Array(32)
        const sliceWidth = width / pcm.length
        let x = 0
        for (let i = 0; i < pcm.length; i++) {
          const v = pcm[i] / 128.0
          const y = centerY + (v - 1.0) * (height * 0.4)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += sliceWidth
        }
        ctx.stroke()
      } else if (data.source === 'assistant' || conversationState === 'speaking') {
        ctx.strokeStyle = '#63D4E5'
        ctx.lineWidth = 2
        ctx.shadowColor = '#63D4E5'
        ctx.shadowBlur = 8
        ctx.beginPath()
        const freq = data.frequencyData || new Uint8Array(32)
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
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let x = 0; x < width; x += 4) {
          const y = centerY + Math.sin(x * 0.06 + now) * 6
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      } else {
        ctx.strokeStyle = 'rgba(130, 145, 158, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, centerY)
        ctx.lineTo(width, centerY)
        ctx.stroke()
      }
    },
    [conversationState]
  )

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
        ? '🌐 [ARES INTERNATIONAL DEMO]: System switched to English. International scientific telemetry active.'
        : '🇦🇷 [MODO ESPAÑOL]: Sistema configurado en español. Copiloto táctico listo.'

    setTranscripts(prev => [
      ...prev,
      {
        id: `demo-${Date.now()}`,
        role: 'assistant',
        text: msg,
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ])
    showSubtitle(msg, 'assistant', 4500)
    speakLocalSpeech(msg, nextLang)
  }

  const handleOrbClick = () => {
    if (presentationMode === 'compact') {
      setPresentationMode('orb')
    } else {
      setPresentationMode('compact')
      onOpen()
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
    <div className="ares-comms-overlay" role="region" aria-label="Ares Copilot Voice Assistant">
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
              <div className="ares-comms-logo-ring" aria-hidden="true">
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

          {/* Barra de Controles de Voz */}
          <div className="ares-comms-controls-bar">
            <div className="ares-comms-btn-group">
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
                title="Hablar (Activa escucha manos libres continua)"
              >
                <MicIcon />
                <span>{conversationState === 'listening' ? 'A LA ESCUCHA...' : '🎤 HABLAR'}</span>
              </button>

              <button
                type="button"
                className="ares-comms-action-btn stop"
                onClick={handleInterrupt}
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
                title="Modo Manos Libres continuo"
              >
                <span>{interactionMode === 'HANDS_FREE' ? 'MANOS LIBRES' : 'PTT'}</span>
              </button>

              {/* Wake Word Toggle */}
              <button
                type="button"
                className={`ares-comms-action-btn toggle ${isWakeWordActive ? 'active wake-active' : ''}`}
                onClick={() => setIsWakeWordActive(prev => !prev)}
                title={isWakeWordActive ? 'Wake Word Activo ("Hola ARES" / "Hey ARES")' : 'Wake Word Desactivado'}
              >
                <span>{isWakeWordActive ? '👂 WAKE: ON' : '👂 WAKE: OFF'}</span>
              </button>
            </div>

            <div className="ares-comms-btn-group">
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
                  title="Selector de idioma de respuesta"
                >
                  <option value="es">ES (Español)</option>
                  <option value="en">EN (English)</option>
                  <option value="auto">AUTO</option>
                </select>
              </div>

              {/* Selector de Voces Naturales de Amazon Nova 2.5 Sonic */}
              <div className="ares-comms-setting-item">
                <select
                  className="ares-comms-select"
                  value={selectedVoice}
                  onChange={e => {
                    const next = e.target.value as 'carlos' | 'lupe' | 'matthew' | 'tiffany'
                    setSelectedVoice(next)
                    providerRef.current?.updateConfig({ voiceId: next })
                  }}
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
                  title={`Volumen: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>

          {/* Visualizador de Onda */}
          <div className="ares-comms-visualizer-container" style={{ padding: '4px 12px' }}>
            <canvas ref={canvasRef} width={340} height={32} className="ares-comms-waveform-canvas" />
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
              <span className="ares-comms-prefix">❯</span>
              <input
                ref={textInputRef}
                id={inputId}
                type="text"
                className="ares-comms-input"
                placeholder={t.inputPlaceholder}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="ares-comms-send-btn"
              disabled={!inputMessage.trim()}
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
        <div className="ares-floating-orb-wrapper">
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

          {/* Orbe Holográfico Interactivo */}
          <div
            className={`ares-floating-orb orb-${conversationState}`}
            onClick={handleOrbClick}
            role="button"
            tabIndex={0}
            aria-label={`Ares Copilot Orb (${conversationState}). Haz clic para abrir el panel de misión.`}
            title="Ares Copilot // Haz clic para abrir el panel o habla diciendo 'Hola, ARES' / 'Hey, ARES'"
          >
            {/* Anillos orbitales animados */}
            <div className="ares-orb-ring ring-outer" aria-hidden="true" />
            <div className="ares-orb-ring ring-middle" aria-hidden="true" />

            {/* Núcleo central animado */}
            <div className="ares-orb-core-wrap">
              <JarvisAiCore size={38} withOuterOrbits={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
