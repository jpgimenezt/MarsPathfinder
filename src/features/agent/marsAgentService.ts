/**
 * AresRoute - Martian AI Agent Service
 * Conecta con el backend Serverless desplegado en AWS (Amazon Bedrock + Lambda)
 */

export const AWS_AGENT_ENDPOINT = 'https://laf33lrf26heqguui3pe3zqjje0rrnaw.lambda-url.us-east-2.on.aws/'

export interface ToolCallExecution {
  tool: string
  input: Record<string, unknown>
  output: Record<string, unknown>
}

export interface AgentResponse {
  reply: string
  model_used?: string
  tools_called?: ToolCallExecution[]
  error?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolsCalled?: ToolCallExecution[]
  modelUsed?: string
  isStreaming?: boolean
}

export async function queryMarsAgent(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<AgentResponse> {
  try {
    const response = await fetch(AWS_AGENT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: history.slice(-6), // Mantener contexto reciente
      }),
    })

    if (!response.ok) {
      throw new Error(`Error en el servidor AWS (HTTP ${response.status})`)
    }

    const data: AgentResponse = await response.json()
    return data
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al contactar al satélite de enlace'
    return {
      reply: `⚠️ [ERROR DE TELEMETRÍA]: No se pudo establecer enlace con el agente en órbita (${errorMessage}). Comprueba tu conexión de red o el estado del servicio AWS en us-east-2.`,
      error: errorMessage,
    }
  }
}
