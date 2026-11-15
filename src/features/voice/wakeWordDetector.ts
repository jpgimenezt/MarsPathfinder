/**
 * ARES MISSION COMMS - Local Wake Word Detector
 * Detecta localmente las frases de activación sin transmitir audio a AWS:
 * - English: "Hey, ARES"
 * - Spanish: "Hola, ARES"
 */

import type { SupportedLanguage } from '../i18n/commsTranslations'

export interface WakeWordEvent {
  phrase: string
  detectedLanguage: SupportedLanguage
  timestamp: number
}

export type WakeWordListener = (event: WakeWordEvent) => void

export class LocalWakeWordDetector {
  private recognition: any = null
  private isListening = false
  private listeners: WakeWordListener[] = []
  private restartTimeout: any = null
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
          for (let j = 0; j < result.length; ++j) {
            const transcript = (result[j].transcript || '').toLowerCase().trim()
            this.evaluateTranscript(transcript)
          }
        }
      }

      this.recognition.onerror = (err: any) => {
        // Errores de 'no-speech' o 'network' son habituales en escucha continua pasiva
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.debug('[WAKE WORD] Evento pasivo:', err.error)
        }
      }

      this.recognition.onend = () => {
        if (this.isListening && !this.isExplicitlyStopped) {
          // Reanudar escucha en bucle pasivo
          this.restartTimeout = setTimeout(() => {
            try {
              if (this.isListening && !this.isExplicitlyStopped) {
                this.recognition?.start()
              }
            } catch {}
          }, 300)
        }
      }
    } catch (e) {
      console.warn('[WAKE WORD] No se pudo inicializar SpeechRecognition local:', e)
    }
  }

  private evaluateTranscript(text: string): void {
    // Patrones de activación en inglés ("Hey ARES")
    const englishPatterns = [
      /\bhey\s+ares\b/i,
      /\bhey\s+iris\b/i, // Variación fonética común
      /\bhey\s+air\s*is\b/i,
      /\bay\s+ares\b/i,
    ]

    // Patrones de activación en español ("Hola ARES")
    const spanishPatterns = [
      /\bhola\s+ares\b/i,
      /\bhola\s+áres\b/i,
      /\bhola\s+copiloto\b/i,
      /\boye\s+ares\b/i,
    ]

    for (const pat of englishPatterns) {
      if (pat.test(text)) {
        this.triggerWake('Hey, ARES', 'en')
        return
      }
    }

    for (const pat of spanishPatterns) {
      if (pat.test(text)) {
        this.triggerWake('Hola, ARES', 'es')
        return
      }
    }
  }

  private triggerWake(phrase: string, detectedLanguage: SupportedLanguage): void {
    console.log(`[WAKE WORD DETECTED] ${phrase} (Idioma inferido: ${detectedLanguage})`)
    this.playAcknowledgeChime()

    const event: WakeWordEvent = {
      phrase,
      detectedLanguage,
      timestamp: Date.now(),
    }

    for (const listener of this.listeners) {
      listener(event)
    }
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
    if (this.restartTimeout) clearTimeout(this.restartTimeout)
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
}
