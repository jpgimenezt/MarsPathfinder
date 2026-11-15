/**
 * ARES MISSION COMMS - Voice Gateway Server
 * Servidor WebSocket independiente de alta concurrencia y baja latencia
 * Conecta el navegador con Amazon Bedrock Runtime (Amazon Nova 2.5 Sonic)
 */

import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { GATEWAY_CONFIG } from './config.js'
import { BedrockNovaSonicSession } from './bedrockNovaSonic.js'

const server = http.createServer((req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = req.url || '/'

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'UP',
        service: 'ARES Voice Gateway',
        model: GATEWAY_CONFIG.bedrockModelId,
        region: GATEWAY_CONFIG.bedrockRegion,
        timestamp: new Date().toISOString(),
      })
    )
    return
  }

  if (url === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        service: 'ARES Voice Gateway',
        version: '1.0.0',
        supportedVoices: ['carlos', 'lupe', 'matthew', 'tiffany'],
        inputSampleRate: GATEWAY_CONFIG.sampleRateInput,
        outputSampleRate: GATEWAY_CONFIG.sampleRateOutput,
        bedrockRegion: GATEWAY_CONFIG.bedrockRegion,
        modelId: GATEWAY_CONFIG.bedrockModelId,
      })
    )
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('ARES Voice Gateway: WebSocket endpoint at /voice')
})

const wss = new WebSocketServer({ server, path: '/voice' })

console.log(`[ARES VOICE GATEWAY] Iniciando en puerto ${GATEWAY_CONFIG.port}...`)
console.log(`[ARES VOICE GATEWAY] Región Bedrock: ${GATEWAY_CONFIG.bedrockRegion} | Modelo: ${GATEWAY_CONFIG.bedrockModelId}`)

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress || 'unknown'
  console.log(`[ARES VOICE GATEWAY] Nueva conexión desde ${clientIp}`)

  let session: BedrockNovaSonicSession | null = null
  let sessionTimeout: NodeJS.Timeout | null = null

  const send = (msg: Record<string, unknown>) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  // Desconexión por límite de tiempo de sesión (máx 8 minutos por especificación Bedrock)
  const resetSessionTimer = () => {
    if (sessionTimeout) clearTimeout(sessionTimeout)
    sessionTimeout = setTimeout(() => {
      console.log(`[ARES VOICE GATEWAY] Sesión excedió límite de duración (${GATEWAY_CONFIG.maxSessionDurationSeconds}s).`)
      send({
        type: 'session_timeout',
        message: 'Límite de sesión de voz alcanzado. Reconectando canal...',
      })
      cleanup()
    }, GATEWAY_CONFIG.maxSessionDurationSeconds * 1000)
  }

  const cleanup = () => {
    if (sessionTimeout) clearTimeout(sessionTimeout)
    if (session) {
      session.closeSession()
      session = null
    }
    send({ type: 'state_change', state: 'VOICE_OFFLINE' })
  }

  ws.on('message', async (data: Buffer | string) => {
    try {
      let message: any
      if (typeof data === 'string') {
        message = JSON.parse(data)
      } else if (Buffer.isBuffer(data)) {
        const text = data.toString('utf8')
        try {
          message = JSON.parse(text)
        } catch {
          // Si es binario directo, interpretarlo como chunk de audio PCM
          if (session) {
            session.sendAudioChunk(data.toString('base64'))
            return
          }
        }
      }

      if (!message || !message.type) return

      switch (message.type) {
        case 'init': {
          cleanup()
          const voiceId = message.voiceId || GATEWAY_CONFIG.defaultVoice
          const language = message.language || GATEWAY_CONFIG.defaultLanguage || 'es'
          console.log(`[ARES VOICE GATEWAY] Inicializando sesión de Nova Sonic | Voz: ${voiceId} | Idioma predeterminado: ${language}`)
          send({ type: 'state_change', state: 'CONNECTING' })

          session = new BedrockNovaSonicSession(voiceId, {
            onAudioChunk: pcmBase64 => {
              send({ type: 'audio_chunk', pcmBase64 })
              send({ type: 'state_change', state: 'SPEAKING' })
              send({ type: 'conversation_state', state: 'speaking' })
            },
            onTranscriptText: (text, isFinal, role = 'assistant') => {
              send({ type: 'transcript', text, role, isFinal })
            },
            onBargeIn: () => {
              send({ type: 'barge_in' })
              send({ type: 'conversation_state', state: 'interrupted' })
              send({ type: 'state_change', state: 'LISTENING' })
            },
            onCompletionEnd: () => {
              send({ type: 'completion_end' })
              send({ type: 'conversation_state', state: 'awaiting_user' })
              send({ type: 'state_change', state: 'LISTENING' })
            },
            onToolUse: async (toolUseId, name, input) => {
              console.log(`[ARES VOICE GATEWAY] Bedrock invocó herramienta: ${name}`, input)
              send({ type: 'state_change', state: 'TOOL_EXECUTION' })
              send({ type: 'conversation_state', state: 'executing_tool' })
              send({
                type: 'tool_call',
                toolUseId,
                tool: name,
                input,
              })

              // Esperar resultado devuelto por el frontend
              return new Promise<Record<string, unknown>>(resolve => {
                const handler = (resData: any) => {
                  try {
                    const parsed = JSON.parse(resData.toString('utf8'))
                    if (parsed.type === 'tool_result' && parsed.toolUseId === toolUseId) {
                      ws.off('message', handler)
                      resolve(parsed.output || {})
                    }
                  } catch {}
                }
                ws.on('message', handler)

                // Timeout de 15 segundos para la ejecución de herramientas
                setTimeout(() => {
                  ws.off('message', handler)
                  resolve({ error: 'TOOL_EXECUTION_TIMEOUT' })
                }, 15000)
              })
            },
            onError: err => {
              const isExpired =
                err.message?.toLowerCase().includes('expired') || (err as any).name === 'ExpiredTokenException'
              const friendlyMessage = isExpired
                ? "⚠️ [SESIÓN AWS EXPIRADA]: Tus credenciales temporales de Amazon Bedrock han caducado. Ejecuta 'aws login' en tu terminal para reactivar el streaming de Nova Sonic."
                : err.message
              console.error(`[ARES VOICE GATEWAY] Error en sesión Bedrock:`, friendlyMessage)
              send({
                type: 'error',
                message: friendlyMessage,
                code: isExpired ? 'AWS_CREDENTIALS_EXPIRED' : (err as any).name || 'BEDROCK_STREAM_ERROR',
              })
              send({ type: 'state_change', state: 'ERROR' })
              send({ type: 'conversation_state', state: 'error' })
            },
            onSessionEnded: () => {
              console.log(`[ARES VOICE GATEWAY] Sesión Bedrock finalizada.`)
              send({ type: 'state_change', state: 'VOICE_OFFLINE' })
              send({ type: 'conversation_state', state: 'standby' })
            },
          })

          try {
            await session.startSession(message.initialContext, language)
            send({ type: 'state_change', state: 'LISTENING' })
            send({ type: 'conversation_state', state: 'awaiting_user' })
            resetSessionTimer()

            // Saludo táctico solo si el cliente lo solicita explícitamente (evita colisiones con síntesis local)
            if (message.greet === true) {
              const greetingText =
                language === 'en'
                  ? 'Astronaut connected to ARES tactical channel. Acknowledge link established briefly in English and state you are standing by for mission navigation and surface science orders.'
                  : 'Astronauta enlazado a la frecuencia táctica ARES. Confirma enlace establecido de forma breve en español e indícale al comandante que estás a la escucha para órdenes de navegación y análisis.'
              session.sendTextMessage(greetingText)
            }
          } catch (initErr: unknown) {
            const err = initErr instanceof Error ? initErr : new Error(String(initErr))
            send({
              type: 'error',
              message: `Fallo al iniciar enlace con Bedrock Nova Sonic: ${err.message}`,
              code: 'SESSION_INIT_FAILED',
            })
            send({ type: 'state_change', state: 'ERROR' })
          }
          break
        }

        case 'language_switch': {
          const targetLang = message.language === 'en' ? 'en' : 'es'
          console.log(`[ARES VOICE GATEWAY] Cambio de idioma persistente en la sesión: ${targetLang}`)
          if (session) {
            const directiveText = targetLang === 'en'
              ? '[SYSTEM DIRECTIVE]: The astronaut switched conversation language to English. Respond strictly in English from now on.'
              : '[DIRECTIVA DE SISTEMA]: El astronauta cambió el idioma de conversación a español. Responde estrictamente en español de ahora en adelante.'
            session.sendTextMessage(directiveText)
          }
          break
        }

        case 'interrupt': {
          if (session) {
            session.interrupt()
          }
          send({ type: 'barge_in' })
          send({ type: 'conversation_state', state: 'interrupted' })
          send({ type: 'state_change', state: 'LISTENING' })
          break
        }

        case 'audio_chunk': {
          if (session && message.pcmBase64) {
            session.sendAudioChunk(message.pcmBase64)
          }
          break
        }

        case 'end_audio_turn': {
          if (session) {
            session.endAudioTurn()
            send({ type: 'state_change', state: 'PROCESSING' })
          }
          break
        }

        case 'text_message': {
          if (session && message.text) {
            send({ type: 'state_change', state: 'PROCESSING' })
            session.sendTextMessage(message.text)
          }
          break
        }

        case 'interrupt': {
          if (session) {
            session.endAudioTurn()
            send({ type: 'state_change', state: 'LISTENING' })
          }
          break
        }

        case 'close': {
          cleanup()
          break
        }
      }
    } catch (e: unknown) {
      console.error(`[ARES VOICE GATEWAY] Error procesando mensaje WebSocket:`, e)
    }
  })

  ws.on('close', () => {
    console.log(`[ARES VOICE GATEWAY] Conexión cerrada por el cliente`)
    cleanup()
  })

  ws.on('error', err => {
    console.error(`[ARES VOICE GATEWAY] Error de socket:`, err.message)
    cleanup()
  })
})

server.listen(GATEWAY_CONFIG.port, () => {
  console.log(`[ARES VOICE GATEWAY] Servidor activo en http://localhost:${GATEWAY_CONFIG.port}`)
  console.log(`[ARES VOICE GATEWAY] Endpoint WebSocket disponible en ws://localhost:${GATEWAY_CONFIG.port}/voice`)
})
