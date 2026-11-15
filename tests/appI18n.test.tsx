// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider, LANGUAGE_STORAGE_KEY, savedLanguage, translate, useLanguage } from '../src/features/i18n/appI18n'
import { localizedSources } from '../src/data/sourceManifest'
import { COMMS_TRANSLATIONS } from '../src/features/i18n/commsTranslations'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => { localStorage.clear(); document.documentElement.lang = 'en' })
function Probe() {
  const { language, setLanguage, distance, date, t } = useLanguage()
  return <><span data-testid="language">{language}</span><span data-testid="route">{t('routePlanner')}</span>
    <span data-testid="warning">{t('routeWarning')}</span><span data-testid="distance">{distance(1234.5)}</span>
    <span data-testid="date">{date('2026-11-15')}</span>
    <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}>switch</button></>
}
function mount() {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  act(() => root.render(<LanguageProvider><Probe /></LanguageProvider>))
  return { el, unmount: () => { act(() => root.unmount()); el.remove() } }
}
describe('language selection and scientific translations', () => {
  it('starts in English regardless of navigator language and persists changes without reload', () => {
    expect(savedLanguage(null)).toBe('en')
    const { el, unmount } = mount()
    expect(el.textContent).toContain('Route Planner')
    expect(el.textContent).toContain('Not suitable for operational navigation')
    expect(document.documentElement.lang).toBe('en')
    act(() => el.querySelector('button')!.click())
    expect(el.textContent).toContain('Planificador de ruta')
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
    act(() => el.querySelector('button')!.click())
    expect(document.documentElement.lang).toBe('en')
    unmount()
  })
  it('restores a saved preference and rejects malformed values', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
    const view = mount()
    expect(view.el.textContent).toContain('Planificador de ruta')
    expect(view.el.textContent).toContain('1,23 km')
    view.unmount()
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    expect(savedLanguage(localStorage)).toBe('en')
    expect(translate('en', 'demMax', { degrees: 25 })).toContain('25°')
    expect(translate('en', 'galeWarning')).toContain('not independently validated')
    expect(localizedSources('en')[0].productId).toBe(localizedSources('es')[0].productId)
  })
  it('keeps English as default in voice dictionary and lets the backend receive explicit locale', async () => {
    expect(COMMS_TRANSLATIONS.en.welcomeMessage).toContain('Press "TALK"')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ reply: 'OBSERVED' }) }))
    const { queryMarsAgent } = await import('../src/features/agent/marsAgentService')
    await queryMarsAgent('What is MOLA?')
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(request.body)).language).toBe('en')
    vi.unstubAllGlobals()
  })
})
