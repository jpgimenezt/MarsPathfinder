/**
 * ARES MISSION COMMS - Real-Time Voice AI Copilot Panel
 * Copiloto inteligente de misión aeroespacial con Amazon Nova 2.5 Sonic.
 * Conversación speech-to-speech bilingüe (EN / ES) en tiempo real,
 * detección de Wake Word local ("Hey, ARES" / "Hola, ARES"),
 * visualizador dinámico de ondas, transcripción sincronizada,
 * modo de demostración internacional y ejecución real de herramientas en el mapa 3D/2D.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import type { MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'
import {
  type VoiceState,
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
} from '../features/voice/wakeWordDetector'
import {
  checkLanguageSwitchCommand,
  detectTextLanguage,
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

// Iconografía vectorial táctica SVG
const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const StopSquareIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection>('en')
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>('en')
  const [isWakeWordActive, setIsWakeWordActive] = useState<boolean>(true)
  const [voiceState, setVoiceState] = useState<VoiceState>('VOICE_OFFLINE')
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('PUSH_TO_TALK')
  const [selectedVoice, setSelectedVoice] = useState<'carlos' | 'lupe' | 'matthew' | 'tiffany'>('matthew')
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [isListeningNow, setIsListeningNow] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmationState | null>(null)

  const t = COMMS_TRANSLATIONS[activeLanguage]

  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      text: COMMS_TRANSLATIONS.en.welcomeMessage,
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
  const inputId = useId()

  // Inicializar motor de herramientas con los handlers reales de la aplicación
  useEffect(() => {
    toolEngineRef.current = new ToolExecutionEngine(appHandlers)
  }, [appHandlers])

  // Inicializar proveedor de voz Nova Sonic
  useEffect(() => {
    const provider = new AmazonNovaSonicProvider({
      voiceId: selectedVoice,
      language: activeLanguage,
      interactionMode,
      volume,
      isMuted,
    })

    providerRef.current = provider

    const unsubscribe = provider.subscribe({
      onStateChange: state => {
        setVoiceState(state)
        if (state !== 'LISTENING') {
          setIsListeningNow(false)
        }
      },
      onTranscript: evt => {
        // En modo auto, inferir idioma a partir de lo que habla el usuario
        if (languageSelection === 'auto' && evt.role === 'user' && evt.text && evt.text.length > 3) {
          const detected = detectTextLanguage(evt.text)
          if (detected !== activeLanguage) {
            setActiveLanguage(detected)
            const nextVoice = detected === 'en' ? 'matthew' : 'carlos'
            setSelectedVoice(nextVoice)
            provider.updateConfig({ language: detected, voiceId: nextVoice })
          }
        }

        setTranscripts(prev => {
          // Si el texto está vacío (delimitador de fin de turno), no crear una burbuja vacía
          if (!evt.text || !evt.text.trim()) {
            if (prev.length === 0) return prev
            const last = prev[prev.length - 1]
            if (last && last.role === evt.role && !last.isFinal) {
              const updated = [...prev]
              updated[updated.length - 1] = { ...last, isFinal: true }
              return updated
            }
            return prev
          }

          // Si es un mensaje del astronauta y el último mensaje ya tiene exactamente este mismo texto, ignorar duplicado
          const last = prev[prev.length - 1]
          if (last && last.role === 'user' && evt.role === 'user' && last.text.trim() === evt.text.trim()) {
            return prev
          }

          // Si el último mensaje es del mismo emisor y no es final, actualizarlo progresivamente
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

        const req: ToolExecutionRequest = { tool, input, toolUseId }
        const res = await toolEngineRef.current.executeTool(req)

        if (res.requiresConfirmation && res.pendingConfirmationId) {
          setPendingConfirm({
            id: res.pendingConfirmationId,
            tool,
            message: res.confirmationMessage || `¿Confirmar ejecución de ${tool}?`,
            securityLevel: res.securityLevel,
          })
          return { status: 'WAITING_FOR_USER_CONFIRMATION', message: res.confirmationMessage }
        }

        // Mostrar notificación de herramienta ejecutada de forma limpia y legible
        const summaryText = res.success
          ? `[ACCIÓN TÁCTICA]: ${res.actionPerformed || `Comando '${tool}' ejecutado correctamente.`}`
          : `[AVISO TÁCTICO]: No se pudo ejecutar '${tool}': ${res.output.error || 'Operación no completada'}`

        setTranscripts(prev => [
          ...prev,
          {
            id: `tool-${Date.now()}`,
            role: 'assistant',
            text: summaryText,
            isFinal: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ])

        return res.output
      },
      onError: err => {
        console.warn('[MISSION COMMS UI] Error reportado por proveedor:', err.message)
      },
    })

    return () => {
      unsubscribe()
      provider.disconnect()
    }
  }, [])

  // Sincronizar contexto compacto del mapa con ARES
  useEffect(() => {
    if (providerRef.current) {
      const compact = buildCompactMissionContext(contextInput)
      providerRef.current.updateMissionContext(compact as unknown as Record<string, unknown>)
    }
  }, [contextInput])

  // Configurar Wake Word Detector local
  useEffect(() => {
    if (!wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current = new LocalWakeWordDetector()
    }
    const detector = wakeWordDetectorRef.current

    const unsubscribe = detector.subscribe((event: WakeWordEvent) => {
      console.log(`[WAKE WORD TRIGGERED] Phrase: "${event.phrase}", Lang: ${event.detectedLanguage}`)

      // 1. Abrir la interfaz si estaba cerrada
      onOpen()

      // 2. Establecer el idioma inferido
      const detectedLang = event.detectedLanguage
      setActiveLanguage(detectedLang)
      const newVoice = detectedLang === 'en' ? 'matthew' : 'carlos'
      setSelectedVoice(newVoice)

      if (providerRef.current) {
        providerRef.current.updateConfig({ language: detectedLang, voiceId: newVoice })
      }

      // 3. Registrar aviso táctico en el log
      setTranscripts(prev => [
        ...prev,
        {
          id: `wake-${Date.now()}`,
          role: 'assistant',
          text: `[WAKE WORD // "${event.phrase}"]: ${COMMS_TRANSLATIONS[detectedLang].telemetry.wakeWordActive}`,
          isFinal: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ])

      // 4. Conectar y comenzar a escuchar automáticamente
      handleStartSpeaking()
    })

    if (isWakeWordActive) {
      detector.start()
    } else {
      detector.stop()
    }

    return () => {
      unsubscribe()
      detector.stop()
    }
  }, [isWakeWordActive, onOpen])

  // Scroll automático hacia el último mensaje
  useEffect(() => {
    if (isOpen) {
      transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcripts, isOpen])

  // Cierre accesible con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ==========================================
  // RENDERER DEL VISUALIZADOR DINÁMICO DE AUDIO
  // ==========================================
  const drawWaveform = useCallback((data: AudioVisualizerData) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const centerY = height / 2

    if (data.source === 'user') {
      // Onda de voz del astronauta (Mars Terracotta: #E87A5D)
      ctx.strokeStyle = '#E87A5D'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#E87A5D'
      ctx.shadowBlur = 8
      ctx.beginPath()

      const pcm = data.timeDomainData || new Uint8Array(64)
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
    } else if (data.source === 'assistant') {
      // Onda de voz de ARES (Telemetry Cyan: #63D4E5)
      ctx.strokeStyle = '#63D4E5'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#63D4E5'
      ctx.shadowBlur = 10
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
    } else if (voiceState === 'PROCESSING' || voiceState === 'TOOL_EXECUTION') {
      // Escaneo de procesamiento (Warning Amber: #E9B85C)
      const now = Date.now() / 250
      ctx.strokeStyle = '#E9B85C'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = 0; x < width; x += 4) {
        const y = centerY + Math.sin(x * 0.05 + now) * 8
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    } else {
      // Línea de base en reposo
      ctx.strokeStyle = 'rgba(130, 145, 158, 0.3)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()
    }
  }, [voiceState])

  // ==========================================
  // MANEJADORES DE CONTROLES DE VOZ E IDIOMA
  // ==========================================
  const holdTimerRef = useRef<number | null>(null)
  const isHoldingRef = useRef(false)

  const handleToggleDemoMode = () => {
    const nextLang: SupportedLanguage = activeLanguage === 'en' ? 'es' : 'en'
    const nextVoice = nextLang === 'en' ? 'matthew' : 'carlos'
    setActiveLanguage(nextLang)
    setLanguageSelection(nextLang)
    setSelectedVoice(nextVoice)
    providerRef.current?.updateConfig({ language: nextLang, voiceId: nextVoice })

    setTranscripts(prev => [
      ...prev,
      {
        id: `demo-sw-${Date.now()}`,
        role: 'assistant',
        text: nextLang === 'en'
          ? '🌐 [ARES INTERNATIONAL DEMO]: System switched to English. Full international telemetry & terminology active.'
          : '🇦🇷 [MODO ESPAÑOL]: Sistema configurado en español. Copiloto táctico listo para instrucciones de navegación.',
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ])
  }

  const handleLanguageSelectionChange = (selection: LanguageSelection) => {
    setLanguageSelection(selection)
    if (selection === 'en' || selection === 'es') {
      setActiveLanguage(selection)
      const nextVoice = selection === 'en' ? 'matthew' : 'carlos'
      setSelectedVoice(nextVoice)
      providerRef.current?.updateConfig({ language: selection, voiceId: nextVoice })
    }
  }

  const handleToggleConnect = async () => {
    if (!providerRef.current) return

    if (voiceState === 'VOICE_OFFLINE' || voiceState === 'ERROR') {
      try {
        await providerRef.current.connect()
        // Si estaba en modo manos libres, comenzar a escuchar de inmediato
        if (interactionMode === 'HANDS_FREE') {
          setIsListeningNow(true)
          await providerRef.current.startListening()
        }
      } catch {
        // Error ya notificado en el provider
      }
    } else {
      setIsListeningNow(false)
      await providerRef.current.disconnect()
    }
  }

  const handleStartSpeaking = async () => {
    if (!providerRef.current) return
    if (voiceState === 'VOICE_OFFLINE' || voiceState === 'ERROR') {
      await providerRef.current.connect()
    }
    setIsListeningNow(true)
    await providerRef.current.startListening()
  }

  const handleStopSpeaking = async () => {
    if (!providerRef.current) return
    setIsListeningNow(false)
    await providerRef.current.stopListening()
  }

  const handlePointerDown = () => {
    isHoldingRef.current = false
    holdTimerRef.current = window.setTimeout(() => {
      isHoldingRef.current = true
      if (!isListeningNow) {
        handleStartSpeaking()
      }
    }, 280)
  }

  const handlePointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (isHoldingRef.current) {
      // Hold prolongado (Push-to-Talk)
      isHoldingRef.current = false
      handleStopSpeaking()
    } else {
      // Click simple: toggle
      if (isListeningNow) {
        handleStopSpeaking()
      } else {
        handleStartSpeaking()
      }
    }
  }

  const handleInterrupt = () => {
    if (providerRef.current) {
      providerRef.current.interrupt()
    }
  }

  const handleToggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    providerRef.current?.mute(next)
  }

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol)
    providerRef.current?.setVolume(newVol)
  }

  const handleVoiceChange = (voice: 'carlos' | 'lupe' | 'matthew' | 'tiffany') => {
    setSelectedVoice(voice)
    providerRef.current?.updateConfig({ voiceId: voice })
  }

  const handleModeToggle = (mode: InteractionMode) => {
    setInteractionMode(mode)
    providerRef.current?.updateConfig({ interactionMode: mode })
    if (mode === 'HANDS_FREE' && voiceState === 'LISTENING') {
      providerRef.current?.startListening()
    }
  }

  const handleSendMessage = async () => {
    const text = inputMessage.trim()
    if (!text) return
    setInputMessage('')

    // Verificar si el usuario ordenó verbal o textualmente cambiar de idioma
    const requestedLang = checkLanguageSwitchCommand(text)
    if (requestedLang) {
      setActiveLanguage(requestedLang)
      setLanguageSelection(requestedLang)
      const nextVoice = requestedLang === 'en' ? 'matthew' : 'carlos'
      setSelectedVoice(nextVoice)
      providerRef.current?.updateConfig({ language: requestedLang, voiceId: nextVoice })

      setTranscripts(prev => [
        ...prev,
        {
          id: `usr-sw-${Date.now()}`,
          role: 'user',
          text,
          isFinal: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          id: `ai-sw-${Date.now()}`,
          role: 'assistant',
          text: requestedLang === 'en'
            ? '[SYSTEM]: Language switched to English. ARES is ready for international mission instructions.'
            : '[SISTEMA]: Idioma cambiado a español. ARES listo para instrucciones operativas de misión.',
          isFinal: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ])
      return
    }

    // En modo auto, inferir idioma a partir del texto ingresado
    if (languageSelection === 'auto') {
      const detected = detectTextLanguage(text)
      if (detected !== activeLanguage) {
        setActiveLanguage(detected)
        const nextVoice = detected === 'en' ? 'matthew' : 'carlos'
        setSelectedVoice(nextVoice)
        providerRef.current?.updateConfig({ language: detected, voiceId: nextVoice })
      }
    }

    // Registrar mensaje del usuario en la conversación
    const userEvt: TranscriptEvent = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      isFinal: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
    setTranscripts(prev => [...prev, userEvt])

    // Si el provider de voz está conectado a Nova Sonic
    if (providerRef.current && (voiceState === 'LISTENING' || voiceState === 'SPEAKING' || voiceState === 'PROCESSING')) {
      try {
        await providerRef.current.sendTextMessage(text)
      } catch (err: unknown) {
        console.warn('[MISSION COMMS] Error enviando por voice provider:', err)
      }
    } else {
      // Fallback al agente Bedrock serverless en AWS (Function URL)
      setVoiceState('PROCESSING')
      try {
        const historyPayload = transcripts
          .filter(t => t.id !== 'init-msg')
          .map(t => ({ role: t.role, content: t.text }))
        const res = await queryMarsAgent(text, historyPayload)
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
        setVoiceState('LISTENING')
      } catch {
        setVoiceState('ERROR')
      }
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
          ? `[CONFIRMADO POR ASTRONAUTA]: ${result.actionPerformed || 'Operación completada.'}`
          : '[ACCION ABORTADA POR ASTRONAUTA]',
        isFinal: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ])
  }

  return (
    <>
      {/* Botón Flotante HUD (FAB) en pantalla - FUSIONADO: ARES COPILOT */}
      {!isOpen && (
        <button
          type="button"
          className="ares-comms-fab-trigger"
          onClick={onOpen}
          aria-label="Abrir Ares Copilot (Asistente de voz y navegación en tiempo real)"
          title="Ares Copilot // Asistente inteligente con Amazon Nova 2.5 Sonic"
        >
          <div className="ares-comms-fab-core">
            <span className="ares-comms-fab-pulse" aria-hidden="true" />
            <JarvisAiCore size={32} withOuterOrbits={true} />
          </div>
          <div className="ares-comms-fab-labels">
            <span className="ares-comms-fab-badge">[IA MISSION COPILOT]</span>
            <span className="ares-comms-fab-text">ARES COPILOT</span>
          </div>
        </button>
      )}

      {/* Ventana Modal ARES COPILOT */}
      {isOpen && (
        <div
          className="ares-comms-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comms-title"
          onClick={e => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div className="ares-comms-panel">
            {/* Retícula FUI de esquinas */}
            <div className="ares-comms-corner top-left" aria-hidden="true" />
            <div className="ares-comms-corner top-right" aria-hidden="true" />
            <div className="ares-comms-corner bottom-left" aria-hidden="true" />
            <div className="ares-comms-corner bottom-right" aria-hidden="true" />

            {/* Header del Panel */}
            <header className="ares-comms-header">
              <div className="ares-comms-header-title-block">
                <div className="ares-comms-logo-ring" aria-hidden="true">
                  <JarvisAiCore size={26} withOuterOrbits={false} />
                </div>
                <div>
                  <div className="ares-comms-eyebrow">{t.headerSubtitle}</div>
                  <h2 id="comms-title" className="ares-comms-title">
                    ARES <span>COPILOT</span>
                  </h2>
                </div>
              </div>

              <div className="ares-comms-header-actions">
                {/* Botón de Demostración Internacional (Toggle EN/ES directo) */}
                <button
                  type="button"
                  className="ares-demo-badge-btn"
                  onClick={handleToggleDemoMode}
                  title={activeLanguage === 'en' ? 'Click to switch to Spanish' : 'Click para cambiar a Modo Internacional en Inglés'}
                >
                  {activeLanguage === 'en' ? '🌐 ARES INTERNATIONAL DEMO' : '🇦🇷 MODO ESPAÑOL'}
                </button>

                {/* Badge de Estado Real del Sistema */}
                <div className={`ares-status-badge ${voiceState}`} role="status">
                  <span className="ares-status-dot" aria-hidden="true" />
                  <span>{t.states[voiceState] || voiceState.replace('_', ' ')}</span>
                </div>

                <button
                  type="button"
                  className="ares-comms-close-btn"
                  onClick={onClose}
                  aria-label="Cerrar ARES Mission Comms"
                  title="Cerrar (Esc)"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>

            {/* Barra de Controles de Voz */}
            <div className="ares-comms-controls-bar">
              <div className="ares-comms-btn-group">
                {/* Botón Enlace / Desconexión */}
                <button
                  type="button"
                  className={`ares-comms-action-btn ${voiceState !== 'VOICE_OFFLINE' ? 'primary' : ''}`}
                  onClick={handleToggleConnect}
                  title="Conectar o desconectar enlace WebSocket con Nova Sonic"
                >
                  {voiceState === 'VOICE_OFFLINE' ? t.controls.connect : t.controls.disconnect}
                </button>

                {/* Botón Hablar (Click para alternar o mantener presionado PTT) */}
                <button
                  type="button"
                  className={`ares-comms-action-btn primary ${isListeningNow ? 'active-listening' : ''}`}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  title="Haz clic para alternar micrófono o mantén presionado para hablar (Push-to-Talk)"
                >
                  <MicIcon />
                  <span>{isListeningNow ? t.controls.transmitting : t.controls.talk}</span>
                </button>

                {/* Botón Detener / Interrupción */}
                <button
                  type="button"
                  className="ares-comms-action-btn stop"
                  onClick={handleInterrupt}
                  title="Detiene la respuesta hablada de ARES o el procesamiento actual"
                >
                  <StopSquareIcon />
                  <span>{t.controls.stop}</span>
                </button>

                {/* Silenciar micrófono */}
                <button
                  type="button"
                  className={`ares-comms-action-btn toggle ${isMuted ? 'active' : ''}`}
                  onClick={handleToggleMute}
                  title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                >
                  {isMuted ? <MicOffIcon /> : <MicIcon />}
                  <span>{isMuted ? t.controls.micMuted : t.controls.micActive}</span>
                </button>

                {/* Modo Manos Libres */}
                <button
                  type="button"
                  className={`ares-comms-action-btn toggle ${interactionMode === 'HANDS_FREE' ? 'active' : ''}`}
                  onClick={() => handleModeToggle(interactionMode === 'HANDS_FREE' ? 'PUSH_TO_TALK' : 'HANDS_FREE')}
                  title="Activa el modo manos libres con detección automática de turnos"
                >
                  <span>{t.controls.handsFree}</span>
                </button>

                {/* Wake Word ("Hey ARES" / "Hola ARES") */}
                <button
                  type="button"
                  className={`ares-comms-action-btn toggle ${isWakeWordActive ? 'active wake-active' : ''}`}
                  onClick={() => setIsWakeWordActive(prev => !prev)}
                  title={isWakeWordActive ? 'Desactivar escucha pasiva de Wake Word ("Hey ARES" / "Hola ARES")' : 'Activar escucha pasiva de Wake Word'}
                >
                  <span>{isWakeWordActive ? '👂 WAKE: ON' : '👂 WAKE: OFF'}</span>
                </button>
              </div>

              <div className="ares-comms-btn-group">
                {/* Selector de Idioma */}
                <div className="ares-comms-setting-item">
                  <label htmlFor="lang-select">{t.controls.langLabel}</label>
                  <select
                    id="lang-select"
                    className="ares-comms-select"
                    value={languageSelection}
                    onChange={e => handleLanguageSelectionChange(e.target.value as LanguageSelection)}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="auto">{t.controls.autoLang}</option>
                  </select>
                </div>

                {/* Selector de Voz */}
                <div className="ares-comms-setting-item">
                  <label htmlFor="voice-select">{t.controls.voiceLabel}</label>
                  <select
                    id="voice-select"
                    className="ares-comms-select"
                    value={selectedVoice}
                    onChange={e => handleVoiceChange(e.target.value as 'carlos' | 'lupe' | 'matthew' | 'tiffany')}
                  >
                    <option value="matthew">Matthew (EN - Male)</option>
                    <option value="tiffany">Tiffany (EN - Female)</option>
                    <option value="carlos">Carlos (ES - Masculino)</option>
                    <option value="lupe">Lupe (ES - Femenino)</option>
                  </select>
                </div>

                {/* Control de Volumen */}
                <div className="ares-comms-setting-item">
                  <VolumeIcon />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                    className="ares-comms-volume-slider"
                    title={`Volumen: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>
            </div>

            {/* Visualizador Dinámico de Ondas de Audio */}
            <div className="ares-comms-visualizer-container">
              <div className="ares-comms-visualizer-header">
                <span>{t.telemetry.liveBanner}</span>
                <span>
                  {voiceState === 'SPEAKING'
                    ? t.telemetry.aresSpeaking
                    : isListeningNow
                    ? t.telemetry.micTransmitting
                    : interactionMode === 'HANDS_FREE' && voiceState === 'LISTENING'
                    ? t.telemetry.handsFreeActive
                    : voiceState === 'PROCESSING'
                    ? t.telemetry.processing
                    : voiceState === 'LISTENING'
                    ? t.telemetry.micStandby
                    : t.telemetry.channelOffline}
                </span>
              </div>
              <canvas ref={canvasRef} width={920} height={52} className="ares-comms-waveform-canvas" />
            </div>

            {/* Cuerpo de Transcripción */}
            <div className="ares-comms-body" role="log" aria-live="polite">
              {transcripts
                .filter(tr => tr.text && tr.text.trim().length > 0)
                .map(tr => (
                <div key={tr.id} className={`ares-comms-msg-row ${tr.role}`}>
                  <div className="ares-comms-avatar">
                    {tr.role === 'user' ? 'A' : 'AI'}
                  </div>
                  <div className="ares-comms-bubble">
                    <div className="ares-comms-msg-meta">
                      <span className="ares-comms-msg-sender">
                        {tr.role === 'user' ? '[ASTRONAUTA]' : '[ARES // COPILOTO]'}
                      </span>
                      <span>{tr.timestamp}</span>
                    </div>
                    <div>
                      {tr.text.split('\n').map((line, idx) => (
                        <p key={idx} style={{ margin: '3px 0' }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Tarjeta de Confirmación de Seguridad (Niveles 3 y 4) */}
              {pendingConfirm && (
                <div className="ares-comms-confirmation-card" role="alert">
                  <div className="ares-confirmation-header">
                    <span>{t.confirmPromptTitle} // LVL {pendingConfirm.securityLevel}</span>
                  </div>
                  <div className="ares-confirmation-prompt">
                    {pendingConfirm.message}
                  </div>
                  <div className="ares-confirmation-actions">
                    <button
                      type="button"
                      className="ares-confirm-btn"
                      onClick={() => handleResolveConfirmation(true)}
                    >
                      {t.confirmButton}
                    </button>
                    <button
                      type="button"
                      className="ares-abort-btn"
                      onClick={() => handleResolveConfirmation(false)}
                    >
                      {t.abortButton}
                    </button>
                  </div>
                </div>
              )}

              <div ref={transcriptsEndRef} />
            </div>

            {/* Barra de Comandos Sugeridos (Bilingüe) */}
            <div className="ares-comms-suggestions-bar">
              {t.suggestedCommands.map(cmd => (
                <button
                  key={cmd.text}
                  type="button"
                  className="ares-suggestion-chip"
                  onClick={() => {
                    setInputMessage(cmd.text)
                    textInputRef.current?.focus()
                  }}
                  title={cmd.text}
                >
                  {cmd.label}
                </button>
              ))}
            </div>

            {/* Barra de Entrada Híbrida (Texto + Voz) */}
            <form
              className="ares-comms-input-bar"
              onSubmit={e => {
                e.preventDefault()
                handleSendMessage()
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
                <span>{t.controls.send}</span>
              </button>
            </form>

            {/* Footer de Misión y Telemetría */}
            <footer className="ares-comms-footer">
              <span>{t.footerSystem}</span>
              <span>
                {currentStops?.A ? `A: [${currentStops.A[1].toFixed(2)}°N, ${currentStops.A[0].toFixed(2)}°E]` : 'A: --'} |{' '}
                {currentStops?.P ? `P: [${currentStops.P[1].toFixed(2)}°N, ${currentStops.P[0].toFixed(2)}°E]` : 'P: --'} |{' '}
                {currentStops?.B ? `B: [${currentStops.B[1].toFixed(2)}°N, ${currentStops.B[0].toFixed(2)}°E]` : 'B: --'}
              </span>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
