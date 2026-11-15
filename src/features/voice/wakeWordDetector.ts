/**
 * ARES MISSION COMMS - Local Wake Word & Continuous Voice Command Detector
 * Detecta localmente frases de activación y captura comandos de voz continuos
 * sin transmitir audio pasivo a AWS:
 * - English: "Hey, ARES"
 * - Spanish: "Hola, ARES"
 * 
 * Permite interacción completamente manos libres (hands-free):
 * - Detecta el comando en la misma frase ("Hey ARES, focus on Mount Sharp")
 * - O mantiene la escucha abierta tras el despertar para capturar instrucciones posteriores
 *   sin requerir presionar ningún botón.
 */

import type { SupportedLanguage } from '../i18n/commsTranslations'

export interface WakeWordEvent {
  phrase: string
  detectedLanguage: SupportedLanguage
  timestamp: number
  trailingCommand?: string
}

export type WakeWordListener = (event: WakeWordEvent) => void
export type CommandListener = (command: string, language: SupportedLanguage) => void

export class LocalWakeWordDetector {
  private recognition: any = null
  private isListening = false
  private isCommandListening = false
  private currentLanguage: SupportedLanguage = 'en'
  private listeners: WakeWordListener[] = []
  private commandListeners: CommandListener[] = []
  private restartTimeout: any = null
  private commandTimeout: any = null
  private isExplicitlyStopped = false

  constructor() {
    this.setupRecognition()
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )
  }

  private setupRecognition(): void {
    if (!this.isSupported()) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.maxAlternatives = 3

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const isFinal = result.isFinal
          for (let j = 0; j < result.length; ++j) {
            const transcript = (result[j].transcript || '').toLowerCase().trim()
            if (transcript) {
              this.evaluateTranscript(transcript, isFinal)
            }
          }
        }
      }

      this.recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.debug('[WAKE WORD / SPEECH] Evento pasivo:', err.error)
        }
      }

      this.recognition.onend = () => {
        if (this.isListening && !this.isExplicitlyStopped) {
          this.restartTimeout = setTimeout(() => {
            try {
              if (this.isListening && !this.isExplicitlyStopped) {
                this.recognition?.start()
              }
            } catch {}
          }, 250)
        }
      }
    } catch (e) {
      console.warn('[WAKE WORD] No se pudo inicializar SpeechRecognition local:', e)
    }
  }

  private evaluateTranscript(text: string, isFinal: boolean): void {
    // 1. Verificar si contiene la frase de activación (en inglés o español)
    const englishMatch = text.match(/\b(hey\s+ares|hey\s+iris|hey\s+air\s*is|ay\s+ares)\b/i)
    const spanishMatch = text.match(/\b(hola\s+ares|hola\s+áres|hola\s+copiloto|oye\s+ares)\b/i)

    if (englishMatch) {
      const wakePhrase = englishMatch[0]
      const trailing = text.slice((englishMatch.index || 0) + wakePhrase.length).replace(/^[,.\s]+/, '').trim()
      this.currentLanguage = 'en'
      this.triggerWake('Hey, ARES', 'en', trailing || undefined)
      if (trailing && isFinal) {
        this.emitCommand(trailing, 'en')
      }
      return
    }

    if (spanishMatch) {
      const wakePhrase = spanishMatch[0]
      const trailing = text.slice((spanishMatch.index || 0) + wakePhrase.length).replace(/^[,.\s]+/, '').trim()
      this.currentLanguage = 'es'
      this.triggerWake('Hola, ARES', 'es', trailing || undefined)
      if (trailing && isFinal) {
        this.emitCommand(trailing, 'es')
      }
      return
    }

    // 2. Si estamos en modo de escucha de comando activo tras el despertar
    if (this.isCommandListening && isFinal && text.length > 2) {
      this.emitCommand(text, this.currentLanguage)
    }
  }

  private triggerWake(phrase: string, detectedLanguage: SupportedLanguage, trailingCommand?: string): void {
    console.log(`[WAKE WORD DETECTED] ${phrase} (Lang: ${detectedLanguage}) Trailing: "${trailingCommand || ''}"`)
    this.playAcknowledgeChime()
    this.setCommandMode(true)

    const event: WakeWordEvent = {
      phrase,
      detectedLanguage,
      timestamp: Date.now(),
      trailingCommand,
    }

    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private emitCommand(command: string, language: SupportedLanguage): void {
    console.log(`[VOICE COMMAND CAPTURED] "${command}" (Lang: ${language})`)
    for (const listener of this.commandListeners) {
      listener(command, language)
    }

    // Reiniciar temporizador de modo comando (10 segundos de atención continua)
    this.scheduleCommandTimeout(10000)
  }

  /**
   * Activa o desactiva la escucha activa de comandos tras el despertar
   */
  public setCommandMode(active: boolean, timeoutMs: number = 10000): void {
    this.isCommandListening = active
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout)
      this.commandTimeout = null
    }

    if (active) {
      this.scheduleCommandTimeout(timeoutMs)
    }
  }

  private scheduleCommandTimeout(ms: number): void {
    if (this.commandTimeout) clearTimeout(this.commandTimeout)
    this.commandTimeout = setTimeout(() => {
      this.isCommandListening = false
    }, ms)
  }

  /**
   * Genera un chime acústico aeroespacial (bip doble de confirmación) mediante Web Audio API local
   */
  public playAcknowledgeChime(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtxClass) return
      const ctx = new AudioCtxClass()

      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.1) // E6

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1320, now + 0.12)
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.22) // A6

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.1)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.28)

      setTimeout(() => {
        try {
          ctx.close()
        } catch {}
      }, 500)
    } catch {}
  }

  public start(): boolean {
    if (!this.recognition || this.isListening) return false
    this.isExplicitlyStopped = false
    this.isListening = true
    try {
      this.recognition.start()
      return true
    } catch {
      return false
    }
  }

  public stop(): void {
    this.isExplicitlyStopped = true
    this.isListening = false
    this.isCommandListening = false
    if (this.restartTimeout) clearTimeout(this.restartTimeout)
    if (this.commandTimeout) clearTimeout(this.commandTimeout)
    try {
      this.recognition?.stop()
    } catch {}
  }

  public subscribe(listener: WakeWordListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  public subscribeCommand(listener: CommandListener): () => void {
    this.commandListeners.push(listener)
    return () => {
      this.commandListeners = this.commandListeners.filter(l => l !== listener)
    }
  }
}

/**
 * Síntesis de voz local de alta fidelidad mediante Web Speech API nativa.
 * Garantiza respuesta auditiva inmediata con 0ms de latencia y sin bloqueos de red.
 */
export function speakLocalSpeech(
  text: string,
  language: SupportedLanguage,
  callbacks?: {
    onStart?: () => void
    onEnd?: () => void
    onError?: () => void
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onEnd?.()
    return
  }

  try {
    window.speechSynthesis.cancel()

    // Limpiar etiquetas de formato o metadatos antes de hablar
    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/<.*?>/g, '')
      .replace(/\(.*?°[NE].*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()

    if (!cleanText) {
      callbacks?.onEnd?.()
      return
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = language === 'en' ? 'en-US' : 'es-ES'
    utterance.rate = 1.05
    utterance.pitch = 0.98

    // Intentar seleccionar una voz natural disponible
    const voices = window.speechSynthesis.getVoices?.() || []
    const targetLangPrefix = language === 'en' ? 'en' : 'es'
    const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix))
    if (matchedVoice) {
      utterance.voice = matchedVoice
    }

    utterance.onstart = () => callbacks?.onStart?.()
    utterance.onend = () => callbacks?.onEnd?.()
    utterance.onerror = () => callbacks?.onError?.()

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('[LOCAL SPEECH] Error sintetizando voz:', err)
    callbacks?.onEnd?.()
  }
}
