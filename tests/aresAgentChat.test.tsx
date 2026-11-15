// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AresAgentChat } from '../src/components/AresAgentChat'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let container: HTMLDivElement

afterEach(() => {
  if (root) {
    act(() => root.unmount())
  }
  container?.remove()
})

describe('AresAgentChat - Futuristic Martian HUD Component', () => {
  it('no renderiza contenido cuando isOpen es false', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<AresAgentChat isOpen={false} onClose={vi.fn()} />)
    })

    expect(container.querySelector('.ares-agent-overlay')).toBeNull()
  })

  it('renderiza la interfaz futurista del HUD cuando isOpen es true', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <AresAgentChat
          isOpen={true}
          onClose={vi.fn()}
          currentStops={{ A: [77.45, 18.42] }}
          totalDistanceMeters={5200}
        />
      )
    })

    const overlay = container.querySelector('.ares-agent-overlay')
    expect(overlay).not.toBeNull()

    // Comprobar título futurista y badges de telemetría
    expect(container.textContent).toContain('ARES-AI')
    expect(container.textContent).toContain('TACTICAL ASSISTANT')
    expect(container.textContent).toContain('UPLINK ACTIVE')
    expect(container.textContent).toContain('US-EAST-2')
    expect(container.textContent).toContain('NOVA PRO (BEDROCK)')

    // Comprobar presencia del botón táctico de ruta actual
    const routeActionBtn = container.querySelector('.hud-action-pill')
    expect(routeActionBtn).not.toBeNull()
    expect(routeActionBtn?.textContent).toContain('EVALUAR RUTA ACTUAL')
  })

  it('permite alternar a la pestaña de diagnóstico y telemetría', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<AresAgentChat isOpen={true} onClose={vi.fn()} />)
    })

    const telemetryTabBtn = container.querySelectorAll<HTMLButtonElement>('.hud-tab')[1]
    expect(telemetryTabBtn.textContent).toContain('DIAGNÓSTICO Y HERRAMIENTAS')

    act(() => {
      telemetryTabBtn.click()
    })

    // Debe mostrar la telemetría serverless de AWS
    expect(container.textContent).toContain('DIAGNÓSTICO DEL SISTEMA SERVERLESS // AWS')
    expect(container.textContent).toContain('Radio Medio de Marte: 3,389.5 km')
    expect(container.textContent).toContain('calculate_mars_distance')
    expect(container.textContent).toContain('evaluate_eva_feasibility')
  })

  it('invoca onClose al presionar el botón de cerrar', () => {
    const handleClose = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<AresAgentChat isOpen={true} onClose={handleClose} />)
    })

    const closeBtn = container.querySelector<HTMLButtonElement>('.hud-close-btn')
    expect(closeBtn).not.toBeNull()

    act(() => {
      closeBtn!.click()
    })

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
