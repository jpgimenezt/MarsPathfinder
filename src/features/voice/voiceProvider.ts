/**
 * ARES MISSION COMMS - Voice Provider Abstraction
 * Arquitectura desacoplada que permite conectar múltiples motores de voz e IA conversacional.
 */

export type VoiceState =
  | 'VOICE_OFFLINE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'TOOL_EXECUTION'
  | 'RECONNECTING'
  | 'ERROR'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

export type ConversationState =
  | 'standby'
  | 'listening'
  | 'processing'
  | 'tool_pending'
  | 'executing_tool'
  | 'speaking'
  | 'interrupted'
  | 'awaiting_user'
  | 'ending'

export type PresentationMode = 'compact' | 'orb' | 'minimized'

export type InteractionMode = 'PUSH_TO_TALK' | 'HANDS_FREE' | 'TEXT_AND_VOICE'

export interface TranscriptEvent {
  id: string
  role: 'user' | 'assistant'
  text: string
  isFinal: boolean
  timestamp: string
}

export interface VoiceConfig {
  voiceId: 'carlos' | 'lupe' | 'matthew' | 'tiffany' | string
  language?: 'en' | 'es' | 'auto'
  endpointUrl: string
  interactionMode: InteractionMode
  volume: number
  isMuted: boolean
  turnDetectionSensitivity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AudioVisualizerData {
  userLevel: number
  assistantLevel: number
  frequencyData?: Uint8Array
  timeDomainData?: Uint8Array
  source: 'user' | 'assistant' | 'idle'
}

export type VoiceEventListener = {
  onStateChange?: (state: VoiceState) => void
  onConnectionStateChange?: (state: ConnectionState) => void
  onConversationStateChange?: (state: ConversationState) => void
  onTranscript?: (event: TranscriptEvent) => void
  onAudioLevel?: (data: AudioVisualizerData) => void
  onToolCall?: (tool: string, input: Record<string, unknown>, toolUseId: string) => Promise<Record<string, unknown>>
  onBargeIn?: () => void
  onCompletionEnd?: () => void
  onError?: (error: { message: string; code?: string; fatal?: boolean }) => void
}

export interface VoiceProvider {
  id: string
  name: string
  state: VoiceState
  config: VoiceConfig

  // Ciclo de vida de la conexión
  connect(): Promise<void>
  disconnect(): Promise<void>

  // Controles de audio
  startListening(): Promise<void>
  stopListening(): Promise<void>
  mute(muted: boolean): void
  setVolume(volume: number): void
  interrupt(): void

  // Entrada de texto concurrente (modo TEXT + VOICE)
  sendTextMessage(text: string): Promise<void>

  // Transmisión de contexto actualizado de la misión
  updateMissionContext(context: Record<string, unknown>): void

  // Configuración dinámica
  updateConfig(config: Partial<VoiceConfig>): void

  // Suscripción de eventos
  subscribe(listeners: VoiceEventListener): () => void
}
