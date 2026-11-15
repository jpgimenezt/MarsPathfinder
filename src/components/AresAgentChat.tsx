import { useState, useRef, useEffect, useId } from 'react'
import { queryMarsAgent, type ChatMessage } from '../features/agent/marsAgentService'
import type { MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'

interface AresAgentChatProps {
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
  totalDistanceMeters?: number | null
  isOpen: boolean
  onClose: () => void
}

const TARS_QUOTES = [
  'No es posible... No, es necesario.',
  'La ley de Murphy no significa que algo malo vaya a pasar; significa que lo que tenga que pasar, pasará.',
  'No entres dócilmente en esa buena noche. Ruge contra la muerte de la luz.',
  'Humor al 75%: Si caminas más de 5 km en regolito fino marciano, el que necesitará un acoplamiento de emergencia serás tú.',
  'Honestidad al 90%: Sin un DEM submétrico de HiRISE, esa ladera oculta rocas que ningún mapa orbital podrá resolver.',
]

export function AresAgentChat({
  currentStops,
  totalDistanceMeters,
  isOpen,
  onClose,
}: AresAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content:
        'SISTEMA ARES-AI EN LÍNEA // Enlace orbital activo con Amazon Bedrock (Nova Pro en us-east-2).\n\n[CALIBRACIÓN TÁCTICA TARS]: Honestidad: 90% | Humor: 65%.\n"No es posible... No, es necesario."\n\nSoy tu copiloto táctico de navegación para misiones de superficie marciana (NASA Space Apps 2026). Puedo evaluar la viabilidad de tus rutas con geodesia marciana real (R = 3,389.5 km), analizar sensores de NASA (CTX, MOLA, THEMIS, HiRISE) o consultar objetivos científicos como el Delta de Jezero o las formaciones Boxwork.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'telemetry'>('chat')
  const [quoteIndex, setQuoteIndex] = useState(-1)
  const [interstellarQuote, setInterstellarQuote] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  const cycleTarsQuote = () => {
    const nextIdx = (quoteIndex + 1) % TARS_QUOTES.length
    setQuoteIndex(nextIdx)
    setInterstellarQuote(TARS_QUOTES[nextIdx])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Verificar si hay puntos colocados en la ruta
  const hasRoute = currentStops && (currentStops.A || currentStops.P || currentStops.B)
  const formatKm = (m: number | null | undefined) => (m ? (m / 1000).toFixed(2) : '0.00')

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    // Formatear historial para el agente (excluyendo mensaje inicial del sistema y errores)
    const historyPayload = messages
      .filter(m => m.id !== 'init-msg' && !m.content.startsWith('⚠️'))
      .map(m => ({
        role: m.role,
        content: m.content,
      }))

    const agentRes = await queryMarsAgent(query, historyPayload)

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: agentRes.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      toolsCalled: agentRes.tools_called,
      modelUsed: agentRes.model_used,
    }

    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
  }

  // Atajo táctico: enviar la ruta actual al agente
  const sendCurrentRouteInspection = () => {
    if (!currentStops) return
    const pts = []
    if (currentStops.A) pts.push(`Origen A: [${currentStops.A[1].toFixed(4)}°N, ${currentStops.A[0].toFixed(4)}°E]`)
    if (currentStops.P) pts.push(`Parada P: [${currentStops.P[1].toFixed(4)}°N, ${currentStops.P[0].toFixed(4)}°E]`)
    if (currentStops.B) pts.push(`Destino B: [${currentStops.B[1].toFixed(4)}°N, ${currentStops.B[0].toFixed(4)}°E]`)

    const distStr = formatKm(totalDistanceMeters)
    const prompt = `Evalúa la viabilidad táctica de mi ruta actual trazada en Jezero Crater con distancia total de ${distStr} km:\n${pts.join('\n')}\n¿Es segura y viable a pie para un astronauta según los límites fisiológicos y las reglas de walkback de la NASA?`
    handleSend(prompt)
  }

  if (!isOpen) return null

  return (
    <div className="ares-agent-overlay" role="dialog" aria-modal="true" aria-labelledby="agent-title">
      <div className="ares-agent-window">
        {/* HUD Scanner Top Bar */}
        <div className="hud-scanline" />

        {/* Header Futurista */}
        <header className="hud-header">
          <div className="hud-title-group">
            <div className="hud-pulse-radar" aria-hidden="true">
              <span className="radar-core" />
              <span className="radar-ring" />
            </div>
            <div>
              <div className="hud-sub">ORBITAL TACTICAL COPILOT // AWS SERVERLESS</div>
              <h2 id="agent-title" className="hud-title">ARES-AI <span>TACTICAL ASSISTANT</span></h2>
            </div>
          </div>

          <div className="hud-telemetry-strip">
            <div className="telemetry-badge active">
              <span className="dot online" />
              <span>LINK: UPLINK ACTIVE</span>
            </div>
            <div className="telemetry-badge">
              <span>REGION: US-EAST-2</span>
            </div>
            <div className="telemetry-badge highlight">
              <span>CORE: NOVA PRO (BEDROCK)</span>
            </div>
            <button
              type="button"
              className="telemetry-badge tars-badge"
              onClick={cycleTarsQuote}
              title="Calibración TARS (Interstellar) — Haz clic para activar protocolo"
            >
              <span className="tars-star">★</span>
              <span>TARS: H:90% · U:65%</span>
            </button>
            <button
              type="button"
              className="hud-close-btn"
              onClick={onClose}
              aria-label="Cerrar terminal táctica"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Banner de Cita de Interstellar / Protocolo TARS */}
        {interstellarQuote && (
          <div className="hud-interstellar-banner" onClick={() => setInterstellarQuote(null)} role="alert">
            <span className="tars-banner-icon">🌌</span>
            <span className="tars-banner-text">"{interstellarQuote}"</span>
            <span className="tars-banner-sub">— PROTOCOLO TARS // INTERSTELLAR (clic para cerrar)</span>
          </div>
        )}

        {/* Selector de Pestañas Tácticas */}
        <div className="hud-nav-bar">
          <div className="hud-tabs">
            <button
              type="button"
              className={`hud-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              ◈ COMUNICADOR EVA
            </button>
            <button
              type="button"
              className={`hud-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
            >
              ⚙ DIAGNÓSTICO Y HERRAMIENTAS
            </button>
          </div>

          {/* Botón de Inyección Rápida de Ruta Actual */}
          {hasRoute && (
            <button
              type="button"
              className="hud-action-pill glow"
              onClick={sendCurrentRouteInspection}
              disabled={loading}
              title="Transmite las coordenadas reales trazadas en el mapa al agente"
            >
              ⚡ EVALUAR RUTA ACTUAL ({formatKm(totalDistanceMeters)} KM)
            </button>
          )}
        </div>

        {/* Cuerpo de Contenido */}
        {activeTab === 'chat' ? (
          <div className="hud-chat-body">
            {/* Chips de Consultas Rápidas */}
            <div className="hud-chips-tray" aria-label="Sugerencias rápidas">
              <button
                type="button"
                className="hud-chip interstellar"
                onClick={() => handleSend('Ares-AI, ¿cuál es tu nivel de humor y honestidad para esta caminata en Marte? ¿Qué opinas de la ley de Murphy en Jezero?')}
                disabled={loading}
              >
                🌌 Protocolo TARS (Interstellar)
              </button>
              <button
                type="button"
                className="hud-chip"
                onClick={() => handleSend('¿Qué son las formaciones boxwork en Monte Sharp y por qué la NASA las destacó para la misión?')}
                disabled={loading}
              >
                🪐 Formaciones Boxwork (Gale)
              </button>
              <button
                type="button"
                className="hud-chip"
                onClick={() => handleSend('¿Por qué no puedo usar la capa MOLA para calcular pendientes seguras de caminata?')}
                disabled={loading}
              >
                🗺️ Resolución MOLA vs DEM
              </button>
              <button
                type="button"
                className="hud-chip"
                onClick={() => handleSend('¿Cuáles son los objetivos astrobiológicos clave en el abanico deltaico de Jezero?')}
                disabled={loading}
              >
                🔬 Delta de Jezero (Biofirmas)
              </button>
              <button
                type="button"
                className="hud-chip"
                onClick={() => handleSend('¿Cuáles son las reglas de seguridad y límites de pendiente para un astronauta con traje mEMU en Marte?')}
                disabled={loading}
              >
                ⚠️ Límites EVA y Pendientes
              </button>
            </div>

            {/* Lista de Mensajes */}
            <div className="hud-messages-area" role="log" aria-live="polite">
              {messages.map(msg => (
                <div key={msg.id} className={`hud-message-row ${msg.role}`}>
                  <div className="hud-avatar">
                    {msg.role === 'user' ? '🧑‍🚀' : '🤖'}
                  </div>
                  <div className="hud-message-bubble">
                    <div className="hud-msg-meta">
                      <span className="sender-tag">
                        {msg.role === 'user' ? 'ASTRONAUTA EVA' : 'ARES-AI CORE'}
                      </span>
                      <span className="timestamp-tag">{msg.timestamp}</span>
                      {msg.modelUsed && <span className="model-tag">{msg.modelUsed}</span>}
                    </div>

                    <div className="hud-msg-text">
                      {msg.content.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>

                    {/* Desglose de herramientas invocadas */}
                    {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                      <div className="hud-tool-card">
                        <div className="tool-card-header">
                          <span className="tool-icon">⚙</span>
                          <span>HERRAMIENTAS EJECUTADAS EN AWS LAMBDA ({msg.toolsCalled.length})</span>
                        </div>
                        {msg.toolsCalled.map((tc, tidx) => (
                          <div key={tidx} className="tool-exec-item">
                            <span className="tool-name">▶ {tc.tool}</span>
                            <pre className="tool-io">{JSON.stringify(tc.output, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="hud-message-row assistant loading">
                  <div className="hud-avatar">🤖</div>
                  <div className="hud-message-bubble loading-bubble">
                    <div className="hud-typing-indicator">
                      <span className="scan-wave" />
                      <span className="typing-text">ENLACE ACTIVO · PROCESANDO EN BEDROCK NOVA PRO...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Barra de Entrada de Texto */}
            <form
              className="hud-input-bar"
              onSubmit={e => {
                e.preventDefault()
                handleSend()
              }}
            >
              <label htmlFor={inputId} className="visually-hidden">
                Consulta táctica para Ares-AI
              </label>
              <div className="hud-input-wrapper">
                <span className="hud-input-prefix">❯</span>
                <input
                  id={inputId}
                  type="text"
                  className="hud-input"
                  placeholder="Ingresa coordenadas, dudas sobre sensores NASA o consulta de seguridad EVA..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="hud-send-btn glow"
                disabled={loading || !input.trim()}
              >
                {loading ? 'ENVIANDO...' : 'TRANSMITIR ❯'}
              </button>
            </form>
          </div>
        ) : (
          /* Pestaña de Telemetría y Diagnóstico */
          <div className="hud-telemetry-body">
            <h3>DIAGNÓSTICO DEL SISTEMA SERVERLESS // AWS</h3>
            <div className="telemetry-grid">
              <div className="telemetry-card">
                <h4>INFRAESTRUCTURA DE NUBE</h4>
                <ul>
                  <li><strong>Proveedor:</strong> Amazon Web Services (AWS)</li>
                  <li><strong>Región Operativa:</strong> us-east-2 (Ohio)</li>
                  <li><strong>Arquitectura:</strong> 100% Serverless Event-Driven</li>
                  <li><strong>Framework de Inferencia:</strong> Bedrock Converse API</li>
                  <li><strong>Modelo Base:</strong> Amazon Nova Pro (`us.amazon.nova-pro-v1:0`)</li>
                  <li><strong>Runtime de Herramientas:</strong> AWS Lambda (Python 3.12, arm64)</li>
                </ul>
              </div>

              <div className="telemetry-card">
                <h4>PARÁMETROS GEODÉSICOS EN CÓDIGO</h4>
                <ul>
                  <li><strong>Radio Medio de Marte:</strong> 3,389.5 km (3,389,500 m)</li>
                  <li><strong>Gravedad Superficial:</strong> 0.38 g (3.72 m/s²)</li>
                  <li><strong>Datum Vertical:</strong> Areoide MOLA (punto 6.1 mbar)</li>
                  <li><strong>Convención Angular:</strong> Latitud Planetocéntrica, Longitud Este</li>
                  <li><strong>Límite Walkback a Pie:</strong> 5.0 km nominal (8.0 km máx)</li>
                </ul>
              </div>

              <div className="telemetry-card">
                <h4>HERRAMIENTAS EXPUESTAS AL LLM</h4>
                <ul>
                  <li><code>calculate_mars_distance</code>: Haversine esférico marciano</li>
                  <li><code>lookup_mission_dataset</code>: Catálogo CTX, MOLA, THEMIS, HiRISE</li>
                  <li><code>get_science_targets</code>: Hitos en Jezero Delta y Mount Sharp</li>
                  <li><code>evaluate_eva_feasibility</code>: Matriz de riesgo y pendientes</li>
                </ul>
              </div>

              <div className="telemetry-card">
                <h4>ENDPOINT HTTP EN VIVO</h4>
                <div className="endpoint-box">
                  <code>https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/</code>
                </div>
                <p className="endpoint-note">
                  Soporta CORS abierto (`*`), invocaciones por `curl` y llamadas asíncronas desde este cliente web.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer del HUD */}
        <footer className="hud-footer">
          <span>SISTEMA: ARES-ROUTE V0.1.0-EXP // NASA SPACE APPS CHALLENGE 2026</span>
          <span className="hud-coord-indicator">
            {currentStops?.A ? `A: [${currentStops.A[1].toFixed(2)}°N, ${currentStops.A[0].toFixed(2)}°E]` : 'A: NO FIJADO'} |{' '}
            {currentStops?.P ? `P: [${currentStops.P[1].toFixed(2)}°N, ${currentStops.P[0].toFixed(2)}°E]` : 'P: NO FIJADO'} |{' '}
            {currentStops?.B ? `B: [${currentStops.B[1].toFixed(2)}°N, ${currentStops.B[0].toFixed(2)}°E]` : 'B: NO FIJADO'}
          </span>
        </footer>
      </div>
    </div>
  )
}
