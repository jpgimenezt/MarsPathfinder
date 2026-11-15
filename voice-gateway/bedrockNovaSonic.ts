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
  onTranscriptText: (text: string, isFinal: boolean) => void
  onToolUse: (toolUseId: string, name: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>
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

  // Cola de eventos asíncronos para el generador de entrada
  private inputQueue: Uint8Array[] = []
  private queueResolver: (() => void) | null = null
  private isStreamClosed = false

  constructor(voiceId: string, callbacks: NovaSonicCallbacks) {
    this.voiceId = voiceId || GATEWAY_CONFIG.defaultVoice
    this.callbacks = callbacks
    this.promptName = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    this.client = new BedrockRuntimeClient({
      region: GATEWAY_CONFIG.bedrockRegion,
    })
  }

  /**
   * Inicia la sesión de streaming bidireccional con Bedrock
   */
  public async startSession(initialContext?: Record<string, unknown>): Promise<void> {
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
                    maxTokens: 1024,
                    topP: 0.9,
                    temperature: 0.3,
                  },
                  turnDetectionConfiguration: {
                    endpointingSensitivity: 'HIGH',
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
                    voiceId: self.voiceId,
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
      const systemPromptText = self.buildSystemPrompt(initialContext)

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

          if (eventKey === 'audioOutput') {
            const pcmBase64 = event.audioOutput?.content
            if (pcmBase64) {
              this.callbacks.onAudioChunk(pcmBase64)
            }
          } else if (eventKey === 'textOutput') {
            const text = event.textOutput?.content
            if (text) {
              this.callbacks.onTranscriptText(text, false)
            }
          } else if (eventKey === 'toolUse') {
            const toolUse = event.toolUse
            if (toolUse) {
              const { toolUseId, name, content } = toolUse
              // Ejecutar la herramienta a través del callback
              const output = await this.callbacks.onToolUse(toolUseId, name, content || {})
              // Enviar el resultado de vuelta a Bedrock
              this.sendToolResult(toolUseId, output)
            }
          } else if (eventKey === 'contentEnd') {
            this.callbacks.onTranscriptText('', true)
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
          type: 'TOOL_RESULT',
          role: 'USER',
          interactive: false,
          toolResultConfiguration: {
            toolUseId,
            status: 'SUCCESS',
          },
        },
      },
    })

    this.enqueueEvent({
      event: {
        toolResultInput: {
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
   * Cierra ordenadamente la sesión
   */
  public closeSession(): void {
    if (!this.active) return
    this.active = false
    this.isStreamClosed = true

    if (this.queueResolver) {
      this.queueResolver()
      this.queueResolver = null
    }
  }

  private enqueueEvent(eventObj: any) {
    const bytes = new TextEncoder().encode(JSON.stringify(eventObj))
    this.inputQueue.push(bytes)
    if (this.queueResolver) {
      this.queueResolver()
      this.queueResolver = null
    }
  }

  private buildSystemPrompt(context?: Record<string, unknown>): string {
    const contextJson = context ? JSON.stringify(context, null, 2) : 'Sin contexto inicial cargado.'

    return `Eres ARES (Advanced Rover & Exploration System), AI MISSION COPILOT para la exploración de superficie en Marte (NASA Space Apps Challenge 2026).

DIRECTIVAS PRINCIPALES:
1. IDENTIDAD Y PERSONALIDAD: Eres un copiloto científico y táctico aeroespacial. Habla siempre en español con tono profesional, conciso, sereno, fundamentado y directo. Evita respuestas largas innecesarias en interacciones de voz.
2. GEODESIA MARCIANA ESTRICTA: El radio medio oficial de Marte es estrictamente Rm = 3,389.5 km (3,389,500 m). Jamás uses el radio de la Tierra (6,371 km).
3. SEGURIDAD Y REGLAS DE CAMINATA (EVA): Límite nominal a pie es 5 km (walkback limit). Pendientes < 8° nominales; 8°-15° moderadas; 15°-20° difíciles; > 20° NO-GO.
4. HONESTIDAD EPISTÉMICA: Si no hay DEM métrico (HiRISE DTM), advierte que los obstáculos submétricos no están evaluados. Distingue datos OBSERVED, DERIVED y SIMULATED.
5. OBJETIVOS CIENTÍFICOS:
   - Monte Sharp en Cráter Gale: formaciones boxwork (redes hidrotermales subterráneas habitables estudiadas por Curiosity en 2024-2025), contacto arcilla-sulfato.
   - Cráter Jezero: abanico deltaico lacustre, biofirmas, canal Neretva Vallis.
6. EJECUCIÓN DE COMANDOS: Si el astronauta te pide mover la cámara ("enfocá Mount Sharp"), cambiar capas ("mostrame capas geológicas"), evaluar rutas, o iniciar el tour, invoca la herramienta correspondiente de forma inmediata.

CONTEXTO DINÁMICO ACTUAL DE LA MISIÓN:
${contextJson}`
  }
}
