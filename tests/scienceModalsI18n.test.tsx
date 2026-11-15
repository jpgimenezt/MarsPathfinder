// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider, useLanguage } from '../src/features/i18n/appI18n'
import { AresScientificDataCenterModal } from '../src/components/AresScientificDataCenterModal'
import { MarsSurfaceIntelligenceModal } from '../src/components/MarsSurfaceIntelligenceModal'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => localStorage.clear())
function Modals() {
  const { language, setLanguage } = useLanguage()
  return <><button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}>switch language</button>
    <AresScientificDataCenterModal isOpen onClose={() => {}} />
    <MarsSurfaceIntelligenceModal isOpen onClose={() => {}} onFocusCoordinates={() => {}} />
  </>
}
describe('scientific modals', () => {
  it('updates both languages without changing dataset IDs or attaching unverified images to Gale', () => {
    const element = document.createElement('div')
    document.body.append(element)
    const root = createRoot(element)
    act(() => root.render(<LanguageProvider><Modals /></LanguageProvider>))
    expect(element.textContent).toContain('Gale procedural terrain (NOT a validated DEM)')
    expect(element.textContent).toContain('Metadata unverified')
    expect(element.textContent).toContain('nasa-trek-gale-ctx')
    expect(element.textContent).not.toContain('[CENTRAR EN MAPA 3D]')
    act(() => element.querySelector<HTMLButtonElement>('button')!.click())
    expect(element.textContent).toContain('Reconstrucción procedural ilustrativa de Gale')
    expect(element.textContent).toContain('Metadatos sin verificar')
    expect(element.textContent).toContain('nasa-trek-gale-ctx')
    act(() => root.unmount())
    element.remove()
  })
})
