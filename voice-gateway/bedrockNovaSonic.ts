/**
 * ARES MISSION COMMS - Amazon Bedrock Nova 2.5 Sonic Session Manager
 * Gestiona el canal de streaming bidireccional HTTP/2 con Amazon Bedrock Runtime.
 */

import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'
import { GATEWAY_CONFIG } from './config.js'
import { BACKEND_BEDROCK_TOOLS } from './toolsRegistry.js'

export interface NovaSonicCallbacks {
  onAudioChunk: (pcmBase64: string) => void
  onTranscriptText: (text: string, isFinal: boolean, role?: 'user' | 'assistant') => void
  onToolUse: (toolUseId: string, name: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>
  onBargeIn?: () => void
  onCompletionEnd?: () => void
  onError: (error: Error) => void
  onSessionEnded: () => void
}

export class BedrockNovaSonicSession {
  private client: BedrockRuntimeClient
  private active = false
  private callbacks: NovaSonicCallbacks
  private voiceId: string
  private promptName: string
  private currentContentName: string | null = null
  private isUserContentOpen = false
  private currentOutputRole: 'user' | 'assistant' = 'assistant'

  // Cola de eventos asíncronos para el generador de entrada
  private inputQueue: Uint8Array[] = []
  private queueResolver: (() => void) | null = null
  private isStreamClosed = false
  private lastActivityTimestamp = Date.now()
  private keepaliveTimer: NodeJS.Timeout | null = null

  constructor(voiceId: string, callbacks: NovaSonicCallbacks) {
    this.voiceId = voiceId || GATEWAY_CONFIG.defaultVoice
    this.callbacks = callbacks
    this.promptName = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    this.client = new BedrockRuntimeClient({
      region: GATEWAY_CONFIG.bedrockRegion,
    })
  }

  public resolveVoiceForLanguage(voiceId: string, language: string): string {
    const langLower = (language || 'en').toLowerCase()
    if (langLower.startsWith('es')) {
      if (voiceId === 'tiffany') return 'lupe'
      if (voiceId === 'matthew') return 'carlos'
      if (voiceId === 'carlos' || voiceId === 'lupe') return voiceId
      return 'carlos'
    } else {
      if (voiceId === 'carlos') return 'matthew'
      if (voiceId === 'lupe') return 'tiffany'
      if (voiceId === 'matthew' || voiceId === 'tiffany') return voiceId
      return 'matthew'
    }
  }

  /**
   * Inicia la sesión de streaming bidireccional con Bedrock
   */
  public async startSession(initialContext?: Record<string, unknown>, language: string = 'en'): Promise<void> {
    this.active = true
    this.isStreamClosed = false

    // Generador asíncrono que alimenta el body del comando Bedrock
    const self = this
    async function* inputGenerator() {
      // 1. sessionStart
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                sessionStart: {
                  inferenceConfiguration: {
                    maxTokens: 2500,
                    topP: 0.9,
                    temperature: 0.3,
                  },
                  turnDetectionConfiguration: {
                    endpointingSensitivity: 'LOW',
                  },
                },
              },
            })
          ),
        },
      }

      // 2. promptStart
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                promptStart: {
                  promptName: self.promptName,
                  textOutputConfiguration: {
                    mediaType: 'text/plain',
                  },
                  audioOutputConfiguration: {
                    mediaType: 'audio/lpcm',
                    sampleRateHertz: GATEWAY_CONFIG.sampleRateOutput,
                    sampleSizeBits: 16,
                    channelCount: 1,
                    voiceId: self.resolveVoiceForLanguage(self.voiceId, language),
                  },
                  toolConfiguration: {
                    tools: BACKEND_BEDROCK_TOOLS,
                  },
                },
              },
            })
          ),
        },
      }

      // 3. System Prompt (contentStart)
      const systemContentName = `c-sys-${Date.now()}`
      const systemPromptText = self.buildSystemPrompt(initialContext, language)

      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                contentStart: {
                  promptName: self.promptName,
                  contentName: systemContentName,
                  type: 'TEXT',
                  role: 'SYSTEM',
                  interactive: false,
                  textInputConfiguration: {
                    mediaType: 'text/plain',
                  },
                },
              },
            })
          ),
        },
      }

      // 4. System textInput
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                textInput: {
                  promptName: self.promptName,
                  contentName: systemContentName,
                  content: systemPromptText,
                },
              },
            })
          ),
        },
      }

      // 5. System contentEnd
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                contentEnd: {
                  promptName: self.promptName,
                  contentName: systemContentName,
                },
              },
            })
          ),
        },
      }

      // Bucle dinámico que entrega los eventos en cola desde el navegador
      while (!self.isStreamClosed || self.inputQueue.length > 0) {
        if (self.inputQueue.length > 0) {
          const nextBytes = self.inputQueue.shift()!
          yield {
            chunk: {
              bytes: nextBytes,
            },
          }
        } else {
          // Esperar el próximo evento
          await new Promise<void>(resolve => {
            self.queueResolver = resolve
          })
        }
      }

      // Finalización del prompt y la sesión
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                promptEnd: {
                  promptName: self.promptName,
                },
              },
            })
          ),
        },
      }

      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              event: {
                sessionEnd: {},
              },
            })
          ),
        },
      }
    }

    const command = new InvokeModelWithBidirectionalStreamCommand({
      modelId: GATEWAY_CONFIG.bedrockModelId,
      body: inputGenerator(),
    })

    try {
      const response = await this.client.send(command)
      this.startKeepAlive()
      this.consumeOutputEvents(response.body)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.callbacks.onError(error)
      this.closeSession()
    }
  }

  /**
   * Consume la respuesta del stream bidireccional de Bedrock
   */
  private async consumeOutputEvents(bodyStream: any) {
    if (!bodyStream) return

    try {
      for await (const part of bodyStream) {
        if (!this.active) break

        if (part.chunk?.bytes) {
          const jsonStr = new TextDecoder().decode(part.chunk.bytes)
          let parsed: any
          try {
            parsed = JSON.parse(jsonStr)
          } catch {
            continue
          }

          const event = parsed.event || {}
          const eventKey = Object.keys(event)[0]

          if (eventKey === 'contentStart') {
            const role = event.contentStart?.role
            if (role) {
              this.currentOutputRole = String(role).toLowerCase() === 'user' ? 'user' : 'assistant'
            }
          } else if (eventKey === 'audioOutput') {
            const pcmBase64 = event.audioOutput?.content
            if (pcmBase64) {
              this.callbacks.onAudioChunk(pcmBase64)
            }
          } else if (eventKey === 'textOutput') {
            const text = event.textOutput?.content
            if (text && text.trim().length > 0) {
              this.callbacks.onTranscriptText(text, false, this.currentOutputRole)
            }
          } else if (eventKey === 'toolUse') {
            const toolUse = event.toolUse
            if (toolUse) {
              const toolUseId = toolUse.toolUseId || toolUse.id || `tool-${Date.now()}`
              const name = toolUse.toolName || toolUse.name || toolUse.tool?.name || ''
              let content = toolUse.input || toolUse.content || toolUse.parameters || toolUse.arguments || {}
              if (typeof content === 'string') {
                try {
                  content = JSON.parse(content)
                } catch {}
              }
              console.log(`[ARES VOICE GATEWAY] Bedrock invocó herramienta: ${name}`, content)
              // Ejecutar la herramienta a través del callback
              const output = await this.callbacks.onToolUse(toolUseId, name, content)
              // Enviar el resultado de vuelta a Bedrock
              this.sendToolResult(toolUseId, output)
            }
          } else if (eventKey === 'contentEnd') {
            this.callbacks.onTranscriptText('', true, this.currentOutputRole)
          } else if (eventKey === 'completionEnd') {
            console.log(`[ARES VOICE GATEWAY] completionEnd detectado: turno de respuesta finalizado. Sesión persistente activa.`)
            this.callbacks.onCompletionEnd?.()
          } else if (eventKey === 'bargeIn' || eventKey === 'BidiBargeInEvent' || eventKey.toLowerCase().includes('bargein')) {
            console.log(`[ARES VOICE GATEWAY] Evento Barge-In detectado desde Bedrock: interrumpiendo reproducción previa.`)
            this.callbacks.onBargeIn?.()
          }
        }
      }
    } catch (err: unknown) {
      if (this.active) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.callbacks.onError(error)
      }
    } finally {
      this.closeSession()
      this.callbacks.onSessionEnded()
    }
  }

  /**
   * Envía un chunk de audio PCM (16kHz 16-bit mono) desde el micrófono
   */
  public sendAudioChunk(pcmBase64: string): void {
    if (!this.active || this.isStreamClosed) return

    // Asegurar apertura del bloque de contenido de audio
    if (!this.isUserContentOpen) {
      this.currentContentName = `c-usr-audio-${Date.now()}`
      this.isUserContentOpen = true

      this.enqueueEvent({
        event: {
          contentStart: {
            promptName: this.promptName,
            contentName: this.currentContentName,
            type: 'AUDIO',
            role: 'USER',
            interactive: true,
            audioInputConfiguration: {
              mediaType: 'audio/lpcm',
              sampleRateHertz: GATEWAY_CONFIG.sampleRateInput,
              sampleSizeBits: 16,
              channelCount: 1,
            },
          },
        },
      })
    }

    // Enviar fragmento de audio
    this.enqueueEvent({
      event: {
        audioInput: {
          promptName: this.promptName,
          contentName: this.currentContentName!,
          content: pcmBase64,
        },
      },
    })
  }

  /**
   * Finaliza el turno de audio del usuario
   */
  public endAudioTurn(): void {
    if (!this.active || !this.isUserContentOpen || !this.currentContentName) return

    this.enqueueEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: this.currentContentName,
        },
      },
    })

    this.isUserContentOpen = false
    this.currentContentName = null
  }

  /**
   * Envía un mensaje de texto dentro de la conversación
   */
  public sendTextMessage(text: string): void {
    if (!this.active || this.isStreamClosed) return

    // Si había un bloque de audio abierto, cerrarlo
    if (this.isUserContentOpen) {
      this.endAudioTurn()
    }

    const textContentName = `c-usr-text-${Date.now()}`

    this.enqueueEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: textContentName,
          type: 'TEXT',
          role: 'USER',
          interactive: true,
          textInputConfiguration: {
            mediaType: 'text/plain',
          },
        },
      },
    })

    this.enqueueEvent({
      event: {
        textInput: {
          promptName: this.promptName,
          contentName: textContentName,
          content: text,
        },
      },
    })

    this.enqueueEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: textContentName,
        },
      },
    })

    // Suministrar un bloque de audio de trigger para que Nova Sonic sintetice respuesta de voz
    const audioTriggerName = `c-usr-trig-${Date.now()}`
    this.enqueueEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: audioTriggerName,
          type: 'AUDIO',
          role: 'USER',
          interactive: true,
          audioInputConfiguration: {
            mediaType: 'audio/lpcm',
            sampleRateHertz: GATEWAY_CONFIG.sampleRateInput,
            sampleSizeBits: 16,
            channelCount: 1,
          },
        },
      },
    })

    const silenceFrame = Buffer.alloc(1600 * 2)
    this.enqueueEvent({
      event: {
        audioInput: {
          promptName: this.promptName,
          contentName: audioTriggerName,
          content: silenceFrame.toString('base64'),
        },
      },
    })

    this.enqueueEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: audioTriggerName,
        },
      },
    })
  }

  /**
   * Envía el resultado de ejecución de una herramienta a Bedrock
   */
  public sendToolResult(toolUseId: string, output: Record<string, unknown>): void {
    if (!this.active || this.isStreamClosed) return

    const toolResultContentName = `c-tool-${Date.now()}`

    this.enqueueEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: toolResultContentName,
          type: 'TOOL',
          role: 'TOOL',
          interactive: false,
          toolResultInputConfiguration: {
            toolUseId,
            type: 'TEXT',
            textInputConfiguration: {
              mediaType: 'text/plain',
            },
          },
        },
      },
    })

    this.enqueueEvent({
      event: {
        toolResult: {
          promptName: this.promptName,
          contentName: toolResultContentName,
          content: JSON.stringify(output),
        },
      },
    })

    this.enqueueEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: toolResultContentName,
        },
      },
    })
  }

  /**
   * Gestiona interrupción de turno (Barge-In) sin cerrar el stream bidireccional
   */
  public interrupt(): void {
    console.log(`[ARES VOICE GATEWAY] Interrupción (Barge-In) aplicada: conservando contexto y canal abierto.`)
    this.lastActivityTimestamp = Date.now()
  }

  /**
   * Cierra ordenadamente la sesión
   */
  public closeSession(): void {
    if (!this.active) return
    this.active = false
    this.isStreamClosed = true

    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer)
      this.keepaliveTimer = null
    }

    if (this.queueResolver) {
      this.queueResolver()
      this.queueResolver = null
    }
  }

  private startKeepAlive(): void {
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer)
    this.keepaliveTimer = setInterval(() => {
      if (!this.active || this.isStreamClosed) {
        if (this.keepaliveTimer) clearInterval(this.keepaliveTimer)
        return
      }
      const idleMs = Date.now() - this.lastActivityTimestamp
      // Si han pasado más de 20 segundos sin actividad, inyectar silencio keepalive para evitar el timeout de 55s de Bedrock
      if (idleMs >= 20000) {
        this.sendKeepAliveSilence()
      }
    }, 15000)
  }

  private sendKeepAliveSilence(): void {
    if (!this.active || this.isStreamClosed) return
    const silenceContentName = `c-ka-${Date.now()}`
    this.enqueueEvent({
      event: {
        contentStart: {
          promptName: this.promptName,
          contentName: silenceContentName,
          type: 'AUDIO',
          role: 'USER',
          interactive: false,
          audioInputConfiguration: {
            mediaType: 'audio/lpcm',
            sampleRateHertz: GATEWAY_CONFIG.sampleRateInput,
            sampleSizeBits: 16,
            channelCount: 1,
          },
        },
      },
    })

    const silenceBytes = Buffer.alloc(1600 * 2) // 100ms de silencio PCM
    this.enqueueEvent({
      event: {
        audioInput: {
          promptName: this.promptName,
          contentName: silenceContentName,
          content: silenceBytes.toString('base64'),
        },
      },
    })

    this.enqueueEvent({
      event: {
        contentEnd: {
          promptName: this.promptName,
          contentName: silenceContentName,
        },
      },
    })
  }

  private enqueueEvent(eventObj: any) {
    this.lastActivityTimestamp = Date.now()
    const bytes = new TextEncoder().encode(JSON.stringify(eventObj))
    this.inputQueue.push(bytes)
    if (this.queueResolver) {
      this.queueResolver()
      this.queueResolver = null
    }
  }

  private buildSystemPrompt(context?: Record<string, unknown>, initialLanguage: string = 'en'): string {
    const contextJson = context ? JSON.stringify(context, null, 2) : 'No initial mission context provided.'

    return `You are ARES (Advanced Rover & Exploration System), AI MISSION COPILOT for human Mars surface exploration (NASA Space Apps Challenge 2026).

PRIMARY DIRECTIVES:
1. BILINGUAL FLUENCY & CONVERSATION LANGUAGE:
   - Default primary and response language: ENGLISH. Initial selected language for this session: ${initialLanguage === 'es' ? 'Spanish' : 'English'}.
   - You are natively bilingual and can understand instructions in Spanish or English at any time without resetting the session.
   - Always respect the explicitly selected application language, even if the previous turn used another language. Switch only when the user changes the application setting or explicitly asks.
   - If the astronaut asks: "Switch to English", "Speak English", "ARES, speak English", "In English please" -> switch your response language to English and keep English for all subsequent turns until asked to switch back.
   - If the astronaut asks: "Cambiar a español", "Cambiá a español", "Hablá en español", "En español por favor" -> switch your response language to Spanish and keep Spanish for all subsequent turns.
   - If the astronaut speaks English while in Spanish mode without asking to change the response language, understand the command, execute any requested tool, and respond in Spanish (or English if in English mode).

2. VOICE & OPERATIONAL IDENTITY:
   - Calm, authoritative, scientific, concise, and decisive mission copilot.
   - Avoid overly long conversational monologues during real-time voice streaming; be direct, actionable, and succinct.
   - When introducing yourself or acknowledging wake word, use short phrases (e.g. "ARES en línea. A la escucha." / "ARES online. Standing by.").
   - When closing communications, use short phrases (e.g. "Enlace cerrado. En espera." / "Comms closed. Standing by.").
   - In all mission confirmations and tool completions, prioritize crisp, 1-sentence space cabin responses.

3. STRICT MARTIAN GEODESY (NON-NEGOTIABLE):
   - The official mean radius of Mars is strictly Rm = 3,389.5 km (3,389,500 m).
   - NEVER use the Earth radius (6,371 km) or WGS-84 terrestrial geodesy for Mars calculations.

4. EVA EXPLORATION & SAFETY RULES:
   - Walkback distances and slope categories in the prototype are illustrative planning assumptions, NOT NASA operational EVA limits.
   - Orbital imagery (CTX/MOLA) cannot resolve small rocks or ensure footing. Jezero's numeric CTX DEM yields exploratory proxies; Gale's procedural terrain is SIMULATED and not independently validated.
   - Separate OBSERVED, HISTORICAL, DERIVED, SIMULATED and UNASSESSED information; never declare a route safe or operational.

5. SCIENTIFIC TARGETS & NASA MISSIONS:
   - Mount Sharp (Aeolis Mons) in Gale Crater: ancient sedimentary layers, clay-sulfate transition zone, and boxwork mineral ridges (subsurface habitable hydrothermal networks investigated by Curiosity in 2024-2025).
   - Jezero Crater: ancient delta fan, river channel (Neretva Vallis), and biosignature preservation potential studied by Perseverance.

6. BILINGUAL TOOL INVOCATION:
   Immediately invoke the appropriate tactical tool when instructed in either English or Spanish:
   - "Focus on Mount Sharp" / "Enfocá Mount Sharp" / "Mirar Mount Sharp" -> focusGeographicTarget({ targetName: "Mount Sharp" })
   - "Show geological layers" / "Mostrá las capas geológicas" -> toggleScientificLayer({ layerId: "geology", enabled: true })
   - "Show thermal layer" / "Activa THEMIS" / "Activa capa térmica" -> toggleScientificLayer({ layerId: "themis", enabled: true })
   - "Show elevation relief" / "Activa MOLA" -> toggleScientificLayer({ layerId: "mola", enabled: true })
   - "Show CTX mosaic" / "Activa mosaico CTX" -> toggleScientificLayer({ layerId: "ctx", enabled: true })
   - "Plan an EVA route" / "Planificá una ruta EVA" -> previewEVARoute({ mode: "FOOT" })
   - "Compare both routes" / "Compará las dos rutas" -> compareMissionRoutes({ showModal: true })
   - "Start mission simulation" / "Iniciá la simulación de misión" -> startDiscoveryTour({ startIndex: 0 })
   - "Pause tour" / "Pausa el recorrido" -> pauseDiscoveryTour({})
   - "What are the geological features here?" / "¿Qué características geológicas tiene esta región?" -> explainSelectedRegion({})

7. MULTI-TURN CONTINUITY & CONVERSATIONAL MEMORY:
   - This is a continuous mission conversation, NOT isolated queries.
   - Maintain context across all turns. When the astronaut asks follow-up questions ("¿Qué altura tiene?", "¿Cuándo fue descubierta?", "What are its key features?", "Mostrame las fotos"), resolve pronouns and relative references using previously discussed landmarks and tool results.
   - Never ask the user to re-state coordinates, landmarks, or previous context that has already been mentioned in the active session.
   - After executing a tool, explain the outcome concisely and stay ready to answer subsequent questions.

ACTIVE MISSION CONTEXT:
${contextJson}`
  }
}
