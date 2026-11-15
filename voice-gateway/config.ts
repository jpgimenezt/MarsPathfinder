/**
 * ARES MISSION COMMS - Voice Gateway Configuration
 * Configuración del Gateway persistente WebSocket para Amazon Nova 2.5 Sonic
 */

export interface GatewayConfig {
  port: number
  bedrockRegion: string
  bedrockModelId: string
  defaultVoice: string
  defaultLanguage: string
  maxSessionDurationSeconds: number
  allowedOrigins: string[]
  sampleRateInput: number
  sampleRateOutput: number
}

export const GATEWAY_CONFIG: GatewayConfig = {
  port: Number(process.env.VOICE_GATEWAY_PORT || 8088),
  bedrockRegion: process.env.AWS_BEDROCK_REGION || 'us-west-2',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-5-sonic',
  defaultVoice: process.env.DEFAULT_VOICE || 'carlos', // Carlos: Voz masculina natural en español (Bedrock Nova 2.5 Sonic)
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'es-US',
  maxSessionDurationSeconds: 450, // 7.5 minutos (límite de Bedrock es 8 min)
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8088',
        'http://127.0.0.1:5173',
        'https://ares-route.vercel.app',
        'https://mars-pathfinder.vercel.app',
        'https://*.vercel.app',
      ],
  sampleRateInput: 16000, // 16kHz PCM para entrada de micrófono
  sampleRateOutput: 24000, // 24kHz PCM para salida de voz sintetizada de Nova Sonic
}
