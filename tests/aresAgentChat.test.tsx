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

describe('AresAgentChat - Tactical Martian HUD Component', () => {
  it('renderiza el botón flotante (FAB) cuando el modal está cerrado', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<AresAgentChat isOpen={false} onClose={vi.fn()} />)
    })

    const fab = container.querySelector('.ares-fab-trigger')
    expect(fab).not.toBeNull()
    expect(fab?.textContent).toContain('COPILOTO TÁCTICO')
    expect(container.querySelector('.ares-agent-overlay')).toBeNull()
  })

  it('renderiza la interfaz táctica del HUD cuando isOpen es true', () => {
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

    // Comprobar título táctico y telemetría de misión
    expect(container.textContent).toContain('ARES-NAV')
    expect(container.textContent).toContain('SISTEMA DE ASISTENCIA')
    expect(container.textContent).toContain('ENLACE: ACTIVO')
    expect(container.textContent).toContain('DATUM: AREOIDE 6.1 MBAR')
    expect(container.textContent).toContain('GEODESIA: 3,389.5 KM')

    // Comprobar presencia del botón táctico de ruta actual
    const routeActionBtn = container.querySelector('.hud-action-pill')
    expect(routeActionBtn).not.toBeNull()
    expect(routeActionBtn?.textContent).toContain('EVALUAR RUTA')
  })

  it('permite alternar a la pestaña de parámetros y sensores', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<AresAgentChat isOpen={true} onClose={vi.fn()} />)
    })

    const telemetryTabBtn = container.querySelectorAll<HTMLButtonElement>('.hud-tab')[1]
    expect(telemetryTabBtn.textContent).toContain('PARÁMETROS Y SENSORES')

    act(() => {
      telemetryTabBtn.click()
    })

    // Debe mostrar los parámetros geodésicos y sensores
    expect(container.textContent).toContain('PARÁMETROS DE MISIÓN Y SISTEMAS DE REFERENCIA')
    expect(container.textContent).toContain('Radio Medio ($R_M$): 3,389.50 km')
    expect(container.textContent).toContain('MRO CTX')
    expect(container.textContent).toContain('MGS MOLA')
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
