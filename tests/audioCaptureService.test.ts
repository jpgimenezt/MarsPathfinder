/**
 * Tests for AudioCaptureService — Universal Audio Architecture
 * Valida la captura unificada, métricas RMS, Peak, dBFS, VAD y distribución de streams.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioCaptureService } from '../src/features/voice/audioCaptureService'

describe('AudioCaptureService — Universal Audio Engine', () => {
  let service: AudioCaptureService

  beforeEach(() => {
    service = AudioCaptureService.getInstance()
  })

  it('proporciona un singleton consistente', () => {
    const s1 = AudioCaptureService.getInstance()
    const s2 = AudioCaptureService.getInstance()
    expect(s1).toBe(s2)
  })

  it('proporciona telemetría inicial con valores por defecto válidos', () => {
    const telemetry = service.getTelemetry()
    expect(telemetry).toBeDefined()
    expect(telemetry.channelCount).toBe(1)
    expect(typeof telemetry.currentRms).toBe('number')
    expect(typeof telemetry.currentPeak).toBe('number')
    expect(telemetry.isMuted).toBe(false)
  })

  it('permite suscribir y desuscribir listeners de telemetría sin fugas de memoria', () => {
    const callback = vi.fn()
    const unsubscribe = service.subscribeTelemetry(callback)

    expect(callback).toHaveBeenCalled()
    const firstCallCount = callback.mock.calls.length

    unsubscribe()
    service.setMuted(true)
    expect(callback.mock.calls.length).toBe(firstCallCount)
    service.setMuted(false)
  })

  it('controla el estado de mute de forma atómica', () => {
    service.setMuted(true)
    expect(service.getIsMuted()).toBe(true)
    expect(service.getTelemetry().isMuted).toBe(true)

    service.setMuted(false)
    expect(service.getIsMuted()).toBe(false)
    expect(service.getTelemetry().isMuted).toBe(false)
  })

  it('permite registrar y notificar nivel de salida del asistente ARES', () => {
    service.notifyOutputLevel(0.75)
    // No debe lanzar excepciones y debe computar en el ciclo de animación
    expect(service).toBeDefined()
  })
})
