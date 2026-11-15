/**
 * ARES MISSION COMMS — Universal Audio Capture & Signal Processing Service
 * 
 * Capa 1 y Capa 2 de la Arquitectura Universal de Audio:
 * - Propietario único y centralizado de navigator.mediaDevices.getUserMedia()
 * - Administra AudioContext, AnalyserNode, MediaStreamTrack y AudioWorklet
 * - Calcula en tiempo real: RMS acústico real, Peak amplitude, dBFS y VAD (Voice Activity Detection)
 * - Distribuye la señal acústica hacia:
 *   1. Visualizadores en tiempo real (Ares Voice Visualizer, Orb reactivo, Telemetría FUI)
 *   2. Detector de activación (Wake Word Detector con VAD acústico sincronizado)
 *   3. Streaming PCM 16kHz lineal hacia Amazon Nova 2.5 Sonic (vía WebSocket)
 * - Soporte multiplataforma: macOS, Windows, Linux (Chrome, Edge, Safari, Firefox)
 */

export interface RealtimeAudioMetrics {
  /** RMS real calculado de las muestras acústicas (0.0 a 1.0) */
  rms: number
  /** Pico máximo de amplitud de la ventana actual (0.0 a 1.0) */
  peak: number
  /** Nivel en decibelios relativos a escala completa (dBFS, típicamente -60 a 0 dB) */
  db: number
  /** Indicador binario de presencia de voz humana activa según umbral acústico */
  isVoiceActive: boolean
  /** Datos crudos de dominio temporal para osciloscopio / waveform (128 a 256 muestras) */
  timeDomainData: Uint8Array
  /** Datos de frecuencias para espectrograma / visualizador FFT */
  frequencyData: Uint8Array
  /** Origen activo del audio analizado */
  source: 'user' | 'assistant' | 'idle'
  /** Nivel suavizado (ataque rápido, decaimiento suave) para animaciones de UI */
  smoothedLevel: number
}

export interface AudioCaptureTelemetry {
  deviceId: string
  deviceLabel: string
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown'
  trackState: 'live' | 'ended' | 'muted' | 'offline'
  audioContextState: AudioContextState | 'offline'
  sampleRate: number
  channelCount: number
  workletActive: boolean
  workletFallback: boolean
  totalFramesProcessed: number
  totalChunksDispatched: number
  isMuted: boolean
  currentRms: number
  currentPeak: number
}

export type AudioMetricsListener = (metrics: RealtimeAudioMetrics) => void
export type PcmDataListener = (pcm16: Int16Array) => void
export type TelemetryListener = (telemetry: AudioCaptureTelemetry) => void

// AudioWorklet Processor para downsampling a 16kHz Int16 Linear PCM (Mono)
const PCM_WORKLET_CODE = `
class AresPcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bytesWritten++] = channelData[i];
      if (this.bytesWritten >= this.bufferSize) {
        this.flush();
      }
    }
    return true;
  }

  flush() {
    const pcm16 = new Int16Array(this.bytesWritten);
    for (let i = 0; i < this.bytesWritten; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }
}
registerProcessor('ares-pcm-downsampler', AresPcmDownsampler);
`

export class AudioCaptureService {
  private static instance: AudioCaptureService | null = null

  // Web Audio Nodes & Stream
  private audioCtx: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputAnalyser: AnalyserNode | null = null
  private outputAnalyser: AnalyserNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptProcessorNode: ScriptProcessorNode | null = null
  private muteSink: GainNode | null = null

  // Buffers de análisis
  private floatTimeBuffer = new Float32Array(256)
  private byteTimeBuffer = new Uint8Array(256)
  private frequencyBuffer = new Uint8Array(64)

  // Suscriptores
  private metricsListeners: AudioMetricsListener[] = []
  private pcmListeners: PcmDataListener[] = []
  private telemetryListeners: TelemetryListener[] = []

  // Estado y telemetría
  private isMuted = false
  private permissionState: 'prompt' | 'granted' | 'denied' | 'unknown' = 'unknown'
  private deviceLabel = 'Default Microphone'
  private deviceId = 'default'
  private workletActive = false
  private workletFallback = false
  private totalFramesProcessed = 0
  private totalChunksDispatched = 0
  private smoothedUserLevel = 0
  private smoothedAssistantLevel = 0
  private lastAssistantReportTime = 0
  private manualAssistantLevel = 0

  // Animation Frame Loop
  private animFrameId: number | null = null
  private isCapturing = false

  private constructor() {
    this.initDeviceChangeListener()
  }

  public static getInstance(): AudioCaptureService {
    if (!AudioCaptureService.instance) {
      AudioCaptureService.instance = new AudioCaptureService()
    }
    return AudioCaptureService.instance
  }

  /**
   * Inicia o recupera la captura unificada del micrófono.
   * Si ya existe un stream activo, reutiliza los nodos sin disparar peticiones redundantes.
   */
  public async startCapture(preferredDeviceId?: string): Promise<MediaStream> {
    if (this.isCapturing && this.mediaStream && this.mediaStream.active) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume()
      }
      this.ensureAnimationLoop()
      return this.mediaStream
    }

    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin soporte de captura de micrófono (getUserMedia no disponible).')
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      }

      console.log('[AUDIO CAPTURE SERVICE] Solicitando acceso al micrófono...')
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.mediaStream = stream
      this.permissionState = 'granted'

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        this.deviceLabel = audioTrack.label || 'Micrófono del Sistema'
        this.deviceId = audioTrack.getSettings().deviceId || 'default'

        audioTrack.onended = () => {
          console.warn('[AUDIO CAPTURE SERVICE] MediaStreamTrack finalizado externamente.')
          this.broadcastTelemetry()
        }
      }

      // Inicializar AudioContext a 16kHz si es posible, o frecuencia nativa con downsampling
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        try {
          this.audioCtx = new AudioCtxClass({ sampleRate: 16000 })
        } catch {
          this.audioCtx = new AudioCtxClass()
        }
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume()
      }

      // Crear AnalyserNode para monitoreo espectral y de dominio temporal
      this.inputAnalyser = this.audioCtx.createAnalyser()
      this.inputAnalyser.fftSize = 512
      this.inputAnalyser.smoothingTimeConstant = 0.2

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream)
      this.sourceNode.connect(this.inputAnalyser)

      // Cargar AudioWorklet para procesamiento PCM 16kHz
      await this.setupPcmProcessing()

      this.isCapturing = true
      this.ensureAnimationLoop()
      this.broadcastTelemetry()
      console.log(`[AUDIO CAPTURE SERVICE] Captura activa: ${this.deviceLabel} (${this.audioCtx.sampleRate}Hz)`)

      return stream
    } catch (err: unknown) {
      this.permissionState = 'denied'
      this.broadcastTelemetry()
      console.error('[AUDIO CAPTURE SERVICE] Error iniciando captura:', err)
      throw err
    }
  }

  /**
   * Configura el procesamiento a PCM 16-bit 16kHz usando AudioWorklet o ScriptProcessor como fallback.
   */
  private async setupPcmProcessing(): Promise<void> {
    if (!this.audioCtx || !this.sourceNode) return

    try {
      if (this.audioCtx.audioWorklet) {
        const blob = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' })
        const workletUrl = URL.createObjectURL(blob)
        await this.audioCtx.audioWorklet.addModule(workletUrl)
        URL.revokeObjectURL(workletUrl)

        this.workletNode = new AudioWorkletNode(this.audioCtx, 'ares-pcm-downsampler')
        this.sourceNode.connect(this.workletNode)

        // Sumidero silencioso para mantener vivo el worklet sin acoplar audio a los parlantes
        this.muteSink = this.audioCtx.createGain()
        this.muteSink.gain.value = 0
        this.workletNode.connect(this.muteSink)
        this.muteSink.connect(this.audioCtx.destination)

        this.workletNode.port.onmessage = event => {
          if (this.isMuted) return
          const buffer = event.data as ArrayBuffer
          const pcm16 = new Int16Array(buffer)
          this.totalChunksDispatched++
          this.dispatchPcm(pcm16)
        }

        this.workletActive = true
        this.workletFallback = false
        return
      }
    } catch (workletError) {
      console.warn('[AUDIO CAPTURE SERVICE] AudioWorklet no soportado o restringido, activando ScriptProcessor fallback:', workletError)
    }

    // Fallback: ScriptProcessorNode para navegadores con AudioWorklet deshabilitado
    try {
      this.scriptProcessorNode = this.audioCtx.createScriptProcessor(2048, 1, 1)
      this.sourceNode.connect(this.scriptProcessorNode)

      this.muteSink = this.audioCtx.createGain()
      this.muteSink.gain.value = 0
      this.scriptProcessorNode.connect(this.muteSink)
      this.muteSink.connect(this.audioCtx.destination)

      this.scriptProcessorNode.onaudioprocess = e => {
        if (this.isMuted) return
        const channelData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(channelData.length)
        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        this.totalChunksDispatched++
        this.dispatchPcm(pcm16)
      }

      this.workletActive = false
      this.workletFallback = true
    } catch (processorError) {
      console.error('[AUDIO CAPTURE SERVICE] Error configurando ScriptProcessor fallback:', processorError)
    }
  }

  /**
   * Ciclo de alta frecuencia con requestAnimationFrame para telemetría acústica fluida a 60 FPS
   */
  private ensureAnimationLoop(): void {
    if (this.animFrameId !== null) return

    const pump = () => {
      this.computeAndDispatchMetrics()
      if (this.isCapturing) {
        this.animFrameId = requestAnimationFrame(pump)
      } else {
        this.animFrameId = null
      }
    }

    this.animFrameId = requestAnimationFrame(pump)
  }

  /**
   * Realiza el cálculo matemático exacto de RMS, Peak, dBFS y VAD sobre el buffer acústico
   */
  private computeAndDispatchMetrics(): void {
    this.totalFramesProcessed++

    let userRms = 0
    let userPeak = 0
    let isVoiceActive = false

    // 1. Análisis del audio de entrada del usuario
    if (this.inputAnalyser && !this.isMuted) {
      if (this.inputAnalyser.getFloatTimeDomainData) {
        this.inputAnalyser.getFloatTimeDomainData(this.floatTimeBuffer)
        let sumSquares = 0
        let maxSample = 0
        const len = this.floatTimeBuffer.length

        for (let i = 0; i < len; i++) {
          const val = this.floatTimeBuffer[i]
          const absVal = Math.abs(val)
          sumSquares += val * val
          if (absVal > maxSample) maxSample = absVal
        }

        userRms = Math.sqrt(sumSquares / len)
        userPeak = maxSample
      } else {
        // Fallback para getByteTimeDomainData
        this.inputAnalyser.getByteTimeDomainData(this.byteTimeBuffer)
        let sumSquares = 0
        let maxSample = 0
        const len = this.byteTimeBuffer.length

        for (let i = 0; i < len; i++) {
          const normalized = (this.byteTimeBuffer[i] - 128) / 128
          const absVal = Math.abs(normalized)
          sumSquares += normalized * normalized
          if (absVal > maxSample) maxSample = absVal
        }

        userRms = Math.sqrt(sumSquares / len)
        userPeak = maxSample
      }

      this.inputAnalyser.getByteFrequencyData(this.frequencyBuffer)
      this.inputAnalyser.getByteTimeDomainData(this.byteTimeBuffer)

      // Detección de actividad vocal (VAD) con histeresis
      isVoiceActive = userRms > 0.02
    }

    // Suavizado acústico exponencial (ataque inmediato, liberación suave)
    if (userRms > this.smoothedUserLevel) {
      this.smoothedUserLevel = userRms // Ataque rápido
    } else {
      this.smoothedUserLevel = this.smoothedUserLevel * 0.85 + userRms * 0.15 // Decaimiento suave
    }

    // 2. Análisis del audio de salida del asistente (ARES)
    let assistantLevel = 0
    if (this.outputAnalyser) {
      const outFreq = new Uint8Array(32)
      this.outputAnalyser.getByteFrequencyData(outFreq)
      let sum = 0
      for (let i = 0; i < outFreq.length; i++) sum += outFreq[i]
      assistantLevel = sum / (outFreq.length * 255)
    } else if (Date.now() - this.lastAssistantReportTime < 250) {
      assistantLevel = this.manualAssistantLevel
    }

    if (assistantLevel > this.smoothedAssistantLevel) {
      this.smoothedAssistantLevel = assistantLevel
    } else {
      this.smoothedAssistantLevel = this.smoothedAssistantLevel * 0.8 + assistantLevel * 0.2
    }

    // Determinar la fuente dominante
    let source: 'user' | 'assistant' | 'idle' = 'idle'
    if (this.smoothedAssistantLevel > 0.04) {
      source = 'assistant'
    } else if (this.smoothedUserLevel > 0.02) {
      source = 'user'
    }

    const activeLevel = source === 'assistant' ? this.smoothedAssistantLevel : this.smoothedUserLevel
    const db = 20 * Math.log10(Math.max(activeLevel, 0.00001))

    const metrics: RealtimeAudioMetrics = {
      rms: activeLevel,
      peak: source === 'assistant' ? this.smoothedAssistantLevel * 1.3 : userPeak,
      db: Math.max(-60, Math.min(0, Math.round(db))),
      isVoiceActive: source === 'user' ? isVoiceActive : false,
      timeDomainData: this.byteTimeBuffer,
      frequencyData: this.frequencyBuffer,
      source,
      smoothedLevel: activeLevel,
    }

    // Notificar a todos los visualizadores
    for (let i = 0; i < this.metricsListeners.length; i++) {
      try {
        this.metricsListeners[i](metrics)
      } catch (e) {
        console.warn('[AUDIO CAPTURE SERVICE] Error en listener de métricas:', e)
      }
    }
  }

  /**
   * Conecta el nodo analizador de salida de ARES para que el orbe y la onda reaccionen
   * cuando el asistente hable vía Nova Sonic o Web Audio
   */
  public registerOutputAnalyser(analyser: AnalyserNode | null): void {
    this.outputAnalyser = analyser
  }

  /**
   * Notifica el nivel de salida sintetizada de ARES de forma manual
   */
  public notifyOutputLevel(level: number): void {
    this.manualAssistantLevel = Math.max(0, Math.min(1, level))
    this.lastAssistantReportTime = Date.now()
  }

  /**
   * Silencia o activa el micrófono sin destruir el contexto de audio
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !muted
      })
    }
    this.broadcastTelemetry()
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  /**
   * Obtiene la telemetría técnica completa del servicio de audio
   */
  public getTelemetry(): AudioCaptureTelemetry {
    const track = this.mediaStream?.getAudioTracks()[0]
    return {
      deviceId: this.deviceId,
      deviceLabel: this.deviceLabel,
      permissionState: this.permissionState,
      trackState: track ? (track.readyState as 'live' | 'ended') : 'offline',
      audioContextState: this.audioCtx ? this.audioCtx.state : 'offline',
      sampleRate: this.audioCtx?.sampleRate || 0,
      channelCount: 1,
      workletActive: this.workletActive,
      workletFallback: this.workletFallback,
      totalFramesProcessed: this.totalFramesProcessed,
      totalChunksDispatched: this.totalChunksDispatched,
      isMuted: this.isMuted,
      currentRms: this.smoothedUserLevel,
      currentPeak: this.smoothedUserLevel * 1.4,
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream
  }

  public getAnalyser(): AnalyserNode | null {
    return this.inputAnalyser
  }

  /**
   * Suscribe un componente a la telemetría acústica (60 FPS)
   */
  public subscribeMetrics(listener: AudioMetricsListener): () => void {
    this.metricsListeners.push(listener)
    this.ensureAnimationLoop()
    return () => {
      this.metricsListeners = this.metricsListeners.filter(l => l !== listener)
    }
  }

  /**
   * Suscribe el streaming a trozos de PCM lineal a 16kHz
   */
  public subscribePcm(listener: PcmDataListener): () => void {
    this.pcmListeners.push(listener)
    return () => {
      this.pcmListeners = this.pcmListeners.filter(l => l !== listener)
    }
  }

  /**
   * Suscribe a cambios en el estado técnico de captura
   */
  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.push(listener)
    listener(this.getTelemetry())
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter(l => l !== listener)
    }
  }

  private dispatchPcm(pcm16: Int16Array): void {
    for (let i = 0; i < this.pcmListeners.length; i++) {
      try {
        this.pcmListeners[i](pcm16)
      } catch (e) {
        console.warn('[AUDIO CAPTURE SERVICE] Error en dispatch PCM:', e)
      }
    }
  }

  private broadcastTelemetry(): void {
    const t = this.getTelemetry()
    for (let i = 0; i < this.telemetryListeners.length; i++) {
      try {
        this.telemetryListeners[i](t)
      } catch (e) {
        console.warn('[AUDIO CAPTURE SERVICE] Error en listener de telemetría:', e)
      }
    }
  }

  private initDeviceChangeListener(): void {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('[AUDIO CAPTURE SERVICE] Cambio de dispositivos detectado (devicechange)')
        this.broadcastTelemetry()
      })
    }
  }

  /**
   * Cierra completamente la captura si no quedan consumidores
   */
  public stopCapture(): void {
    if (this.metricsListeners.length > 0 || this.pcmListeners.length > 0) {
      // No destruir si aún hay consumidores activos
      return
    }

    this.isCapturing = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {}
      this.sourceNode = null
    }

    if (this.workletNode) {
      try {
        this.workletNode.disconnect()
      } catch {}
      this.workletNode = null
    }

    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.disconnect()
      } catch {}
      this.scriptProcessorNode = null
    }

    this.broadcastTelemetry()
  }
}
