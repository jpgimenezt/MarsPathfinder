import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { queryMarsAgent, type ChatMessage } from '../features/agent/marsAgentService'
import type { MarsPoint } from '../features/route/marsDistance'
import type { StopId } from '../features/route/routePlan'

interface AresAgentChatProps {
  currentStops?: Partial<Record<StopId, MarsPoint | null>>
  totalDistanceMeters?: number | null
  isOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
}

/**
 * Icono de Núcleo de IA cinético estilo J.A.R.V.I.S. (Marvel ARC Reactor / HUD FUI)
 * Construido con SVG vectorial puro centrado en (0, 0) para rotaciones matemáticas perfectas en GPU.
 */
export function JarvisAiCore({
  size = 28,
  active = true,
  withOuterOrbits = false,
  className = '',
}: {
  size?: number
  active?: boolean
  withOuterOrbits?: boolean
  className?: string
}) {
  const gradientId = useId()
  const filterId = useId()

  return (
    <div
      className={`jarvis-core-container ${active ? 'is-active' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="jarvis-core-svg"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="65%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </radialGradient>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Coordenadas locales centradas en (0, 0) mediante translate(50, 50) */}
        <g transform="translate(50, 50)">
          {/* Aura de energía de fondo */}
          <circle cx="0" cy="0" r="32" fill={`url(#${gradientId})`} className="jarvis-pulse-glow" />

          {/* Órbitas 3D externas que salen del objeto (SOLO en el botón flotante / standalone) */}
          {withOuterOrbits && (
            <g className="jarvis-outer-orbits-group">
              <g className="jarvis-spin-orbit-alpha">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="64"
                  ry="20"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="1.3"
                  strokeDasharray="14 6 4 6"
                  opacity="0.85"
                />
                <circle cx="64" cy="0" r="2.8" fill="#ffffff" filter={`url(#${filterId})`} className="orbit-particle-alpha" />
                <circle cx="-64" cy="0" r="2" fill="#00f0ff" />
              </g>

              <g className="jarvis-spin-orbit-beta">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="70"
                  ry="18"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.1"
                  strokeDasharray="20 8"
                  opacity="0.75"
                />
                <circle cx="0" cy="18" r="2.5" fill="#38bdf8" filter={`url(#${filterId})`} className="orbit-particle-beta" />
                <circle cx="0" cy="-18" r="1.8" fill="#ffffff" />
              </g>

              <g className="jarvis-spin-orbit-gamma">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="58"
                  ry="24"
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="1.1"
                  strokeDasharray="8 6"
                  opacity="0.65"
                />
                <circle cx="58" cy="0" r="2.2" fill="#ffffff" className="orbit-particle-gamma" />
              </g>
            </g>
          )}

          {/* Anillo exterior con marcas de cuadrante (FUI / Jarvis ring) */}
          <circle
            cx="0"
            cy="0"
            r="44"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="1.2"
            strokeDasharray="3 5"
            opacity="0.6"
            className="jarvis-ring-outer-ticks"
          />

          {/* 4 Nodos orbitales en cruz */}
          <g className="jarvis-orbital-nodes">
            <circle cx="0" cy="-44" r="2.2" fill="#00f0ff" />
            <circle cx="44" cy="0" r="2.2" fill="#00f0ff" />
            <circle cx="0" cy="44" r="2.2" fill="#00f0ff" />
            <circle cx="-44" cy="0" r="2.2" fill="#00f0ff" />
          </g>

          {/* Anillo de datos segmentado (rotación horaria) */}
          <circle
            cx="0"
            cy="0"
            r="36"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeDasharray="18 8 5 8"
            strokeLinecap="round"
            className="jarvis-ring-segmented"
          />

          {/* Anillo contra-rotatorio con cortes angulares (rotación antihoraria) */}
          <circle
            cx="0"
            cy="0"
            r="28"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2.6"
            strokeDasharray="24 14"
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            className="jarvis-ring-counter"
          />

          {/* Anillo interior del reactor ARC */}
          <circle
            cx="0"
            cy="0"
            r="18"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.6"
            strokeDasharray="8 6"
            className="jarvis-ring-inner-arc"
          />

          {/* Rayos radiales de energía del iris */}
          <g className="jarvis-iris-rays" stroke="#00f0ff" strokeWidth="1.2" opacity="0.8">
            <line x1="0" y1="-16" x2="0" y2="-10" />
            <line x1="0" y1="10" x2="0" y2="16" />
            <line x1="-16" y1="0" x2="-10" y2="0" />
            <line x1="10" y1="0" x2="16" y2="0" />
          </g>

          {/* Núcleo central del reactor (ARC Reactor Core) */}
          <circle cx="0" cy="0" r="7.5" fill="#00f0ff" opacity="0.55" className="jarvis-core-pulse" />
          <circle cx="0" cy="0" r="4.2" fill="#ffffff" filter={`url(#${filterId})`} className="jarvis-center-dot" />
          <circle cx="0" cy="0" r="2" fill="#00f0ff" />
        </g>
      </svg>
    </div>
  )
}

// Iconografía vectorial táctica (SVG) - Sin emojis
const AstronautIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a7 7 0 0 0-7 7v4a7 7 0 0 0 14 0V9a7 7 0 0 0-7-7z" />
    <path d="M8 10h8v2a4 4 0 0 1-8 0v-2z" />
    <path d="M9 19v3" />
    <path d="M15 19v3" />
    <path d="M5 14H3" />
    <path d="M21 14h-2" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

export function AresAgentChat({
  currentStops,
  totalDistanceMeters,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
}: AresAgentChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const isModalOpen = isControlled ? controlledIsOpen : internalIsOpen

  const handleOpen = useCallback(() => {
    setInternalIsOpen(true)
    controlledOnOpen?.()
  }, [controlledOnOpen])

  const handleClose = useCallback(() => {
    setInternalIsOpen(false)
    controlledOnClose?.()
  }, [controlledOnClose])

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content:
        'SISTEMA ARES // CONSOLA TÁCTICA DE EXPLORACIÓN DE SUPERFICIE\n\n' +
        '[ESTADO]: ENLACE ORBITAL ACTIVO // RELAY UHF 401.5 MHz\n' +
        '[REFERENCIA]: MARTE · DATUM AREOIDE 6.1 MBAR\n\n' +
        'Copiloto táctico de navegación para misiones de superficie marciana (NASA Space Apps 2026). ' +
        'Asistencia en análisis geodésico (R = 3,389.5 km), evaluación de transitabilidad y pendientes en Jezero y Mount Sharp, ' +
        'y verificación de cobertura con datos de misiones de NASA (CTX, MOLA, THEMIS, HiRISE).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'telemetry'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }

  // Prevenir saltos de layout durante la animación holográfica de apertura
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
      }, 550)
      return () => clearTimeout(timer)
    }
  }, [isModalOpen])

  useEffect(() => {
    if (isModalOpen) {
      scrollToBottom()
    }
  }, [messages, isModalOpen])

  // Cierre accesible con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, handleClose])

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

    const historyPayload = messages
      .filter(m => m.id !== 'init-msg' && !m.content.startsWith('[ERROR DE TELEMETRÍA]'))
      .map(m => ({
        role: m.role,
        content: m.content,
      }))

    const agentRes = await queryMarsAgent(query, historyPayload)

    // Filtrar cualquier bloque interno de razonamiento <thinking>
    let cleanReply = agentRes.reply || ''
    cleanReply = cleanReply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: cleanReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      toolsCalled: agentRes.tools_called,
      modelUsed: agentRes.model_used,
    }

    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
  }

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

  return (
    <>
      {/* Botón Flotante HUD (FAB) en la esquina inferior */}
      {!isModalOpen && (
        <button
          type="button"
          className="ares-fab-trigger"
          onClick={handleOpen}
          aria-label="Abrir consola táctica de navegación Ares"
          title="Consola Táctica de Navegación (Copiloto EVA)"
        >
          <div className="ares-fab-core-container">
            <span className="ares-fab-sonar-ping" aria-hidden="true" />
            <JarvisAiCore size={36} withOuterOrbits={true} className="ares-fab-jarvis" />
          </div>
          <div className="ares-fab-labels">
            <span className="ares-fab-badge">[IA TÁCTICA]</span>
            <span className="ares-fab-text">COPILOTO TÁCTICO</span>
          </div>
        </button>
      )}

      {/* Ventana Modal HUD Táctica */}
      {isModalOpen && (
        <div
          className="ares-agent-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-title"
          onClick={e => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          <div className="ares-agent-window">
            {/* Emisión Aladino holográfica desde el icono */}
            <div className="hud-genie-steam" aria-hidden="true" />

            {/* Haz de barrido láser holográfico de inicialización */}
            <div className="hud-laser-boot-beam" aria-hidden="true" />

            {/* Scanline CRT permanente */}
            <div className="hud-scanline" aria-hidden="true" />

            {/* Retículas y esquinas tácticas FUI */}
            <div className="hud-corner top-left" aria-hidden="true" />
            <div className="hud-corner top-right" aria-hidden="true" />
            <div className="hud-corner bottom-left" aria-hidden="true" />
            <div className="hud-corner bottom-right" aria-hidden="true" />

            {/* Header de Cabina Táctica */}
            <header className="hud-header">
              <div className="hud-title-group">
                <JarvisAiCore size={32} withOuterOrbits={false} className="hud-header-jarvis" />
                <div className="hud-title-text-block">
                  <div className="hud-sub">CONSOLA TÁCTICA // NASA SPACE APPS</div>
                  <h2 id="agent-title" className="hud-title">
                    ARES-NAV <span>SISTEMA DE ASISTENCIA</span>
                  </h2>
                </div>
              </div>

              <div className="hud-telemetry-strip">
                <div className="telemetry-badge active">
                  <span className="dot online" />
                  <span>ENLACE: ACTIVO</span>
                </div>
                <div className="telemetry-badge">
                  <span>DATUM: AREOIDE 6.1 MBAR</span>
                </div>
                <div className="telemetry-badge highlight">
                  <span>GEODESIA: 3,389.5 KM</span>
                </div>
                <button
                  type="button"
                  className="hud-close-btn"
                  onClick={handleClose}
                  aria-label="Cerrar consola táctica"
                  title="Cerrar consola (Esc)"
                >
                  <CloseIcon />
                </button>
              </div>
            </header>

            {/* Barra de Navegación de la Consola */}
            <div className="hud-nav-bar">
              <div className="hud-tabs">
                <button
                  type="button"
                  className={`hud-tab ${activeTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  COMUNICADOR TÁCTICO
                </button>
                <button
                  type="button"
                  className={`hud-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
                  onClick={() => setActiveTab('telemetry')}
                >
                  PARÁMETROS Y SENSORES
                </button>
              </div>

              {hasRoute && (
                <button
                  type="button"
                  className="hud-action-pill glow"
                  onClick={sendCurrentRouteInspection}
                  disabled={loading}
                  title="Transmite las coordenadas reales del mapa al sistema"
                >
                  <BoltIcon />
                  <span>EVALUAR RUTA ({formatKm(totalDistanceMeters)} KM)</span>
                </button>
              )}
            </div>

            {/* Contenido Principal */}
            {activeTab === 'chat' ? (
              <div className="hud-chat-body">
                {/* Sugerencias Tácticas - Sin Emojis */}
                <div className="hud-chips-tray" aria-label="Sugerencias de navegación">
                  <button
                    type="button"
                    className="hud-chip"
                    onClick={() =>
                      handleSend(
                        '¿Qué son las formaciones boxwork en Monte Sharp y por qué la NASA las destacó para la misión?'
                      )
                    }
                    disabled={loading}
                  >
                    [OBJETIVO] Formaciones Boxwork (Gale)
                  </button>
                  <button
                    type="button"
                    className="hud-chip"
                    onClick={() =>
                      handleSend(
                        '¿Por qué no se puede usar la capa MOLA visual para calcular pendientes seguras de caminata?'
                      )
                    }
                    disabled={loading}
                  >
                    [ANÁLISIS] Resolución MOLA vs DTM
                  </button>
                  <button
                    type="button"
                    className="hud-chip"
                    onClick={() =>
                      handleSend(
                        '¿Cuáles son los objetivos astrobiológicos clave en el abanico deltaico de Jezero?'
                      )
                    }
                    disabled={loading}
                  >
                    [CIENCIA] Delta de Jezero (Biofirmas)
                  </button>
                  <button
                    type="button"
                    className="hud-chip"
                    onClick={() =>
                      handleSend(
                        '¿Cuáles son las reglas de seguridad y límites de pendiente para un astronauta con traje mEMU en Marte?'
                      )
                    }
                    disabled={loading}
                  >
                    [SEGURIDAD] Límites EVA y Pendientes
                  </button>
                </div>

                {/* Mensajes */}
                <div className="hud-messages-area" role="log" aria-live="polite">
                  {messages.map(msg => (
                    <div key={msg.id} className={`hud-message-row ${msg.role}`}>
                      <div className="hud-avatar" aria-hidden="true">
                        {msg.role === 'user' ? <AstronautIcon /> : <JarvisAiCore size={20} withOuterOrbits={false} className="hud-msg-jarvis" />}
                      </div>
                      <div className="hud-message-bubble">
                        <div className="hud-msg-meta">
                          <span className="sender-tag">
                            {msg.role === 'user' ? '[EVA-1]' : '[ARES-NAV]'}
                          </span>
                          <span className="timestamp-tag">{msg.timestamp}</span>
                        </div>

                        <div className="hud-msg-text">
                          {msg.content.split('\n').map((line, idx) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>

                        {/* Desglose de telemetría de herramientas */}
                        {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                          <div className="hud-tool-card">
                            <div className="tool-card-header">
                              <span>VERIFICACIÓN GEODÉSICA ({msg.toolsCalled.length})</span>
                            </div>
                            {msg.toolsCalled.map((tc, tidx) => (
                              <div key={tidx} className="tool-exec-item">
                                <span className="tool-name">[FUNCIÓN]: {tc.tool}</span>
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
                      <div className="hud-avatar" aria-hidden="true">
                        <JarvisAiCore size={20} active withOuterOrbits={false} className="hud-loading-jarvis" />
                      </div>
                      <div className="hud-message-bubble loading-bubble">
                        <div className="hud-typing-indicator">
                          <span className="scan-wave" aria-hidden="true" />
                          <span className="typing-text">PROCESANDO TELEMETRÍA Y GEODESIA...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Entrada de Consulta */}
                <form
                  className="hud-input-bar"
                  onSubmit={e => {
                    e.preventDefault()
                    handleSend()
                  }}
                >
                  <label htmlFor={inputId} className="visually-hidden">
                    Consulta táctica de superficie
                  </label>
                  <div className="hud-input-wrapper">
                    <span className="hud-input-prefix" aria-hidden="true">❯</span>
                    <input
                      ref={inputRef}
                      id={inputId}
                      type="text"
                      className="hud-input"
                      placeholder="Consultar coordenadas, límites de terreno, objetivos científicos..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="hud-send-btn glow"
                    disabled={loading || !input.trim()}
                    aria-label="Transmitir consulta"
                  >
                    <SendIcon />
                    <span>TRANSMITIR</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Pestaña de Parámetros Científicos y Sensores */
              <div className="hud-telemetry-body">
                <h3>PARÁMETROS DE MISIÓN Y SISTEMAS DE REFERENCIA</h3>
                <div className="telemetry-grid">
                  <div className="telemetry-card">
                    <h4>SISTEMA DE REFERENCIA MARCIANO</h4>
                    <ul>
                      <li><strong>Radio Medio ($R_M$):</strong> 3,389.50 km (3,389,500 m)</li>
                      <li><strong>Gravedad Superficial:</strong> 0.38 g (3.72 m/s²)</li>
                      <li><strong>Datum Vertical:</strong> Areoide MOLA (presión media 6.1 mbar)</li>
                      <li><strong>Convención de Coordenadas:</strong> Latitud Planetocéntrica, Longitud Este</li>
                      <li><strong>Navegación Superficial:</strong> Odometría visual + TRN (sin red GNSS)</li>
                    </ul>
                  </div>

                  <div className="telemetry-card">
                    <h4>CRITERIOS DE SEGURIDAD EVA (TRAJE mEMU)</h4>
                    <ul>
                      <li><strong>Límite Walkback a Pie:</strong> 5.0 km nominal (8.0 km contingencia)</li>
                      <li><strong>Pendiente Nominal:</strong> &lt; 8° (tránsito a pie seguro)</li>
                      <li><strong>Pendiente Moderada:</strong> 8° a 15° (incremento metabólico +50%)</li>
                      <li><strong>Pendiente Difícil:</strong> 15° a 20° (resbalamiento en regolito fino)</li>
                      <li><strong>Zona Crítica (NO-GO):</strong> &gt; 20° (infranqueable a pie)</li>
                    </ul>
                  </div>

                  <div className="telemetry-card">
                    <h4>SENSORES ORBITALES EN CATÁLOGO</h4>
                    <ul>
                      <li><strong>MRO CTX:</strong> ~6 m/px óptico (mosaico controlado Jezero)</li>
                      <li><strong>MRO HiRISE:</strong> ~0.25 m/px óptico / 1-2 m DTM de relieve</li>
                      <li><strong>MGS MOLA:</strong> ~463 m/px relieve regional respecto al Areoide</li>
                      <li><strong>Mars Odyssey THEMIS:</strong> 100 m/px infrarrojo térmico (Day IR)</li>
                    </ul>
                  </div>

                  <div className="telemetry-card">
                    <h4>ENLACE DE COMUNICACIONES TÁCTICO</h4>
                    <ul>
                      <li><strong>Banda de Radio Superficie:</strong> UHF Proximity-1 (401.5 MHz)</li>
                      <li><strong>Latencia Tierra-Marte:</strong> 3 a 22 minutos (un trayecto)</li>
                      <li><strong>Requisito Operativo:</strong> Autonomía de decisión en superficie</li>
                      <li><strong>Integridad de Datos:</strong> Prohibición estricta de extrapolación sin DTM métrico</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Footer de la Consola */}
            <footer className="hud-footer">
              <span>SISTEMA ARES-NAV // NASA SPACE APPS CHALLENGE 2026</span>
              <span className="hud-coord-indicator">
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
