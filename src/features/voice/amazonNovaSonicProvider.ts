/**
 * ARES MISSION COMMS - Amazon Nova 2.5 Sonic Voice Provider
 * Implementación de VoiceProvider para streaming de voz bidireccional speech-to-speech
 * Conecta con ARES Voice Gateway a través de WebSocket seguro y Web Audio API
 */

import type {
  VoiceProvider,
  VoiceState,
  VoiceConfig,
  VoiceEventListener,
  TranscriptEvent,
} from './voiceProvider'
import { AudioCaptureService } from './audioCaptureService'

/**
 * Resuelve el endpoint de WebSocket para el Voice Gateway.
 * En producción o protocolo HTTPS, garantiza estrictamente wss:// (nunca ws://localhost).
 */
export function resolveGatewayEndpoint(explicitUrl?: string): string {
  if (explicitUrl && explicitUrl.trim().length > 0) return explicitUrl.trim()

  // 1. Variable de entorno Vite (prioridad máxima para producción / dominios dedicados)
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_VOICE_GATEWAY_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim()
  }

  // 2. Entorno HTTPS o Producción sin gateway dedicado:
  // No inventar hosts ficticios ni asumir soporte WebSocket persistente en Vercel Serverless
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const isProd = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.PROD)

  if (isHttps || isProd) {
    return ''
  }

  // 3. Fallback únicamente para desarrollo local en HTTP
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
  return `ws://${hostname}:8088/voice`
}

export class AmazonNovaSonicProvider implements VoiceProvider {
  public id = 'amazon-nova-2-5-sonic'
  public name = 'Amazon Nova 2.5 Sonic (Speech-to-Speech)'
  public state: VoiceState = 'VOICE_OFFLINE'
  public config: VoiceConfig

  private ws: WebSocket | null = null
  private listeners: VoiceEventListener[] = []
  private missionContext: Record<string, unknown> = {}

  // Web Audio Contexts & Nodos
  private audioCapture = AudioCaptureService.getInstance()
  private pcmUnsubscribe: (() => void) | null = null
  private metricsUnsubscribe: (() => void) | null = null
  private analyserAssistant: AnalyserNode | null = null

  // Cola de reproducción de voz sintetizada de ARES (24kHz)
  private playbackCtx: AudioContext | null = null
  private nextPlayTime = 0
  private activeAudioSources: AudioBufferSourceNode[] = []
  private isTurnCompleted = true
  private turnCompletionTimeout: any = null

  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private manualDisconnect = false

  constructor(initialConfig?: Partial<VoiceConfig>) {
    this.config = {
      voiceId: initialConfig?.voiceId || 'carlos', // Voz natural en español por defecto
      language: initialConfig?.language || 'es', // Español por defecto
      endpointUrl: resolveGatewayEndpoint(initialConfig?.endpointUrl),
      interactionMode: initialConfig?.interactionMode || 'HANDS_FREE',
      volume: initialConfig?.volume ?? 1.0,
      isMuted: initialConfig?.isMuted ?? false,
      turnDetectionSensitivity: initialConfig?.turnDetectionSensitivity || 'MEDIUM',
    }
  }

  public async connect(): Promise<void> {
    if (!this.config.endpointUrl || this.config.endpointUrl.trim().length === 0) {
      this.setState('VOICE_OFFLINE')
      this.notifyError({
        message: 'ARES Voice Gateway no configurado en este entorno. Las consultas continúan operativas por texto con Amazon Bedrock.',
        code: 'GATEWAY_NOT_CONFIGURED',
      })
      return
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.manualDisconnect = false
    this.setState('CONNECTING')

    // Desbloquear AudioContext dentro del gesto del usuario (política de autoplay de navegadores)
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (!this.playbackCtx) {
        // Inicializar AudioContext a la frecuencia nativa del hardware (p. ej. 48kHz o 44.1kHz en macOS)
        // Web Audio resampleará limpiamente el buffer de 24kHz sin desfasar el reloj ni acelerar el audio (cero efecto helio)
        this.playbackCtx = new AudioCtxClass()
        this.analyserAssistant = this.playbackCtx.createAnalyser()
        this.analyserAssistant.fftSize = 64
        this.analyserAssistant.connect(this.playbackCtx.destination)
        this.audioCapture.registerOutputAnalyser(this.analyserAssistant)

        if (!this.metricsUnsubscribe) {
          this.metricsUnsubscribe = this.audioCapture.subscribeMetrics(metrics => {
            const visualData = {
              userLevel: metrics.source === 'user' ? metrics.rms : 0,
              assistantLevel: metrics.source === 'assistant' ? metrics.rms : 0,
              frequencyData: metrics.frequencyData,
              timeDomainData: metrics.timeDomainData,
              source: metrics.source,
            }
            for (const l of this.listeners) {
              l.onAudioLevel?.(visualData)
            }
          })
        }
      }
      if (this.playbackCtx.state === 'suspended') {
        await this.playbackCtx.resume()
      }
    } catch (e) {
      console.warn('[NOVA SONIC] Advertencia inicializando AudioContext de reproducción:', e)
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`[NOVA SONIC PROVIDER] Conectando a ${this.config.endpointUrl}...`)
        this.ws = new WebSocket(this.config.endpointUrl)

        this.ws.onopen = () => {
          console.log('[NOVA SONIC PROVIDER] Enlace WebSocket establecido.')
          this.reconnectAttempts = 0

          // Enviar inicialización de sesión
          this.sendWsMessage({
            type: 'init',
            voiceId: this.config.voiceId,
            language: this.config.language || (this.config.voiceId === 'matthew' || this.config.voiceId === 'tiffany' ? 'en' : 'es'),
            initialContext: this.missionContext,
          })

          this.setState('LISTENING')
          resolve()
        }

        this.ws.onmessage = async event => {
          this.handleIncomingMessage(event.data)
        }

        this.ws.onerror = err => {
          console.warn('[NOVA SONIC PROVIDER] Error en canal WebSocket:', err)
          this.notifyError({
            message: 'No se pudo contactar el ARES Voice Gateway en ' + this.config.endpointUrl,
            code: 'GATEWAY_UNREACHABLE',
          })
          this.setState('ERROR')
          reject(err)
        }

        this.ws.onclose = () => {
          console.log('[NOVA SONIC PROVIDER] Canal WebSocket cerrado.')
          this.cleanupAudio()

          if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            this.setState('RECONNECTING')
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts)
          } else {
            this.setState('VOICE_OFFLINE')
          }
        }
      } catch (err: unknown) {
        this.setState('ERROR')
        const error = err instanceof Error ? err : new Error(String(err))
        this.notifyError({ message: error.message, code: 'CONNECTION_FAILED' })
        reject(error)
      }
    })
  }

  public async disconnect(): Promise<void> {
    this.manualDisconnect = true
    this.stopAudioCapture()
    this.cleanupAudio()

    if (this.ws) {
      this.sendWsMessage({ type: 'close' })
      this.ws.close()
      this.ws = null
    }

    this.setState('VOICE_OFFLINE')
  }

  public async startListening(): Promise<void> {
    if (this.config.isMuted) return
    await this.initAudioCapture()
    this.setState('LISTENING')
  }

  public async stopListening(): Promise<void> {
    this.stopAudioCapture()
    this.sendWsMessage({ type: 'end_audio_turn' })
    if (this.state === 'LISTENING') {
      this.setState('PROCESSING')
    }
  }

  public mute(muted: boolean): void {
    this.config.isMuted = muted
    if (muted) {
      this.stopAudioCapture()
    }
  }

  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume))
  }

  public flushAudioBuffers(): void {
    if (this.turnCompletionTimeout) {
      clearTimeout(this.turnCompletionTimeout)
      this.turnCompletionTimeout = null
    }
    for (const source of this.activeAudioSources) {
      try {
        source.stop()
        source.disconnect()
      } catch {}
    }
    this.activeAudioSources = []
    this.nextPlayTime = 0
  }

  public interrupt(): void {
    this.isTurnCompleted = true
    this.flushAudioBuffers()
    // Notificar al gateway que se interrumpió el turno (Barge-In)
    this.sendWsMessage({ type: 'interrupt' })
    this.setState('LISTENING')
    for (const listener of this.listeners) {
      listener.onBargeIn?.()
      listener.onConversationStateChange?.('interrupted')
    }
  }

  public async sendTextMessage(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    this.sendWsMessage({
      type: 'text_message',
      text,
    })
    this.setState('PROCESSING')
  }

  public updateMissionContext(context: Record<string, unknown>): void {
    this.missionContext = context
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWsMessage({
        type: 'update_context',
        context,
      })
    }
  }

  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    const prevVoice = this.config.voiceId
    const prevLang = this.config.language
    this.config = { ...this.config, ...newConfig }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    // Si cambió el idioma sin cambiar la voz, enviar directiva sin destruir la sesión persistente
    if (newConfig.language && newConfig.language !== prevLang && (!newConfig.voiceId || newConfig.voiceId === prevVoice)) {
      this.sendWsMessage({
        type: 'language_switch',
        language: newConfig.language,
      })
      return
    }

    // Si cambió explícitamente el ID de la voz a uno diferente, reinicializar
    if (newConfig.voiceId && newConfig.voiceId !== prevVoice) {
      this.sendWsMessage({
        type: 'init',
        voiceId: this.config.voiceId,
        language: this.config.language || 'es',
        initialContext: this.missionContext,
      })
    }
  }

  public subscribe(listener: VoiceEventListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // ==========================================
  // MANEJO DE AUDIO WEB AUDIO API Y WORKLETS
  // ==========================================

  private async initAudioCapture(): Promise<void> {
    if (this.pcmUnsubscribe) return

    try {
      await this.audioCapture.startCapture()

      this.pcmUnsubscribe = this.audioCapture.subscribePcm((pcm16: Int16Array) => {
        if (this.config.isMuted) return
        const base64 = this.arrayBufferToBase64(pcm16.buffer)

        this.sendWsMessage({
          type: 'audio_chunk',
          pcmBase64: base64,
        })
      })

      if (this.analyserAssistant) {
        this.audioCapture.registerOutputAnalyser(this.analyserAssistant)
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.notifyError({
        message: `Error accediendo al micrófono: ${error.message}`,
        code: 'MIC_ACCESS_DENIED',
      })
      this.setState('ERROR')
    }
  }

  private stopAudioCapture(): void {
    if (this.pcmUnsubscribe) {
      this.pcmUnsubscribe()
      this.pcmUnsubscribe = null
    }
  }

  private cleanupAudio(): void {
    this.stopAudioCapture()
    if (this.metricsUnsubscribe) {
      this.metricsUnsubscribe()
      this.metricsUnsubscribe = null
    }
    if (this.playbackCtx) {
      try {
        this.playbackCtx.close()
      } catch {}
      this.playbackCtx = null
    }
    this.audioCapture.registerOutputAnalyser(null)
    this.activeAudioSources = []
    this.nextPlayTime = 0
  }

  /**
   * Reproducción progresiva de audio recibido de ARES (PCM 24kHz 16-bit mono)
   */
  private async enqueueSynthesizedAudio(pcmBase64: string): Promise<void> {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (!this.playbackCtx) {
        // Inicializar AudioContext a la frecuencia nativa del hardware (p. ej. 48kHz o 44.1kHz en macOS)
        // Web Audio resampleará limpiamente el buffer de 24kHz sin desfasar el reloj ni acelerar el audio (cero efecto helio)
        this.playbackCtx = new AudioCtxClass()
        this.analyserAssistant = this.playbackCtx.createAnalyser()
        this.analyserAssistant.fftSize = 64
        this.analyserAssistant.connect(this.playbackCtx.destination)
        this.audioCapture.registerOutputAnalyser(this.analyserAssistant)

        if (!this.metricsUnsubscribe) {
          this.metricsUnsubscribe = this.audioCapture.subscribeMetrics(metrics => {
            const visualData = {
              userLevel: metrics.source === 'user' ? metrics.rms : 0,
              assistantLevel: metrics.source === 'assistant' ? metrics.rms : 0,
              frequencyData: metrics.frequencyData,
              timeDomainData: metrics.timeDomainData,
              source: metrics.source,
            }
            for (const l of this.listeners) {
              l.onAudioLevel?.(visualData)
            }
          })
        }
      }

      if (this.playbackCtx.state === 'suspended') {
        await this.playbackCtx.resume()
      }

      const pcmBytes = this.base64ToArrayBuffer(pcmBase64)
      const validBytes = pcmBytes.byteLength - (pcmBytes.byteLength % 2)
      if (validBytes <= 0) return

      const dataView = new DataView(pcmBytes, 0, validBytes)
      const numSamples = validBytes / 2
      const float32Array = new Float32Array(numSamples)

      for (let i = 0; i < numSamples; i++) {
        // Little-endian Linear PCM 16-bit
        const sample = dataView.getInt16(i * 2, true)
        float32Array[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff
      }

      const audioBuffer = this.playbackCtx.createBuffer(1, float32Array.length, 24000)
      audioBuffer.copyToChannel(float32Array, 0)

      const source = this.playbackCtx.createBufferSource()
      source.buffer = audioBuffer

      // Control de volumen
      const gainNode = this.playbackCtx.createGain()
      gainNode.gain.value = this.config.volume
      source.connect(gainNode)

      if (this.analyserAssistant) {
        gainNode.connect(this.analyserAssistant)
      } else {
        gainNode.connect(this.playbackCtx.destination)
      }

      const currentTime = this.playbackCtx.currentTime
      const startTime = Math.max(currentTime, this.nextPlayTime)
      source.start(startTime)

      this.nextPlayTime = startTime + audioBuffer.duration
      this.activeAudioSources.push(source)

      source.onended = () => {
        this.activeAudioSources = this.activeAudioSources.filter(s => s !== source)
        this.checkPlaybackCompletion()
      }
    } catch (err: unknown) {
      console.warn('[NOVA SONIC PROVIDER] Error reproduciendo chunk de audio:', err)
    }
  }

  /**
   * Verifica de forma robusta la finalización de la reproducción antes de reabrir el micrófono,
   * evitando que micro-pausas entre chunks de audio activen el micro y causen falso barge-in.
   */
  private checkPlaybackCompletion(): void {
    if (this.turnCompletionTimeout) {
      clearTimeout(this.turnCompletionTimeout)
      this.turnCompletionTimeout = null
    }

    if (this.activeAudioSources.length > 0) return

    if (this.isTurnCompleted) {
      this.finishPlaybackTurn()
    } else {
      // Ventana de gracia esperando posibles chunks adicionales en tránsito
      this.turnCompletionTimeout = setTimeout(() => {
        if (this.activeAudioSources.length === 0 && this.state === 'SPEAKING') {
          this.finishPlaybackTurn()
        }
      }, 1000)
    }
  }

  private finishPlaybackTurn(): void {
    if (this.state === 'SPEAKING') {
      this.setState('LISTENING')
      if (this.config.interactionMode === 'HANDS_FREE' && !this.config.isMuted) {
        // Pausa de 350ms para que el eco en el ambiente acústico decaiga por completo
        setTimeout(() => {
          if (this.state === 'LISTENING') {
            this.startListening()
          }
        }, 350)
      }
    }
  }

  // ==========================================
  // DISPATCHER DE MENSAJES Y EVENTOS
  // ==========================================

  private async handleIncomingMessage(raw: any): Promise<void> {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!data || !data.type) return

      switch (data.type) {
        case 'state_change': {
          this.setState(data.state)
          break
        }

        case 'barge_in': {
          this.isTurnCompleted = true
          this.flushAudioBuffers()
          for (const l of this.listeners) {
            l.onBargeIn?.()
          }
          break
        }

        case 'completion_end': {
          this.isTurnCompleted = true
          this.checkPlaybackCompletion()
          for (const l of this.listeners) {
            l.onCompletionEnd?.()
          }
          break
        }

        case 'conversation_state': {
          for (const l of this.listeners) {
            l.onConversationStateChange?.(data.state)
          }
          break
        }

        case 'audio_chunk': {
          if (data.pcmBase64) {
            this.isTurnCompleted = false
            if (this.turnCompletionTimeout) {
              clearTimeout(this.turnCompletionTimeout)
              this.turnCompletionTimeout = null
            }
            this.setState('SPEAKING')
            await this.enqueueSynthesizedAudio(data.pcmBase64)
          }
          break
        }

        case 'transcript': {
          this.notifyTranscript({
            id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: data.role || 'assistant',
            text: data.text || '',
            isFinal: Boolean(data.isFinal),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          })
          break
        }

        case 'tool_call': {
          this.setState('TOOL_EXECUTION')
          let toolOutput: Record<string, unknown> = {}

          // Notificar al listener de herramientas del frontend
          for (const l of this.listeners) {
            if (l.onToolCall) {
              toolOutput = await l.onToolCall(data.tool, data.input, data.toolUseId)
            }
          }

          // Enviar resultado de vuelta al gateway
          this.sendWsMessage({
            type: 'tool_result',
            toolUseId: data.toolUseId,
            output: toolOutput,
          })
          break
        }

        case 'error': {
          this.notifyError({
            message: data.message || 'Error en ARES Voice Gateway',
            code: data.code,
          })
          this.setState('ERROR')
          break
        }
      }
    } catch (e: unknown) {
      console.error('[NOVA SONIC PROVIDER] Error al decodificar mensaje entrante:', e)
    }
  }


  private setState(newState: VoiceState): void {
    if (this.state === newState) return
    this.state = newState
    for (const l of this.listeners) {
      l.onStateChange?.(newState)
    }
  }

  private notifyTranscript(event: TranscriptEvent): void {
    for (const l of this.listeners) {
      l.onTranscript?.(event)
    }
  }

  private notifyError(err: { message: string; code?: string; fatal?: boolean }): void {
    for (const l of this.listeners) {
      l.onError?.(err)
    }
  }

  private sendWsMessage(msg: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}
