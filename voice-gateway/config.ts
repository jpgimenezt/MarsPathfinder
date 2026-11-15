/**
 * ARES MISSION COMMS - Voice Gateway Configuration
 * Configuración del Gateway persistente WebSocket para Amazon Nova 2.5 Sonic
 */

export interface GatewayConfig {
  port: number
  bedrockRegion: string
  bedrockModelId: string
  defaultVoice: string
  maxSessionDurationSeconds: number
  allowedOrigins: string[]
  sampleRateInput: number
  sampleRateOutput: number
}

export const GATEWAY_CONFIG: GatewayConfig = {
  port: Number(process.env.VOICE_GATEWAY_PORT || 8088),
  bedrockRegion: process.env.AWS_BEDROCK_REGION || 'us-west-2',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-5-sonic',
  defaultVoice: process.env.DEFAULT_VOICE || 'carlos',
  maxSessionDurationSeconds: 450, // 7.5 minutos (límite de Bedrock es 8 min)
  allowedOrigins: ['*'],
  sampleRateInput: 16000, // 16kHz PCM para entrada de micrófono
  sampleRateOutput: 24000, // 24kHz PCM para salida de voz sintetizada de Nova Sonic
}
