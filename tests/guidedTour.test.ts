import { describe, expect, it } from 'vitest'
import { GUIDED_TOUR_STEPS } from '../src/components/AresGuidedTour'

describe('ARES Guided Tour Steps (Onboarding)', () => {
  it('contiene las 7 etapas obligatorias del recorrido de inducción', () => {
    expect(GUIDED_TOUR_STEPS).toHaveLength(7)
    const stageNumbers = GUIDED_TOUR_STEPS.map(s => s.stageNumber)
    expect(stageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('cada etapa incluye título, subtítulo, descripción detallada y sugerencia de acción', () => {
    GUIDED_TOUR_STEPS.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(10)
      expect(step.subtitle.length).toBeGreaterThan(10)
      expect(step.description.length).toBeGreaterThan(40)
      expect(step.actionHint).toBeTruthy()
    })
  })

  it('los textos no contienen emojis', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    GUIDED_TOUR_STEPS.forEach((step) => {
      expect(emojiRegex.test(step.title)).toBe(false)
      expect(emojiRegex.test(step.subtitle)).toBe(false)
      expect(emojiRegex.test(step.description)).toBe(false)
      if (step.actionHint) {
        expect(emojiRegex.test(step.actionHint)).toBe(false)
      }
    })
  })

  it('cubre navegación 3D, capas científicas, Curiosity, EVA, colonia Base Alfa y datos NASA', () => {
    const allText = GUIDED_TOUR_STEPS.map(s => `${s.title} ${s.description}`).join(' ')
    expect(allText).toContain('3D')
    expect(allText).toContain('MOLA')
    expect(allText).toContain('CTX')
    expect(allText).toContain('Curiosity')
    expect(allText.toUpperCase()).toContain('EVA')
    expect(allText.toUpperCase()).toContain('WALKBACK')
    expect(allText.toUpperCase()).toContain('BASE ALFA')
    expect(allText.toUpperCase()).toContain('NASA')
  })
})
