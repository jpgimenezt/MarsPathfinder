import { describe, it, expect, vi } from 'vitest'
import { AmazonNovaSonicProvider, resolveGatewayEndpoint } from '../src/features/voice/amazonNovaSonicProvider'

describe('ARES MISSION COMMS - AmazonNovaSonicProvider', () => {
  it('inicializa con valores por defecto de ARES', () => {
    const provider = new AmazonNovaSonicProvider({
      voiceId: 'carlos',
      volume: 0.8,
    })

    expect(provider.id).toBe('amazon-nova-2-5-sonic')
    expect(provider.state).toBe('VOICE_OFFLINE')
    expect(provider.config.voiceId).toBe('carlos')
    expect(provider.config.volume).toBe(0.8)
    expect(provider.config.isMuted).toBe(false)
  })

  it('resuelve correctamente endpoints seguros wss:// para producción', () => {
    // Si se pasa explícito
    expect(resolveGatewayEndpoint('wss://custom.gateway.com/voice')).toBe('wss://custom.gateway.com/voice')

    // Localhost fallback por defecto en entorno de test node/jsdom no HTTPS
    const resolved = resolveGatewayEndpoint()
    expect(resolved).toMatch(/^(wss?:\/\/)/)
  })

  it('permite cambiar volumen y silenciar micrófono', () => {
    const provider = new AmazonNovaSonicProvider()
    provider.setVolume(0.5)
    expect(provider.config.volume).toBe(0.5)

    provider.mute(true)
    expect(provider.config.isMuted).toBe(true)
  })

  it('notifica suscriptores ante cambios de estado', () => {
    const provider = new AmazonNovaSonicProvider()
    const stateSpy = vi.fn()

    const unsubscribe = provider.subscribe({
      onStateChange: stateSpy,
    })

    // Simular cambio de estado
    ;(provider as any).setState('LISTENING')
    expect(stateSpy).toHaveBeenCalledWith('LISTENING')

    unsubscribe()
  })

  it('gestiona interrupción inmediata deteniendo buffers y emitiendo evento', () => {
    const provider = new AmazonNovaSonicProvider()
    const stateSpy = vi.fn()
    provider.subscribe({ onStateChange: stateSpy })

    provider.interrupt()
    expect(stateSpy).toHaveBeenCalledWith('LISTENING')
  })
})
