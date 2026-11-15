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
import { resolveBilingualTool } from './bilingualCommandRegistry'

export interface WakeWordEvent {
  phrase: string
  detectedLanguage: SupportedLanguage
  timestamp: number
  trailingCommand?: string
}

export interface WakeWordMatchResult {
  isWake: boolean
  wakePhrase: string
  detectedLanguage: SupportedLanguage
  trailingCommand?: string
}

/**
 * Motor fonético de última generación para detección de "Hey ARES" y "Hola ARES",
 * con tolerancia a truncamientos acústicos iniciales (clipping de fonemas como "res", "eiares", "ey ares")
 * y reconocimiento inmediato de comandos adjuntos.
 */
export function matchWakeWordPhonetic(rawText: string, currentLang: SupportedLanguage = 'es'): WakeWordMatchResult | null {
  if (!rawText || !rawText.trim()) return null
  const text = rawText.trim()
  const lower = text.toLowerCase()

  // 1. Patrones estándar en inglés
  const englishRegex = /\b(?:hey|hay|hi|hello|ok|okay)\s*[,.:;]?\s*(?:ares|áres|alex|alice|iris|aris|eric|alres|copilot|copiloto|eiares|res)\b/i
  // 2. Patrones estándar en español
  const spanishRegex = /\b(?:hola|ola|oye|ey|ei|ay|buenos\s+dias)\s*[,.:;]?\s*(?:ares|áres|alex|alice|iris|aris|eric|alres|copiloto|copilot|eiares|res)\b/i
  // 3. Variantes fonéticas recortadas / clipped (cuando el navegador o micrófono corta el inicio "H" o "Hey")
  // Ejemplos reportados por astronautas: "res", "eiares", "eyares", "ey ares", "eares", "ares"
  const clippedRegex = /\b(?:eiares|eyares|eares|iares|yares|ei\s+ares|ey\s+ares|e\s+ares|ay\s+ares|ai\s+ares|hay\s+ares|ah\s+ares|res|rez|eres|e\s+res|ei\s+res|ey\s+res)\b/i
  // 4. Menciones directas de ARES o COPILOTO
  const directRegex = /\b(?:ares|áres|alex|iris|aris|copiloto|copilot)\b/i

  const engMatch = lower.match(englishRegex)
  const espMatch = lower.match(spanishRegex)
  const clipMatch = lower.match(clippedRegex)
  const dirMatch = lower.match(directRegex)

  const candidates: { match: RegExpMatchArray; lang: SupportedLanguage }[] = []
  if (engMatch) candidates.push({ match: engMatch, lang: 'en' })
  if (espMatch) candidates.push({ match: espMatch, lang: 'es' })
  if (clipMatch) candidates.push({ match: clipMatch, lang: currentLang })
  if (dirMatch) candidates.push({ match: dirMatch, lang: currentLang })

  if (candidates.length === 0) return null

  // Seleccionar la coincidencia que aparece primero en el audio
  candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0))
  const best = candidates[0]
  const matchedPrefix = best.match[0]
  const startIndex = best.match.index ?? 0
  let detectedLang = best.lang

  const trailing = text.slice(startIndex + matchedPrefix.length).replace(/^[,.:;\s]+/, '').trim()

  // Heurística de idioma sobre el comando adjunto
  if (trailing) {
    if (/(?:enfoc[aá]|activ[aá]|mostr[aá]|calcul[aá]|capas|relieve|inercia|geolog|ruta|donde|hola|cambiar)/i.test(trailing)) {
      detectedLang = 'es'
    } else if (/(?:focus|toggle|show|layer|thermal|elevation|route|where|hello|switch)/i.test(trailing)) {
      detectedLang = 'en'
    }
  }

  return {
    isWake: true,
    wakePhrase: matchedPrefix,
    detectedLanguage: detectedLang,
    trailingCommand: trailing || undefined,
  }
}

export type WakeWordListener = (event: WakeWordEvent) => void
export type CommandListener = (command: string, language: SupportedLanguage) => void
export type DisconnectListener = () => void
export type InterruptListener = () => void

export class LocalWakeWordDetector {
  private recognition: any = null
  private isListening = false
  private isCommandListening = false
  private currentLanguage: SupportedLanguage = 'es'
  private listeners: WakeWordListener[] = []
  private commandListeners: CommandListener[] = []
  private disconnectListeners: DisconnectListener[] = []
  private interruptListeners: InterruptListener[] = []
  private restartTimeout: any = null
  private isExplicitlyStopped = false

  private lastTriggeredWakeTime = 0
  private lastEmittedCommand = ''
  private lastEmittedCommandTime = 0

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
    const trimmed = text.trim()
    if (!trimmed) return

    // 0. Detección inmediata de comando vocal de interrupción (Barge-In)
    const interruptMatch = trimmed.match(/\b(detener|detente|para|parar|silencio|stop|cancela|cancelar|basta|callate|cállate|quiet|pause)\b/i)
    if (interruptMatch) {
      console.log(`[VOICE INTERRUPT DETECTED] Interrupción por comando vocal: "${trimmed}"`)
      this.emitInterrupt()
      return
    }

    // 1. Detección de Wake Word mediante motor fonético tolerante de última generación
    const wakeResult = matchWakeWordPhonetic(trimmed, this.currentLanguage)
    if (wakeResult) {
      const now = Date.now()
      this.currentLanguage = wakeResult.detectedLanguage

      // Evitar spam si el navegador envía eventos interinos continuos de la misma frase en < 1500ms
      const isNewWake = now - this.lastTriggeredWakeTime > 1500
      if (isNewWake) {
        this.lastTriggeredWakeTime = now
        this.triggerWake(wakeResult.wakePhrase, wakeResult.detectedLanguage, wakeResult.trailingCommand)
      }

      // Si viene con comando adjunto (ej: "Hey ARES enfoca Mount Sharp" o "eiares activa themis")
      if (wakeResult.trailingCommand && wakeResult.trailingCommand.length > 2) {
        const cmd = wakeResult.trailingCommand
        const isResolved = resolveBilingualTool(cmd) !== null
        // Emitir si es final O si ya resolvimos semánticamente una herramienta táctica válida
        if (isFinal || isResolved) {
          if (cmd !== this.lastEmittedCommand || now - this.lastEmittedCommandTime > 2500) {
            this.lastEmittedCommand = cmd
            this.lastEmittedCommandTime = now
            this.emitCommand(cmd, wakeResult.detectedLanguage)
          }
        }
      }
      return
    }

    // 2. Verificar comando explícito de desconexión / cierre de comunicaciones
    const disconnectMatch = trimmed.match(/\b(cerrar\s+comunicaciones|desconectar|cortar\s+enlace|terminar\s+sesion|disconnect|close\s+comms|end\s+session)\b/i)
    if (disconnectMatch) {
      this.emitDisconnect()
      return
    }

    // 3. Si estamos en modo de escucha de comando activo tras el despertar (conversación continua)
    if (this.isCommandListening && trimmed.length > 2) {
      const now = Date.now()
      const isResolved = resolveBilingualTool(trimmed) !== null
      if (isFinal || isResolved) {
        if (trimmed !== this.lastEmittedCommand || now - this.lastEmittedCommandTime > 2500) {
          this.lastEmittedCommand = trimmed
          this.lastEmittedCommandTime = now
          this.emitCommand(trimmed, this.currentLanguage)
        }
      }
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

  private emitInterrupt(): void {
    for (const listener of this.interruptListeners) {
      listener()
    }
  }

  private emitCommand(command: string, language: SupportedLanguage): void {
    console.log(`[VOICE COMMAND CAPTURED] "${command}" (Lang: ${language})`)
    for (const listener of this.commandListeners) {
      listener(command, language)
    }
  }

  private emitDisconnect(): void {
    console.log(`[VOICE DISCONNECT REQUESTED] Cierre ordenado de comunicaciones`)
    this.setCommandMode(false)
    for (const listener of this.disconnectListeners) {
      listener()
    }
  }

  public subscribeInterrupt(listener: InterruptListener): () => void {
    this.interruptListeners.push(listener)
    return () => {
      this.interruptListeners = this.interruptListeners.filter(l => l !== listener)
    }
  }

  /**
   * Activa o desactiva la escucha activa continua de comandos (mantiene la sesión viva para multiturno)
   */
  public setCommandMode(active: boolean): void {
    this.isCommandListening = active
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

  public subscribeDisconnect(listener: DisconnectListener): () => void {
    this.disconnectListeners.push(listener)
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter(l => l !== listener)
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
    const isSpanish = language === 'es'
    utterance.lang = isSpanish ? 'es-US' : 'en-US'
    utterance.rate = 0.98 // Cadencia táctica natural y comprensible
    utterance.pitch = 0.92 // Tono sobrio, cálido y resonante de misión (elimina cualquier efecto helio o chillón)

    // Selección inteligente de voces naturales y profesionales
    const voices = window.speechSynthesis.getVoices?.() || []
    const langPrefix = isSpanish ? 'es' : 'en'

    const scoreVoice = (v: SpeechSynthesisVoice): number => {
      const name = v.name.toLowerCase()
      const lang = v.lang.toLowerCase()
      let score = 0

      // Descartar absolutamente voces de novedad, caricaturescas o de tono helio/infantil
      if (
        name.includes('junior') || name.includes('bad news') || name.includes('albert') ||
        name.includes('fred') || name.includes('zarvox') || name.includes('trinoids') ||
        name.includes('whisper') || name.includes('princess') || name.includes('hysterical') ||
        name.includes('bells') || name.includes('boing') || name.includes('bubbles') ||
        name.includes('cellos') || name.includes('deranged') || name.includes('good news') ||
        name.includes('organ') || name.includes('ralph') || name.includes('jester')
      ) {
        return -1000
      }

      // Coincidencia estricta de idioma
      if (lang.startsWith(langPrefix)) {
        score += 100
      } else {
        return -500 // Evitar hablar español con voz exclusivamente inglesa o viceversa
      }

      // Regiones preferidas
      if (isSpanish) {
        if (lang.includes('es-us') || lang.includes('es-419') || lang.includes('es-mx')) score += 40
        if (lang.includes('es-es') || lang.includes('es-ar')) score += 30
      } else {
        if (lang.includes('en-us')) score += 40
        if (lang.includes('en-gb')) score += 30
      }

      // Calidad de síntesis (voces neuronales y premium)
      if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 50
      if (name.includes('premium') || name.includes('enhanced') || name.includes('google')) score += 40

      // Voces reconocidas de alta fidelidad para español
      if (isSpanish) {
        if (name.includes('carlos') || name.includes('jorge') || name.includes('diego') || name.includes('alvaro')) score += 35
        if (name.includes('lupe') || name.includes('monica') || name.includes('paulina') || name.includes('dalia') || name.includes('soledad')) score += 30
      } else {
        if (name.includes('matthew') || name.includes('guy') || name.includes('ryan') || name.includes('daniel')) score += 35
        if (name.includes('tiffany') || name.includes('jenny') || name.includes('aria') || name.includes('samantha')) score += 30
      }

      return score
    }

    const eligible = voices
      .map(v => ({ voice: v, score: scoreVoice(v) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)

    if (eligible.length > 0) {
      utterance.voice = eligible[0].voice
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
